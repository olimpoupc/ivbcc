import { describe, expect, it } from "vitest";
import { getUserFacingErrorMessage } from "./user-facing-error";

describe("getUserFacingErrorMessage", () => {
  it("maps a known Supabase Auth error to a friendly Spanish message", () => {
    const error = new Error("Invalid login credentials");

    expect(getUserFacingErrorMessage(error, "fallback")).toBe(
      "Correo o contraseña incorrectos."
    );
  });

  it("recognizes plain PostgrestError-like objects (not instanceof Error)", () => {
    const error = { message: "Email not confirmed", code: "AUTH_ERROR" };

    expect(getUserFacingErrorMessage(error, "fallback")).toBe(
      "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada y confirma tu cuenta."
    );
  });

  it("recognizes the custom rate-limit trigger messages", () => {
    const error = {
      message: "Demasiadas inscripciones desde este correo. Intenta más tarde.",
      code: "P0001",
    };

    expect(getUserFacingErrorMessage(error, "fallback")).toBe(
      "Demasiadas inscripciones desde este correo. Intenta más tarde."
    );
  });

  it("falls back to the generic message for unrecognized errors (e.g. raw Postgres constraint errors)", () => {
    const error = {
      message:
        'duplicate key value violates unique constraint "event_registrations_event_id_email_key"',
    };

    expect(getUserFacingErrorMessage(error, "No pudimos completar la acción.")).toBe(
      "No pudimos completar la acción."
    );
  });

  it("falls back for null/undefined errors", () => {
    expect(getUserFacingErrorMessage(null, "fallback")).toBe("fallback");
    expect(getUserFacingErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
