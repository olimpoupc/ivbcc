import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";
import {
  getPageParam,
  getPageRange,
  getParam,
  type AdminListSearchParams,
} from "@/lib/admin-query";
import { formatColombianPesos } from "@/lib/donations-format";
import { getDonationFilterParts, parseDonationStatus } from "@/lib/donations-query";
import {
  fetchInBatches,
  getYearOptions,
  groupDonationsByPeriod,
  resolveDateFilter,
  SUMMARY_MAX_ROWS,
  toColombiaDate,
  type DonationSummaryRow,
} from "@/lib/donations-range";
import { DonationTabs } from "../DonationTabs";
import DonationDateFilters from "./DonationDateFilters";
import DonationsMonthlySummary from "./DonationsMonthlySummary";
import DonationsRegistryPanel, {
  type DonationRow,
} from "./DonationsRegistryPanel";

export const revalidate = 0;

const PAGE_SIZE = 15;
const PATHNAME = "/admin/donaciones/registro";

const donationSelect =
  "id,reference_code,first_name,last_name,email,phone,amount,method_title,receipt_path,status,admin_note,verified_at,created_at";

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminDonacionesRegistroPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const statusFilter = parseDonationStatus(getParam(params, "status"));

  // Fechas calculadas en hora de Colombia (UTC-5)
  const today = toColombiaDate(new Date());
  const dateFilterParams = {
    periodo: getParam(params, "periodo"),
    anio: getParam(params, "anio"),
    mes: getParam(params, "mes"),
    desde: getParam(params, "desde"),
    hasta: getParam(params, "hasta"),
  };
  const dateFilter = resolveDateFilter(dateFilterParams, today);
  const filters = getDonationFilterParts({
    status: statusFilter,
    query,
    range: dateFilter.range,
  });

  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  // Listado paginado y conteo con los mismos filtros (sesión del admin + RLS)
  let dataQuery = supabase
    .from("donations")
    .select(donationSelect)
    .order("created_at", { ascending: false })
    .range(from, to);

  let countQuery = supabase
    .from("donations")
    .select("*", { count: "exact", head: true });

  if (filters.status) {
    dataQuery = dataQuery.eq("status", filters.status);
    countQuery = countQuery.eq("status", filters.status);
  }
  if (filters.orFilter) {
    dataQuery = dataQuery.or(filters.orFilter);
    countQuery = countQuery.or(filters.orFilter);
  }
  if (filters.gte) {
    dataQuery = dataQuery.gte("created_at", filters.gte);
    countQuery = countQuery.gte("created_at", filters.gte);
  }
  if (filters.lt) {
    dataQuery = dataQuery.lt("created_at", filters.lt);
    countQuery = countQuery.lt("created_at", filters.lt);
  }

  // Totales sobre TODO el rango (no solo la página visible), en lotes de 1000
  // filas con tope de 20000. Orden estable para que los lotes no se solapen.
  const summaryPromise = fetchInBatches<DonationSummaryRow>((batchFrom, batchTo) => {
    let summaryQuery = supabase
      .from("donations")
      .select("amount,status,created_at")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(batchFrom, batchTo);

    if (filters.status) summaryQuery = summaryQuery.eq("status", filters.status);
    if (filters.orFilter) summaryQuery = summaryQuery.or(filters.orFilter);
    if (filters.gte) summaryQuery = summaryQuery.gte("created_at", filters.gte);
    if (filters.lt) summaryQuery = summaryQuery.lt("created_at", filters.lt);

    return summaryQuery;
  });

  const [summaryResult, { data, error }, { count, error: countError }] = await Promise.all([
    summaryPromise,
    dataQuery,
    countQuery,
  ]);

  const loadError = error || countError || summaryResult.error;
  if (loadError) {
    console.error("Error al cargar registro de donaciones:", loadError);
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Administración"
          title="Registro de donaciones"
          subtitle="No fue posible cargar el registro de donaciones en este momento."
          icon="donation"
        />
        <DonationTabs current="registro" />
      </AdminPageShell>
    );
  }

  const grouped = groupDonationsByPeriod(summaryResult.rows, dateFilter.range, today);
  const totals = grouped.totals;

  const donations = (data || []) as DonationRow[];
  const totalItems = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Parámetros que la paginación y la búsqueda deben conservar
  const listParams: Record<string, string | undefined> = {
    periodo: dateFilterParams.periodo || undefined,
    anio: dateFilterParams.anio || undefined,
    mes: dateFilterParams.mes || undefined,
    desde: dateFilterParams.desde || undefined,
    hasta: dateFilterParams.hasta || undefined,
  };

  // El CSV recibe el rango ya resuelto (AAAA-MM-DD) y el estado actual
  const exportSearch = new URLSearchParams();
  if (query) exportSearch.set("q", query);
  if (statusFilter !== "all") exportSearch.set("estado", statusFilter);
  if (dateFilter.range.desde) exportSearch.set("desde", dateFilter.range.desde);
  if (dateFilter.range.hasta) exportSearch.set("hasta", dateFilter.range.hasta);
  const exportQueryString = exportSearch.toString();
  const exportHref = `/api/export/donations${exportQueryString ? `?${exportQueryString}` : ""}`;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Registro de donaciones"
        subtitle="Monitorea, concilia y verifica las transferencias y comprobantes enviados por los donantes."
        icon="donation"
        actions={
          <AdminActionButton href="/donaciones" icon="external" tone="outline" external>
            Ver página pública
          </AdminActionButton>
        }
      />

      <DonationTabs current="registro" />

      <DonationDateFilters
        pathname={PATHNAME}
        filter={dateFilter}
        yearOptions={getYearOptions(today)}
        query={query}
        status={statusFilter}
      />

      {summaryResult.truncated && (
        <div
          role="status"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          Este periodo tiene más de {SUMMARY_MAX_ROWS.toLocaleString("es-CO")} donaciones, así que
          los totales y el resumen solo cuentan las primeras{" "}
          {SUMMARY_MAX_ROWS.toLocaleString("es-CO")}. Elige un rango de fechas más corto para ver
          cifras exactas.
        </div>
      )}

      {/* Tarjetas: solo las donaciones verificadas suman al total */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          label="Total verificado"
          value={formatColombianPesos(totals.verifiedTotal)}
          detail={dateFilter.label}
          icon="check"
          tone="gold"
        />

        <AdminMetricCard
          label="Donaciones verificadas"
          value={totals.verifiedCount}
          detail="Cantidad en el periodo"
          icon="analytics"
          tone="navy"
        />

        <AdminMetricCard
          label="Pendientes por conciliar"
          value={totals.pendingCount}
          detail={`Valor: ${formatColombianPesos(totals.pendingTotal)}`}
          icon="spark"
          tone="slate"
        />

        <AdminMetricCard
          label="Rechazadas"
          value={totals.rejectedCount}
          detail={`Valor: ${formatColombianPesos(totals.rejectedTotal)}`}
          icon="close"
          tone="slate"
        />
      </section>

      <DonationsMonthlySummary summary={grouped} />

      {/* Panel de registro con filtros, búsqueda, tabla y comprobantes */}
      <DonationsRegistryPanel
        key={`${query}|${statusFilter}`}
        initialDonations={donations}
        query={query}
        status={statusFilter}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        listParams={listParams}
        exportHref={exportHref}
      />
    </AdminPageShell>
  );
}
