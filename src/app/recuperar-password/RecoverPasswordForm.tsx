"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthFeedback from "@/components/AuthFeedback";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "loading";
    message: string;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setFeedback({
        type: "error",
        message: "Ingresa un correo valido, por ejemplo usuario@gmail.com.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "loading", message: "Enviando correo de recuperación..." });

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "No pudimos enviar el correo de recuperación.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message: "Te enviamos un correo con el enlace para restablecer tu contraseña.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">
          Correo electrónico
        </label>
        <input
          type="email"
          placeholder="usuario@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--ivbcc-navy)] py-2 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>

      <AuthFeedback
        type={
          feedback?.type === "loading"
            ? "info"
            : feedback?.type || "info"
        }
        message={feedback?.message || ""}
      />
    </form>
  );
}
