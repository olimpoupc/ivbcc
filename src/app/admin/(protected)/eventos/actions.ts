"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { removeStorageObjects } from "@/lib/storage";
import { renderEventChangeEmail } from "@/lib/email-templates";
import { checkDailyQuota, chunk, startOfUtcDay } from "@/lib/event-broadcast";
import { buildCalendarLinks } from "@/lib/event-calendar";
import { diffEventChanges, isCancelled, summarizeEventChanges, type EventSnapshot } from "@/lib/event-change";
import { getMailerConfig, sendEmailBatch } from "@/lib/mailer";
import { siteUrl } from "@/lib/seo";

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

export type NotifyEventChangeResult =
  | { success: true; message: string }
  | { success: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_STATUSES = ["draft", "published", "scheduled", "cancelled"];

function sanitizePrevious(previous: EventSnapshot): EventSnapshot {
  const date = typeof previous?.event_date === "string" ? previous.event_date : null;
  return {
    event_date: date && !Number.isNaN(new Date(date).getTime()) ? date : null,
    location: typeof previous?.location === "string" ? previous.location.slice(0, 300) : null,
    status: EVENT_STATUSES.includes(String(previous?.status)) ? String(previous.status) : null,
  };
}

/**
 * Avisa por correo a los inscritos CONFIRMADOS de un cambio de fecha/hora,
 * lugar o de la cancelación del evento. Es un aviso de servicio: no exige
 * marketing_consent, pero respeta las bajas (email_suppressions), porque la
 * página de baja promete no enviar más mensajes sobre eventos.
 *
 * El estado NUEVO se lee de la base de datos; `previous` (lo que el editor
 * cargó antes de guardar) solo se usa para mostrar "anterior -> nuevo" y se
 * valida aquí. Si no hay cambios reales, no se envía nada.
 */
export async function notifyEventChange(
  eventId: string,
  previous: EventSnapshot
): Promise<NotifyEventChangeResult> {
  try {
    const { supabase, user, isAdmin } = await getAdminUser();
    if (!isAdmin || !user) return { success: false, error: "No tienes permisos de administrador." };
    if (!UUID_PATTERN.test(eventId)) return { success: false, error: "El evento no es válido." };
    if (!getMailerConfig()) {
      return { success: false, error: "El envío de correos no está configurado (Resend)." };
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,title,slug,event_date,location,status")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError || !event) return { success: false, error: "Evento no encontrado." };

    const changes = diffEventChanges(sanitizePrevious(previous), event);
    if (!changes.length) {
      return { success: true, message: "No hubo cambios de fecha, lugar o estado: no se envió ningún aviso." };
    }

    // Destinatarios: inscritos confirmados del evento, sin baja.
    const { data: registrations, error: registrationsError } = await supabase
      .from("event_registrations")
      .select("email,full_name")
      .eq("event_id", event.id)
      .eq("status", "confirmed");
    if (registrationsError) throw registrationsError;

    const emails = Array.from(new Set((registrations || []).map((row) => row.email.toLowerCase())));
    const { data: suppressions, error: suppressionsError } = emails.length
      ? await supabase.from("email_suppressions").select("email").in("email", emails)
      : { data: [], error: null };
    if (suppressionsError) throw suppressionsError;

    const suppressed = new Set((suppressions || []).map((row) => String(row.email)));
    const seen = new Set<string>();
    const recipients = (registrations || []).filter((row) => {
      const email = row.email.toLowerCase();
      if (suppressed.has(email) || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
    if (!recipients.length) {
      return { success: true, message: "No hay inscritos confirmados a quienes avisar." };
    }

    // Mismo tope diario de Resend que el envío masivo: si no alcanza, no se
    // envía nada.
    const { data: today, error: todayError } = await supabase
      .from("event_broadcasts")
      .select("sent_count")
      .gte("created_at", startOfUtcDay().toISOString());
    if (todayError) throw todayError;
    const sentToday = (today || []).reduce((total, row) => total + (Number(row.sent_count) || 0), 0);
    const quota = checkDailyQuota(sentToday, recipients.length);
    if (quota.exceeds) {
      return {
        success: false,
        error: `No se envió ningún aviso: hay ${recipients.length} inscritos confirmados y solo quedan ${quota.remaining} envíos hoy según el tope diario de Resend (se reinicia a medianoche UTC). Puedes avisar mañana desde «Mensajes a inscritos».`,
      };
    }

    const cancelled = isCancelled(event);
    const eventUrl = `${siteUrl}/eventos/${encodeURIComponent(event.slug)}`;
    const calendarLinks = cancelled
      ? null
      : buildCalendarLinks(
          { id: event.id, title: event.title, startsAt: event.event_date, location: event.location, eventUrl },
          siteUrl
        );
    const subject = cancelled
      ? `Evento cancelado: ${event.title}`
      : `Cambio en el evento ${event.title}`;
    const summary = summarizeEventChanges(changes);

    const { data: broadcast, error: broadcastError } = await supabase
      .from("event_broadcasts")
      .insert({
        event_id: event.id,
        subject: `Cambio: ${summary}`.slice(0, 200),
        body: `${subject}

${summary}`,
        created_by: user.id,
        recipients_count: recipients.length,
      })
      .select("id")
      .single();
    if (broadcastError || !broadcast) {
      console.error("Error al registrar el aviso de cambio:", broadcastError);
      return { success: false, error: "No fue posible registrar el aviso." };
    }

    let sent = 0;
    let failed = 0;
    for (const batch of chunk(recipients)) {
      const result = await sendEmailBatch(
        batch.map((recipient) => ({
          to: recipient.email,
          subject,
          html: renderEventChangeEmail({
            recipientName: recipient.full_name,
            eventTitle: event.title,
            changes,
            cancelled,
            eventUrl,
            calendarLinks,
            eventsUrl: `${siteUrl}/eventos`,
          }),
        })),
        "aviso de cambio de evento"
      );
      sent += result.sent;
      failed += result.failed;
    }

    const { error: updateError } = await supabase
      .from("event_broadcasts")
      .update({ sent_count: sent, failed_count: failed })
      .eq("id", broadcast.id);
    if (updateError) console.error("Error al guardar el resultado del aviso:", updateError);

    revalidatePath(`/admin/eventos/${event.id}/mensajes`);
    return failed
      ? { success: true, message: `Aviso enviado a ${sent} inscritos; ${failed} fallaron.` }
      : { success: true, message: `Aviso enviado a ${sent} inscritos confirmados.` };
  } catch (error) {
    console.error("Error inesperado al avisar el cambio del evento:", error);
    return { success: false, error: "No fue posible enviar el aviso." };
  }
}
