import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AdminPageHeader, AdminPageShell, AdminPanelCard } from "@/components/admin/AdminPrimitives";
import { buildListHref, getParam, type AdminListSearchParams } from "@/lib/admin-query";
import CourseEnrollmentsSection from "./CourseEnrollmentsSection";
import EventRegistrationsSection from "./EventRegistrationsSection";

const typeFilters = [
  { label: "Todas", value: "all" },
  { label: "Eventos", value: "events" },
  { label: "Cursos", value: "courses" },
];

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminInscripcionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawType = getParam(params, "type") || "all";
  const type = typeFilters.some((filter) => filter.value === rawType) ? rawType : "all";
  const supabase = await createSupabaseServerClient();

  // Cada sección conserva en sus enlaces y formularios los filtros de la otra.
  const typeParam = type !== "all" ? type : undefined;
  const eventParams = {
    evento: getParam(params, "evento"),
    estado: getParam(params, "estado"),
    q: getParam(params, "q"),
    eventsPage: getParam(params, "eventsPage"),
  };
  const courseParams = {
    curso: getParam(params, "curso"),
    progreso: getParam(params, "progreso"),
    coursesPage: getParam(params, "coursesPage"),
  };

  const showEvents = type === "all" || type === "events";
  const showCourses = type === "all" || type === "courses";

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Inscripciones"
        subtitle="Gestiona las inscripciones a eventos y el avance de los estudiantes en los cursos."
        icon="users"
      />

      <AdminPanelCard>
        <div className="flex flex-wrap gap-2" aria-label="Tipo de inscripción">
          {typeFilters.map((filter) => {
            const isActive = type === filter.value;
            return (
              <Link
                key={filter.value}
                href={buildListHref("/admin/inscripciones", {
                  ...eventParams,
                  ...courseParams,
                  type: filter.value !== "all" ? filter.value : undefined,
                })}
                aria-current={isActive ? "true" : undefined}
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
        <EventRegistrationsSection
          supabase={supabase}
          params={params}
          keepParams={{ type: typeParam, ...courseParams }}
        />
      )}

      {showCourses && (
        <CourseEnrollmentsSection
          supabase={supabase}
          params={params}
          keepParams={{ type: typeParam, ...eventParams }}
        />
      )}
    </AdminPageShell>
  );
}
