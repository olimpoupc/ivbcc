"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { removeStorageObjects } from "@/lib/storage";

export type ActionResult = { success: true } | { success: false; error: string };

export async function deletePublication(
  id: string,
  imageUrl: string | null,
  fileUrl: string | null
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error: storageError } = await removeStorageObjects(supabase, [
    imageUrl,
    fileUrl,
  ]);
  if (storageError) {
    return { success: false, error: "No se pudo eliminar los archivos de la publicación." };
  }

  const { error } = await supabase.from("publications").delete().eq("id", id);
  if (error) return { success: false, error: "No se pudo eliminar la publicación." };

  revalidatePath("/admin/publicaciones");
  return { success: true };
}

export async function publishPublication(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("publications")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false, error: "No se pudo publicar la publicación." };

  revalidatePath("/admin/publicaciones");
  return { success: true };
}
