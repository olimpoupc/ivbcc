"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthFeedback from "@/components/AuthFeedback";
import FormField from "@/components/ui/FormField";

function isValidPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "loading";
    message: string;
  } | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      setHasRecoverySession(Boolean(session));
      if (session) {
        setFeedback(null);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasRecoverySession(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasRecoverySession) {
      setFeedback({
        type: "error",
        message: "El enlace es inválido o expiró. Solicita una nueva recuperación.",
      });
      return;
    }

    if (!isValidPassword(password)) {
      setFeedback({
        type: "error",
        message:
          "La contraseña debe tener minimo 8 caracteres, al menos una letra y al menos un numero.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "Las contraseñas no coinciden.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "loading", message: "Actualizando tu contraseña..." });

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "No pudimos actualizar la contraseña.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message: "Tu contraseña fue actualizada correctamente.",
    });
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  }

  if (hasRecoverySession === false) {
    return (
      <div className="space-y-4">
        <AuthFeedback
          type="error"
          message="El enlace es inválido o expiró. Solicita una nueva recuperación."
        />
      </div>
    );
  }

  if (hasRecoverySession === null) {
    return (
      <div className="space-y-4">
        <AuthFeedback
          type="info"
          message="Validando enlace de recuperación..."
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Nueva contraseña"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <FormField
        label="Confirmar contraseña"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full disabled:opacity-60"
      >
        {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
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
