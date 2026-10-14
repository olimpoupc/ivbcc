"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { isClientRateLimited, sanitizeText } from "@/lib/security";
import FormField from "@/components/ui/FormField";
import { registerForEvent, type RegisterForEventResult } from "./actions";

type Props = {
  eventId: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

// Evita reenvíos seguidos desde este navegador (el servidor también limita
// a un enlace cada 10 minutos por inscripción pendiente).
const RESUBMIT_COOLDOWN_MS = 10 * 60 * 1000;

export default function EventRegistrationForm({ eventId }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [marketingConsent, setMarketingConsent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    if (!isValidEmail(normalizedEmail)) {
      setMessageType("error");
      setMessage("Ingresa un correo valido, por ejemplo usuario@gmail.com.");
      return;
    }

    if (phone && normalizedPhone.length !== phone.trim().length) {
      setMessageType("error");
      setMessage("El telefono solo debe contener numeros.");
      return;
    }

    if (normalizedPhone.length !== 10) {
      setMessageType("error");
      setMessage("El teléfono debe tener exactamente 10 dígitos.");
      return;
    }

    if (isClientRateLimited(`event-registration:${eventId}`, 5, 60 * 60 * 1000)) {
      setMessageType("error");
      setMessage("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
      return;
    }

    setIsSubmitting(true);
    const registrationKey = `event-registration:${eventId}:${normalizedEmail}`;

    const lastRequestAt = Number(window.localStorage.getItem(registrationKey));
    if (lastRequestAt && Date.now() - lastRequestAt < RESUBMIT_COOLDOWN_MS) {
      setMessageType("success");
      setMessage(
        "Ya te enviamos el enlace hace unos minutos. Revisa tu correo, incluida la carpeta de spam."
      );
      setIsSubmitting(false);
      return;
    }

    const cleanFullName = sanitizeText(fullName, 120);

    if (!cleanFullName) {
      setMessageType("error");
      setMessage("Ingresa tu nombre completo.");
      setIsSubmitting(false);
      return;
    }

    // La inscripción y el correo de confirmación se hacen en el servidor.
    let result: RegisterForEventResult;
    try {
      result = await registerForEvent({
        eventId,
        fullName: cleanFullName,
        email: normalizedEmail,
        phone: normalizedPhone,
        marketingConsent,
      });
    } catch {
      setIsSubmitting(false);
      setMessageType("error");
      setMessage("No pudimos conectarnos. Revisa tu internet e inténtalo nuevamente.");
      return;
    }

    setIsSubmitting(false);

    if (!result.success) {
      setMessageType("error");
      setMessage(result.error);
      return;
    }

    // El servidor responde igual exista o no el correo: la inscripción solo
    // cuenta cuando la persona confirma desde el enlace del correo.
    window.localStorage.setItem(registrationKey, String(Date.now()));
    trackEvent("event_registration", { event_id: eventId });
    setMessageType("success");
    setMessage(result.message);
    setFullName("");
    setEmail("");
    setPhone("");
    setMarketingConsent(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Nombre completo"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <FormField
        label="Correo"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        inputMode="email"
      />

      <FormField
        label="Teléfono"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(normalizePhone(e.target.value))}
        inputMode="numeric"
        maxLength={10}
        pattern="[0-9]{10}"
      />

      <label className="flex items-start gap-3 rounded-2xl border border-[#e8e2d6] bg-[#f6f1e8]/60 p-4 text-sm leading-6 text-gray-700">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span>
          Acepto recibir comunicaciones de la IVBCC sobre este evento (opcional). Autorizo el
          tratamiento de mis datos conforme a la Ley 1581 de 2012; puedo darme de baja en
          cualquier momento desde el enlace de cada mensaje.
        </span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full py-4 text-base font-black disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : "Inscribirme"}
      </button>

      {message && (
        <p
          role={messageType === "error" ? "alert" : "status"}
          className={`form-note ${
            messageType === "success" ? "border-green-200 bg-green-50/80 text-green-800" : "border-red-200 bg-red-50/80 text-red-800"
          }`}
        >
          {message}
        </p>
      )}

    </form>
  );
}
