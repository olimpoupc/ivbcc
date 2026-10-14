/**
 * SERVER-ONLY: inscripciones a eventos del usuario con sesión.
 *
 * Usa service_role porque event_registrations no es legible por usuarios
 * (RLS solo admin), así que SIEMPRE filtra por el correo de la propia sesión
 * y solo si ese correo está verificado (email_confirmed_at no nulo): nunca
 * acepta un correo enviado por el cliente.
 */

import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export type SessionRegistrationStatus = "pending" | "confirmed";

function verifiedSessionEmail(user: User | null | undefined): string | null {
  if (!user?.email || !user.email_confirmed_at) return null;
  return user.email.trim().toLowerCase();
}

/** Estado de la inscripción del usuario a un evento, o null si no hay. */
export async function getSessionEventRegistrationStatus(
  user: User | null | undefined,
  eventId: string
): Promise<SessionRegistrationStatus | null> {
  const email = verifiedSessionEmail(user);
  if (!email) return null;

  try {
    const { data, error } = await createSupabaseServiceRoleClient()
      .from("event_registrations")
      .select("status")
      .eq("event_id", eventId)
      .eq("email", email)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();
    if (error) {
      console.error("No se pudo consultar la inscripción del usuario:", error);
      return null;
    }
    return (data?.status as SessionRegistrationStatus | undefined) ?? null;
  } catch (error) {
    console.error("No se pudo consultar la inscripción del usuario:", error);
    return null;
  }
}

export type SessionUpcomingEvent = {
  status: SessionRegistrationStatus;
  title: string;
  slug: string;
  event_date: string;
  location: string | null;
};

/** Eventos futuros y publicados en los que está inscrito el correo de la sesión. */
export async function getSessionUpcomingEvents(
  user: User | null | undefined,
  now: Date = new Date()
): Promise<SessionUpcomingEvent[]> {
  const email = verifiedSessionEmail(user);
  if (!email) return [];

  try {
    const { data, error } = await createSupabaseServiceRoleClient()
      .from("event_registrations")
      .select("status,events!inner(title,slug,event_date,location,status)")
      .eq("email", email)
      .in("status", ["pending", "confirmed"])
      .eq("events.status", "published")
      .gt("events.event_date", now.toISOString())
      .limit(50);
    if (error) {
      console.error("No se pudieron consultar los eventos del usuario:", error);
      return [];
    }

    type Row = {
      status: SessionRegistrationStatus;
      events: { title: string; slug: string; event_date: string; location: string | null };
    };
    return ((data || []) as unknown as Row[])
      .map((row) => ({ status: row.status, ...row.events }))
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  } catch (error) {
    console.error("No se pudieron consultar los eventos del usuario:", error);
    return [];
  }
}
