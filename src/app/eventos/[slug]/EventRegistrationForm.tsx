"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import FormField from "@/components/ui/FormField";

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

    setIsSubmitting(true);
    const registrationKey = `event-registration:${eventId}:${normalizedEmail}`;

    if (window.localStorage.getItem(registrationKey)) {
      setMessageType("error");
      setMessage("Ya estás inscrito en este evento.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("event_registrations").insert({
      event_id: eventId,
      full_name: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone || null,
    });

    setIsSubmitting(false);

    if (error) {
      setMessageType("error");

      if (error.code === "23505") {
        setMessage("Ya estás inscrito en este evento.");
        return;
      }

      setMessage("No pudimos registrar tu inscripción. Inténtalo nuevamente.");
      console.error(error);
      return;
    }

    window.localStorage.setItem(registrationKey, "true");
    trackEvent("event_registration", { event_id: eventId });
    setMessageType("success");
    setMessage("Inscripción registrada correctamente.");
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
