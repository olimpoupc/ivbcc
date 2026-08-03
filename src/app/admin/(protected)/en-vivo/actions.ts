"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteLiveStream(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase.from("live_streams").delete().eq("id", id);
  if (error) return { success: false, error: "No se pudo eliminar la transmisión." };

  revalidatePath("/admin/en-vivo");
  return { success: true };
}

export async function publishLiveStream(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("live_streams")
    .update({ status: "published" })
    .eq("id", id);

  if (error) return { success: false, error: "No se pudo publicar la transmisión." };

  revalidatePath("/admin/en-vivo");
  return { success: true };
}
