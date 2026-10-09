"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { validateDonationAmount } from "@/lib/donations-format";
import {
  detectReceiptBinaryType,
  generateReferenceCode,
  generateUploadToken,
  MAX_RECEIPT_BYTES,
  safeCompareTokens,
} from "@/lib/donations";
import { sanitizeText } from "@/lib/security";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { getUserFacingErrorMessage } from "@/lib/user-facing-error";

export type CreateDonationInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  donationMethodId: string;
  amount: number;
  dataConsent: boolean;
};

export type PublicDonationMethod = {
  id: string;
  title: string;
  method_type: string;
  description: string | null;
  account_holder: string | null;
  account_number: string | null;
  bank_name: string | null;
  document_number: string | null;
  phone: string | null;
  qr_image_url: string | null;
  payment_url: string | null;
  instructions: string | null;
};

export type CreateDonationResult =
  | {
      success: true;
      donation: {
        id: string;
        reference_code: string;
        amount: number;
        method_title: string;
        upload_token: string;
        created_at: string;
      };
      method: PublicDonationMethod;
    }
  | {
      success: false;
      error: string;
    };

export type UploadReceiptResult =
  | {
      success: true;
      receiptPath: string;
    }
  | {
      success: false;
      error: string;
    };

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

async function verifyRateLimit(
  serviceRole: ReturnType<typeof createSupabaseServiceRoleClient>,
  key: string,
  limit: number,
  windowSeconds = 3600
): Promise<boolean> {
  const { data: allowed, error } = await serviceRole.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Error al verificar límite de frecuencia:", error);
    return false;
  }

  return Boolean(allowed);
}

export async function createDonation(
  input: CreateDonationInput
): Promise<CreateDonationResult> {
  const serviceRole = createSupabaseServiceRoleClient();
  const clientIp = await getClientIp();

  // Límite de frecuencia: 5 por hora por IP
  const allowed = await verifyRateLimit(serviceRole, `donation:${clientIp}`, 5, 3600);
  if (!allowed) {
    return {
      success: false,
      error: getUserFacingErrorMessage(
        new Error("rate limit"),
        "Demasiados intentos de donación. Por favor, espera unos minutos e inténtalo de nuevo."
      ),
    };
  }

  // 1. Sanitizar y validar nombres (2 a 80 caracteres)
  const cleanFirstName = sanitizeText(input.firstName || "", 80);
  const cleanLastName = sanitizeText(input.lastName || "", 80);

  if (cleanFirstName.length < 2 || cleanFirstName.length > 80) {
    return {
      success: false,
      error: "El nombre debe tener entre 2 y 80 caracteres.",
    };
  }

  if (cleanLastName.length < 2 || cleanLastName.length > 80) {
    return {
      success: false,
      error: "El apellido debe tener entre 2 y 80 caracteres.",
    };
  }

  // 2. Correo opcional con validación de formato
  let cleanEmail: string | null = null;
  if (input.email && input.email.trim()) {
    const rawEmail = sanitizeText(input.email, 120).toLowerCase();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(rawEmail)) {
      return {
        success: false,
        error: "El correo electrónico no tiene un formato válido.",
      };
    }
    cleanEmail = rawEmail;
  }

  // 3. Teléfono opcional (máx. 20 caracteres)
  let cleanPhone: string | null = null;
  if (input.phone && input.phone.trim()) {
    cleanPhone = sanitizeText(input.phone, 20);
  }

  // 4. Validar monto
  const amountValidation = validateDonationAmount(input.amount);
  if (!amountValidation.valid || amountValidation.amount === undefined) {
    return {
      success: false,
      error:
        amountValidation.error ||
        "El monto de la donación no es válido.",
    };
  }

  // 5. Consentimiento obligatorio (Ley 1581)
  if (!input.dataConsent) {
    return {
      success: false,
      error: "Debes autorizar el tratamiento de datos personales para registrar la donación.",
    };
  }

  // 6. Verificar que el método de donación exista y esté activo
  const { data: method, error: methodError } = await serviceRole
    .from("donation_methods")
    .select(
      "id, title, method_type, description, account_holder, account_number, bank_name, document_number, phone, qr_image_url, payment_url, instructions, is_active"
    )
    .eq("id", input.donationMethodId)
    .eq("is_active", true)
    .maybeSingle();

  if (methodError || !method) {
    return {
      success: false,
      error: "El método de donación seleccionado no está disponible.",
    };
  }

  // 7. Generar código de referencia y upload_token
  const referenceCode = generateReferenceCode();
  const uploadToken = generateUploadToken();

  // 8. Insertar con service_role
  const { data: donation, error: insertError } = await serviceRole
    .from("donations")
    .insert({
      reference_code: referenceCode,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      email: cleanEmail,
      phone: cleanPhone,
      amount: amountValidation.amount,
      donation_method_id: method.id,
      method_title: method.title,
      upload_token: uploadToken,
      data_consent: true,
      status: "pending",
    })
    .select("id, reference_code, amount, method_title, upload_token, created_at")
    .single();

  if (insertError || !donation) {
    console.error("Error al registrar donación:", insertError);
    return {
      success: false,
      error: "No fue posible registrar la donación. Por favor, intenta de nuevo.",
    };
  }

  return {
    success: true,
    donation: {
      id: donation.id,
      reference_code: donation.reference_code,
      amount: donation.amount,
      method_title: donation.method_title,
      upload_token: donation.upload_token,
      created_at: donation.created_at,
    },
    method: {
      id: method.id,
      title: method.title,
      method_type: method.method_type,
      description: method.description,
      account_holder: method.account_holder,
      account_number: method.account_number,
      bank_name: method.bank_name,
      document_number: method.document_number,
      phone: method.phone,
      qr_image_url: method.qr_image_url,
      payment_url: method.payment_url,
      instructions: method.instructions,
    },
  };
}

