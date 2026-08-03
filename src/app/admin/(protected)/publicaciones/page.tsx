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
import DeletePublicationButton from "./DeletePublicationButton";
import PublishPublicationButton from "./PublishPublicationButton";

const statusConfig = {
  published: {
    label: "Publicada",
    tone: "green",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
} as const;

const categoryConfig = {
  devotional: "Devocional",
  reflection: "Reflexión",
  announcement: "Comunicado",
  bulletin: "Boletín",
  document: "Documento",
  resource: "Recurso",
  video: "Video",
};

const publicationSelect =
  "id,title,slug,summary,content,image_url,file_url,status,category,featured,published_at,created_at";

const statusFilters = [
  { label: "Todas", value: "all" },
  { label: "Publicadas", value: "published" },
  { label: "Borradores", value: "draft" },
];

const PAGE_SIZE = 9;

function formatDateTimeColombia(value?: string | null) {
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

export default async function AdminPublicacionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const selectedStatus = getParam(params, "status") || "all";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("publications")
    .select(publicationSelect)
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("publications")
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
    { data: publications, error },
    { count: filteredCount },
    { count: totalCount },
    { count: publishedCount },
    { count: draftCount },
    { count: featuredCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("publications").select("*", { count: "exact", head: true }),
    supabase
      .from("publications")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("publications")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("publications")
      .select("*", { count: "exact", head: true })
      .eq("featured", true),
  ]);

  if (error) {
    return <main className="p-8 text-sm text-gray-500">Error cargando publicaciones.</main>;
  }

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) =>
    buildListHref("/admin/publicaciones", {
      q: query || undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      page: targetPage > 1 ? String(targetPage) : undefined,
    });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar publicaciones"
        subtitle="Gestiona devocionales, reflexiones, comunicados, boletines, documentos, recursos y videos."
        icon="file"
        actions={
          <AdminActionButton href="/admin/publicaciones/crear" icon="plus" tone="gold">
            Crear publicación
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Publicaciones"
          value={totalCount || 0}
          detail="Contenido registrado"
          icon="file"
          tone="slate"
        />
        <AdminMetricCard
          label="Publicadas"
          value={publishedCount || 0}
          detail="Visibles en el sitio"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Borradores"
          value={draftCount || 0}
          detail="Pendientes"
          icon="activity"
          tone="navy"
        />
        <AdminMetricCard
          label="Destacadas"
          value={featuredCount || 0}
          detail="Marcadas como prioridad"
          icon="spark"
          tone="slate"
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
              placeholder="Escribe para encontrar una publicación"
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
            const href = buildListHref("/admin/publicaciones", {
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
        {publications?.map((publication, index) => {
          const status = publication.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;
          const category =
            categoryConfig[
              publication.category as keyof typeof categoryConfig
            ] || "Publicación";

          return (
            <article
              key={publication.id}
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-44 bg-[var(--ivbcc-paper)]">
                {publication.image_url ? (
                  <Image
                    src={publication.image_url}
                    alt={publication.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Publicaciones"
                    subtitle="Vista previa sin portada."
                    className="h-full"
                  />
                )}

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                  {publication.featured && (
                    <AdminStatusBadge tone="gold">
                      Destacada
                    </AdminStatusBadge>
                  )}
                </div>
              </div>

              <div className="flex min-h-72 flex-col p-5">
                <div className="flex-1">
                  <p className="kicker">
                    {category}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {publication.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-2 text-sm leading-6">
                    {publication.summary || publication.content || "Sin resumen"}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-[var(--ivbcc-line)] pt-4">
                  <div>
                    <p className="kicker">
                      Slug
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {publication.slug}
                    </p>
                  </div>

                  <div>
                    <p className="kicker">
                      Publicación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {formatDateTimeColombia(
                        publication.published_at || publication.created_at
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {publication.status === "draft" && (
                    <PublishPublicationButton id={publication.id} />
                  )}

                  <Link
                    href={`/admin/publicaciones/${publication.id}/editar`}
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                  >
                    Editar
                  </Link>

                  <DeletePublicationButton
                    id={publication.id}
                    imageUrl={publication.image_url}
                    fileUrl={publication.file_url}
                  />
                </div>
              </div>
            </article>
          );
        })}

        {publications?.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title={
                query || selectedStatus !== "all"
                  ? "No se encontraron publicaciones"
                  : "Aún no hay publicaciones registradas"
              }
              description={
                query || selectedStatus !== "all"
                  ? "Ajusta la búsqueda o los filtros para ver otras publicaciones."
                  : "Crea la primera publicación para alimentar el módulo público."
              }
              icon="file"
              action={
                <AdminActionButton href="/admin/publicaciones/crear" icon="plus" tone="gold">
                  Crear publicación
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
