import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const newsStatusConfig = {
  published: "Publicada",
  scheduled: "Programada",
  draft: "Borrador",
};

const contactStatusConfig = {
  pending: "Pendiente",
  read: "Leído",
  responded: "Respondido",
  archived: "Archivado",
};

const contactCategoryConfig = {
  general: "General",
  counseling: "Consejería",
  formation: "Formación",
  events: "Eventos",
  prayer: "Petición de oración",
  support: "Soporte",
  other: "Otro",
};

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalNoticias, error: totalNoticiasError },
    { count: publishedNoticias, error: publishedNoticiasError },
    { count: totalEventos, error: totalEventosError },
    { count: publishedEventos, error: publishedEventosError },
    { count: totalCursos, error: totalCursosError },
    { count: publishedCursos, error: publishedCursosError },
    { count: totalEventRegistrations, error: totalEventRegistrationsError },
    { count: totalCourseEnrollments, error: totalCourseEnrollmentsError },
    { count: totalUsers, error: totalUsersError },
    { count: totalQuizzes, error: totalQuizzesError },
    { count: totalContactMessages, error: totalContactMessagesError },
    { count: pendingContactMessages, error: pendingContactMessagesError },
    { count: respondedContactMessages, error: respondedContactMessagesError },
    { data: ultimasNoticias, error: newsError },
    { data: proximosEventos, error: eventsError },
    { data: ultimosCursos, error: coursesError },
    { data: ultimasInscripcionesEventos, error: latestEventRegistrationsError },
    { data: ultimasInscripcionesCursos, error: latestCourseEnrollmentsError },
    { data: ultimosMensajesContacto, error: latestContactMessagesError },
  ] = await Promise.all([
    supabase.from("news").select("*", { count: "exact", head: true }),
    supabase
      .from("news")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("course_enrollments")
      .select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("quizzes").select("*", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "responded"),
    supabase
      .from("news")
      .select("id,title,status,published_at,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("id,title,event_date,location")
      .order("event_date", { ascending: true })
      .limit(5),
    supabase
      .from("courses")
      .select("id,title,created_at,status")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("event_registrations")
      .select("id,full_name,event_id,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("course_enrollments")
      .select("id,user_id,course_id,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("contact_messages")
      .select("id,full_name,subject,category,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (
    totalNoticiasError ||
    publishedNoticiasError ||
    totalEventosError ||
    publishedEventosError ||
    totalCursosError ||
    publishedCursosError ||
    totalEventRegistrationsError ||
    totalCourseEnrollmentsError ||
    totalUsersError ||
    totalQuizzesError ||
    totalContactMessagesError ||
    pendingContactMessagesError ||
    respondedContactMessagesError ||
    newsError ||
    eventsError ||
    coursesError ||
    latestEventRegistrationsError ||
    latestCourseEnrollmentsError ||
    latestContactMessagesError
  ) {
    return (
      <main className="p-8 text-sm text-gray-500">
        Error cargando el dashboard.
      </main>
    );
  }

  const eventIds = Array.from(
    new Set((ultimasInscripcionesEventos || []).map((item) => item.event_id).filter(Boolean))
  );
  const courseIds = Array.from(
    new Set((ultimasInscripcionesCursos || []).map((item) => item.course_id).filter(Boolean))
  );
  const userIds = Array.from(
    new Set((ultimasInscripcionesCursos || []).map((item) => item.user_id).filter(Boolean))
  );

  const [
    { data: relatedEvents, error: relatedEventsError },
    { data: relatedCourses, error: relatedCoursesError },
    { data: relatedProfiles, error: relatedProfilesError },
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

  if (relatedEventsError || relatedCoursesError || relatedProfilesError) {
    return (
      <main className="p-8 text-sm text-gray-500">
        Error cargando relaciones del dashboard.
      </main>
    );
  }

  const eventsById = new Map((relatedEvents || []).map((item) => [item.id, item.title]));
  const coursesById = new Map((relatedCourses || []).map((item) => [item.id, item.title]));
  const profilesById = new Map(
    (relatedProfiles || []).map((profile) => [
      profile.id,
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Usuario sin nombre",
    ])
  );

  const metrics = [
    { label: "Noticias totales", value: totalNoticias || 0 },
    { label: "Noticias publicadas", value: publishedNoticias || 0 },
    { label: "Eventos totales", value: totalEventos || 0 },
    { label: "Eventos publicados", value: publishedEventos || 0 },
    { label: "Cursos totales", value: totalCursos || 0 },
    { label: "Cursos publicados", value: publishedCursos || 0 },
    { label: "Inscripciones a eventos", value: totalEventRegistrations || 0 },
    { label: "Inscripciones a cursos", value: totalCourseEnrollments || 0 },
    { label: "Usuarios registrados", value: totalUsers || 0 },
    { label: "Quizzes creados", value: totalQuizzes || 0 },
    { label: "Mensajes de contacto", value: totalContactMessages || 0 },
    { label: "Mensajes pendientes", value: pendingContactMessages || 0 },
    { label: "Mensajes respondidos", value: respondedContactMessages || 0 },
  ];

  const quickLinks = [
    { href: "/admin/noticias", label: "Gestionar noticias" },
    { href: "/admin/eventos", label: "Gestionar eventos" },
    { href: "/admin/formacion", label: "Gestionar cursos" },
    { href: "/admin/inscripciones", label: "Ver inscripciones" },
    { href: "/admin/contacto", label: "Ver mensajes de contacto" },
    { href: "/admin/chatbot", label: "Gestionar chatbot" },
  ];

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            Dashboard administrador
          </h1>
          <p className="mt-2 text-gray-600">
            Resumen general de noticias, eventos, cursos, usuarios e inscripciones.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg bg-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <p className="text-3xl font-bold text-gray-950">{metric.value}</p>
            <p className="mt-2 text-sm font-medium text-gray-500">
              {metric.label}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <article className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">Últimas noticias</h2>
            <p className="mt-1 text-sm text-gray-500">
              Noticias creadas más recientemente.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {ultimasNoticias?.map((noticia) => {
              const status =
                newsStatusConfig[noticia.status as keyof typeof newsStatusConfig] ||
                "Publicada";

              return (
                <article
                  key={noticia.id}
                  className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <h3 className="font-semibold text-gray-900">{noticia.title}</h3>
                  <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    {status}
                  </span>
                  <p className="text-gray-500">
                    {formatDateColombia(noticia.published_at || noticia.created_at)}
                  </p>
                </article>
              );
            })}
          </div>
        </article>

        <article className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">Próximos eventos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Eventos ordenados por fecha.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {proximosEventos?.map((event) => (
              <article
                key={event.id}
                className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <p className="mt-1 text-gray-500">
                    {event.location || "Ubicación por confirmar"}
                  </p>
                </div>
                <p className="text-gray-500">{formatDateColombia(event.event_date)}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">Últimos cursos creados</h2>
            <p className="mt-1 text-sm text-gray-500">
              Cursos añadidos más recientemente.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {ultimosCursos?.map((course) => (
              <article
                key={course.id}
                className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <h3 className="font-semibold text-gray-900">{course.title}</h3>
                <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {course.status === "published" ? "Publicado" : "Borrador"}
                </span>
                <p className="text-gray-500">{formatDateColombia(course.created_at)}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">Últimas inscripciones</h2>
            <p className="mt-1 text-sm text-gray-500">
              Registros recientes de eventos y cursos.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {(ultimasInscripcionesEventos || []).map((registration) => (
              <article
                key={`event-${registration.id}`}
                className="grid gap-2 py-4 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-gray-900">{registration.full_name}</p>
                  <p className="mt-1 text-gray-500">
                    Evento: {eventsById.get(registration.event_id) || "Evento no encontrado"}
                  </p>
                </div>
                <p className="text-gray-500">{formatDateColombia(registration.created_at)}</p>
              </article>
            ))}

            {(ultimasInscripcionesCursos || []).map((enrollment) => (
              <article
                key={`course-${enrollment.id}`}
                className="grid gap-2 py-4 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {profilesById.get(enrollment.user_id) || "Usuario no encontrado"}
                  </p>
                  <p className="mt-1 text-gray-500">
                    Curso: {coursesById.get(enrollment.course_id) || "Curso no encontrado"}
                  </p>
                </div>
                <p className="text-gray-500">{formatDateColombia(enrollment.created_at)}</p>
              </article>
            ))}

            {(ultimasInscripcionesEventos?.length || 0) +
              (ultimasInscripcionesCursos?.length || 0) ===
              0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                Aún no hay inscripciones registradas.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-xl bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">
              Últimos mensajes recibidos
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Consultas y solicitudes más recientes enviadas desde contacto.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {ultimosMensajesContacto?.map((message) => {
              const status =
                contactStatusConfig[
                  message.status as keyof typeof contactStatusConfig
                ] || "Pendiente";
              const category =
                contactCategoryConfig[
                  message.category as keyof typeof contactCategoryConfig
                ] || "General";

              return (
                <article
                  key={message.id}
                  className="grid gap-3 py-4 text-sm md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {message.full_name}
                    </h3>
                    <p className="mt-1 text-gray-500">{message.subject}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {category}
                    </span>
                    <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      {status}
                    </span>
                  </div>
                  <p className="text-gray-500">
                    {formatDateColombia(message.created_at)}
                  </p>
                </article>
              );
            })}

            {(ultimosMensajesContacto?.length || 0) === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                Aún no hay mensajes de contacto registrados.
              </p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
