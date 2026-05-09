"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function revokeCertificate(certificateId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "No autenticado." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, message: "No autorizado." };
  }

  const { error } = await supabase
    .from("course_certificates")
    .update({
      status: "revoked",
    })
    .eq("id", certificateId);

  if (error) {
    return { ok: false, message: "No se pudo revocar el certificado." };
  }

  revalidatePath("/admin/certificados");
  return { ok: true, message: "Certificado revocado." };
}
