import { describe, expect, it } from "vitest";
import {
  CONFIRMATION_TOKEN_TTL_MS,
  generateToken,
  getConfirmationExpiry,
  hashToken,
  isTokenExpired,
  isWellFormedToken,
} from "./registration-token";

describe("generateToken", () => {
  it("genera 32 bytes en base64url (43 caracteres) y su sha256", () => {
    const { token, hash } = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
  });

  it("no repite tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken().token));
    expect(tokens.size).toBe(50);
  });
});

describe("hashToken", () => {
  it("es el sha256 hexadecimal y determinista", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });
});

describe("isWellFormedToken", () => {
  it("acepta solo el formato generado", () => {
    expect(isWellFormedToken(generateToken().token)).toBe(true);
    expect(isWellFormedToken("corto")).toBe(false);
    expect(isWellFormedToken(`${"a".repeat(42)}=`)).toBe(false);
    expect(isWellFormedToken(undefined)).toBe(false);
  });
});

describe("vencimiento", () => {
  const now = new Date("2026-10-14T12:00:00Z");

  it("vence 48 horas después de emitido", () => {
    expect(CONFIRMATION_TOKEN_TTL_MS).toBe(48 * 60 * 60 * 1000);
    expect(getConfirmationExpiry(now).toISOString()).toBe("2026-10-16T12:00:00.000Z");
  });

  it("sigue vigente antes de la hora de vencimiento y vence justo en ella", () => {
    const expiry = getConfirmationExpiry(now);
    expect(isTokenExpired(expiry, new Date("2026-10-16T11:59:59Z"))).toBe(false);
    expect(isTokenExpired(expiry, new Date("2026-10-16T12:00:00Z"))).toBe(true);
  });

  it("trata como vencido un valor vacío o inválido", () => {
    expect(isTokenExpired(null, now)).toBe(true);
    expect(isTokenExpired("no-es-fecha", now)).toBe(true);
  });
});
