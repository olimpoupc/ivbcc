"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
};

export default function PublishCourseButton({ id }: Props) {
  async function handlePublish() {
    const confirmPublish = confirm("¿Deseas publicar este curso ahora?");

    if (!confirmPublish) return;

    const { error } = await supabase
      .from("courses")
      .update({ status: "published" })
      .eq("id", id);

    if (error) {
      alert("Error al publicar el curso");
      console.error(error);
      return;
    }

    alert("Curso publicado correctamente");
    window.location.reload();
  }

  return (
    <button
      onClick={handlePublish}
      className="rounded-full bg-green-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-700"
    >
      Publicar
    </button>
  );
}
