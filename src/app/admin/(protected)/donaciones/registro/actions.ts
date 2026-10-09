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

export async function verifyDonation(
  donationId: string,
  adminNote?: string
): Promise<AdminActionResult> {
  const { supabase, user, isAdmin } = await getAdminUser();

  if (!isAdmin || !user) {
    return { success: false, error: "No tienes permisos de administrador." };
  }

  const cleanNote = adminNote ? sanitizeText(adminNote, 1000) : null;

  const { error } = await supabase
    .from("donations")
    .update({
      status: "verified",
      admin_note: cleanNote,
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq("id", donationId);

  if (error) {
    console.error("Error al verificar donación:", error);
    return {
      success: false,
      error: "No fue posible verificar la donación. Intenta nuevamente.",
    };
  }

  revalidatePath("/admin/donaciones/registro");
  return { success: true };
}

export async function rejectDonation(
  donationId: string,
  adminNote?: string
): Promise<AdminActionResult> {
  const { supabase, user, isAdmin } = await getAdminUser();

  if (!isAdmin || !user) {
    return { success: false, error: "No tienes permisos de administrador." };
  }

  const cleanNote = adminNote ? sanitizeText(adminNote, 1000) : null;

  const { error } = await supabase
    .from("donations")
    .update({
      status: "rejected",
      admin_note: cleanNote,
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq("id", donationId);

  if (error) {
    console.error("Error al rechazar donación:", error);
    return {
      success: false,
      error: "No fue posible actualizar el estado de la donación.",
    };
  }

  revalidatePath("/admin/donaciones/registro");
  return { success: true };
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
