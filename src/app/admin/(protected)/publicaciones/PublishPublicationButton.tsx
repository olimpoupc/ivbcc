"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
};

export default function PublishPublicationButton({ id }: Props) {
  async function handlePublish() {
    const confirmPublish = confirm(
      "¿Deseas publicar esta publicación ahora?"
    );

    if (!confirmPublish) return;

    const { error } = await supabase
      .from("publications")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message || "Error al publicar la publicación");
      console.error(error);
      return;
    }

    alert("Publicación publicada correctamente");
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
