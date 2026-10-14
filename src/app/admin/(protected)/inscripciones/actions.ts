"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { isUuid } from "@/lib/admin-registrations";
import {
  renderEventConfirmationRequestEmail,
  renderEventRegistrationEmail,
} from "@/lib/email-templates";
import { buildCalendarLinks, formatEventDate } from "@/lib/event-calendar";
import { getMailerConfig, sendEmail } from "@/lib/mailer";
import { generateToken, getConfirmationExpiry } from "@/lib/registration-token";
import { siteUrl } from "@/lib/seo";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { setAttendance } from "../eventos/[id]/inscritos/actions";

export type RegistrationActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

type RegistrationWithEvent = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  events: {
    id: string;
    title: string;
    slug: string;
    event_date: string;
    location: string | null;
  } | null;
};

const NOT_ADMIN = "No tienes permisos de administrador.";
const INVALID = "La inscripción indicada no es válida.";
const NOT_FOUND = "No encontramos la inscripción. Recarga la página.";

function revalidate(eventId?: string) {
  revalidatePath("/admin/inscripciones");
  if (eventId) revalidatePath(`/admin/eventos/${eventId}/inscritos`);
}

/**
 * Comprueba la sesión de administrador ANTES de crear el cliente
 * service_role: ninguna escritura ocurre sin pasar por aquí.
 */
async function requireAdmin(registrationId: string) {
  const { user, isAdmin } = await getAdminUser();
  if (!isAdmin || !user) return { ok: false, error: NOT_ADMIN } as const;
  if (!isUuid(registrationId)) return { ok: false, error: INVALID } as const;
  return { ok: true, user, supabase: createSupabaseServiceRoleClient() } as const;
}

async function loadRegistration(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  registrationId: string
) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("id,event_id,full_name,email,phone,status,events(id,title,slug,event_date,location)")
    .eq("id", registrationId)
    .maybeSingle();
  if (error) throw error;
  return data as RegistrationWithEvent | null;
}

function isPastEvent(eventDate: string) {
  return new Date(eventDate).getTime() <= Date.now();
}

/** a) Nuevo enlace de confirmación (solo pendientes): token nuevo y 48 h más. */
export async function resendConfirmationLink(registrationId: string): Promise<RegistrationActionResult> {
  try {
    const auth = await requireAdmin(registrationId);
    if (!auth.ok) return { success: false, error: auth.error };
    const { supabase } = auth;

    const registration = await loadRegistration(supabase, registrationId);
    if (!registration?.events) return { success: false, error: NOT_FOUND };
    if (registration.status !== "pending") {
      return { success: false, error: "Solo se reenvía el enlace a inscripciones pendientes." };
    }
    const event = registration.events;
    if (isPastEvent(event.event_date)) {
      return { success: false, error: "El evento ya comenzó o terminó; el enlace no serviría." };
    }
    if (!getMailerConfig()) {
      return { success: false, error: "El envío de correos no está configurado (Resend)." };
    }

    const { token, hash } = generateToken();
    const { data: updated, error } = await supabase
      .from("event_registrations")
      .update({
        confirmation_token_hash: hash,
        confirmation_expires_at: getConfirmationExpiry().toISOString(),
      })
      .eq("id", registration.id)
      .eq("status", "pending")
      .select("id");
    if (error) throw error;
    if (!updated?.length) return { success: false, error: NOT_FOUND };

    const sent = await sendEmail(
      {
        to: registration.email,
        subject: `Confirma tu inscripción: ${event.title}`,
        html: renderEventConfirmationRequestEmail({
          recipientName: registration.full_name,
          eventTitle: event.title,
          eventDateLabel: formatEventDate(event.event_date),
          eventLocation: event.location,
          confirmUrl: `${siteUrl}/eventos/confirmar?token=${encodeURIComponent(token)}`,
        }),
      },
      "reenvío del enlace de confirmación (admin)"
    );

    revalidate(registration.event_id);
    return sent.ok
      ? { success: true, message: `Enviamos un enlace nuevo a ${registration.email}. Vence en 48 horas.` }
      : {
          success: false,
          error: "El enlace se renovó, pero el correo no se pudo enviar. Revisa la configuración de Resend.",
        };
  } catch (error) {
    console.error("Error al reenviar el enlace de confirmación:", error);
    return { success: false, error: "No fue posible reenviar el enlace." };
  }
}

