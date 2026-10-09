import { describe, expect, it } from "vitest";
import {
  detectReceiptBinaryType,
  formatColombianPesos,
  generateReferenceCode,
  generateUploadToken,
  safeCompareTokens,
  validateDonationAmount,
} from "./donations";

describe("formatColombianPesos", () => {
  it("formats positive amounts without decimals in es-CO standard", () => {
    const formatted = formatColombianPesos(50000);
    // es-CO formatted COP typically looks like "$ 50.000" or "$50.000"
    expect(formatted).toMatch(/\$\s?50\.000/);
    expect(formatted).not.toContain(",00");
  });

  it("formats boundary amounts correctly", () => {
    const min = formatColombianPesos(1000);
    expect(min).toMatch(/\$\s?1\.000/);

    const max = formatColombianPesos(20000000);
    expect(max).toMatch(/\$\s?20\.000\.000/);
  });
});

describe("validateDonationAmount", () => {
  it("accepts integers within allowed range", () => {
    expect(validateDonationAmount(1000)).toEqual({ valid: true, amount: 1000 });
    expect(validateDonationAmount(50000)).toEqual({ valid: true, amount: 50000 });
    expect(validateDonationAmount(20000000)).toEqual({
      valid: true,
      amount: 20000000,
    });
  });

  it("rejects values below minimum 1000", () => {
    const res = validateDonationAmount(999);
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("rejects values above maximum 20000000", () => {
    const res = validateDonationAmount(20000001);
    expect(res.valid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("rejects non-integer numbers (decimals)", () => {
    const res = validateDonationAmount(15000.5);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("número entero");
  });

  it("rejects non-numeric inputs and NaN", () => {
    expect(validateDonationAmount("50000" as unknown as number).valid).toBe(false);
    expect(validateDonationAmount(NaN).valid).toBe(false);
    expect(validateDonationAmount(null).valid).toBe(false);
  });
});

describe("generateReferenceCode", () => {
  it("generates code following DON-AAAA-XXXXXX format", () => {
    const fixedDate = new Date(2026, 4, 15);
    const code = generateReferenceCode(fixedDate);
    expect(code).toMatch(/^DON-2026-[0-9A-Z]{6}$/);
  });

  it("generates distinct codes across calls", () => {
    const code1 = generateReferenceCode();
    const code2 = generateReferenceCode();
    expect(code1).not.toBe(code2);
  });
});

describe("detectReceiptBinaryType", () => {
  it("detects valid JPEG files", () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectReceiptBinaryType(jpegBytes)).toEqual({
      mimeType: "image/jpeg",
      extension: "jpg",
    });
  });

  it("detects valid PNG files", () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(detectReceiptBinaryType(pngBytes)).toEqual({
      mimeType: "image/png",
      extension: "png",
    });
  });

  it("detects valid PDF files", () => {
    const pdfBytes = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35,
    ]);
    expect(detectReceiptBinaryType(pdfBytes)).toEqual({
      mimeType: "application/pdf",
      extension: "pdf",
    });
  });

  it("detects valid WebP files", () => {
    // RIFF....WEBP
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectReceiptBinaryType(webpBytes)).toEqual({
      mimeType: "image/webp",
      extension: "webp",
    });
  });

  it("rejects invalid or spoofed binary headers", () => {
    // Random executable or text
    const textBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(detectReceiptBinaryType(textBytes)).toBeNull();

    // Partial RIFF but not WEBP
    const fakeRiff = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
    ]);
    expect(detectReceiptBinaryType(fakeRiff)).toBeNull();

    // Too short
    expect(detectReceiptBinaryType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("safeCompareTokens", () => {
  it("returns true for matching tokens", () => {
    const token = generateUploadToken();
    expect(safeCompareTokens(token, token)).toBe(true);
  });

  it("returns false for different tokens of same or different lengths", () => {
    const t1 = generateUploadToken();
    const t2 = generateUploadToken();
    expect(safeCompareTokens(t1, t2)).toBe(false);
    expect(safeCompareTokens("short", "longer-token-here")).toBe(false);
  });
});
