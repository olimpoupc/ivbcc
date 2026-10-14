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
import {
  getRegistrationStatusLabel,
  parseRegistrationStatus,
  registrationStatusFilters,
} from "@/lib/registration-status";
import AttendanceButton from "./AttendanceButton";
import DownloadRegistrationsCsvButton from "./DownloadRegistrationsCsvButton";

const PAGE_SIZE = 10;
const CSV_EXPORT_LIMIT = 20000;

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<AdminListSearchParams>;
};

type RegistrationRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  status: string;
  checked_in_at: string | null;
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "confirmed") return "green" as const;
  if (status === "cancelled") return "red" as const;
  return "amber" as const;
}

export default async function EventoInscritosPage({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;
  const query = getParam(search, "q")?.trim() || "";
  const statusFilter = parseRegistrationStatus(getParam(search, "estado"));
  const page = getPageParam(search);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("event_registrations")
    .select("id,full_name,email,phone,created_at,status,checked_in_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);

  if (statusFilter !== "all") {
    dataQuery = dataQuery.eq("status", statusFilter);
    filteredCountQuery = filteredCountQuery.eq("status", statusFilter);
  }

  if (query) {
    const likeValue = quoteFilterValue(`%${query}%`);
    const orFilter = `full_name.ilike.${likeValue},email.ilike.${likeValue}`;
    dataQuery = dataQuery.or(orFilter);
    filteredCountQuery = filteredCountQuery.or(orFilter);
  }

  const baseCount = () =>
    supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id);

  const [
    { data: evento, error: eventError },
    { data: inscritos, error: registrationsError },
    { count: filteredCount },
    { count: totalCount },
    { count: confirmedCount },
    { count: attendedCount },
    { data: csvRows },
  ] = await Promise.all([
    supabase.from("events").select("id,title").eq("id", id).maybeSingle(),
    dataQuery,
    filteredCountQuery,
    baseCount().neq("status", "cancelled"),
    baseCount().eq("status", "confirmed"),
    baseCount().eq("status", "confirmed").not("checked_in_at", "is", null),
    // El CSV incluye solo inscritos confirmados.
    supabase
      .from("event_registrations")
      .select("full_name,email,phone,created_at,status,checked_in_at")
      .eq("event_id", id)
      .eq("status", "confirmed")
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

  const rows = (inscritos || []) as RegistrationRow[];
  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const basePath = `/admin/eventos/${id}/inscritos`;
  const buildHref = (targetPage: number) =>
    buildListHref(basePath, {
      q: query || undefined,
      estado: statusFilter !== "all" ? statusFilter : undefined,
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
            <AdminActionButton href={`/admin/eventos/${id}/mensajes`} icon="message" tone="outline">
              Enviar mensaje
            </AdminActionButton>
            <AdminActionButton href="/admin/eventos" icon="arrow" tone="outline">
              Volver a eventos
            </AdminActionButton>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Inscritos"
          value={totalCount || 0}
          detail="Solicitudes (pendientes y confirmadas)"
          icon="users"
          tone="slate"
        />
        <AdminMetricCard
          label="Confirmados"
          value={confirmedCount || 0}
          detail="Confirmaron desde su correo"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Asistieron"
          value={attendedCount || 0}
          detail="Asistencia marcada en el evento"
          icon="calendar"
          tone="navy"
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
          {statusFilter !== "all" && <input type="hidden" name="estado" value={statusFilter} />}

          <button
            type="submit"
            className="h-12 rounded-full bg-[var(--ivbcc-navy)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)]"
          >
            Buscar
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar por estado">
          {registrationStatusFilters.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <Link
                key={filter.value}
                href={buildListHref(basePath, {
                  q: query || undefined,
                  estado: filter.value !== "all" ? filter.value : undefined,
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
        <p className="mt-3 text-xs font-semibold text-[var(--ivbcc-muted)]">
          El CSV incluye solo los inscritos confirmados.
        </p>
      </AdminPanelCard>

      <AdminPanelCard className="overflow-hidden p-0">
        <div className="hidden grid-cols-12 border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-muted)] lg:grid">
          <div className="col-span-3">Nombre completo</div>
          <div className="col-span-3">Correo</div>
          <div className="col-span-2">Fecha de inscripción</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2 text-right">Asistencia</div>
        </div>

        {rows.length ? (
          rows.map((inscrito) => (
            <article
              key={inscrito.id}
              className="grid gap-2 border-b border-[var(--ivbcc-line)] px-5 py-4 text-sm lg:grid-cols-12 lg:items-center lg:gap-0"
            >
              <div className="lg:col-span-3">
                <p className="font-extrabold text-[var(--ivbcc-ink)]">{inscrito.full_name}</p>
                <p className="text-xs text-[var(--ivbcc-muted)]">
                  {inscrito.phone || "Sin teléfono"}
                </p>
              </div>
              <div className="break-all text-[var(--ivbcc-muted)] lg:col-span-3">
                {inscrito.email}
              </div>
              <div className="text-[var(--ivbcc-muted)] lg:col-span-2">
                {formatDateTimeColombia(inscrito.created_at)}
              </div>
              <div className="lg:col-span-2">
                <AdminStatusBadge tone={statusTone(inscrito.status)}>
                  {getRegistrationStatusLabel(inscrito.status)}
                </AdminStatusBadge>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:col-span-2 lg:justify-end">
                {inscrito.status === "confirmed" ? (
                  <>
                    {inscrito.checked_in_at && (
                      <span className="text-xs font-bold text-emerald-700">
                        Asistió · {formatDateTimeColombia(inscrito.checked_in_at)}
                      </span>
                    )}
                    <AttendanceButton
                      eventId={id}
                      registrationId={inscrito.id}
                      checkedInAt={inscrito.checked_in_at}
                    />
                  </>
                ) : (
                  <span className="text-xs text-[var(--ivbcc-muted)]">Sin confirmar</span>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="p-6">
            <AdminEmptyState
              title={
                query || statusFilter !== "all"
                  ? "No se encontraron inscritos"
                  : "Este evento aún no tiene inscritos"
              }
              description={
                query || statusFilter !== "all"
                  ? "Ajusta la búsqueda o el filtro de estado para ver otros registros."
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