/** b) Confirmación manual (solo pendientes) y correo de inscripción confirmada. */
export async function confirmRegistrationManually(
  registrationId: string
): Promise<RegistrationActionResult> {
  try {
    const auth = await requireAdmin(registrationId);
    if (!auth.ok) return { success: false, error: auth.error };
    const { supabase } = auth;

    const registration = await loadRegistration(supabase, registrationId);
    if (!registration?.events) return { success: false, error: NOT_FOUND };
    if (registration.status !== "pending") {
      return { success: false, error: "Solo se confirman manualmente inscripciones pendientes." };
    }

    const { data: updated, error } = await supabase
      .from("event_registrations")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmation_token_hash: null,
        confirmation_expires_at: null,
      })
      .eq("id", registration.id)
      .eq("status", "pending")
      .select("id");
    if (error) throw error;
    if (!updated?.length) return { success: false, error: NOT_FOUND };

    revalidate(registration.event_id);

    const event = registration.events;
    // Para un evento que ya pasó no tiene sentido "Agendar evento".
    if (isPastEvent(event.event_date)) {
      return { success: true, message: "Inscripción confirmada. No se envió correo porque el evento ya pasó." };
    }

    const eventUrl = `${siteUrl}/eventos/${encodeURIComponent(event.slug)}`;
    const sent = await sendEmail(
      {
        to: registration.email,
        subject: `Inscripción confirmada: ${event.title}`,
        html: renderEventRegistrationEmail({
          recipientName: registration.full_name,
          eventTitle: event.title,
          eventDateLabel: formatEventDate(event.event_date),
          eventLocation: event.location,
          eventUrl,
          email: registration.email,
          phone: registration.phone || "",
          calendarLinks: buildCalendarLinks(
            {
              id: event.id,
              title: event.title,
              startsAt: event.event_date,
              location: event.location,
              eventUrl,
            },
            siteUrl
          ),
        }),
      },
      "inscripción confirmada (admin)"
    );

    return sent.ok
      ? { success: true, message: `Inscripción confirmada y correo enviado a ${registration.email}.` }
      : { success: true, message: "Inscripción confirmada, pero no se pudo enviar el correo." };
  } catch (error) {
    console.error("Error al confirmar manualmente la inscripción:", error);
    return { success: false, error: "No fue posible confirmar la inscripción." };
  }
}

/**
 * c) Cancelar (pendiente o confirmada). Se conserva la fila: si la persona se
 * vuelve a inscribir, registerForEvent la reactiva como pendiente con un token
 * nuevo, sin chocar con UNIQUE(event_id, email).
 */
export async function cancelRegistration(registrationId: string): Promise<RegistrationActionResult> {
  try {
    const auth = await requireAdmin(registrationId);
    if (!auth.ok) return { success: false, error: auth.error };
    const { supabase } = auth;

    const { data: updated, error } = await supabase
      .from("event_registrations")
      .update({
        status: "cancelled",
        // La asistencia exige estado confirmado y el enlace pendiente deja de servir.
        checked_in_at: null,
        checked_in_by: null,
        confirmation_token_hash: null,
        confirmation_expires_at: null,
      })
      .eq("id", registrationId)
      .in("status", ["pending", "confirmed"])
      .select("id,event_id");
    if (error) throw error;
    if (!updated?.length) {
      return { success: false, error: "Solo se cancelan inscripciones pendientes o confirmadas." };
    }

    revalidate(updated[0].event_id as string);
    return { success: true, message: "Inscripción cancelada." };
  } catch (error) {
    console.error("Error al cancelar la inscripción:", error);
    return { success: false, error: "No fue posible cancelar la inscripción." };
  }
}

/** d) Eliminar definitivamente la inscripción. */
export async function deleteRegistration(registrationId: string): Promise<RegistrationActionResult> {
  try {
    const auth = await requireAdmin(registrationId);
    if (!auth.ok) return { success: false, error: auth.error };
    const { supabase } = auth;

    const { data: deleted, error } = await supabase
      .from("event_registrations")
      .delete()
      .eq("id", registrationId)
      .select("id,event_id");
    if (error) throw error;
    if (!deleted?.length) return { success: false, error: NOT_FOUND };

    revalidate(deleted[0].event_id as string);
    return { success: true, message: "Inscripción eliminada." };
  } catch (error) {
    console.error("Error al eliminar la inscripción:", error);
    return { success: false, error: "No fue posible eliminar la inscripción." };
  }
}

/** e) Asistencia: reutiliza setAttendance (que también valida al administrador). */
export async function toggleRegistrationAttendance(
  eventId: string,
  registrationId: string,
  attended: boolean
): Promise<RegistrationActionResult> {
  const { user, isAdmin } = await getAdminUser();
  if (!isAdmin || !user) return { success: false, error: NOT_ADMIN };

  const result = await setAttendance(eventId, registrationId, attended);
  if (!result.success) return result;
  revalidate(eventId);
  return { success: true, message: attended ? "Asistencia registrada." : "Asistencia deshecha." };
}
