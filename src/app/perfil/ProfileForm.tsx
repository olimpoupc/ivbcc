"use client";

import { useState } from "react";
import AuthFeedback from "@/components/AuthFeedback";
import { supabase } from "@/lib/supabase";
import FormField from "@/components/ui/FormField";

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
    <article className="premium-surface rounded-[30px] p-6 md:p-8">
      <div className="mb-6">
        <p className="kicker">
          Datos personales
        </p>
        <h2 className="section-title mt-2 text-3xl text-gray-950">
          Actualiza tu perfil
        </h2>
        <p className="muted-copy mt-3 text-sm">
          Mantén tus datos al día para una experiencia más clara dentro de la
          plataforma.
        </p>
      </div>

      <AuthFeedback type={feedback.type} message={feedback.message} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Nombres"
            type="text"
            value={values.first_name}
            onChange={(event) => updateField("first_name", event.target.value)}
          />

          <FormField
            label="Apellidos"
            type="text"
            value={values.last_name}
            onChange={(event) => updateField("last_name", event.target.value)}
          />

          <FormField
            label="Edad"
            type="number"
            min="0"
            value={values.age}
            onChange={(event) => updateField("age", event.target.value)}
          />

          <FormField
            label="Correo electrónico"
            type="email"
            value={values.email}
            readOnly
          />

          <FormField
            label="Rol"
            type="text"
            value={values.role}
            readOnly
            className="capitalize"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary disabled:opacity-60"
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </article>
  );
}
