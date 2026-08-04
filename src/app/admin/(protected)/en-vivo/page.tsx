import Link from "next/link";
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
  quoteFilterValue,
  type AdminListSearchParams,
} from "@/lib/admin-query";
import DeleteLiveStreamButton from "./DeleteLiveStreamButton";
import PublishLiveStreamButton from "./PublishLiveStreamButton";

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

const categoryConfig = {
  live: "En vivo",
  sunday: "Dominical",
  preaching: "Prédica",
  teaching: "Enseñanza",
  special: "Especial",
};

const liveStreamSelect =
  "id,title,slug,description,youtube_url,status,category,is_live,featured,scheduled_at,ends_at,created_at";

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

export default async function AdminEnVivoPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const selectedStatus = getParam(params, "status") || "all";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("live_streams")
    .select(liveStreamSelect)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("live_streams")
    .select("*", { count: "exact", head: true });

  if (selectedStatus !== "all") {
    dataQuery = dataQuery.eq("status", selectedStatus);
    filteredCountQuery = filteredCountQuery.eq("status", selectedStatus);
  }

  if (query) {
    const likeValue = quoteFilterValue(`%${query}%`);
    const orFilter = `title.ilike.${likeValue},slug.ilike.${likeValue}`;
    dataQuery = dataQuery.or(orFilter);
    filteredCountQuery = filteredCountQuery.or(orFilter);
  }

  const now = new Date().toISOString();

  const [
    { data: liveStreams, error },
    { count: filteredCount },
    { count: totalCount },
    { count: activeLiveCount },
    { count: scheduledCount },
    { count: publishedCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("live_streams").select("*", { count: "exact", head: true }),
    supabase
      .from("live_streams")
      .select("*", { count: "exact", head: true })
      .eq("is_live", true),
    supabase
      .from("live_streams")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_at", now),
    supabase
      .from("live_streams")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  if (error) {
    return <main className="p-8 text-sm text-gray-500">Error cargando transmisiones.</main>;
  }

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) =>
    buildListHref("/admin/en-vivo", {
      q: query || undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      page: targetPage > 1 ? String(targetPage) : undefined,
    });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar transmisiones"
        subtitle="Gestiona transmisiones en vivo, dominicales, prédicas, enseñanzas y videos especiales de IVBCC."
        icon="stream"
        actions={
          <AdminActionButton href="/admin/en-vivo/crear" icon="plus" tone="gold">
            Crear transmisión
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Transmisiones"
          value={totalCount || 0}
          detail="Registros totales"
          icon="stream"
          tone="slate"
        />
        <AdminMetricCard
          label="En vivo"
          value={activeLiveCount || 0}
          detail="Marcadas como activas"
          icon="activity"
          tone="gold"
        />
        <AdminMetricCard
          label="Programadas"
          value={scheduledCount || 0}
          detail="Próximas emisiones"
          icon="calendar"
          tone="navy"
        />
        <AdminMetricCard
          label="Publicadas"
          value={publishedCount || 0}
          detail="Visibles públicamente"
          icon="check"
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
              placeholder="Escribe para encontrar una transmisión"
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
            const href = buildListHref("/admin/en-vivo", {
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
        {liveStreams?.map((stream) => {
          const status = stream.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;
          const category =
            categoryConfig[stream.category as keyof typeof categoryConfig] ||
            "Transmisión";

          return (
            <article
              key={stream.id}
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="flex min-h-80 flex-col p-5">
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="slate">
                    {category}
                  </AdminStatusBadge>
                  {stream.is_live && (
                    <AdminStatusBadge tone="red">
                      En vivo actual
                    </AdminStatusBadge>
                  )}
                  {stream.featured && (
                    <AdminStatusBadge tone="gold">
                      Destacado
                    </AdminStatusBadge>
                  )}
                </div>

                <div className="mt-5 flex-1">
                  <p className="kicker">
                    {stream.slug}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {stream.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm leading-6">
                    {stream.description || "Sin descripción"}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-[var(--ivbcc-line)] pt-4">
                  <div>
                    <p className="kicker">
                      Programación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {formatDateTimeColombia(stream.scheduled_at)}
                    </p>
                  </div>

                  {stream.ends_at ? (
                    <div>
                      <p className="kicker">
                        Finalización
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                        {formatDateTimeColombia(stream.ends_at)}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="kicker">
                      YouTube
                    </p>
                    <a
                      href={stream.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 line-clamp-1 block text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
                    >
                      {stream.youtube_url}
                    </a>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {stream.status === "draft" && (
                    <PublishLiveStreamButton id={stream.id} />
                  )}

                  <Link
                    href={`/admin/en-vivo/${stream.id}/editar`}
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                  >
                    Editar
                  </Link>

                  <DeleteLiveStreamButton id={stream.id} />
                </div>
              </div>
            </article>
          );
        })}

        {liveStreams?.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title={
                query || selectedStatus !== "all"
                  ? "No se encontraron transmisiones"
                  : "Aún no hay transmisiones registradas"
              }
              description={
                query || selectedStatus !== "all"
                  ? "Ajusta la búsqueda o los filtros para ver otras transmisiones."
                  : "Crea una transmisión para gestionar videos y emisiones en vivo."
              }
              icon="stream"
              action={
                <AdminActionButton href="/admin/en-vivo/crear" icon="plus" tone="gold">
                  Crear transmisión
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
