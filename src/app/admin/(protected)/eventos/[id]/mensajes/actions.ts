"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { renderEventBroadcastEmail } from "@/lib/email-templates";
import {
  checkDailyQuota,
  chunk,
  selectBroadcastRecipients,
  startOfUtcDay,
  validateBroadcastInput,
  type BroadcastCandidate,
} from "@/lib/event-broadcast";
import { getMailerConfig, sendEmail, sendEmailBatch } from "@/lib/mailer";
import { deriveUnsubscribeToken, getEmailLinkSecret, hashToken } from "@/lib/registration-token";
import { siteUrl } from "@/lib/seo";

export type BroadcastActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

type AdminSupabase = Awaited<ReturnType<typeof getAdminUser>>["supabase"];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unsubscribeUrl(token: string) {
  return `${siteUrl}/correos/baja?token=${encodeURIComponent(token)}`;
}

/**
 * Destinatarios del evento, leídos con la sesión del administrador (RLS):
 * confirmados con consentimiento y sin baja.
 */
async function loadRecipients(supabase: AdminSupabase, eventId: string) {
  const { data: registrations, error } = await supabase
    .from("event_registrations")
    .select("id,email,full_name,status,marketing_consent,unsubscribe_token_hash")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .eq("marketing_consent", true);
  if (error) throw error;

  const emails = (registrations || []).map((row) => row.email.toLowerCase());
  const { data: suppressions, error: suppressionsError } = emails.length
    ? await supabase.from("email_suppressions").select("email").in("email", emails)
    : { data: [], error: null };
  if (suppressionsError) throw suppressionsError;

  const recipients = selectBroadcastRecipients(
    (registrations || []) as BroadcastCandidate[],
    (suppressions || []).map((row) => row.email as string)
  );
  const hashById = new Map(
    (registrations || []).map((row) => [row.id as string, row.unsubscribe_token_hash as string | null])
  );
  return { recipients, hashById };
}

async function sentTodayCount(supabase: AdminSupabase) {
  const { data, error } = await supabase
    .from("event_broadcasts")
    .select("sent_count")
    .gte("created_at", startOfUtcDay().toISOString());
  if (error) throw error;
  return (data || []).reduce((total, row) => total + (Number(row.sent_count) || 0), 0);
}

