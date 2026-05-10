"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
};

export default function DeleteQuizButton({ id }: Props) {
  async function handleDelete() {
    const confirmDelete = confirm("¿Seguro que deseas eliminar este quiz?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("quizzes").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar el quiz");
      console.error(error);
      return;
    }

    alert("Quiz eliminado correctamente");
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
