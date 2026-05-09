"use client";

import Image from "next/image";
import {
  CERTIFICATE_INSTITUTION_NAME,
  type CertificateViewModel,
  formatCertificateDate,
} from "@/lib/certificates";

type Props = {
  certificate: CertificateViewModel;
  showActions?: boolean;
};

export default function CertificateView({
  certificate,
  showActions = true,
}: Props) {
  const isValid = certificate.status === "valid";

  return (
    <section className="space-y-5">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .certificate-print-area,
          .certificate-print-area * {
            visibility: visible !important;
          }

          .certificate-print-area {
            position: fixed !important;
            inset: 0 !important;
            width: 281mm !important;
            height: 194mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          .certificate-actions {
            display: none !important;
          }

          main,
          section {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {showActions ? (
        <div className="certificate-actions flex flex-wrap justify-end gap-3">
          <a
            href={certificate.verificationUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            Verificar
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary"
          >
            Imprimir / guardar PDF
          </button>
        </div>
      ) : null}

      <article className="certificate-print-area relative mx-auto aspect-[1.414/1] w-full max-w-6xl overflow-hidden rounded-[18px] border-[10px] border-[var(--ivbcc-gold)] bg-white p-8 text-[var(--ivbcc-navy)] shadow-2xl md:p-12">
        <div className="pointer-events-none absolute inset-4 border border-[var(--ivbcc-gold)]/45" />
        <div className="pointer-events-none absolute inset-8 border border-[var(--ivbcc-navy)]/12" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[var(--ivbcc-gold)]/30" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full border border-[var(--ivbcc-navy)]/12" />

        <div className="relative flex h-full flex-col">
          <header className="grid gap-4 md:grid-cols-[160px_1fr_160px] md:items-start">
            <div className="rounded-2xl border border-[var(--ivbcc-line)] bg-white p-3 shadow-sm">
              <Image
                src="/images/logonegro.png"
                alt="Logo IVBCC"
                width={138}
                height={54}
                className="h-auto w-full"
                priority
              />
            </div>

            <div className="text-center">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.24em] text-[var(--ivbcc-gold)]">
                {CERTIFICATE_INSTITUTION_NAME}
              </p>
              <h1 className="font-display mt-4 text-4xl font-extrabold leading-none text-[var(--ivbcc-navy)] md:text-6xl">
                Certificado
              </h1>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                de finalización académica
              </p>
            </div>

            <div className="justify-self-start rounded-2xl border border-[var(--ivbcc-line)] bg-[#fbfaf7] p-3 text-center md:justify-self-end">
              <Image
                src={certificate.qrImageUrl}
                alt={`QR de verificación ${certificate.code}`}
                width={96}
                height={96}
                unoptimized
                className="mx-auto h-24 w-24"
              />
              <p className="mt-2 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                Verificar
              </p>
            </div>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center md:py-10">
            <p className="text-xl font-semibold text-slate-600">Certifica que</p>
            <h2 className="font-display mt-4 max-w-4xl text-4xl font-extrabold leading-tight text-[var(--ivbcc-navy)] md:text-6xl">
              {certificate.studentName}
            </h2>
            <div className="mt-5 h-px w-3/4 bg-gradient-to-r from-transparent via-[var(--ivbcc-gold)] to-transparent" />
            <p className="mt-6 text-lg font-semibold text-slate-600">
              ha completado satisfactoriamente el curso
            </p>
            <p className="font-display mt-3 max-w-4xl text-3xl font-extrabold leading-tight text-[var(--ivbcc-navy)] md:text-5xl">
              {certificate.courseTitle}
            </p>
            {certificate.courseHours ? (
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                Duración: {certificate.courseHours} horas
              </p>
            ) : null}
          </div>

          <footer className="grid gap-6 md:grid-cols-[1fr_1.2fr_1fr] md:items-end">
            <div className="rounded-2xl bg-[#f6f1e8] p-4">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
                Código
              </p>
              <p className="mt-2 break-all font-mono text-sm font-bold text-[var(--ivbcc-navy)]">
                {certificate.code}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Estado: {isValid ? "Válido" : "No válido"}
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto h-px w-64 bg-[var(--ivbcc-navy)]" />
              <p className="mt-3 font-display text-xl font-extrabold text-[var(--ivbcc-navy)]">
                Dirección Académica IVBCC
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Pastor / Dirección Académica IVBCC
              </p>
            </div>

            <div className="rounded-2xl bg-[#f6f1e8] p-4 md:text-right">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
                Fecha de expedición
              </p>
              <p className="mt-2 text-sm font-bold text-[var(--ivbcc-navy)]">
                {formatCertificateDate(certificate.issuedAt)}
              </p>
              <p className="mt-2 break-all text-xs font-semibold text-slate-500">
                {certificate.verificationUrl}
              </p>
            </div>
          </footer>
        </div>
      </article>
    </section>
  );
}
