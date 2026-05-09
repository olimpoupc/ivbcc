export type CourseCertificateRecord = {
  id?: string;
  code: string;
  user_id?: string;
  course_id?: string;
  student_name: string;
  course_title: string;
  issued_at: string;
  status: "valid" | "revoked" | string;
};

export type CertificateViewModel = {
  code: string;
  studentName: string;
  courseTitle: string;
  courseHours?: number | null;
  issuedAt: string;
  status: string;
  verificationUrl: string;
  qrImageUrl: string;
};

export const CERTIFICATE_INSTITUTION_NAME =
  "Iglesia Valle de Bendición Cruzada Cristiana";

const fallbackSiteUrl = "https://ivbcc-u5p5.vercel.app";

export const certificateSiteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl
).replace(/\/$/, "");

export function absoluteCertificateUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${certificateSiteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatCertificateDate(value?: string | null) {
  return new Date(value || Date.now()).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

export function buildCertificateCode() {
  const year = new Date().getFullYear();
  const segment = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IVBCC-CERT-${year}-${segment}`;
}

export function buildCertificateVerificationPath(code: string) {
  return `/certificados/verificar/${encodeURIComponent(code)}`;
}

export function buildCertificateVerificationUrl(code: string) {
  return absoluteCertificateUrl(buildCertificateVerificationPath(code));
}

export function buildQrImageUrl(value: string) {
  const encodedValue = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodedValue}`;
}

export function toCertificateViewModel(
  certificate: CourseCertificateRecord
): CertificateViewModel {
  const verificationUrl = buildCertificateVerificationUrl(certificate.code);

  return {
    code: certificate.code,
    studentName: certificate.student_name,
    courseTitle: certificate.course_title,
    courseHours: null,
    issuedAt: certificate.issued_at,
    status: certificate.status,
    verificationUrl,
    qrImageUrl: buildQrImageUrl(verificationUrl),
  };
}

export function getCertificatePublicStatus(
  certificate?: Pick<CourseCertificateRecord, "status"> | null
) {
  if (!certificate) {
    return {
      label: "Certificado no encontrado",
      tone: "missing" as const,
      isValid: false,
    };
  }

  if (certificate.status === "valid") {
    return {
      label: "Certificado válido",
      tone: "valid" as const,
      isValid: true,
    };
  }

  if (certificate.status === "revoked") {
    return {
      label: "Certificado revocado",
      tone: "revoked" as const,
      isValid: false,
    };
  }

  return {
    label: "Certificado no válido",
    tone: "invalid" as const,
    isValid: false,
  };
}
