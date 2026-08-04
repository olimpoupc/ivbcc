import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
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
import DownloadRegistrationsCsvButton from "./DownloadRegistrationsCsvButton";

const PAGE_SIZE = 10;
const CSV_EXPORT_LIMIT = 20000;

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<AdminListSearchParams>;
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function EventoInscritosPage({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;
  const query = getParam(search, "q")?.trim() || "";
  const page = getPageParam(search);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("event_registrations")
    .select("id,full_name,email,phone,created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);

  if (query) {
    const likeValue = quoteFilterValue(`%${query}%`);
    const orFilter = `full_name.ilike.${likeValue},email.ilike.${likeValue}`;
    dataQuery = dataQuery.or(orFilter);
    filteredCountQuery = filteredCountQuery.or(orFilter);
  }

  const [
    { data: evento, error: eventError },
    { data: inscritos, error: registrationsError },
    { count: filteredCount },
    { count: totalCount },
    { data: csvRows },
  ] = await Promise.all([
    supabase.from("events").select("id,title").eq("id", id).maybeSingle(),
    dataQuery,
    filteredCountQuery,
    supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id),
    supabase
      .from("event_registrations")
      .select("full_name,email,phone,created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(CSV_EXPORT_LIMIT),
  ]);

  if (eventError || !evento) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Eventos"
          title="Evento no encontrado"
          icon="calendar"
          actions={
            <AdminActionButton href="/admin/eventos" icon="arrow" tone="outline">
              Volver a eventos
            </AdminActionButton>
          }
        />
      </AdminPageShell>
    );
  }

  if (registrationsError) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Eventos"
          title="Inscritos del evento"
          subtitle="No fue posible cargar los inscritos."
          icon="calendar"
        />
      </AdminPageShell>
    );
  }

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) =>
    buildListHref(`/admin/eventos/${id}/inscritos`, {
      q: query || undefined,
      page: targetPage > 1 ? String(targetPage) : undefined,
    });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Eventos"
        title="Inscritos del evento"
        subtitle={evento.title}
        icon="calendar"
        actions={
          <>
            <DownloadRegistrationsCsvButton registrations={csvRows || []} />
            <AdminActionButton href="/admin/eventos" icon="arrow" tone="outline">
              Volver a eventos
            </AdminActionButton>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Total de inscritos"
          value={totalCount || 0}
          detail="Registros recibidos"
          icon="users"
          tone="slate"
        />
      </section>

      <AdminPanelCard className="p-5">
        <form className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Buscar por nombre o correo
            </label>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Escribe para encontrar un inscrito"
              className="h-12 w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
            />
          </div>

          <button
            type="submit"
            className="h-12 rounded-full bg-[var(--ivbcc-navy)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)]"
          >
            Buscar
          </button>
        </form>
      </AdminPanelCard>

      <AdminPanelCard className="overflow-hidden p-0">
        <div className="hidden grid-cols-12 border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-muted)] lg:grid">
          <div className="col-span-3">Nombre completo</div>
          <div className="col-span-3">Correo</div>
          <div className="col-span-2">Teléfono</div>
          <div className="col-span-4">Fecha de inscripción</div>
        </div>

        {inscritos?.length ? (
          inscritos.map((inscrito) => (
            <article
              key={inscrito.id}
              className="grid gap-2 border-b border-[var(--ivbcc-line)] px-5 py-4 text-sm lg:grid-cols-12 lg:items-center lg:gap-0"
            >
              <div className="font-extrabold text-[var(--ivbcc-ink)] lg:col-span-3">
                {inscrito.full_name}
              </div>
              <div className="text-[var(--ivbcc-muted)] lg:col-span-3">{inscrito.email}</div>
              <div className="text-[var(--ivbcc-muted)] lg:col-span-2">
                {inscrito.phone || "Sin teléfono"}
              </div>
              <div className="text-[var(--ivbcc-muted)] lg:col-span-4">
                {formatDateTimeColombia(inscrito.created_at)}
              </div>
            </article>
          ))
        ) : (
          <div className="p-6">
            <AdminEmptyState
              title={
                query
                  ? "No se encontraron inscritos"
                  : "Este evento aún no tiene inscritos"
              }
              description={
                query
                  ? "Ajusta la búsqueda para ver otros registros."
                  : "Cuando alguien se inscriba desde la página pública, aparecerá aquí."
              }
              icon="users"
            />
          </div>
        )}

        <div className="px-5 pb-5">
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            buildHref={buildHref}
          />
        </div>
      </AdminPanelCard>
    </AdminPageShell>
  );
}
