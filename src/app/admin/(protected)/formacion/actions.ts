"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { removeStorageObjects } from "@/lib/storage";

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteCourse(
  id: string,
  imageUrl: string | null
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error: storageError } = await removeStorageObjects(supabase, [imageUrl]);
  if (storageError) {
    return { success: false, error: "No se pudo eliminar la imagen del curso." };
  }

  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) return { success: false, error: "No se pudo eliminar el curso." };

  revalidatePath("/admin/formacion");
  return { success: true };
}

export async function publishCourse(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("courses")
    .update({ status: "published" })
    .eq("id", id);

  if (error) return { success: false, error: "No se pudo publicar el curso." };

  revalidatePath("/admin/formacion");
  return { success: true };
}