export async function uploadDonationReceipt(
  formData: FormData
): Promise<UploadReceiptResult> {
  const serviceRole = createSupabaseServiceRoleClient();
  const clientIp = await getClientIp();

  // Límite de frecuencia: 10 por hora por IP para subida de comprobante
  const allowed = await verifyRateLimit(
    serviceRole,
    `donation:${clientIp}`,
    10,
    3600
  );
  if (!allowed) {
    return {
      success: false,
      error: getUserFacingErrorMessage(
        new Error("rate limit"),
        "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
      ),
    };
  }

  const referenceCode = formData.get("referenceCode")?.toString()?.trim();
  const uploadToken = formData.get("uploadToken")?.toString()?.trim();
  const file = formData.get("receiptFile");

  if (!referenceCode || !uploadToken) {
    return {
      success: false,
      error: "Datos de verificación de la donación incompletos.",
    };
  }

  if (!(file instanceof File) || file.size === 0) {
    return {
      success: false,
      error: "Debes seleccionar un archivo para el comprobante.",
    };
  }

  // 1. Validar que la donación exista
  const { data: donation, error: donationError } = await serviceRole
    .from("donations")
    .select("id, reference_code, upload_token, receipt_path, status, created_at")
    .eq("reference_code", referenceCode)
    .maybeSingle();

  if (donationError || !donation) {
    return {
      success: false,
      error: "No se encontró el registro de la donación.",
    };
  }

  // 2. Comparación en tiempo constante del upload_token
  if (!safeCompareTokens(donation.upload_token, uploadToken)) {
    return {
      success: false,
      error: "El token de autorización no es válido para esta donación.",
    };
  }

  // 3. Validar estado pendiente
  if (donation.status !== "pending") {
    return {
      success: false,
      error: "Esta donación ya fue verificada o cerrada previamente.",
    };
  }

  // 4. Validar que no tenga comprobante previo
  if (donation.receipt_path) {
    return {
      success: false,
      error: "Esta donación ya tiene un comprobante registrado.",
    };
  }

  // 5. Validar que se creó hace menos de 24 horas
  const createdAtMs = new Date(donation.created_at).getTime();
  const nowMs = Date.now();
  const diffHours = (nowMs - createdAtMs) / (1000 * 60 * 60);

  if (diffHours > 24) {
    return {
      success: false,
      error: "El plazo de 24 horas para adjuntar el comprobante ha expirado.",
    };
  }

  // 6. Validar tamaño máximo 5 MB
  if (file.size > MAX_RECEIPT_BYTES) {
    return {
      success: false,
      error: "El archivo no debe superar los 5 MB.",
    };
  }

  // 7. Validar firma binaria real (JPEG, PNG, WebP o PDF)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const detected = detectReceiptBinaryType(buffer);

  if (!detected) {
    return {
      success: false,
      error: "El formato del comprobante no es válido. Solo se admiten archivos JPG, PNG, WebP o PDF.",
    };
  }

  // 8. Guardar con nombre generado (receipts/<id>-<uuid>.<ext>)
  const safeFilename = `receipts/${donation.id}-${randomUUID()}.${detected.extension}`;

  const { error: uploadError } = await serviceRole.storage
    .from("donation-receipts")
    .upload(safeFilename, buffer, {
      contentType: detected.mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Error al subir comprobante a Storage:", uploadError);
    return {
      success: false,
      error: "No fue posible almacenar el archivo. Por favor, intenta de nuevo.",
    };
  }

  // 9. Actualizar receipt_path en donations
  const { error: updateError } = await serviceRole
    .from("donations")
    .update({ receipt_path: safeFilename })
    .eq("id", donation.id);

  // Si algo falla, borrar el archivo subido
  if (updateError) {
    console.error("Error al actualizar receipt_path:", updateError);
    await serviceRole.storage
      .from("donation-receipts")
      .remove([safeFilename]);

    return {
      success: false,
      error: "Ocurrió un error al registrar el comprobante. Intenta nuevamente.",
    };
  }

  return {
    success: true,
    receiptPath: safeFilename,
  };
}
