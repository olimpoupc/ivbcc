"use server";

import { hashToken, isWellFormedToken } from "@/lib/registration-token";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export type UnsubscribeResult = { success: true } | { success: false; error: string };

const INVALID_LINK_ERROR =
  "Este enlace no es válido. Si quieres dejar de recibir mensajes, escríbenos por la página de contacto.";

/**
 * Baja por POST (Server Action), no por GET: los escáneres de correo abren
 * los enlaces y no deben dar de baja a nadie solos.
 */
export async function unsubscribeEmail(token: string): Promise<UnsubscribeResult> {
  try {
    if (!isWellFormedToken(token)) return { success: false, error: INVALID_LINK_ERROR };

    const supabase = createSupabaseServiceRoleClient();
    const { data: registration, error } = await supabase
      .from("event_registrations")
      .select("id,email")
      .eq("unsubscribe_token_hash", hashToken(token))
      .maybeSingle();

    if (error) {
      console.error("Error al buscar el enlace de baja:", error);
      return { success: false, error: "No pudimos procesar la baja. Inténtalo nuevamente." };
    }
    if (!registration) return { success: false, error: INVALID_LINK_ERROR };

    const email = String(registration.email).trim().toLowerCase();
    const { error: suppressError } = await supabase
      .from("email_suppressions")
      .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });

    if (suppressError) {
      console.error("Error al registrar la baja:", suppressError);
      return { success: false, error: "No pudimos procesar la baja. Inténtalo nuevamente." };
    }

    // Refleja también el retiro del consentimiento en esa inscripción.
    await supabase
      .from("event_registrations")
      .update({ marketing_consent: false })
      .eq("id", registration.id);

    return { success: true };
  } catch (error) {
    console.error("Error inesperado al dar de baja:", error);
    return { success: false, error: "No pudimos procesar la baja. Inténtalo nuevamente." };
  }
}
