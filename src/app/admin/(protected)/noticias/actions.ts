"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { removeStorageObjects } from "@/lib/storage";

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteNews(
  id: string,
  imageUrl: string | null
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error: storageError } = await removeStorageObjects(supabase, [imageUrl]);
  if (storageError) {
    return { success: false, error: "No se pudo eliminar la imagen de la noticia." };
  }

  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) return { success: false, error: "No se pudo eliminar la noticia." };

  revalidatePath("/admin/noticias");
  return { success: true };
}

export async function publishNews(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("news")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: "No se pudo publicar la noticia." };

  revalidatePath("/admin/noticias");
  return { success: true };
}
