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

export default function DeleteEventButton({ id, imageUrl }: Props) {
  async function handleDelete() {
    const confirmDelete = confirm("¿Seguro que deseas eliminar este evento?");

    if (!confirmDelete) return;

    const imagePath = getStoragePathFromPublicUrl(imageUrl);

    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from("news-images")
        .remove([imagePath]);

      if (storageError) {
        alert("Error al eliminar la imagen del evento");
        console.error(storageError);
        return;
      }
    }

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar el evento");
      console.error(error);
      return;
    }

    alert("Evento eliminado correctamente");
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