async function loadEvent(supabase: AdminSupabase, eventId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,slug")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Envía el mensaje solo al correo del administrador, para revisarlo. */
export async function sendBroadcastTest(
  eventId: string,
  subject: string,
  body: string
): Promise<BroadcastActionResult> {
  try {
    const { supabase, user, isAdmin } = await getAdminUser();
    if (!isAdmin || !user?.email) return { success: false, error: "No tienes permisos de administrador." };
    if (!UUID_PATTERN.test(eventId)) return { success: false, error: "El evento no es válido." };
    const invalid = validateBroadcastInput(subject, body);
    if (invalid) return { success: false, error: invalid };
    if (!getMailerConfig()) {
      return { success: false, error: "El envío de correos no está configurado (Resend)." };
    }

    const event = await loadEvent(supabase, eventId);
    if (!event) return { success: false, error: "Evento no encontrado." };

    const result = await sendEmail(
      {
        to: user.email,
        subject: `[Prueba] ${subject.trim()}`,
        html: renderEventBroadcastEmail({
          recipientName: "Administrador",
          eventTitle: event.title,
          eventUrl: `${siteUrl}/eventos/${encodeURIComponent(event.slug)}`,
          body: body.trim(),
          unsubscribeUrl: unsubscribeUrl("enlace-de-prueba"),
        }),
      },
      "mensaje de prueba a inscritos"
    );

    return result.ok
      ? { success: true, message: `Enviamos la prueba a ${user.email}.` }
      : { success: false, error: "No fue posible enviar la prueba. Revisa la configuración de Resend." };
  } catch (error) {
    console.error("Error al enviar el mensaje de prueba:", error);
    return { success: false, error: "No fue posible enviar la prueba." };
  }
}

/** Envía el mensaje a los inscritos confirmados con consentimiento y sin baja. */
export async function sendEventBroadcast(
  eventId: string,
  subject: string,
  body: string
): Promise<BroadcastActionResult> {
  try {
    const { supabase, user, isAdmin } = await getAdminUser();
    if (!isAdmin || !user) return { success: false, error: "No tienes permisos de administrador." };
    if (!UUID_PATTERN.test(eventId)) return { success: false, error: "El evento no es válido." };
    const invalid = validateBroadcastInput(subject, body);
    if (invalid) return { success: false, error: invalid };

    const secret = getEmailLinkSecret();
    if (!secret) {
      console.error("[correo] Falta EMAIL_LINK_SECRET (mínimo 32 caracteres) para los enlaces de baja.");
      return {
        success: false,
        error: "El envío masivo no está configurado: falta el secreto de los enlaces de baja.",
      };
    }
    if (!getMailerConfig()) {
      return { success: false, error: "El envío de correos no está configurado (Resend)." };
    }

    const event = await loadEvent(supabase, eventId);
    if (!event) return { success: false, error: "Evento no encontrado." };

    const { recipients, hashById } = await loadRecipients(supabase, eventId);
    if (!recipients.length) {
      return { success: false, error: "No hay destinatarios: ningún confirmado aceptó comunicaciones." };
    }

    const quota = checkDailyQuota(await sentTodayCount(supabase), recipients.length);
    if (quota.exceeds) {
      return {
        success: false,
        error: `El envío supera el tope diario de Resend: quedan ${quota.remaining} correos hoy y hay ${recipients.length} destinatarios. Intenta mañana (el tope se reinicia a medianoche UTC) o revisa el plan.`,
      };
    }

    const { data: broadcast, error: broadcastError } = await supabase
      .from("event_broadcasts")
      .insert({
        event_id: event.id,
        subject: subject.trim(),
        body: body.trim(),
        created_by: user.id,
        recipients_count: recipients.length,
      })
      .select("id")
      .single();
    if (broadcastError || !broadcast) {
      console.error("Error al registrar el mensaje:", broadcastError);
      return { success: false, error: "No fue posible registrar el envío." };
    }

    const eventUrl = `${siteUrl}/eventos/${encodeURIComponent(event.slug)}`;
    let sent = 0;
    let failed = 0;

    for (const batch of chunk(recipients)) {
      const items = [];
      for (const recipient of batch) {
        const token = deriveUnsubscribeToken(recipient.id, secret);
        const hash = hashToken(token);
        // Solo se guarda el hash; es estable, así que basta escribirlo una vez.
        if (hashById.get(recipient.id) !== hash) {
          const { error } = await supabase
            .from("event_registrations")
            .update({ unsubscribe_token_hash: hash })
            .eq("id", recipient.id);
          if (error) {
            console.error("No se pudo guardar el enlace de baja:", error);
            failed += 1;
            continue;
          }
        }
        const link = unsubscribeUrl(token);
        items.push({
          to: recipient.email,
          subject: subject.trim(),
          html: renderEventBroadcastEmail({
            recipientName: recipient.full_name,
            eventTitle: event.title,
            eventUrl,
            body: body.trim(),
            unsubscribeUrl: link,
          }),
          headers: { "List-Unsubscribe": `<${link}>` },
        });
      }

      const result = await sendEmailBatch(items, "mensaje a inscritos");
      sent += result.sent;
      failed += result.failed;
    }

    const { error: updateError } = await supabase
      .from("event_broadcasts")
      .update({ sent_count: sent, failed_count: failed })
      .eq("id", broadcast.id);
    if (updateError) console.error("Error al guardar el resultado del envío:", updateError);

    revalidatePath(`/admin/eventos/${eventId}/mensajes`);
    return failed
      ? {
          success: true,
          message: `Enviados: ${sent}. Fallidos: ${failed}. Revisa los registros del servidor para ver el detalle.`,
        }
      : { success: true, message: `Mensaje enviado a ${sent} inscritos.` };
  } catch (error) {
    console.error("Error inesperado al enviar el mensaje a inscritos:", error);
    return { success: false, error: "No fue posible enviar el mensaje." };
  }
}
