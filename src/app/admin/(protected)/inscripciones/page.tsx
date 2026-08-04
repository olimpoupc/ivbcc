import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminPagination,
  AdminPanelCard,
} from "@/components/admin/AdminPrimitives";
import {
  buildListHref,
  getPageParam,
  getPageRange,
  getParam,
  quoteFilterValue,
  type AdminListSearchParams,
} from "@/lib/admin-query";

type EventRegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  event_title: string;
};

type CourseEnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  created_at: string;
  course_title: string;
  student_name: string;
};

const typeFilters = [
  { label: "Todas", value: "all" },
  { label: "Eventos", value: "events" },
  { label: "Cursos", value: "courses" },
];

const PAGE_SIZE = 10;

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminInscripcionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const type = getParam(params, "type") || "all";
  const eventsPage = getPageParam(params, "eventsPage");
  const coursesPage = getPageParam(params, "coursesPage");
  const eventsRange = getPageRange(eventsPage, PAGE_SIZE);
  const coursesRange = getPageRange(coursesPage, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let eventsDataQuery = supabase
    .from("admin_event_registrations_view")
    .select("id,event_id,full_name,email,phone,created_at,event_title")
    .order("created_at", { ascending: false })
    .range(eventsRange.from, eventsRange.to);

  let eventsFilteredCountQuery = supabase
    .from("admin_event_registrations_view")
    .select("*", { count: "exact", head: true });

  let coursesDataQuery = supabase
    .from("admin_course_enrollments_view")
    .select("id,course_id,user_id,created_at,course_title,student_name")
    .order("created_at", { ascending: false })
    .range(coursesRange.from, coursesRange.to);

  let coursesFilteredCountQuery = supabase
    .from("admin_course_enrollments_view")
    .select("*", { count: "exact", head: true });

  if (query) {
    const likeValue = quoteFilterValue(`%${query}%`);
    const eventsOrFilter = `full_name.ilike.${likeValue},email.ilike.${likeValue},event_title.ilike.${likeValue}`;
    eventsDataQuery = eventsDataQuery.or(eventsOrFilter);
    eventsFilteredCountQuery = eventsFilteredCountQuery.or(eventsOrFilter);

    const coursesOrFilter = `student_name.ilike.${likeValue},course_title.ilike.${likeValue}`;
    coursesDataQuery = coursesDataQuery.or(coursesOrFilter);
    coursesFilteredCountQuery = coursesFilteredCountQuery.or(coursesOrFilter);
  }

  const [
    { data: eventRows, error: eventsError },
    { count: filteredEventsCount },
    { count: totalEventRegistrations },
    { data: courseRows, error: coursesError },
    { count: filteredCoursesCount },
    { count: totalCourseEnrollments },
  ] = await Promise.all([
    eventsDataQuery,
    eventsFilteredCountQuery,
    supabase
      .from("admin_event_registrations_view")
      .select("*", { count: "exact", head: true }),
    coursesDataQuery,
    coursesFilteredCountQuery,
    supabase
      .from("admin_course_enrollments_view")
      .select("*", { count: "exact", head: true }),
  ]);

  if (eventsError || coursesError) {
    return (
      <main className="p-8 text-sm text-gray-500">
        Error cargando inscripciones.
      </main>
    );
  }

  const events = (eventRows || []) as EventRegistrationRow[];
  const courses = (courseRows || []) as CourseEnrollmentRow[];

  const eventsTotalItems = filteredEventsCount || 0;
  const coursesTotalItems = filteredCoursesCount || 0;
  const eventsTotalPages = Math.max(1, Math.ceil(eventsTotalItems / PAGE_SIZE));
  const coursesTotalPages = Math.max(1, Math.ceil(coursesTotalItems / PAGE_SIZE));

  const buildEventsHref = (targetPage: number) =>
    buildListHref("/admin/inscripciones", {
      q: query || undefined,
      type: type !== "all" ? type : undefined,
      eventsPage: targetPage > 1 ? String(targetPage) : undefined,
      coursesPage: coursesPage > 1 ? String(coursesPage) : undefined,
    });

  const buildCoursesHref = (targetPage: number) =>
    buildListHref("/admin/inscripciones", {
      q: query || undefined,
      type: type !== "all" ? type : undefined,
      eventsPage: eventsPage > 1 ? String(eventsPage) : undefined,
      coursesPage: targetPage > 1 ? String(targetPage) : undefined,
    });

  const showEvents = type === "all" || type === "events";
  const showCourses = type === "all" || type === "courses";

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Inscripciones"
        subtitle="Resumen centralizado de inscripciones a eventos y cursos en IVBCC."
        icon="users"
      />

      <section className="grid gap-6 md:grid-cols-2">
        <AdminMetricCard
          label="Inscritos a eventos"
          value={totalEventRegistrations || 0}
          detail="Total histórico"
          icon="calendar"
          tone="slate"
        />
        <AdminMetricCard
          label="Inscritos a cursos"
          value={totalCourseEnrollments || 0}
          detail="Total histórico"
          icon="book"
          tone="navy"
        />
      </section>

      <AdminPanelCard>
        <form className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Buscar por nombre, correo, evento o curso
            </label>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Escribe para encontrar una inscripción"
              className="h-12 w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
            />
          </div>

          <input type="hidden" name="type" value={type} />

          <button
            type="submit"
            className="h-12 rounded-full bg-[var(--ivbcc-navy)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)]"
          >
            Buscar
          </button>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          {typeFilters.map((filter) => {
            const href = buildListHref("/admin/inscripciones", {
              q: query || undefined,
              type: filter.value !== "all" ? filter.value : undefined,
            });
            const isActive = type === filter.value;

            return (
              <Link
                key={filter.value}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-extrabold transition ${
                  isActive
                    ? "border-[var(--ivbcc-gold)] bg-[var(--ivbcc-gold)] text-[var(--ivbcc-navy)]"
                    : "border-[var(--ivbcc-line)] bg-white/70 text-[var(--ivbcc-muted)] hover:bg-white"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </AdminPanelCard>

      {showEvents && (
        <AdminPanelCard>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title text-xl text-[var(--ivbcc-ink)]">
                Inscripciones a eventos
              </h2>
              <p className="muted-copy mt-1 text-sm">
                Registros públicos recibidos desde los formularios de eventos.
              </p>
            </div>
            <a
              href={`/api/export/inscripciones-eventos${query ? `?q=${encodeURIComponent(query)}` : ""}`}
              className="rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
            >
              Exportar CSV
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--ivbcc-line)] text-sm">
              <thead>
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                  <th className="pb-3 pr-4">Nombre</th>
                  <th className="pb-3 pr-4">Correo</th>
                  <th className="pb-3 pr-4">Teléfono</th>
                  <th className="pb-3 pr-4">Evento</th>
                  <th className="pb-3">Fecha de inscripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ivbcc-line)]">
                {events.map((registration) => (
                  <tr key={registration.id} className="align-top text-[var(--ivbcc-muted)]">
                    <td className="py-4 pr-4 font-semibold text-[var(--ivbcc-ink)]">
                      {registration.full_name}
                    </td>
                    <td className="py-4 pr-4">{registration.email}</td>
                    <td className="py-4 pr-4">{registration.phone || "Sin teléfono"}</td>
                    <td className="py-4 pr-4">{registration.event_title}</td>
                    <td className="py-4">{formatDateColombia(registration.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {events.length === 0 && (
            <AdminEmptyState
              title="No se encontraron inscripciones a eventos"
              description="Ajusta la búsqueda para ver otros registros."
              icon="calendar"
            />
          )}

          <div className="mt-4">
            <AdminPagination
              page={eventsPage}
              totalPages={eventsTotalPages}
              totalItems={eventsTotalItems}
              pageSize={PAGE_SIZE}
              buildHref={buildEventsHref}
            />
          </div>
        </AdminPanelCard>
      )}

      {showCourses && (
        <AdminPanelCard>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title text-xl text-[var(--ivbcc-ink)]">
                Inscripciones a cursos
              </h2>
              <p className="muted-copy mt-1 text-sm">
                Usuarios inscritos en los cursos de formación.
              </p>
            </div>
            <a
              href={`/api/export/inscripciones-cursos${query ? `?q=${encodeURIComponent(query)}` : ""}`}
              className="rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
            >
              Exportar CSV
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--ivbcc-line)] text-sm">
              <thead>
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                  <th className="pb-3 pr-4">Usuario</th>
                  <th className="pb-3 pr-4">Curso</th>
                  <th className="pb-3">Fecha de inscripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ivbcc-line)]">
                {courses.map((enrollment) => (
                  <tr key={enrollment.id} className="align-top text-[var(--ivbcc-muted)]">
                    <td className="py-4 pr-4 font-semibold text-[var(--ivbcc-ink)]">
                      {enrollment.student_name}
                    </td>
                    <td className="py-4 pr-4">{enrollment.course_title}</td>
                    <td className="py-4">{formatDateColombia(enrollment.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {courses.length === 0 && (
            <AdminEmptyState
              title="No se encontraron inscripciones a cursos"
              description="Ajusta la búsqueda para ver otros registros."
              icon="book"
            />
          )}

          <div className="mt-4">
            <AdminPagination
              page={coursesPage}
              totalPages={coursesTotalPages}
              totalItems={coursesTotalItems}
              pageSize={PAGE_SIZE}
              buildHref={buildCoursesHref}
            />
          </div>
        </AdminPanelCard>
      )}
    </AdminPageShell>
  );
}
