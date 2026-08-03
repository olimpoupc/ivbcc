"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { removeStorageObjects } from "@/lib/storage";

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteLesson(
  id: string,
  courseId: string,
  materialUrl: string | null
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error: storageError } = await removeStorageObjects(supabase, [materialUrl]);
  if (storageError) {
    return { success: false, error: "No se pudo eliminar el material de la lección." };
  }

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) return { success: false, error: "No se pudo eliminar la lección." };

  revalidatePath(`/admin/formacion/${courseId}/lecciones`);
  return { success: true };
}
