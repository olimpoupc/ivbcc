"use client";

import { supabase } from "@/lib/supabase";

type Props = {
  id: string;
  imageUrl?: string | null;
  fileUrl?: string | null;
};

function getStoragePathFromPublicUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;

  try {
    const url = new URL(fileUrl);
    const marker = "/storage/v1/object/public/news-images/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export default function DeletePublicationButton({
  id,
  imageUrl,
  fileUrl,
}: Props) {
  async function handleDelete() {
    const confirmDelete = confirm(
      "¿Seguro que deseas eliminar esta publicación?"
    );

    if (!confirmDelete) return;

    const storagePaths = [imageUrl, fileUrl]
      .map((value) => getStoragePathFromPublicUrl(value))
      .filter(Boolean) as string[];

    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage
        .from("news-images")
        .remove(storagePaths);

      if (storageError) {
        alert(storageError.message || "Error al eliminar archivos");
        console.error(storageError);
        return;
      }
    }

    const { error } = await supabase
      .from("publications")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message || "Error al eliminar la publicación");
      console.error(error);
      return;
    }

    alert("Publicación eliminada correctamente");
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
