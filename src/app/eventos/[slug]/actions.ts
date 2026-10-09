"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { renderEventRegistrationEmail } from "@/lib/email-templates";
import { buildCalendarLinks, type CalendarLinks } from "@/lib/event-calendar";
import { sanitizeText } from "@/lib/security";
import { siteUrl } from "@/lib/seo";
import { createSupabasePublicClient } from "@/lib/supabase-server";
import { getUserFacingErrorMessage } from "@/lib/user-facing-error";

export type RegisterForEventInput = {
  eventId: string;
  fullName: string;
  email: string;
  phone: string;
};

export type RegisterForEventResult =
  | { success: true; emailSent: boolean; calendarLinks: CalendarLinks }
  | { success: false; error: string; alreadyRegistered?: boolean };

const GENERIC_ERROR = "No pudimos registrar tu inscripción. Inténtalo nuevamente.";
const EVENT_PASSED_ERROR =
  "Las inscripciones para este evento ya cerraron porque el evento ya comenzó o finalizó.";
const EVENT_CLOSED_ERROR = "Las inscripciones para este evento ya no están disponibles.";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return headerList.get("x-real-ip")?.trim() || "127.0.0.1";
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export async function registerForEvent(
  input: RegisterForEventInput
): Promise<RegisterForEventResult> {
  try {
    return await registerForEventUnsafe(input);
  } catch (error) {
    console.error("Error inesperado al registrar inscripción a evento:", error);
    return { success: false, error: GENERIC_ERROR };
  }
}

async function registerForEventUnsafe(
  input: RegisterForEventInput
): Promise<RegisterForEventResult> {
  // 1. Validar en el servidor (el cliente puede ser manipulado)
  const eventId = String(input?.eventId || "");
  const fullName = sanitizeText(String(input?.fullName || ""), 120);
  const email = sanitizeText(String(input?.email || ""), 254).toLowerCase();
  const phone = String(input?.phone || "").replace(/\D/g, "");

  if (!UUID_PATTERN.test(eventId)) {
    return { success: false, error: "El evento no es válido." };
  }
  if (!fullName) {
    return { success: false, error: "Ingresa tu nombre completo." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: "Ingresa un correo valido, por ejemplo usuario@gmail.com." };
  }
  if (phone.length !== 10) {
    return { success: false, error: "El teléfono debe tener exactamente 10 dígitos." };
  }

  // Cliente anónimo: la inserción sigue sujeta a RLS, sin service_role.
  const supabase = createSupabasePublicClient();

  // 2. Límite por IP (además del límite por correo que aplica la base de
  //    datos). Evita que se use el formulario para enviar correos masivos.
  const ip = await getClientIp();
  const { data: allowed, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
    p_key: `event_registration_ip:${ip}`,
    p_limit: 10,
    p_window_seconds: 3600,
  });
  if (rateLimitError) {
    console.error("Error al verificar límite de inscripciones:", rateLimitError);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!allowed) {
    return {
      success: false,
      error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  // 3. El evento debe existir, estar publicado y con inscripciones abiertas.
  //    También nos da los datos reales para el correo (no se confía en el cliente).
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,title,slug,event_date,location,status,registration_enabled")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Error al consultar el evento para la inscripción:", eventError);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!event || event.status !== "published" || !event.registration_enabled) {
    return { success: false, error: "Las inscripciones para este evento no están disponibles." };
  }

  // Misma regla que la política RLS: no se aceptan inscripciones una vez
  // que llega la fecha y hora de inicio del evento.
  if (new Date(event.event_date).getTime() <= Date.now()) {
    return { success: false, error: EVENT_PASSED_ERROR };
  }

  // 4. Insertar (sin .select(): los visitantes no pueden leer inscripciones)
  const { error: insertError } = await supabase.from("event_registrations").insert({
    event_id: event.id,
    full_name: fullName,
    email,
    phone,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        success: false,
        error: "Ya estás inscrito en este evento.",
        alreadyRegistered: true,
      };
    }
    // 42501 = la política RLS rechazó la fila (p. ej. el evento empezó o se
    // cerró justo entre la validación y la inserción).
    if (insertError.code === "42501") {
      return { success: false, error: EVENT_CLOSED_ERROR };
    }
    console.error("Error al registrar inscripción a evento:", insertError);
    // P0001 = límite por correo de la base; solo se muestran mensajes conocidos.
    return { success: false, error: getUserFacingErrorMessage(insertError, GENERIC_ERROR) };
  }

  // 5. Enlaces "Agregar al calendario": se usan en el correo y en la pantalla.
  const eventUrl = `${siteUrl}/eventos/${encodeURIComponent(event.slug)}`;
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

  // 6. Correo de confirmación. Si falla, la inscripción ya quedó guardada:
  //    no se reporta como error al usuario, solo se registra en el servidor.
  const emailSent = await sendConfirmationEmail({
    to: email,
    recipientName: fullName,
    phone,
    event,
    eventUrl,
    calendarLinks,
  });

  return { success: true, emailSent, calendarLinks };
}

async function sendConfirmationEmail({
  to,
  recipientName,
  phone,
  event,
  eventUrl,
  calendarLinks,
}: {
  to: string;
  recipientName: string;
  phone: string;
  event: { title: string; event_date: string; location: string | null };
  eventUrl: string;
  calendarLinks: CalendarLinks;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EVENTS_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error(
      "[eventos] No se envió el correo de confirmación: falta RESEND_API_KEY o EVENTS_FROM_EMAIL/CONTACT_FROM_EMAIL."
    );
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: process.env.CONTACT_REPLY_TO_EMAIL || undefined,
      subject: `Inscripción confirmada: ${event.title}`,
      html: renderEventRegistrationEmail({
        recipientName,
        eventTitle: event.title,
        eventDateLabel: formatEventDate(event.event_date),
        eventLocation: event.location,
        eventUrl,
        email: to,
        phone,
        calendarLinks,
      }),
    });

    if (error) {
      console.error("Resend rechazó el correo de confirmación de evento:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error al enviar el correo de confirmación de evento:", error);
    return false;
  }
}
