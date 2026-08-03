"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import type { CertificateViewModel } from "@/lib/certificates";
import { getUserFacingErrorMessage } from "@/lib/user-facing-error";
import { getOrCreateCourseCertificate } from "./certificate-actions";

type Props = {
  courseId: string;
  initialFirstName?: string;
  initialLastName?: string;
  userEmail?: string;
  initialCertificate?: CertificateViewModel | null;
};

export default function CourseCertificateButton({
  courseId,
  initialFirstName = "",
  initialLastName = "",
  userEmail = "",
  initialCertificate = null,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [showProfileForm, setShowProfileForm] = useState(
    !initialCertificate && (!initialFirstName.trim() || !initialLastName.trim())
  );
  const [certificate, setCertificate] = useState<CertificateViewModel | null>(
    initialCertificate
  );

  function handleGenerateCertificate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage("");

    startTransition(async () => {
      let result;

      try {
        result = await getOrCreateCourseCertificate(courseId, {
          firstName,
          lastName,
        });
      } catch (error) {
        console.error(error);
        setMessage(getUserFacingErrorMessage(error, "Error generando certificado."));
        return;
      }

      if (!result.ok) {
        if ("reason" in result && result.reason === "profile_required") {
          setFirstName(result.firstName);
          setLastName(result.lastName);
          setShowProfileForm(true);
        }

        setMessage(result.message);
        return;
      }

      setCertificate(result.certificate);
      setShowProfileForm(false);
      setMessage("Certificado generado correctamente.");
    });
  }

  return (
    <div className="space-y-5">
      {!certificate && showProfileForm ? (
        <form
          onSubmit={handleGenerateCertificate}
          className="space-y-4 rounded-2xl border border-green-200 bg-white p-5"
        >
          <div>
            <p className="kicker">Certificado</p>
            <h3 className="section-title mt-2 text-2xl text-gray-950">
              Completa los datos para tu certificado
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-label">
              Nombre
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                className="form-control mt-2"
              />
            </label>

            <label className="form-label">
              Apellido
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                className="form-control mt-2"
              />
            </label>
          </div>

          {userEmail ? (
            <label className="form-label">
              Correo
              <input
                type="email"
                value={userEmail}
                readOnly
                className="form-control mt-2"
              />
            </label>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="btn-secondary disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar y generar certificado"}
          </button>
        </form>
      ) : !certificate ? (
        <button
          type="button"
          onClick={() => handleGenerateCertificate()}
          disabled={isPending}
          className="btn-secondary disabled:opacity-60"
        >
          {isPending ? "Generando certificado..." : "Generar certificado"}
        </button>
      ) : null}

      {message ? (
        <p
          className={`form-note ${
            certificate
              ? "border-green-200 bg-green-50/80 text-green-800"
              : "border-amber-200 bg-amber-50/80 text-amber-800"
          }`}
        >
          {message}
        </p>
      ) : null}

      {certificate ? (
        <div className="space-y-3 rounded-2xl border border-green-200 bg-white p-5">
          <div>
            <p className="text-sm font-semibold text-green-700">
              Certificado listo.
            </p>
            <p className="mt-1 font-mono text-xs font-bold text-[var(--ivbcc-navy)]">
              Código: {certificate.code}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={certificate.verificationUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Abrir certificado
            </a>
            <a
              href={certificate.verificationUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Verificar
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
