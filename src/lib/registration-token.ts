/**
 * SERVER-ONLY: tokens de un solo uso para enlaces enviados por correo
 * (confirmar inscripción, darse de baja). Usa "node:crypto".
 *
 * El token en claro solo viaja en el enlace del correo; en la base de datos se
 * guarda únicamente su sha256, así que una filtración de la tabla no permite
 * confirmar ni dar de baja a nadie. La búsqueda es por igualdad del hash, sin
 * comparar el secreto en claro.
 */

import { createHash, randomBytes } from "node:crypto";

export const CONFIRMATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

/** 32 bytes en base64url = 43 caracteres [A-Za-z0-9_-]. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function getConfirmationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + CONFIRMATION_TOKEN_TTL_MS);
}

export function isTokenExpired(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return true;
  const time = new Date(expiresAt).getTime();
  return Number.isNaN(time) || time <= now.getTime();
}
