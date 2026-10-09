"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { isClientRateLimited, sanitizeText } from "@/lib/security";
import FormField from "@/components/ui/FormField";
import type { CalendarLinks } from "@/lib/event-calendar";
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

export default function EventRegistrationForm({ eventId }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [calendarLinks, setCalendarLinks] = useState<CalendarLinks | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setCalendarLinks(null);

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

    if (window.localStorage.getItem(registrationKey)) {
      setMessageType("error");
      setMessage("Ya estás inscrito en este evento.");
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
      // Si ya estaba inscrito, lo recordamos para no repetir el intento.
      if (result.alreadyRegistered) {
        window.localStorage.setItem(registrationKey, "true");
      }
      return;
    }

    window.localStorage.setItem(registrationKey, "true");
    trackEvent("event_registration", { event_id: eventId });
    setMessageType("success");
    setCalendarLinks(result.calendarLinks);
    setMessage(
      result.emailSent
        ? `Inscripción registrada correctamente. Te enviamos la confirmación a ${normalizedEmail}.`
        : "Inscripción registrada correctamente."
    );
    setFullName("");
    setEmail("");
    setPhone("");
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary disabled:opacity-60"
      >
        {isSubmitting ? "Inscribiendo..." : "Inscribirme"}
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

      {messageType === "success" && calendarLinks && (
        <div className="rounded-2xl border border-[#e8e2d6] bg-[#f6f1e8] p-4">
          <p className="text-sm font-extrabold text-gray-950">Agregar a tu calendario:</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={calendarLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Google Calendar
            </a>
            <a href={calendarLinks.ics} className="btn-secondary">
              Apple / Outlook Calendar
            </a>
          </div>
        </div>
      )}
    </form>
  );
}
