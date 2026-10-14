"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { confirmEventRegistration, type ConfirmRegistrationResult } from "./actions";

export default function ConfirmRegistrationButton({ token }: { token: string }) {
  const [result, setResult] = useState<ConfirmRegistrationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        setResult(await confirmEventRegistration(token));
      } catch {
        setResult({
          success: false,
          error: "No pudimos conectarnos. Revisa tu internet e inténtalo nuevamente.",
        });
      }
    });
  }

  if (result?.success) {
    return (
      <div className="space-y-5">
        <p
          role="status"
          className="form-note border-green-200 bg-green-50/80 text-green-800"
        >
          ¡Listo! Tu inscripción a «{result.eventTitle}» quedó confirmada.
          {result.emailSent ? " Te enviamos los detalles a tu correo." : ""}
        </p>
        <div className="rounded-2xl border border-[#e8e2d6] bg-[#f6f1e8] p-4">
          <p className="text-sm font-extrabold text-gray-950">Agregar a tu calendario:</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={result.calendarLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Google Calendar
            </a>
            <a href={result.calendarLinks.ics} className="btn-secondary">
              Apple / Outlook Calendar
            </a>
          </div>
        </div>
        <Link href={result.eventUrl} className="btn-primary">
          Ver el evento
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="btn-primary w-full py-4 text-base font-black disabled:opacity-60"
      >
        {isPending ? "Confirmando..." : "Confirmar inscripción"}
      </button>
      {result && !result.success && (
        <div role="alert" className="form-note border-red-200 bg-red-50/80 text-red-800">
          <p>{result.error}</p>
          {result.eventUrl && (
            <Link href={result.eventUrl} className="mt-2 inline-block font-bold underline">
              Ir a la página del evento
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
