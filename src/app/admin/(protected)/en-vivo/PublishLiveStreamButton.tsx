"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
};

export default function PublishLiveStreamButton({ id }: Props) {
  async function handlePublish() {
    const confirmPublish = confirm(
      "¿Deseas publicar esta transmisión ahora?"
    );

    if (!confirmPublish) return;

    const { error } = await supabase
      .from("live_streams")
      .update({ status: "published" })
      .eq("id", id);

    if (error) {
      alert(error.message || "Error al publicar la transmisión");
      console.error(error);
      return;
    }

    alert("Transmisión publicada correctamente");
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
