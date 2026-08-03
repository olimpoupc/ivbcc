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
import DeleteNewsButton from "./DeleteNewsButton";
import PublishNewsButton from "./PublishNewsButton";

const statusConfig = {
  published: {
    label: "Publicada",
    tone: "green",
  },
  scheduled: {
    label: "Programada",
    tone: "blue",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
} as const;

const newsSelect =
  "id,title,slug,summary,image_url,status,published_at,created_at";

const statusFilters = [
  { label: "Todas", value: "all" },
  { label: "Publicadas", value: "published" },
  { label: "Programadas", value: "scheduled" },
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

export default async function AdminNoticiasPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const selectedStatus = getParam(params, "status") || "all";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("news")
    .select(newsSelect)
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("news")
    .select("*", { count: "exact", head: true });

  if (selectedStatus !== "all") {
    if (selectedStatus === "published") {
      dataQuery = dataQuery.or("status.eq.published,status.is.null");
      filteredCountQuery = filteredCountQuery.or(
        "status.eq.published,status.is.null"
      );
    } else {
      dataQuery = dataQuery.eq("status", selectedStatus);
      filteredCountQuery = filteredCountQuery.eq("status", selectedStatus);
    }
  }

  if (query) {
    const orFilter = `title.ilike.%${query}%,slug.ilike.%${query}%`;
    dataQuery = dataQuery.or(orFilter);
    filteredCountQuery = filteredCountQuery.or(orFilter);
  }

  const [
    { data: noticias, error },
    { count: filteredCount },
    { count: totalCount },
    { count: publishedCount },
    { count: draftCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("news").select("*", { count: "exact", head: true }),
    supabase
      .from("news")
      .select("*", { count: "exact", head: true })
      .or("status.eq.published,status.is.null"),
    supabase
      .from("news")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
  ]);

  if (error) {
    return <main className="p-8 text-sm text-gray-500">Error cargando noticias.</main>;
  }

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) =>
    buildListHref("/admin/noticias", {
      q: query || undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      page: targetPage > 1 ? String(targetPage) : undefined,
    });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar noticias"
        subtitle="Administra las noticias publicadas, programadas y borradores."
        icon="news"
        actions={
          <AdminActionButton href="/admin/noticias/crear" icon="plus" tone="gold">
            Crear nueva noticia
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Noticias totales"
          value={totalCount || 0}
          detail="Entradas registradas"
          icon="news"
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
          detail="Pendientes de publicar"
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
              placeholder="Escribe para encontrar una noticia"
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
            const href = buildListHref("/admin/noticias", {
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
        {noticias?.map((noticia, index) => {
          const status = noticia.status || "published";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.published;

          return (
            <article
              key={noticia.id}
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-44 bg-[var(--ivbcc-paper)]">
                {noticia.image_url ? (
                  <Image
                    src={noticia.image_url}
                    alt={noticia.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Noticias"
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
                    {noticia.slug}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {noticia.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm leading-6">
                    {noticia.summary}
                  </p>
                </div>

                <div className="mt-5 border-t border-[var(--ivbcc-line)] pt-4">
                  <p className="kicker">
                    Publicación
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                    {formatDateTimeColombia(noticia.published_at)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {noticia.status === "draft" && (
                    <PublishNewsButton id={noticia.id} />
                  )}

                  <Link
                    href={`/admin/noticias/${noticia.id}/editar`}
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                  >
                    Editar
                  </Link>
                  <DeleteNewsButton
                    id={noticia.id}
                    imageUrl={noticia.image_url}
                  />
                </div>
              </div>
            </article>
          );
        })}

        {noticias?.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title={
                query || selectedStatus !== "all"
                  ? "No se encontraron noticias"
                  : "Aún no hay noticias registradas"
              }
              description={
                query || selectedStatus !== "all"
                  ? "Ajusta los filtros o crea una nueva noticia para el sitio público."
                  : "Crea la primera noticia para el módulo público."
              }
              icon="news"
              action={
                <AdminActionButton href="/admin/noticias/crear" icon="plus" tone="gold">
                  Crear noticia
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
