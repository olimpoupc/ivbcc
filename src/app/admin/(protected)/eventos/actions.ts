"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { removeStorageObjects } from "@/lib/storage";

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteEvent(
  id: string,
  imageUrl: string | null
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error: storageError } = await removeStorageObjects(supabase, [imageUrl]);
  if (storageError) {
    return { success: false, error: "No se pudo eliminar la imagen del evento." };
  }

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { success: false, error: "No se pudo eliminar el evento." };

  revalidatePath("/admin/eventos");
  return { success: true };
}

export async function publishEvent(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", id);

  if (error) return { success: false, error: "No se pudo publicar el evento." };

  revalidatePath("/admin/eventos");
  return { success: true };
}
