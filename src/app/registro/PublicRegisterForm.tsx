"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { isClientRateLimited, sanitizeText } from "@/lib/security";
import AuthFeedback from "@/components/AuthFeedback";
import FormField from "@/components/ui/FormField";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export default function PublicRegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "loading";
    message: string;
  } | null>(null);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (isClientRateLimited("register", 3, 15 * 60 * 1000)) {
      setFeedback({
        type: "error",
        message: "Demasiados registros recientes desde este navegador. Intenta de nuevo más tarde.",
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

    if (!isValidPassword(password)) {
      setFeedback({
        type: "error",
        message:
          "La contraseña debe tener minimo 8 caracteres, al menos una letra y al menos un numero.",
      });
      return;
    }

    setFeedback({ type: "loading", message: "Creando tu cuenta..." });
    setIsSubmitting(true);

    const cleanFirstName = sanitizeText(firstName, 80);
    const cleanLastName = sanitizeText(lastName, 100);
    const numericAge = Number(age);

    if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      setIsSubmitting(false);
      setFeedback({
        type: "error",
        message: "Ingresa una edad válida.",
      });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          first_name: cleanFirstName,
          last_name: cleanLastName,
          age: numericAge,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);

      const normalizedMessage = error.message?.toLowerCase() || "";

      if (
        normalizedMessage.includes("already registered") ||
        normalizedMessage.includes("user already registered") ||
        normalizedMessage.includes("already exists")
      ) {
        setFeedback({
          type: "error",
          message: "Este correo ya está registrado. Intenta iniciar sesión.",
        });
        return;
      }

      setFeedback({
        type: "error",
        message: error.message || "No pudimos completar el registro.",
      });
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        role: "user",
        first_name: cleanFirstName,
        last_name: cleanLastName,
        age: numericAge,
      });

      if (profileError) {
        console.error(profileError);
        setFeedback({
          type: "error",
          message: profileError.message || "No pudimos completar el registro.",
        });
        return;
      }
    }

    setFeedback({
      type: "success",
      message: "Registro exitoso. Redirigiendo a formación...",
    });
    trackEvent("register", { method: "email" });
    router.push("/formacion");
    router.refresh();
  }

  async function handleGoogleRegister() {
    const redirectTo = `${window.location.origin}/login`;
    trackEvent("register", { method: "google" });

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
        message: error.message || "Google aún no está configurado.",
      });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Nombre"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />

          <FormField
            label="Apellidos"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>

        <FormField
          label="Edad"
          type="number"
          min="1"
          value={age}
          onChange={(event) => setAge(event.target.value)}
          required
        />

        <FormField
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <FormField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full disabled:opacity-60"
        >
          {isSubmitting ? "Registrando..." : "Registrarse"}
        </button>
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
        onClick={handleGoogleRegister}
        className="btn-ghost w-full"
      >
        Registrarse con Google
      </button>
    </div>
  );
}
