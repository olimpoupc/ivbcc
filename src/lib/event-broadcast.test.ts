import { describe, expect, it } from "vitest";
import {
  checkDailyQuota,
  chunk,
  RESEND_DAILY_QUOTA,
  selectBroadcastRecipients,
  startOfUtcDay,
  validateBroadcastInput,
  type BroadcastCandidate,
} from "./event-broadcast";
import { renderEventBroadcastEmail } from "./email-templates";

const candidate = (overrides: Partial<BroadcastCandidate>): BroadcastCandidate => ({
  id: "id",
  email: "ana@ejemplo.com",
  full_name: "Ana",
  status: "confirmed",
  marketing_consent: true,
  ...overrides,
});

describe("selectBroadcastRecipients", () => {
  it("solo confirmados con consentimiento y no suprimidos", () => {
    const recipients = selectBroadcastRecipients(
      [
        candidate({ id: "ok", email: "ok@ejemplo.com" }),
        candidate({ id: "pend", email: "pend@ejemplo.com", status: "pending" }),
        candidate({ id: "canc", email: "canc@ejemplo.com", status: "cancelled" }),
        candidate({ id: "sin", email: "sin@ejemplo.com", marketing_consent: false }),
        candidate({ id: "baja", email: "Baja@Ejemplo.com" }),
      ],
      ["baja@ejemplo.com"]
    );
    expect(recipients.map((r) => r.id)).toEqual(["ok"]);
  });

  it("compara la supresión sin distinguir mayúsculas y no repite correos", () => {
    const recipients = selectBroadcastRecipients(
      [
        candidate({ id: "a", email: "Ana@Ejemplo.com" }),
        candidate({ id: "b", email: "ana@ejemplo.com" }),
        candidate({ id: "c", email: "luis@ejemplo.com" }),
      ],
      [" LUIS@ejemplo.com "]
    );
    expect(recipients.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("tope diario y lotes", () => {
  it("usa el tope del plan gratuito de Resend y avisa si se excede", () => {
    expect(RESEND_DAILY_QUOTA).toBe(100);
    expect(checkDailyQuota(90, 10)).toEqual({ remaining: 10, exceeds: false });
    expect(checkDailyQuota(90, 11)).toEqual({ remaining: 10, exceeds: true });
    expect(checkDailyQuota(150, 1)).toEqual({ remaining: 0, exceeds: true });
  });

  it("el día del tope empieza a medianoche UTC", () => {
    expect(startOfUtcDay(new Date("2026-10-14T03:30:00Z")).toISOString()).toBe(
      "2026-10-14T00:00:00.000Z"
    );
  });

  it("divide en lotes de 100", () => {
    const parts = chunk(Array.from({ length: 250 }, (_, i) => i));
    expect(parts.map((p) => p.length)).toEqual([100, 100, 50]);
  });
});

describe("validateBroadcastInput", () => {
  it("exige asunto y cuerpo dentro de los límites", () => {
    expect(validateBroadcastInput(" ", "hola")).toBe("Escribe el asunto del mensaje.");
    expect(validateBroadcastInput("Asunto", "  ")).toBe("Escribe el contenido del mensaje.");
    expect(validateBroadcastInput("a".repeat(201), "x")).toMatch(/200/);
    expect(validateBroadcastInput("Asunto", "Hola")).toBeNull();
  });
});

describe("renderEventBroadcastEmail", () => {
  it("escapa el cuerpo y el nombre, y siempre incluye el enlace de baja", () => {
    const html = renderEventBroadcastEmail({
      recipientName: "<b>Ana</b>",
      eventTitle: "Retiro & Vigilia",
      eventUrl: "https://ivbcc.org/eventos/retiro",
      body: 'Traer <script>alert("x")</script>\n\nSegundo párrafo',
      unsubscribeUrl: "https://ivbcc.org/correos/baja?token=abc",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Hola &lt;b&gt;Ana&lt;/b&gt;,");
    expect(html).toContain("Retiro &amp; Vigilia");
    expect(html).toContain('href="https://ivbcc.org/correos/baja?token=abc"');
    expect(html).toContain("Darme de baja");
  });
});
