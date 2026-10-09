/**
 * SERVER-ONLY: Este archivo contiene operaciones criptográficas con "node:crypto"
 * y manejo de Buffer de Node.js.
 * 
 * ADVERTENCIA: NO debe importarse desde componentes de cliente (Client Components).
 * Para funciones seguras en el navegador (formateo y montos), usa "@/lib/donations-format".
 */

import { randomBytes, timingSafeEqual } from "node:crypto";

export * from "./donations-format";

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB

export function generateReferenceCode(date = new Date()): string {
  const year = date.getFullYear();
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `DON-${year}-${suffix}`;
}

export function generateUploadToken(): string {
  return randomBytes(24).toString("hex");
}

export type AllowedReceiptType = {
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  extension: "jpg" | "png" | "webp" | "pdf";
};

export function detectReceiptBinaryType(
  bytes: Uint8Array
): AllowedReceiptType | null {
  if (!bytes || bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // PDF: 25 50 44 46 (%PDF)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { mimeType: "application/pdf", extension: "pdf" };
  }

  // WebP: RIFF....WEBP (needs at least 12 bytes)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  return null;
}

export function safeCompareTokens(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
