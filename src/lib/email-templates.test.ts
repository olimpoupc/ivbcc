import { describe, expect, it } from "vitest";
import { renderEventRegistrationEmail } from "./email-templates";

const baseData = {
  recipientName: "Ana Pérez",
  eventTitle: "Noche de alabanza",
  eventDateLabel: "sábado, 18 de octubre de 2026, 6:00 p. m.",
  eventLocation: "Templo principal",
  eventUrl: "https://ivbcc.org/eventos/noche-de-alabanza",
  email: "ana@ejemplo.com",
  phone: "3001234567",
  calendarLinks: {
    google: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Noche",
    ics: "https://ivbcc.org/api/eventos/abc/calendario.ics",
  },
};

describe("renderEventRegistrationEmail", () => {
  it("incluye el agradecimiento y los datos del evento y del inscrito", () => {
    const html = renderEventRegistrationEmail(baseData);
    expect(html).toContain("¡Gracias por inscribirte al evento!");
    expect(html).toContain("Hola Ana Pérez,");
    expect(html).toContain("Noche de alabanza");
    expect(html).toContain("sábado, 18 de octubre de 2026, 6:00 p. m.");
    expect(html).toContain("Templo principal");
    expect(html).toContain("ana@ejemplo.com");
    expect(html).toContain("3001234567");
    expect(html).toContain('href="https://ivbcc.org/eventos/noche-de-alabanza"');
  });

  it("incluye la sección «Agendar evento» con los dos enlaces de calendario", () => {
    const html = renderEventRegistrationEmail(baseData);
    expect(html).toContain("Agendar evento:");
    expect(html).toContain("Google Calendar");
    expect(html).toContain("Apple / Outlook Calendar");
    // Los & del enlace se escapan como &amp; dentro del atributo href
    expect(html).toContain(
      'href="https://calendar.google.com/calendar/render?action=TEMPLATE&amp;text=Noche"'
    );
    expect(html).toContain('href="https://ivbcc.org/api/eventos/abc/calendario.ics"');
    // La sección va después del botón "Ver el evento"
    expect(html.indexOf("Agendar evento:")).toBeGreaterThan(html.indexOf("Ver el evento"));
  });

  it("omite la fila de lugar cuando el evento no tiene lugar", () => {
    const html = renderEventRegistrationEmail({ ...baseData, eventLocation: null });
    expect(html).not.toContain(">Lugar<");
  });

  it("escapa el HTML que escriba el usuario", () => {
    const html = renderEventRegistrationEmail({
      ...baseData,
      recipientName: '<script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
});
