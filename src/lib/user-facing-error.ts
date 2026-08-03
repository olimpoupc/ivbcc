const KNOWN_SAFE_PATTERNS: Array<{ match: RegExp; message: string }> = [
  {
    match: /email not confirmed/i,
    message:
      "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada y confirma tu cuenta.",
  },
  {
    match: /invalid login credentials/i,
    message: "Correo o contraseña incorrectos.",
  },
  {
    match: /user already registered|already registered/i,
    message: "Ya existe una cuenta con este correo.",
  },
  {
    match: /password should be at least/i,
    message: "La contraseña debe tener al menos 6 caracteres.",
  },
  {
    match: /same password/i,
    message: "La nueva contraseña debe ser diferente a la actual.",
  },
  {
    match: /email rate limit exceeded|rate limit/i,
    message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  },
  {
    match: /token has expired or is invalid|invalid.*token/i,
    message: "El enlace expiró o no es válido. Solicita uno nuevo.",
  },
  {
    match: /demasiadas inscripciones desde este correo/i,
    message: "Demasiadas inscripciones desde este correo. Intenta más tarde.",
  },
  {
    match: /demasiados mensajes enviados desde este correo/i,
    message: "Demasiados mensajes enviados desde este correo. Intenta más tarde.",
  },
];

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  return "";
}

/**
 * Supabase Auth errors are written to be shown to end users, but Postgres/
 * PostgREST errors (constraint names, column names, RLS denials) are not.
 * This only surfaces messages that match a known-safe allowlist; anything
 * else falls back to a generic message so internal schema details never
 * reach the browser. Callers should still console.error the raw error.
 */
export function getUserFacingErrorMessage(error: unknown, fallback: string) {
  const rawMessage = extractMessage(error);
  const knownSafe = KNOWN_SAFE_PATTERNS.find((entry) => entry.match.test(rawMessage));

  return knownSafe ? knownSafe.message : fallback;
}
