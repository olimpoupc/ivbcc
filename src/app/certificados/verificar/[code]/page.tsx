import Link from "next/link";
import type { Metadata } from "next";
import CertificateView from "@/components/certificates/CertificateView";
import {
  CERTIFICATE_INSTITUTION_NAME,
  getCertificatePublicStatus,
  toCertificateViewModel,
  type CourseCertificateRecord,
} from "@/lib/certificates";
import { buildContentMetadata } from "@/lib/seo";
import { createSupabasePublicClient } from "@/lib/supabase-server";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  return buildContentMetadata({
    title: `Verificación de certificado ${code}`,
    description:
      "Consulta pública de validez para certificados de formación IVBCC.",
    path: `/certificados/verificar/${code}`,
    type: "website",
  });
}

export default async function VerificarCertificadoPage({ params }: Props) {
  const { code } = await params;
  const decodedCode = decodeURIComponent(code).trim().toUpperCase();
  // Exact-code lookup through verify_certificate(): a SECURITY DEFINER function
  // that returns only the public fields of a single certificate. There is no
  // public SELECT on course_certificates, so this can not be used to list them.
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase.rpc("verify_certificate", {
    p_code: decodedCode,
  });
  const certificate = data?.[0] ?? null;

  const certificateStatus = getCertificatePublicStatus(
    error ? null : certificate
  );

  return (
    <main className="premium-page py-12">
      <section className="site-shell-wide">
        <header className="page-hero mb-8">
          <div className="hero-inner p-7 md:p-10">
            <p className="kicker">{CERTIFICATE_INSTITUTION_NAME}</p>
            <h1 className="section-title mt-3 text-4xl md:text-5xl">
              Verificación de certificado
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
              Consulta pública de autenticidad para certificados emitidos por
              IVBCC.
            </p>
          </div>
        </header>

        {certificateStatus.isValid && certificate ? (
          <div className="space-y-6">
            <div className="premium-surface rounded-[28px] p-6">
              <p className="kicker text-green-700">Certificado válido</p>
              <h2 className="section-title mt-2 text-3xl text-gray-950">
                Este certificado fue emitido por IVBCC.
              </h2>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600 md:grid-cols-2">
                <p>Estudiante: {certificate.student_name}</p>
                <p>Curso: {certificate.course_title}</p>
                <p>Código: {certificate.code}</p>
                <p>Estado: válido</p>
              </div>
            </div>

            <CertificateView
              certificate={toCertificateViewModel(
                certificate as CourseCertificateRecord
              )}
            />
          </div>
        ) : (
          <div className="premium-surface rounded-[28px] px-6 py-16 text-center">
            <p className="kicker text-red-700">{certificateStatus.label}</p>
            <h2 className="section-title mt-3 text-3xl text-gray-950">
              {certificateStatus.tone === "revoked"
                ? "Este certificado fue revocado."
                : "No encontramos un certificado válido con este código."}
            </h2>
            <p className="muted-copy mx-auto mt-4 max-w-2xl text-sm">
              {certificateStatus.tone === "revoked"
                ? "El código existe, pero ya no tiene estado válido para verificación pública."
                : "Verifica que el código esté escrito exactamente como aparece en el diploma."}
            </p>
            <Link href="/" className="btn-primary mt-7">
              Volver al inicio
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
