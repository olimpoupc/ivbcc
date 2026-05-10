"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
};

export default function DeleteLessonButton({ id }: Props) {
  async function handleDelete() {
    const confirmDelete = confirm("¿Seguro que deseas eliminar esta lección?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar la lección");
      console.error(error);
      return;
    }

    alert("Lección eliminada correctamente");
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700"
    >
      Eliminar
    </button>
  );
}
