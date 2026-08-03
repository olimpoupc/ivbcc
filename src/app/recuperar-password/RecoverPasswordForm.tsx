"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isClientRateLimited } from "@/lib/security";
import { getUserFacingErrorMessage } from "@/lib/user-facing-error";
import AuthFeedback from "@/components/AuthFeedback";
import FormField from "@/components/ui/FormField";

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

    if (isClientRateLimited("recover-password", 5, 60 * 60 * 1000)) {
      setFeedback({
        type: "error",
        message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
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
        message: getUserFacingErrorMessage(
          error,
          "No pudimos enviar el correo de recuperación."
        ),
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
      <FormField
        label="Correo electrónico"
        type="email"
        placeholder="usuario@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-60"
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
