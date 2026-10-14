import Link from "next/link";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPagination,
  AdminPanelCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import { adminInputClass, adminSelectClass } from "@/components/admin/AdminFormPrimitives";
import { buildListHref, getPageRange, type AdminListSearchParams } from "@/lib/admin-query";
import {
  buildRegistrationStats,
  eventListStatusOptions,
  getEventRegistrationFilterParts,
  isPendingLinkExpired,
  parseEventRegistrationFilters,
  REGISTRATIONS_PAGE_SIZE,
} from "@/lib/admin-registrations";
import { getRegistrationStatusLabel } from "@/lib/registration-status";
import type { createSupabaseServerClient } from "@/lib/supabase-server";
import RegistrationActionsMenu from "./RegistrationActionsMenu";

type SessionClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type RegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  status: string;
  checked_in_at: string | null;
  confirmation_expires_at: string | null;
  events: { title: string } | null;
};

type Props = {
  supabase: SessionClient;
  params: AdminListSearchParams | undefined;
  /** Parámetros de la otra sección, para conservarlos en los enlaces. */
  keepParams: Record<string, string | undefined>;
};

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function statusTone(status: string, expired: boolean) {
  if (status === "confirmed") return "green" as const;
  if (status === "cancelled") return "red" as const;
  return expired ? ("slate" as const) : ("amber" as const);
}

