"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isClientRateLimited } from "@/lib/security";
import FormField from "@/components/ui/FormField";

export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isClientRateLimited("admin-login", 5, 10 * 60 * 1000)) {
      alert("Demasiados intentos recientes. Espera unos minutos antes de intentarlo otra vez.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      alert("Credenciales incorrectas");
      return;
    }

    window.location.href = "/admin/dashboard";
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <FormField
        label="Correo electrónico"
        type="email"
        placeholder="admin@ivbcc.com"
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
        className="btn-primary w-full"
      >
        Ingresar
      </button>
    </form>
  );
}
