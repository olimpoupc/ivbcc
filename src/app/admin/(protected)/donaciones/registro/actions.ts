"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { sanitizeText } from "@/lib/security";

export type AdminActionResult = {
  success: boolean;
  error?: string;
};

export type SignedUrlResult = {
  success: boolean;
  signedUrl?: string;
  error?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STALE_STATUS_ERROR =
  "La donación cambió de estado mientras la revisabas. Recarga la página e inténtalo de nuevo.";

type DonationStatus = "pending" | "verified" | "rejected";

/**
 * Cambia el estado de una donación con la sesión del administrador (RLS).
 * Solo actualiza si el estado actual es uno de los permitidos, así un doble
 * clic o una pestaña desactualizada no pisan una decisión ya tomada.
 */
async function changeDonationStatus(
  donationId: string,
  nextStatus: DonationStatus,
  allowedCurrent: DonationStatus[],
  adminNote: string | undefined,
  failureMessage: string
): Promise<AdminActionResult> {
  const { supabase, user, isAdmin } = await getAdminUser();

  if (!isAdmin || !user) {
    return { success: false, error: "No tienes permisos de administrador." };
  }

  if (!UUID_PATTERN.test(donationId || "")) {
    return { success: false, error: "La donación indicada no es válida." };
  }

  const changes: Record<string, string | null> =
    nextStatus === "pending"
      ? { status: "pending", verified_at: null, verified_by: null }
      : {
          status: nextStatus,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        };

  if (adminNote !== undefined) {
    changes.admin_note = adminNote ? sanitizeText(adminNote, 1000) || null : null;
  }

  const { data, error } = await supabase
    .from("donations")
    .update(changes)
    .eq("id", donationId)
    .in("status", allowedCurrent)
    .select("id");

  if (error) {
    console.error(`Error al cambiar la donación a ${nextStatus}:`, error);
    return { success: false, error: failureMessage };
  }

  if (!data || data.length === 0) {
    return { success: false, error: STALE_STATUS_ERROR };
  }

  revalidatePath("/admin/donaciones/registro");
  return { success: true };
}

export async function verifyDonation(
  donationId: string,
  adminNote?: string
): Promise<AdminActionResult> {
  return changeDonationStatus(
    donationId,
    "verified",
    ["pending"],
    adminNote ?? "",
    "No fue posible verificar la donación. Intenta nuevamente."
  );
}

export async function rejectDonation(
  donationId: string,
  adminNote?: string
): Promise<AdminActionResult> {
  return changeDonationStatus(
    donationId,
    "rejected",
    ["pending"],
    adminNote ?? "",
    "No fue posible actualizar el estado de la donación."
  );
}

// Corrige un error: devuelve una donación verificada o rechazada a pendiente.
// Deja de sumar a los totales verificados y se borra quién y cuándo la revisó.
export async function revertDonationToPending(
  donationId: string,
  adminNote?: string
): Promise<AdminActionResult> {
  return changeDonationStatus(
    donationId,
    "pending",
    ["verified", "rejected"],
    adminNote,
    "No fue posible devolver la donación a pendiente. Intenta nuevamente."
  );
}

export async function getReceiptSignedUrl(
  receiptPath: string
): Promise<SignedUrlResult> {
  const { supabase, isAdmin } = await getAdminUser();

  if (!isAdmin) {
    return { success: false, error: "No tienes permisos de administrador." };
  }

  if (!receiptPath) {
    return { success: false, error: "Ruta de comprobante no especificada." };
  }

  const { data, error } = await supabase.storage
    .from("donation-receipts")
    .createSignedUrl(receiptPath, 60);

  if (error || !data?.signedUrl) {
    console.error("Error al generar URL firmada de comprobante:", error);
    return {
      success: false,
      error: "No fue posible generar el enlace seguro al comprobante.",
    };
  }

  return {
    success: true,
    signedUrl: data.signedUrl,
  };
}