export default async function EventRegistrationsSection({ supabase, params, keepParams }: Props) {
  const { data: eventOptions } = await supabase
    .from("events")
    .select("id,title,event_date")
    .order("event_date", { ascending: false })
    .limit(500);
  const events = eventOptions || [];

  const filters = parseEventRegistrationFilters(
    params,
    events.map((event) => event.id as string)
  );
  const parts = getEventRegistrationFilterParts(filters);
  const range = getPageRange(filters.page, REGISTRATIONS_PAGE_SIZE);

  let dataQuery = supabase
    .from("event_registrations")
    .select(
      "id,event_id,full_name,email,phone,created_at,status,checked_in_at,confirmation_expires_at,events(title)"
    )
    .order("created_at", { ascending: false })
    .range(range.from, range.to);
  let countQuery = supabase.from("event_registrations").select("id", { count: "exact", head: true });

  if (parts.eventId) {
    dataQuery = dataQuery.eq("event_id", parts.eventId);
    countQuery = countQuery.eq("event_id", parts.eventId);
  }
  if (parts.status) {
    dataQuery = dataQuery.eq("status", parts.status);
    countQuery = countQuery.eq("status", parts.status);
  }
  if (parts.attendedOnly) {
    dataQuery = dataQuery.not("checked_in_at", "is", null);
    countQuery = countQuery.not("checked_in_at", "is", null);
  }
  if (parts.orFilter) {
    dataQuery = dataQuery.or(parts.orFilter);
    countQuery = countQuery.or(parts.orFilter);
  }

  // Estadísticas: solo dependen del evento seleccionado.
  const statQuery = () => {
    const query = supabase.from("event_registrations").select("id", { count: "exact", head: true });
    return parts.eventId ? query.eq("event_id", parts.eventId) : query;
  };

  const [
    { data: rows, error },
    { count: filteredCount },
    { count: pending },
    { count: confirmed },
    { count: cancelled },
    { count: attended },
  ] = await Promise.all([
    dataQuery,
    countQuery,
    statQuery().eq("status", "pending"),
    statQuery().eq("status", "confirmed"),
    statQuery().eq("status", "cancelled"),
    statQuery().eq("status", "confirmed").not("checked_in_at", "is", null),
  ]);

  if (error) {
    return (
      <AdminPanelCard>
        <p className="text-sm text-[var(--ivbcc-muted)]">No fue posible cargar las inscripciones a eventos.</p>
      </AdminPanelCard>
    );
  }

  const stats = buildRegistrationStats({
    pending: pending || 0,
    confirmed: confirmed || 0,
    cancelled: cancelled || 0,
    attended: attended || 0,
  });
  const registrations = (rows || []) as unknown as RegistrationRow[];
  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / REGISTRATIONS_PAGE_SIZE));
  const selectedEvent = events.find((event) => event.id === filters.eventId);

  const currentParams = {
    ...keepParams,
    evento: filters.eventId || undefined,
    estado: filters.status !== "all" ? filters.status : undefined,
    q: filters.query || undefined,
  };
  const buildPageHref = (page: number) =>
    buildListHref("/admin/inscripciones", {
      ...currentParams,
      eventsPage: page > 1 ? String(page) : undefined,
    });
  const exportHref = buildListHref("/api/export/inscripciones-eventos", {
    evento: filters.eventId || undefined,
    estado: filters.status,
    q: filters.query || undefined,
  });

  return (
    <>
      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        aria-label="Resumen de inscripciones a eventos"
      >
        <AdminMetricCard label="Inscritos" value={stats.total} detail={selectedEvent ? selectedEvent.title : "Todos los eventos"} icon="users" tone="navy" />
        <AdminMetricCard label="Confirmados" value={stats.confirmed} detail="Confirmaron por correo o el equipo" icon="check" tone="gold" />
        <AdminMetricCard label="Pendientes" value={stats.pending} detail="Sin confirmar" icon="message" tone="slate" />
        <AdminMetricCard label="Cancelados" value={stats.cancelled} detail="Cancelados por el equipo" icon="close" tone="slate" />
        <AdminMetricCard label="Asistieron" value={stats.attended} detail="Asistencia marcada" icon="calendar" tone="slate" />
        <AdminMetricCard label="% de asistencia" value={`${stats.attendanceRate}%`} detail="Asistieron / confirmados" icon="analytics" tone="slate" />
      </section>

      <AdminPanelCard>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title text-xl text-[var(--ivbcc-ink)]">Inscripciones a eventos</h2>
            <p className="muted-copy mt-1 text-sm">
              Filtra por evento y estado. El CSV respeta los filtros aplicados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedEvent && (
              <AdminActionButton href={`/admin/eventos/${selectedEvent.id}/mensajes`} icon="message" tone="outline">
                Enviar mensaje
              </AdminActionButton>
            )}
            <a
              href={exportHref}
              className="rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
            >
              Exportar CSV
            </a>
          </div>
        </div>

        <form className="mb-5 grid gap-3 md:grid-cols-[1.2fr_0.8fr_1.2fr_auto] md:items-end">
          {Object.entries(keepParams).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null
          )}
          <label className="block text-sm font-extrabold text-[var(--ivbcc-ink)]">
            Evento
            <select name="evento" defaultValue={filters.eventId || ""} className={`${adminSelectClass} mt-2`}>
              <option value="">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-extrabold text-[var(--ivbcc-ink)]">
            Estado
            <select name="estado" defaultValue={filters.status} className={`${adminSelectClass} mt-2`}>
              {eventListStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-extrabold text-[var(--ivbcc-ink)]">
            Buscar por nombre o correo
            <input
              type="search"
              name="q"
              defaultValue={filters.query}
              maxLength={100}
              placeholder="Ejemplo: maria@gmail.com"
              className={`${adminInputClass} mt-2`}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-12 rounded-full bg-[var(--ivbcc-navy)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)]"
            >
              Filtrar
            </button>
            <Link
              href={buildListHref("/admin/inscripciones", keepParams)}
              className="inline-flex h-12 items-center rounded-full border border-[var(--ivbcc-line)] px-4 text-sm font-extrabold text-[var(--ivbcc-muted)] hover:bg-white"
            >
              Limpiar
            </Link>
          </div>
        </form>

        <div className="overflow-x-auto pb-40 lg:overflow-visible lg:pb-0">
          <table className="min-w-full divide-y divide-[var(--ivbcc-line)] text-sm">
            <thead>
              <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                <th className="pb-3 pr-4">Nombre</th>
                <th className="pb-3 pr-4">Correo</th>
                <th className="pb-3 pr-4">Teléfono</th>
                <th className="pb-3 pr-4">Evento</th>
                <th className="pb-3 pr-4">Estado</th>
                <th className="pb-3 pr-4">Asistencia</th>
                <th className="pb-3 pr-4">Fecha</th>
                <th className="pb-3 text-right">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ivbcc-line)]">
              {registrations.map((registration) => {
                const expired = isPendingLinkExpired(registration);
                return (
                  <tr key={registration.id} className="align-top text-[var(--ivbcc-muted)]">
                    <td className="py-4 pr-4 font-semibold text-[var(--ivbcc-ink)]">{registration.full_name}</td>
                    <td className="py-4 pr-4 break-all">{registration.email}</td>
                    <td className="py-4 pr-4 whitespace-nowrap">{registration.phone || "Sin teléfono"}</td>
                    <td className="py-4 pr-4">
                      <Link
                        href={buildListHref("/admin/inscripciones", {
                          ...keepParams,
                          evento: registration.event_id,
                        })}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        {registration.events?.title || "Evento"}
                      </Link>
                    </td>
                    <td className="py-4 pr-4">
                      <AdminStatusBadge tone={statusTone(registration.status, expired)}>
                        {getRegistrationStatusLabel(registration.status)}
                        {expired ? " · enlace vencido" : ""}
                      </AdminStatusBadge>
                    </td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      {registration.checked_in_at ? (
                        <span className="font-bold text-emerald-700">Asistió</span>
                      ) : registration.status === "confirmed" ? (
                        "No registrada"
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4 pr-4 whitespace-nowrap">{formatDateColombia(registration.created_at)}</td>
                    <td className="py-4 text-right">
                      <RegistrationActionsMenu
                        registrationId={registration.id}
                        eventId={registration.event_id}
                        fullName={registration.full_name}
                        status={registration.status}
                        checkedIn={Boolean(registration.checked_in_at)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {registrations.length === 0 && (
          <AdminEmptyState
            title="No se encontraron inscripciones a eventos"
            description="Ajusta los filtros para ver otros registros."
            icon="calendar"
          />
        )}

        <div className="mt-4">
          <AdminPagination
            page={filters.page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={REGISTRATIONS_PAGE_SIZE}
            buildHref={buildPageHref}
          />
        </div>
      </AdminPanelCard>
    </>
  );
}
