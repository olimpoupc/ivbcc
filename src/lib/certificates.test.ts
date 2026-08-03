import { describe, expect, it } from "vitest";
import {
  buildCertificateCode,
  buildCertificateVerificationPath,
  buildCertificateVerificationUrl,
  buildQrImageUrl,
  certificateSiteUrl,
  getCertificatePublicStatus,
  toCertificateViewModel,
} from "./certificates";

describe("buildCertificateCode", () => {
  it("matches the IVBCC-CERT-<year>-<segment> pattern", () => {
    const code = buildCertificateCode();

    expect(code).toMatch(/^IVBCC-CERT-\d{4}-[A-Z0-9]{6}$/);
  });

  it("generates different codes on successive calls", () => {
    expect(buildCertificateCode()).not.toBe(buildCertificateCode());
  });
});

describe("buildCertificateVerificationPath / Url", () => {
  it("URL-encodes the certificate code in the path", () => {
    expect(buildCertificateVerificationPath("IVBCC-CERT-2026-ABC123")).toBe(
      "/certificados/verificar/IVBCC-CERT-2026-ABC123"
    );
  });

  it("builds an absolute URL using the configured site URL", () => {
    const url = buildCertificateVerificationUrl("IVBCC-CERT-2026-ABC123");

    expect(url).toBe(
      `${certificateSiteUrl}/certificados/verificar/IVBCC-CERT-2026-ABC123`
    );
  });
});

describe("buildQrImageUrl", () => {
  it("embeds the URL-encoded target as the QR data param", () => {
    const qrUrl = buildQrImageUrl("https://example.com/a b");

    expect(qrUrl).toContain(
      `data=${encodeURIComponent("https://example.com/a b")}`
    );
  });
});

describe("toCertificateViewModel", () => {
  it("maps a certificate record to its view model, including derived fields", () => {
    const viewModel = toCertificateViewModel({
      code: "IVBCC-CERT-2026-ABC123",
      student_name: "Ana Gómez",
      course_title: "Discipulado Básico",
      issued_at: "2026-01-01T00:00:00.000Z",
      status: "valid",
    });

    expect(viewModel.studentName).toBe("Ana Gómez");
    expect(viewModel.courseTitle).toBe("Discipulado Básico");
    expect(viewModel.status).toBe("valid");
    expect(viewModel.verificationUrl).toContain(
      "/certificados/verificar/IVBCC-CERT-2026-ABC123"
    );
    expect(viewModel.qrImageUrl).toContain(
      encodeURIComponent(viewModel.verificationUrl)
    );
  });
});

describe("getCertificatePublicStatus", () => {
  it("reports a missing certificate", () => {
    expect(getCertificatePublicStatus(null)).toEqual({
      label: "Certificado no encontrado",
      tone: "missing",
      isValid: false,
    });
  });

  it("reports a valid certificate", () => {
    expect(getCertificatePublicStatus({ status: "valid" })).toEqual({
      label: "Certificado válido",
      tone: "valid",
      isValid: true,
    });
  });

  it("reports a revoked certificate", () => {
    expect(getCertificatePublicStatus({ status: "revoked" })).toEqual({
      label: "Certificado revocado",
      tone: "revoked",
      isValid: false,
    });
  });

  it("reports an unknown status as invalid", () => {
    expect(getCertificatePublicStatus({ status: "weird" })).toEqual({
      label: "Certificado no válido",
      tone: "invalid",
      isValid: false,
    });
  });
});
