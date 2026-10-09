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
  quoteFilterValue,
  type AdminListSearchParams,
} from "@/lib/admin-query";
import { formatColombianPesos } from "@/lib/donations";
import { DonationTabs } from "../DonationTabs";
import DonationsRegistryPanel, {
  type DonationRow,
} from "./DonationsRegistryPanel";

export const revalidate = 0;

const PAGE_SIZE = 15;

const donationSelect =
  "id,reference_code,first_name,last_name,email,phone,amount,method_title,receipt_path,status,admin_note,verified_at,created_at";

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminDonacionesRegistroPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const rawStatus = getParam(params, "status") || "all";
  const validStatuses = ["pending", "verified", "rejected"] as const;
  const statusFilter = (validStatuses as readonly string[]).includes(rawStatus)
    ? (rawStatus as (typeof validStatuses)[number])
    : "all";

  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  // Consulta resumen con la función get_donation_summary()
  const summaryPromise = supabase.rpc("get_donation_summary");

  // Consulta de donaciones con filtros y búsqueda
  let dataQuery = supabase
    .from("donations")
    .select(donationSelect)
    .order("created_at", { ascending: false })
    .range(from, to);

  let countQuery = supabase
    .from("donations")
    .select("*", { count: "exact", head: true });

  if (statusFilter !== "all") {
    dataQuery = dataQuery.eq("status", statusFilter);
    countQuery = countQuery.eq("status", statusFilter);
  }

  if (query) {
    const likeVal = quoteFilterValue(`%${query}%`);
    const orCondition = `first_name.ilike.${likeVal},last_name.ilike.${likeVal},reference_code.ilike.${likeVal},method_title.ilike.${likeVal}`;
    dataQuery = dataQuery.or(orCondition);
    countQuery = countQuery.or(orCondition);
  }

  const [{ data: summaryRows, error: summaryError }, { data, error }, { count }] =
    await Promise.all([summaryPromise, dataQuery, countQuery]);

  if (error || summaryError) {
    console.error("Error al cargar registro de donaciones:", error || summaryError);
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

  const summary = (summaryRows?.[0] as {
    total_verificado: number | string;
    cantidad_verificadas: number | string;
    total_verificado_mes_actual: number | string;
    cantidad_pendientes: number | string;
    total_pendiente: number | string;
    cantidad_rechazadas: number | string;
  }) || {
    total_verificado: 0,
    cantidad_verificadas: 0,
    total_verificado_mes_actual: 0,
    cantidad_pendientes: 0,
    total_pendiente: 0,
    cantidad_rechazadas: 0,
  };

  const donations = (data || []) as DonationRow[];
  const totalItems = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

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

      {/* Tarjetas de métricas calculadas por get_donation_summary() */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminMetricCard
          label="Total verificado"
          value={formatColombianPesos(Number(summary.total_verificado))}
          detail={`${summary.cantidad_verificadas} aprobadas`}
          icon="check"
          tone="gold"
        />

        <AdminMetricCard
          label="Verificado este mes"
          value={formatColombianPesos(Number(summary.total_verificado_mes_actual))}
          detail="Mes en curso"
          icon="analytics"
          tone="navy"
        />

        <AdminMetricCard
          label="Aportes verificados"
          value={Number(summary.cantidad_verificadas)}
          detail="Total histórico"
          icon="check"
          tone="slate"
        />

        <AdminMetricCard
          label="Pendientes por conciliar"
          value={Number(summary.cantidad_pendientes)}
          detail={`Valor: ${formatColombianPesos(Number(summary.total_pendiente))}`}
          icon="spark"
          tone="slate"
        />

        <AdminMetricCard
          label="Rechazadas"
          value={Number(summary.cantidad_rechazadas)}
          detail="Transferencias no coincidentes"
          icon="close"
          tone="slate"
        />
      </section>

      {/* Panel de registro con filtros, búsqueda, tabla y comprobantes */}
      <DonationsRegistryPanel
        initialDonations={donations}
        query={query}
        status={statusFilter}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />
    </AdminPageShell>
  );
}
