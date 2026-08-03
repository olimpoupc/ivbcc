"use server";

import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { renderContactReplyEmail } from "@/lib/email-templates";

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

export async function sendContactReply(
  messageId: string,
  values: { subject: string; body: string }
): Promise<ActionResult> {
  const { supabase, isAdmin, user } = await getAdminUser();
  if (!isAdmin || !user) return { success: false, error: "No autorizado." };

  const subject = values.subject.trim();
  const body = values.body.trim();
  if (!subject || !body) {
    return { success: false, error: "El asunto y el cuerpo del correo son obligatorios." };
  }

  const { data: message, error: fetchError } = await supabase
    .from("contact_messages")
    .select("email, full_name")
    .eq("id", messageId)
    .maybeSingle();

  if (fetchError || !message) {
    return { success: false, error: "No se encontró el mensaje original." };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return {
      success: false,
      error: "El envío de correos aún no está configurado (faltan variables de entorno).",
    };
  }

  const resend = new Resend(resendApiKey);
  const { data: sent, error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: message.email,
    replyTo: process.env.CONTACT_REPLY_TO_EMAIL || undefined,
    subject,
    html: renderContactReplyEmail({ recipientName: message.full_name, body }),
  });

  const { error: insertError } = await supabase.from("contact_message_replies").insert({
    contact_message_id: messageId,
    sent_by: user.id,
    sent_by_email: user.email,
    subject,
    body,
    status: sendError ? "failed" : "sent",
    provider_message_id: sent?.id ?? null,
    error_message: sendError?.message ?? null,
  });

  if (insertError) return { success: false, error: insertError.message };
  if (sendError) return { success: false, error: sendError.message };

  await supabase
    .from("contact_messages")
    .update({ status: "responded", responded_at: new Date().toISOString() })
    .eq("id", messageId);

  revalidatePath("/admin/contacto");
  return { success: true };
}
