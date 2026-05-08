"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
};

export default function DeleteLiveStreamButton({ id }: Props) {
  async function handleDelete() {
    const confirmDelete = confirm(
      "¿Seguro que deseas eliminar esta transmisión?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("live_streams").delete().eq("id", id);

    if (error) {
      alert(error.message || "Error al eliminar la transmisión");
      console.error(error);
      return;
    }

    alert("Transmisión eliminada correctamente");
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
    >
      Eliminar
    </button>
  );
}
