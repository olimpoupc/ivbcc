"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isClientRateLimited } from "@/lib/security";

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
      <div>
        <label className="block text-sm font-medium mb-1">
          Correo electrónico
        </label>
        <input
          type="email"
          placeholder="admin@ivbcc.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input
          type="password"
          placeholder="********"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-[var(--ivbcc-navy)] text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
      >
        Ingresar
      </button>
    </form>
  );
}
