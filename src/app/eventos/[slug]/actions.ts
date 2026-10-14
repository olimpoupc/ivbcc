"use server";

import { headers } from "next/headers";
import { renderEventConfirmationRequestEmail } from "@/lib/email-templates";
import { formatEventDate } from "@/lib/event-calendar";
import { sendEmail } from "@/lib/mailer";
import { generateToken, getConfirmationExpiry } from "@/lib/registration-token";
import { sanitizeText } from "@/lib/security";
import { siteUrl } from "@/lib/seo";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export type RegisterForEventInput = {
  eventId: string;
  fullName: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
};

export type RegisterForEventResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Respuesta ÚNICA para toda solicitud válida, exista o no el correo, esté
 * pendiente o ya confirmado: así el formulario no revela quién está inscrito.
 */
const REGISTRATION_ACCEPTED_MESSAGE =
  "Revisa tu correo para confirmar tu inscripción. El enlace vence en 48 horas.";

const GENERIC_ERROR = "No pudimos registrar tu inscripción. Inténtalo nuevamente.";
const EVENT_PASSED_ERROR =
  "Las inscripciones para este evento ya cerraron porque el evento ya comenzó o finalizó.";
const EVENT_CLOSED_ERROR = "Las inscripciones para este evento no están disponibles.";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Un reenvío del enlace por inscripción pendiente cada 10 minutos. */
const RESEND_COOLDOWN_SECONDS = 600;

type ServiceRoleClient = ReturnType<typeof createSupabaseServiceRoleClient>;

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return headerList.get("x-real-ip")?.trim() || "127.0.0.1";
}

async function rateLimitAllows(
  supabase: ServiceRoleClient,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Error al verificar límite de inscripciones:", error);
    return null;
  }
  return Boolean(data);
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
  const marketingConsent = input?.marketingConsent === true;

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

  // El INSERT público se cierra en la migración 2: solo el servidor inscribe.
  const supabase = createSupabaseServiceRoleClient();

  // 2. Límite por IP (además del límite por correo del disparador de la BD).
  const ip = await getClientIp();
  const allowed = await rateLimitAllows(supabase, `event_registration_ip:${ip}`, 10, 3600);
  if (allowed === null) return { success: false, error: GENERIC_ERROR };
  if (!allowed) {
    return {
      success: false,
      error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  // 3. Evento publicado, con inscripciones abiertas y futuro (service_role no
  //    pasa por RLS, así que estas reglas se comprueban aquí).
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,title,event_date,location,status,registration_enabled")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Error al consultar el evento para la inscripción:", eventError);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!event || event.status !== "published" || !event.registration_enabled) {
    return { success: false, error: EVENT_CLOSED_ERROR };
  }
  if (new Date(event.event_date).getTime() <= Date.now()) {
    return { success: false, error: EVENT_PASSED_ERROR };
  }

  // 4. ¿Ya existe una inscripción con este correo para el evento?
  const { data: existing, error: existingError } = await supabase
    .from("event_registrations")
    .select("id,status")
    .eq("event_id", event.id)
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    console.error("Error al buscar inscripción existente:", existingError);
    return { success: false, error: GENERIC_ERROR };
  }

  // Confirmada: no se reenvía nada (evita usar el formulario para enviar
  // correos a terceros) y se responde igual que siempre.
  if (existing?.status === "confirmed") {
    return { success: true, message: REGISTRATION_ACCEPTED_MESSAGE };
  }

  const { token, hash } = generateToken();
  const expiresAt = getConfirmationExpiry().toISOString();
  const consentFields = marketingConsent
    ? { marketing_consent: true, consent_at: new Date().toISOString() }
    : {};

  if (existing) {
    // Pendiente (o cancelada): nuevo enlace, como máximo uno cada 10 minutos.
    const canResend = await rateLimitAllows(
      supabase,
      `event_confirmation_resend:${existing.id}`,
      1,
      RESEND_COOLDOWN_SECONDS
    );
    if (!canResend) return { success: true, message: REGISTRATION_ACCEPTED_MESSAGE };

    const { error: updateError } = await supabase
      .from("event_registrations")
      .update({
        status: "pending",
        confirmation_token_hash: hash,
        confirmation_expires_at: expiresAt,
        ...consentFields,
      })
      .eq("id", existing.id)
      .neq("status", "confirmed");

    if (updateError) {
      console.error("Error al renovar el enlace de confirmación:", updateError);
      return { success: false, error: GENERIC_ERROR };
    }
  } else {
    const { error: insertError } = await supabase.from("event_registrations").insert({
      event_id: event.id,
      full_name: fullName,
      email,
      phone,
      status: "pending",
      confirmation_token_hash: hash,
      confirmation_expires_at: expiresAt,
      marketing_consent: marketingConsent,
      consent_at: marketingConsent ? new Date().toISOString() : null,
    });

    if (insertError) {
      // 23505: otra solicitud simultánea creó la fila; P0001: límite por
      // correo del disparador. En ambos casos se responde igual, sin revelar
      // nada sobre el correo, y no se envía otro enlace.
      if (insertError.code === "23505" || insertError.code === "P0001") {
        return { success: true, message: REGISTRATION_ACCEPTED_MESSAGE };
      }
      console.error("Error al registrar inscripción a evento:", insertError);
      return { success: false, error: GENERIC_ERROR };
    }
  }

  // 5. Correo con el enlace de confirmación. Si falla, la solicitud queda
  //    pendiente y la persona puede volver a enviarla para recibir otro enlace.
  await sendEmail(
    {
      to: email,
      subject: `Confirma tu inscripción: ${event.title}`,
      html: renderEventConfirmationRequestEmail({
        recipientName: fullName,
        eventTitle: event.title,
        eventDateLabel: formatEventDate(event.event_date),
        eventLocation: event.location,
        confirmUrl: `${siteUrl}/eventos/confirmar?token=${encodeURIComponent(token)}`,
      }),
    },
    "confirmación de inscripción a evento"
  );

  return { success: true, message: REGISTRATION_ACCEPTED_MESSAGE };
}
