"use client";

import { useState } from "react";
import AuthFeedback from "@/components/AuthFeedback";
import { supabase } from "@/lib/supabase";

type ProfileFormValues = {
  id: string;
  first_name: string;
  last_name: string;
  age: string;
  role: string;
  email: string;
};

type Props = {
  initialProfile: ProfileFormValues;
};

export default function ProfileForm({ initialProfile }: Props) {
  const [values, setValues] = useState(initialProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  }>({ type: "info", message: "" });

  function updateField<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setFeedback({ type: "info", message: "Guardando perfil..." });

    const normalizedAge = values.age.trim();
    const parsedAge = normalizedAge ? Number(normalizedAge) : null;

    if (
      normalizedAge &&
      (parsedAge === null || !Number.isInteger(parsedAge) || parsedAge < 0)
    ) {
      setIsSubmitting(false);
      setFeedback({
        type: "error",
        message: "La edad debe ser un número válido.",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: values.first_name.trim() || null,
        last_name: values.last_name.trim() || null,
        age: parsedAge,
      })
      .eq("id", values.id);

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "No pudimos actualizar tu perfil.",
      });
      return;
    }

    setFeedback({
      type: "success",
      message: "Tu perfil fue actualizado correctamente.",
    });
  }

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
          Datos personales
        </p>
        <h2 className="mt-2 text-2xl font-bold text-gray-950">
          Actualiza tu perfil
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Mantén tus datos al día para una experiencia más clara dentro de la
          plataforma.
        </p>
      </div>

      <AuthFeedback type={feedback.type} message={feedback.message} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Nombres
            </label>
            <input
              type="text"
              value={values.first_name}
              onChange={(event) => updateField("first_name", event.target.value)}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Apellidos
            </label>
            <input
              type="text"
              value={values.last_name}
              onChange={(event) => updateField("last_name", event.target.value)}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Edad
            </label>
            <input
              type="number"
              min="0"
              value={values.age}
              onChange={(event) => updateField("age", event.target.value)}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Correo electrónico
            </label>
            <input
              type="email"
              value={values.email}
              readOnly
              className="w-full rounded-lg border bg-gray-50 px-4 py-3 text-gray-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Rol
            </label>
            <input
              type="text"
              value={values.role}
              readOnly
              className="w-full rounded-lg border bg-gray-50 px-4 py-3 capitalize text-gray-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </article>
  );
}
