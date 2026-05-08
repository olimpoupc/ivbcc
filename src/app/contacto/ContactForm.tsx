"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  isClientRateLimited,
  sanitizeMultilineText,
  sanitizeText,
} from "@/lib/security";
import AuthFeedback from "@/components/AuthFeedback";

type ContactCategory =
  | "general"
  | "counseling"
  | "formation"
  | "events"
  | "prayer"
  | "support"
  | "other";

const categoryOptions: Array<{
  value: ContactCategory;
  label: string;
}> = [
  { value: "general", label: "General" },
  { value: "counseling", label: "Consejería" },
  { value: "formation", label: "Formación" },
  { value: "events", label: "Eventos" },
  { value: "prayer", label: "Petición de oración" },
  { value: "support", label: "Soporte" },
  { value: "other", label: "Otro" },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [churchName, setChurchName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<ContactCategory>("general");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  }>({ type: "info", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isClientRateLimited("contact", 3, 10 * 60 * 1000)) {
      setFeedback({
        type: "error",
        message: "Has enviado varios mensajes recientemente. Intenta de nuevo en unos minutos.",
      });
      return;
    }

    const cleanFullName = sanitizeText(fullName, 120);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = sanitizeText(phone, 40);
    const cleanChurchName = sanitizeText(churchName, 160);
    const cleanSubject = sanitizeText(subject, 180);
    const cleanMessage = sanitizeMultilineText(message, 4000);

    if (!cleanFullName || !cleanEmail || !cleanSubject || !cleanMessage) {
      setFeedback({
        type: "error",
        message: "Completa nombre, correo, asunto y mensaje para continuar.",
      });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setFeedback({
        type: "error",
        message: "Ingresa un correo válido, por ejemplo usuario@gmail.com.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback({
      type: "info",
      message: "Enviando tu mensaje...",
    });

    const { error } = await supabase.from("contact_messages").insert({
      full_name: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone || null,
      church_name: cleanChurchName || null,
      subject: cleanSubject,
      category,
      message: cleanMessage,
      status: "pending",
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "No pudimos enviar tu mensaje.",
      });
      return;
    }

    setFullName("");
    setEmail("");
    setPhone("");
    setChurchName("");
    setSubject("");
    setCategory("general");
    setMessage("");
    setFeedback({
      type: "success",
      message:
        "Tu mensaje fue enviado correctamente. Pronto nos pondremos en contacto contigo.",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-6 shadow-sm md:p-8"
    >
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
          Formulario
        </p>
        <h2 className="mt-2 text-2xl font-bold text-gray-950">
          Escríbenos con confianza
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Estamos para servirte, acompañarte y ayudarte a encontrar la ruta correcta.
        </p>
      </div>

      <AuthFeedback type={feedback.type} message={feedback.message} />

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Nombre completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Teléfono
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Iglesia o congregación
          </label>
          <input
            type="text"
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Asunto
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Categoría
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ContactCategory)}
            className="w-full rounded-lg border px-4 py-3"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Mensaje
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : "Enviar mensaje"}
      </button>
    </form>
  );
}
