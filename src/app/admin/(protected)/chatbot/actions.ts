"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";

export type ChatbotCategory =
  | "general"
  | "schedules"
  | "events"
  | "formation"
  | "live"
  | "location"
  | "contact"
  | "prayer"
  | "whatsapp";

export type ChatbotItemInput = {
  title: string;
  message: string;
  category: ChatbotCategory;
  button_text: string;
  button_url: string;
  order_index: number;
  is_active: boolean;
};

export type ActionResult = { success: true } | { success: false; error: string };

function buildPayload(input: ChatbotItemInput) {
  const title = input.title.trim();
  const message = input.message.trim();

  return { title, message, isValid: Boolean(title && message) };
}

export async function createChatbotItem(
  input: ChatbotItemInput
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { title, message, isValid } = buildPayload(input);
  if (!isValid) {
    return { success: false, error: "Título y mensaje son obligatorios." };
  }

  const { error } = await supabase.from("chatbot_items").insert({
    title,
    message,
    category: input.category,
    button_text: input.button_text.trim() || null,
    button_url: input.button_url.trim() || null,
    order_index: input.order_index,
    is_active: input.is_active,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/chatbot");
  return { success: true };
}

export async function updateChatbotItem(
  id: string,
  input: ChatbotItemInput
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { title, message, isValid } = buildPayload(input);
  if (!isValid) {
    return { success: false, error: "Título y mensaje son obligatorios." };
  }

  const { error } = await supabase
    .from("chatbot_items")
    .update({
      title,
      message,
      category: input.category,
      button_text: input.button_text.trim() || null,
      button_url: input.button_url.trim() || null,
      order_index: input.order_index,
      is_active: input.is_active,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/chatbot");
  return { success: true };
}

export async function toggleChatbotItem(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("chatbot_items")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/chatbot");
  return { success: true };
}

export async function deleteChatbotItem(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase.from("chatbot_items").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/chatbot");
  return { success: true };
}
