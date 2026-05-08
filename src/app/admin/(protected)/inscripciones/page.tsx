import { createSupabaseServerClient } from "@/lib/supabase-server";
import RegistrationsPanel from "./RegistrationsPanel";

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function AdminInscripcionesPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalEventRegistrations },
    { count: totalCourseEnrollments },
    { data: eventRegistrations, error: eventRegistrationsError },
    { data: courseEnrollments, error: courseEnrollmentsError },
  ] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("course_enrollments")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("event_registrations")
      .select("id,event_id,full_name,email,phone,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("course_enrollments")
      .select("id,course_id,user_id,created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (eventRegistrationsError || courseEnrollmentsError) {
    return <main className="p-8 text-sm text-gray-500">Error cargando inscripciones.</main>;
  }

  const eventIds = Array.from(
    new Set((eventRegistrations || []).map((item) => item.event_id).filter(Boolean))
  );
  const courseIds = Array.from(
    new Set((courseEnrollments || []).map((item) => item.course_id).filter(Boolean))
  );
  const userIds = Array.from(
    new Set((courseEnrollments || []).map((item) => item.user_id).filter(Boolean))
  );

  const [
    { data: eventsData, error: eventsError },
    { data: coursesData, error: coursesError },
    { data: profilesData, error: profilesError },
  ] = await Promise.all([
    eventIds.length
      ? supabase.from("events").select("id,title").in("id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? supabase.from("courses").select("id,title").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id,first_name,last_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (eventsError || coursesError || profilesError) {
    return <main className="p-8 text-sm text-gray-500">Error cargando relaciones de inscripciones.</main>;
  }

  const eventsById = new Map((eventsData || []).map((event) => [event.id, event.title]));
  const coursesById = new Map((coursesData || []).map((course) => [course.id, course.title]));
  const profilesById = new Map(
    (profilesData || []).map((profile) => [
      profile.id,
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Usuario sin nombre",
    ])
  );

  const metrics = [
    { label: "Inscritos a eventos", value: totalEventRegistrations || 0 },
    { label: "Inscritos a cursos", value: totalCourseEnrollments || 0 },
  ];

  const eventRows = (eventRegistrations || []).map((registration) => ({
    id: registration.id,
    type: "Evento" as const,
    name: registration.full_name,
    email: registration.email,
    phone: registration.phone || "",
    item: eventsById.get(registration.event_id) || "Evento no encontrado",
    date: formatDateColombia(registration.created_at),
  }));

  const courseRows = (courseEnrollments || []).map((enrollment) => ({
    id: enrollment.id,
    type: "Curso" as const,
    name: profilesById.get(enrollment.user_id) || "Usuario no encontrado",
    email: "",
    phone: "",
    item: coursesById.get(enrollment.course_id) || "Curso no encontrado",
    date: formatDateColombia(enrollment.created_at),
  }));

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-950">Inscripciones</h1>
        <p className="mt-2 text-gray-600">
          Resumen centralizado de inscripciones a eventos y cursos en IVBCC.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-3xl font-bold text-gray-950">{metric.value}</p>
            <p className="mt-2 text-sm font-medium text-gray-500">{metric.label}</p>
          </article>
        ))}
      </section>

      <RegistrationsPanel eventRows={eventRows} courseRows={courseRows} />
    </main>
  );
}
