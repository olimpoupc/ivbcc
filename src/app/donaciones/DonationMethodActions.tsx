"use client";

import { useState } from "react";

type Props = {
  accountNumber?: string | null;
  accountCopyButtonText?: string;
  accountCopyLabel?: string;
  phone?: string | null;
  paymentUrl?: string | null;
  title: string;
};

function normalizeColombianPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("57") && digits.length >= 12) return digits;
  if (digits.startsWith("3") && digits.length === 10) return `57${digits}`;

  return digits;
}

function buildWhatsAppHref(phone: string, title: string) {
  const normalizedPhone = normalizeColombianPhone(phone);
  const message = `Hola, bendiciones. Quiero confirmar una donación por ${title} para IVBCC.`;

  return normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
    : null;
}

export default function DonationMethodActions({
  accountNumber,
  accountCopyButtonText = "Copiar cuenta",
  accountCopyLabel = "Cuenta",
  phone,
  paymentUrl,
  title,
}: Props) {
  const [feedback, setFeedback] = useState("");
  const whatsappHref = phone ? buildWhatsAppHref(phone, title) : null;

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copiado`);
    } catch {
      setFeedback("No se pudo copiar");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {accountNumber ? (
          <button
            type="button"
            onClick={() => copyValue(accountNumber, accountCopyLabel)}
            className="btn-secondary"
          >
            {accountCopyButtonText}
          </button>
        ) : null}
        {phone ? (
          <button
            type="button"
            onClick={() => copyValue(phone, "Teléfono")}
            className="btn-ghost"
          >
            Copiar teléfono
          </button>
        ) : null}
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            WhatsApp
          </a>
        ) : null}
        {paymentUrl ? (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Ir a pago
          </a>
        ) : null}
      </div>
      {feedback ? (
        <p className="text-sm font-semibold text-emerald-700">{feedback}</p>
      ) : null}
    </div>
  );
}
