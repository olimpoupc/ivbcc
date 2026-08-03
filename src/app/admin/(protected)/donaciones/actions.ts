"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";
import { buildSafeStoragePath, validateImageFile } from "@/lib/security";
import { removeStorageObjects } from "@/lib/storage";

export type ActionResult = { success: true } | { success: false; error: string };

const STORAGE_BUCKET = "news-images";

function nullableText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function saveDonationMethod(formData: FormData): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const editingId = textValue(formData.get("id")) || null;
  const title = textValue(formData.get("title"));

  if (!title) {
    return { success: false, error: "El título es obligatorio." };
  }

  const manualQrUrl = nullableText(formData.get("qr_image_url"));
  const previousQrUrl = nullableText(formData.get("previous_qr_image_url"));
  const qrFile = formData.get("qrFile");

  let qrImageUrl = manualQrUrl;

  if (qrFile instanceof File && qrFile.size > 0) {
    const validationError = await validateImageFile(qrFile);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const qrPath = buildSafeStoragePath("donations/qr", qrFile);
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(qrPath, qrFile, { contentType: qrFile.type, upsert: false });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(qrPath);
    qrImageUrl = publicUrlData.publicUrl;
  }

  const payload = {
    title,
    method_type: textValue(formData.get("method_type")) || "other",
    description: nullableText(formData.get("description")),
    account_holder: nullableText(formData.get("account_holder")),
    account_number: nullableText(formData.get("account_number")),
    bank_name: nullableText(formData.get("bank_name")),
    document_number: nullableText(formData.get("document_number")),
    phone: nullableText(formData.get("phone")),
    qr_image_url: qrImageUrl,
    payment_url: nullableText(formData.get("payment_url")),
    instructions: nullableText(formData.get("instructions")),
    order_index: Number.parseInt(textValue(formData.get("order_index")), 10) || 0,
    is_active: formData.get("is_active") === "true",
  };

  const { error } = editingId
    ? await supabase.from("donation_methods").update(payload).eq("id", editingId)
    : await supabase.from("donation_methods").insert(payload);

  if (error) {
    return { success: false, error: error.message };
  }

  if (qrFile instanceof File && qrFile.size > 0 && previousQrUrl && previousQrUrl !== qrImageUrl) {
    await removeStorageObjects(supabase, [previousQrUrl]);
  }

  revalidatePath("/admin/donaciones");
  return { success: true };
}

export async function toggleDonationMethod(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("donation_methods")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/donaciones");
  return { success: true };
}

export async function deleteDonationMethod(
  id: string,
  qrImageUrl: string | null
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase.from("donation_methods").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  await removeStorageObjects(supabase, [qrImageUrl]);

  revalidatePath("/admin/donaciones");
  return { success: true };
}
