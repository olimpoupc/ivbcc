"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";

export type ActionResult = { success: true } | { success: false; error: string };

type MessageStatus = "pending" | "read" | "responded" | "archived";

export async function updateContactMessage(
  id: string,
  values: Partial<{
    status: MessageStatus;
    admin_response: string;
    responded_at: string | null;
  }>
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("contact_messages")
    .update(values)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/contacto");
  return { success: true };
}

export async function deleteContactMessage(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase.from("contact_messages").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/contacto");
  return { success: true };
}
