"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
};

export default function PublishNewsButton({ id }: Props) {
  async function handlePublish() {
    const confirmPublish = confirm("¿Deseas publicar esta noticia ahora?");

    if (!confirmPublish) return;

    const { error } = await supabase
      .from("news")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Error al publicar la noticia");
      console.error(error);
      return;
    }

    alert("Noticia publicada correctamente");
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
