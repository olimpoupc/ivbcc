import { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { quoteFilterValue } from "@/lib/admin-query";
import { buildCsvResponse } from "@/lib/csv";

const EXPORT_ROW_LIMIT = 20000;

const categoryConfig: Record<string, string> = {
  general: "General",
  counseling: "Consejería",
  formation: "Formación",
  events: "Eventos",
  prayer: "Petición de oración",
  support: "Soporte",
  other: "Otro",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  read: "Leído",
  responded: "Respondido",
  archived: "Archivado",
  verified: "Verificada",
  rejected: "Rechazada",
};

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "No autorizado" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

function notFound() {
  return new Response(
    JSON.stringify({ error: "Módulo de exportación desconocido" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}

function queryFailed(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module: moduleName } = await params;
  const { supabase, isAdmin } = await getAdminUser();

  if (!isAdmin) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim() || "";

  if (moduleName === "contacto") {
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";

    let dataQuery = supabase
      .from("contact_messages")
      .select("full_name,email,phone,category,subject,status,created_at")
      .order("created_at", { ascending: false })
      .limit(EXPORT_ROW_LIMIT);

    if (status !== "all") dataQuery = dataQuery.eq("status", status);
    if (category !== "all") dataQuery = dataQuery.eq("category", category);
    if (query) {
      const likeValue = quoteFilterValue(`%${query}%`);
      dataQuery = dataQuery.or(
        `full_name.ilike.${likeValue},email.ilike.${likeValue},phone.ilike.${likeValue},subject.ilike.${likeValue},message.ilike.${likeValue}`
      );
    }

    const { data, error } = await dataQuery;
    if (error) return queryFailed(error.message);

    const rows = (data || []).map((message) => [
      message.full_name,
      message.email,
      message.phone || "",
      categoryConfig[message.category] || "Otro",
      message.subject,
      statusLabels[message.status] || message.status,
      formatDateColombia(message.created_at),
    ]);

    return buildCsvResponse(
      ["Nombre", "Correo", "Teléfono", "Categoría", "Asunto", "Estado", "Fecha"],
      rows,
      "mensajes-contacto-ivbcc.csv"
    );
  }

  if (moduleName === "inscripciones-eventos") {
    let dataQuery = supabase
      .from("admin_event_registrations_view")
      .select("full_name,email,phone,event_title,created_at")
      .order("created_at", { ascending: false })
      .limit(EXPORT_ROW_LIMIT);

    if (query) {
      const likeValue = quoteFilterValue(`%${query}%`);
      dataQuery = dataQuery.or(
        `full_name.ilike.${likeValue},email.ilike.${likeValue},event_title.ilike.${likeValue}`
      );
    }

    const { data, error } = await dataQuery;
    if (error) return queryFailed(error.message);

    const rows = (data || []).map((registration) => [
      registration.full_name,
      registration.email,
      registration.phone || "",
      registration.event_title,
      formatDateColombia(registration.created_at),
    ]);

    return buildCsvResponse(
      ["Nombre", "Correo", "Teléfono", "Evento", "Fecha"],
      rows,
      "inscripciones-eventos-ivbcc.csv"
    );
  }

  if (moduleName === "inscripciones-cursos") {
    let dataQuery = supabase
      .from("admin_course_enrollments_view")
      .select("student_name,course_title,created_at")
      .order("created_at", { ascending: false })
      .limit(EXPORT_ROW_LIMIT);

    if (query) {
      const likeValue = quoteFilterValue(`%${query}%`);
      dataQuery = dataQuery.or(
        `student_name.ilike.${likeValue},course_title.ilike.${likeValue}`
      );
    }

    const { data, error } = await dataQuery;
    if (error) return queryFailed(error.message);

    const rows = (data || []).map((enrollment) => [
      enrollment.student_name,
      enrollment.course_title,
      formatDateColombia(enrollment.created_at),
    ]);

    return buildCsvResponse(
      ["Usuario", "Curso", "Fecha"],
      rows,
      "inscripciones-cursos-ivbcc.csv"
    );
  }

  if (moduleName === "donations" || moduleName === "donaciones") {
    const status = searchParams.get("status") || "all";

    let dataQuery = supabase
      .from("donations")
      .select(
        "reference_code,first_name,last_name,email,phone,amount,method_title,status,admin_note,verified_at,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(EXPORT_ROW_LIMIT);

    if (status !== "all") dataQuery = dataQuery.eq("status", status);
    if (query) {
      const likeValue = quoteFilterValue(`%${query}%`);
      dataQuery = dataQuery.or(
        `first_name.ilike.${likeValue},last_name.ilike.${likeValue},reference_code.ilike.${likeValue},method_title.ilike.${likeValue}`
      );
    }

    const { data, error } = await dataQuery;
    if (error) return queryFailed(error.message);

    const rows = (data || []).map((donation) => [
      donation.reference_code,
      `${donation.first_name} ${donation.last_name}`,
      donation.email || "",
      donation.phone || "",
      donation.method_title,
      String(donation.amount),
      statusLabels[donation.status] || donation.status,
      donation.admin_note || "",
      formatDateColombia(donation.created_at),
      donation.verified_at ? formatDateColombia(donation.verified_at) : "",
    ]);

    return buildCsvResponse(
      [
        "Referencia",
        "Donante",
        "Correo",
        "Teléfono",
        "Método",
        "Monto (COP)",
        "Estado",
        "Nota Admin",
        "Fecha Creación",
        "Fecha Verificación",
      ],
      rows,
      "donaciones-ivbcc.csv"
    );
  }

  return notFound();
}
