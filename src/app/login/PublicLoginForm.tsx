"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { isClientRateLimited } from "@/lib/security";
import AuthFeedback from "@/components/AuthFeedback";
import FormField from "@/components/ui/FormField";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PublicLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "loading";
    message: string;
  } | null>(null);

  function getReadableErrorMessage(message?: string) {
    const normalizedMessage = message?.toLowerCase() || "";

    if (normalizedMessage.includes("email not confirmed")) {
      return "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada y confirma tu cuenta antes de iniciar sesión.";
    }

    return message || "No pudimos iniciar sesión.";
  }

  const redirectByRole = useCallback(async (user: {
    id: string;
    user_metadata?: Record<string, unknown>;
  }) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: getReadableErrorMessage(error.message),
      });
      router.push("/formacion");
      router.refresh();
      return;
    }

    let resolvedProfile = profile;

    if (!resolvedProfile) {
      const metadata = user.user_metadata || {};
      const firstName =
        String(metadata.nombre || metadata.first_name || metadata.full_name || "").trim();
      const lastName =
        String(metadata.apellidos || metadata.last_name || "").trim();

      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          role: "user",
          first_name: firstName,
          last_name: lastName,
          age: null,
        })
        .select("role")
        .maybeSingle();

      if (insertError) {
        console.error(insertError);
        setFeedback({
          type: "error",
          message: getReadableErrorMessage(insertError.message),
        });
        router.push("/formacion");
        router.refresh();
        return;
      }

      resolvedProfile = insertedProfile;
    }

    if (resolvedProfile?.role === "admin") {
      router.push("/admin/dashboard");
      router.refresh();
      return;
    }

    router.push("/formacion");
    router.refresh();
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;
      await redirectByRole(user);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [redirectByRole]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (isClientRateLimited("login", 5, 10 * 60 * 1000)) {
      setFeedback({
        type: "error",
        message: "Demasiados intentos recientes. Espera unos minutos antes de intentarlo otra vez.",
      });
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setFeedback({
        type: "error",
        message: "Ingresa un correo valido, por ejemplo usuario@gmail.com.",
      });
      return;
    }

    setFeedback({ type: "loading", message: "Validando tus credenciales..." });
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: getReadableErrorMessage(error.message),
      });
      return;
    }

    if (!data.user) {
      setFeedback({
        type: "success",
        message: "Inicio de sesión correcto. Redirigiendo...",
      });
      trackEvent("login", { method: "email" });
      router.push("/formacion");
      router.refresh();
      return;
    }

    setFeedback({
      type: "success",
      message: "Inicio de sesión correcto. Redirigiendo...",
    });
    trackEvent("login", { method: "email" });
    await redirectByRole(data.user);
  }

  async function handleGoogleLogin() {
    const redirectTo = `${window.location.origin}/login`;
    trackEvent("login", { method: "google" });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: getReadableErrorMessage(error.message),
      });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleLogin} className="space-y-4">
        <FormField
          label="Correo electrónico"
          type="email"
          placeholder="usuario@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <FormField
          label="Contraseña"
          type="password"
          placeholder="********"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full disabled:opacity-60"
        >
          {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
        </button>

        <div className="text-right">
          <Link
            href="/recuperar-password"
            className="text-sm font-extrabold text-[var(--ivbcc-navy)] transition hover:text-[var(--ivbcc-gold)]"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>

      <AuthFeedback
        type={
          feedback?.type === "loading"
            ? "info"
            : feedback?.type || "info"
        }
        message={feedback?.message || ""}
      />

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="btn-ghost w-full"
      >
        Iniciar con Google
      </button>
    </div>
  );
}
