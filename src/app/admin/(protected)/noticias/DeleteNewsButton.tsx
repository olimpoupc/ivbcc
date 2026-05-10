"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
  imageUrl?: string | null;
};

function getStoragePathFromPublicUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/news-images/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export default function DeleteNewsButton({ id, imageUrl }: Props) {
  async function handleDelete() {
    const confirmDelete = confirm("¿Seguro que deseas eliminar esta noticia?");

    if (!confirmDelete) return;

    const imagePath = getStoragePathFromPublicUrl(imageUrl);

    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from("news-images")
        .remove([imagePath]);

      if (storageError) {
        alert("Error al eliminar la imagen de la noticia");
        console.error(storageError);
        return;
      }
    }

    const { error } = await supabase.from("news").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar la noticia");
      console.error(error);
      return;
    }

    alert("Noticia eliminada correctamente");
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      className="mt-2 rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700"
    >
      Eliminar
    </button>
  );
}
