import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminPagination,
  AdminPanelCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  buildListHref,
  getPageParam,
  getPageRange,
  getParam,
  type AdminListSearchParams,
} from "@/lib/admin-query";
import DeleteCourseButton from "./DeleteCourseButton";
import PublishCourseButton from "./PublishCourseButton";

const statusConfig = {
  published: {
    label: "Publicado",
    tone: "green",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
} as const;

const courseSelect = "id,title,slug,description,image_url,status,created_at";

const statusFilters = [
  { label: "Todos", value: "all" },
  { label: "Publicados", value: "published" },
  { label: "Borradores", value: "draft" },
];

const PAGE_SIZE = 9;

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminFormacionPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const selectedStatus = getParam(params, "status") || "all";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("courses")
    .select(courseSelect)
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("courses")
    .select("*", { count: "exact", head: true });

  if (selectedStatus !== "all") {
    dataQuery = dataQuery.eq("status", selectedStatus);
    filteredCountQuery = filteredCountQuery.eq("status", selectedStatus);
  }

  if (query) {
    const orFilter = `title.ilike.%${query}%,slug.ilike.%${query}%`;
    dataQuery = dataQuery.or(orFilter);
    filteredCountQuery = filteredCountQuery.or(orFilter);
  }

  const [
    { data: courses, error },
    { count: filteredCount },
    { count: totalCount },
    { count: publishedCount },
    { count: draftCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
  ]);

  if (error) {
    return <main className="p-8 text-sm text-gray-500">Error cargando cursos.</main>;
  }

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) =>
    buildListHref("/admin/formacion", {
      q: query || undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      page: targetPage > 1 ? String(targetPage) : undefined,
    });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar cursos"
        subtitle="Gestiona cursos publicados y borradores para el módulo de formación."
        icon="book"
        actions={
          <AdminActionButton href="/admin/formacion/crear" icon="plus" tone="gold">
            Crear curso
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Cursos totales"
          value={totalCount || 0}
          detail="Programas registrados"
          icon="book"
          tone="slate"
        />
        <AdminMetricCard
          label="Publicados"
          value={publishedCount || 0}
          detail="Disponibles para alumnos"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Borradores"
          value={draftCount || 0}
          detail="En preparación"
          icon="file"
          tone="navy"
        />
      </section>

      <AdminPanelCard>
        <form className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Buscar por título o slug
            </label>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Escribe para encontrar un curso"
              className="h-12 w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
            />
          </div>

          <input type="hidden" name="status" value={selectedStatus} />

          <button
            type="submit"
            className="h-12 rounded-full bg-[var(--ivbcc-navy)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)]"
          >
            Buscar
          </button>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const href = buildListHref("/admin/formacion", {
              q: query || undefined,
              status: filter.value !== "all" ? filter.value : undefined,
            });
            const isActive = selectedStatus === filter.value;

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

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses?.map((course, index) => {
          const status = course.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;

          return (
            <article
              key={course.id}
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-44 bg-[var(--ivbcc-paper)]">
                {course.image_url ? (
                  <Image
                    src={course.image_url}
                    alt={course.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Formación"
                    subtitle="Vista previa sin portada."
                    className="h-full"
                  />
                )}

                <span className="absolute left-4 top-4">
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                </span>
              </div>

              <div className="flex min-h-64 flex-col p-5">
                <div className="flex-1">
                  <p className="kicker">
                    {course.slug}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {course.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm leading-6">
                    {course.description}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {course.status === "draft" && (
                    <PublishCourseButton id={course.id} />
                  )}

                  <Link
                    href={`/admin/formacion/${course.id}/quizzes`}
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver quizzes
                  </Link>
                  <Link
                    href={`/admin/formacion/${course.id}/lecciones`}
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver lecciones
                  </Link>
                  <Link
                    href={`/admin/certificados?course=${course.id}`}
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver certificados emitidos
                  </Link>
                  <Link
                    href={`/admin/formacion/${course.id}/editar`}
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                  >
                    Editar
                  </Link>
                  <DeleteCourseButton id={course.id} imageUrl={course.image_url} />
                </div>
              </div>
            </article>
          );
        })}

        {courses?.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title={
                query || selectedStatus !== "all"
                  ? "No se encontraron cursos"
                  : "Aún no hay cursos registrados"
              }
              description={
                query || selectedStatus !== "all"
                  ? "Ajusta la búsqueda o los filtros para ver otros cursos."
                  : "Crea el primer curso para el módulo de formación."
              }
              icon="book"
              action={
                <AdminActionButton href="/admin/formacion/crear" icon="plus" tone="gold">
                  Crear curso
                </AdminActionButton>
              }
            />
          </div>
        )}
      </section>

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        buildHref={buildHref}
      />
    </AdminPageShell>
  );
}
