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
import DeleteEventButton from "./DeleteEventButton";
import PublishEventButton from "./PublishEventButton";

const statusConfig = {
  published: {
    label: "Publicado",
    tone: "green",
  },
  scheduled: {
    label: "Programado",
    tone: "blue",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
  cancelled: {
    label: "Cancelado",
    tone: "red",
  },
} as const;

const eventSelect =
  "id,title,slug,description,image_url,status,event_date,location,created_at";

const statusFilters = [
  { label: "Todos", value: "all" },
  { label: "Publicados", value: "published" },
  { label: "Programados", value: "scheduled" },
  { label: "Borradores", value: "draft" },
  { label: "Cancelados", value: "cancelled" },
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

export default async function AdminEventosPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const selectedStatus = getParam(params, "status") || "all";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("events")
    .select(eventSelect)
    .order("event_date", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("events")
    .select("*", { count: "exact", head: true });

  if (selectedStatus !== "all") {
    dataQuery = dataQuery.eq("status", selectedStatus);
    filteredCountQuery = filteredCountQuery.eq("status", selectedStatus);
  }

  if (query) {
    const orFilter = `title.ilike.%${query}%,location.ilike.%${query}%`;
    dataQuery = dataQuery.or(orFilter);
    filteredCountQuery = filteredCountQuery.or(orFilter);
  }

  const now = new Date().toISOString();

  const [
    { data: eventos, error },
    { count: filteredCount },
    { count: totalCount },
    { count: upcomingCount },
    { count: publishedCount },
    { count: draftCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("event_date", now),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
  ]);

  if (error) {
    return <main className="p-8 text-sm text-gray-500">Error cargando eventos.</main>;
  }

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) =>
    buildListHref("/admin/eventos", {
      q: query || undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      page: targetPage > 1 ? String(targetPage) : undefined,
    });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar eventos"
        subtitle="Gestiona eventos publicados, programados, borradores y cancelados."
        icon="calendar"
        actions={
          <AdminActionButton href="/admin/eventos/crear" icon="plus" tone="gold">
            Crear nuevo evento
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Eventos totales"
          value={totalCount || 0}
          detail="Registros creados"
          icon="calendar"
          tone="slate"
        />
        <AdminMetricCard
          label="Próximos"
          value={upcomingCount || 0}
          detail="Desde hoy en adelante"
          icon="activity"
          tone="gold"
        />
        <AdminMetricCard
          label="Publicados"
          value={publishedCount || 0}
          detail="Visibles en el sitio"
          icon="check"
          tone="navy"
        />
        <AdminMetricCard
          label="Borradores"
          value={draftCount || 0}
          detail="Pendientes de publicar"
          icon="file"
          tone="slate"
        />
      </section>

      <AdminPanelCard>
        <form className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Buscar por título o ubicación
            </label>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Escribe para encontrar un evento"
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
            const href = buildListHref("/admin/eventos", {
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
        {eventos?.map((evento, index) => {
          const status = evento.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;

          return (
            <article
              key={evento.id}
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-44 bg-[var(--ivbcc-paper)]">
                {evento.image_url ? (
                  <Image
                    src={evento.image_url}
                    alt={evento.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Eventos"
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
                    {evento.slug}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {evento.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-2 text-sm leading-6">
                    {evento.description}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-[var(--ivbcc-line)] pt-4">
                  <div>
                    <p className="kicker">
                      Fecha del evento
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {formatDateTimeColombia(evento.event_date)}
                    </p>
                  </div>

                  <div>
                    <p className="kicker">
                      Ubicación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {evento.location || "Sin ubicación"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {evento.status === "draft" && (
                    <PublishEventButton id={evento.id} />
                  )}

                  <Link
                    href={`/admin/eventos/${evento.id}/inscritos`}
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver inscritos
                  </Link>
                  <Link
                    href={`/admin/eventos/${evento.id}/editar`}
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
                  >
                    Editar
                  </Link>
                  <DeleteEventButton id={evento.id} imageUrl={evento.image_url} />
                </div>
              </div>
            </article>
          );
        })}

        {eventos?.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title={
                query || selectedStatus !== "all"
                  ? "No se encontraron eventos"
                  : "Aún no hay eventos registrados"
              }
              description={
                query || selectedStatus !== "all"
                  ? "Ajusta la búsqueda o los filtros para ver otros eventos."
                  : "Crea el primer evento para publicarlo en el sitio."
              }
              icon="calendar"
              action={
                <AdminActionButton href="/admin/eventos/crear" icon="plus" tone="gold">
                  Crear evento
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
