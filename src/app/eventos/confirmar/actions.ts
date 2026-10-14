"use server";

import { renderEventRegistrationEmail } from "@/lib/email-templates";
import {
  buildCalendarLinks,
  formatEventDate,
  type CalendarLinks,
} from "@/lib/event-calendar";
import { sendEmail } from "@/lib/mailer";
import { hashToken, isTokenExpired, isWellFormedToken } from "@/lib/registration-token";
import { siteUrl } from "@/lib/seo";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export type ConfirmRegistrationResult =
  | {
      success: true;
      eventTitle: string;
      eventUrl: string;
      calendarLinks: CalendarLinks;
      emailSent: boolean;
    }
  | { success: false; error: string; eventUrl?: string };

const INVALID_LINK_ERROR =
  "Este enlace no es válido o ya fue usado. Si ya confirmaste, tu inscripción está lista.";
const GENERIC_ERROR = "No pudimos confirmar tu inscripción. Inténtalo nuevamente.";

type RegistrationWithEvent = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  confirmation_expires_at: string | null;
  events: {
    id: string;
    title: string;
    slug: string;
    event_date: string;
    location: string | null;
    status: string;
  } | null;
};

/**
 * Confirma por POST (Server Action), nunca por GET: los escáneres de enlaces
 * de los proveedores de correo abren las URL y no deben confirmar solos.
 */
export async function confirmEventRegistration(
  token: string
): Promise<ConfirmRegistrationResult> {
  try {
    if (!isWellFormedToken(token)) return { success: false, error: INVALID_LINK_ERROR };

    const supabase = createSupabaseServiceRoleClient();
    const hash = hashToken(token);

    const { data, error } = await supabase
      .from("event_registrations")
      .select(
        "id,full_name,email,phone,status,confirmation_expires_at,events(id,title,slug,event_date,location,status)"
      )
      .eq("confirmation_token_hash", hash)
      .maybeSingle();

    if (error) {
      console.error("Error al buscar la inscripción por token:", error);
      return { success: false, error: GENERIC_ERROR };
    }

    const registration = data as RegistrationWithEvent | null;
    if (!registration || registration.status !== "pending" || !registration.events) {
      return { success: false, error: INVALID_LINK_ERROR };
    }

    const event = registration.events;
    const eventUrl = `${siteUrl}/eventos/${encodeURIComponent(event.slug)}`;

    if (isTokenExpired(registration.confirmation_expires_at)) {
      return {
        success: false,
        error:
          "Este enlace venció. Vuelve a inscribirte desde la página del evento para recibir uno nuevo.",
        eventUrl,
      };
    }
    if (event.status !== "published" || new Date(event.event_date).getTime() <= Date.now()) {
      return {
        success: false,
        error: "Este evento ya comenzó o no está disponible, así que no es posible confirmar.",
        eventUrl,
      };
    }

    // Un solo uso: se borra el hash en la misma actualización que confirma.
    const { data: updated, error: updateError } = await supabase
      .from("event_registrations")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmation_token_hash: null,
        confirmation_expires_at: null,
      })
      .eq("id", registration.id)
      .eq("confirmation_token_hash", hash)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      console.error("Error al confirmar la inscripción:", updateError);
      return { success: false, error: GENERIC_ERROR };
    }
    if (!updated?.length) return { success: false, error: INVALID_LINK_ERROR };

    const calendarLinks = buildCalendarLinks(
      {
        id: event.id,
        title: event.title,
        startsAt: event.event_date,
        location: event.location,
        eventUrl,
      },
      siteUrl
    );

    // Correo de inscripción confirmada con "Agendar evento". Si falla, la
    // confirmación ya quedó guardada.
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
          calendarLinks,
        }),
      },
      "inscripción confirmada"
    );

    return {
      success: true,
      eventTitle: event.title,
      eventUrl,
      calendarLinks,
      emailSent: sent.ok,
    };
  } catch (error) {
    console.error("Error inesperado al confirmar la inscripción:", error);
    return { success: false, error: GENERIC_ERROR };
  }
}
