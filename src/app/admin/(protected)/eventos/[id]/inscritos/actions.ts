"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";

export type AttendanceResult = { success: true } | { success: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marca o deshace la asistencia de un inscrito CONFIRMADO (sesión admin + RLS). */
export async function setAttendance(
  eventId: string,
  registrationId: string,
  attended: boolean
): Promise<AttendanceResult> {
  const { supabase, user, isAdmin } = await getAdminUser();
  if (!isAdmin || !user) return { success: false, error: "No tienes permisos de administrador." };
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(registrationId)) {
    return { success: false, error: "La inscripción indicada no es válida." };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .update(
      attended
        ? { checked_in_at: new Date().toISOString(), checked_in_by: user.id }
        : { checked_in_at: null, checked_in_by: null }
    )
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .select("id");

  if (error) {
    console.error("Error al registrar asistencia:", error);
    return { success: false, error: "No fue posible guardar la asistencia. Intenta nuevamente." };
  }
  if (!data?.length) {
    return { success: false, error: "Solo se puede marcar asistencia a inscritos confirmados." };
  }

  revalidatePath(`/admin/eventos/${eventId}/inscritos`);
  return { success: true };
}
