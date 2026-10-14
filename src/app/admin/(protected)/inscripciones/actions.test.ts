import { beforeEach, describe, expect, it, vi } from "vitest";

// Cada acción debe validar la sesión de administrador ANTES de crear el
// cliente service_role (o de escribir con la sesión).
const calls: string[] = [];
const adminState = { isAdmin: false };

function chainable(): unknown {
  const target = () => undefined;
  return new Proxy(target, {
    get(_, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void) => resolve({ data: [], error: null });
      }
      if (prop === "maybeSingle") {
        return async () => ({ data: null, error: null });
      }
      calls.push(`db.${String(prop)}`);
      return () => chainable();
    },
  });
}

vi.mock("@/lib/admin-auth", () => ({
  getAdminUser: vi.fn(async () => {
    calls.push("getAdminUser");
    return {
      supabase: chainable(),
      user: adminState.isAdmin ? { id: "admin-id", email: "admin@example.com" } : null,
      isAdmin: adminState.isAdmin,
    };
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => {
    calls.push("serviceRole");
    return chainable();
  }),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/mailer", () => ({
  getMailerConfig: () => ({ apiKey: "x", from: "x" }),
  sendEmail: vi.fn(async () => {
    calls.push("sendEmail");
    return { ok: true, id: null };
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const actions = await import("./actions");

const REG = "33333333-3333-4333-8333-333333333333";
const EVENT = "44444444-4444-4444-8444-444444444444";

const cases: [string, () => Promise<{ success: boolean }>][] = [
  ["resendConfirmationLink", () => actions.resendConfirmationLink(REG)],
  ["confirmRegistrationManually", () => actions.confirmRegistrationManually(REG)],
  ["cancelRegistration", () => actions.cancelRegistration(REG)],
  ["deleteRegistration", () => actions.deleteRegistration(REG)],
  ["toggleRegistrationAttendance", () => actions.toggleRegistrationAttendance(EVENT, REG, true)],
];

describe("acciones de /admin/inscripciones", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it.each(cases)("%s rechaza sin administrador y no toca la base de datos", async (_, run) => {
    adminState.isAdmin = false;
    const result = await run();
    expect(result.success).toBe(false);
    expect(calls[0]).toBe("getAdminUser");
    expect(calls).not.toContain("serviceRole");
    expect(calls.some((call) => call.startsWith("db."))).toBe(false);
    expect(calls).not.toContain("sendEmail");
  });

  it.each(cases)("%s llama a getAdminUser antes de cualquier escritura", async (_, run) => {
    adminState.isAdmin = true;
    await run();
    expect(calls[0]).toBe("getAdminUser");
    const firstDb = calls.findIndex((call) => call === "serviceRole" || call.startsWith("db."));
    expect(firstDb).toBeGreaterThan(0);
  });

  it("rechaza identificadores que no son UUID sin crear el cliente service_role", async () => {
    adminState.isAdmin = true;
    const result = await actions.deleteRegistration("1; drop table");
    expect(result.success).toBe(false);
    expect(calls).toEqual(["getAdminUser"]);
  });
});
