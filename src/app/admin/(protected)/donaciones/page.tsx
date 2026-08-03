import DonationMethodsPanel, {
  type DonationMethodRow,
} from "./DonationMethodsPanel";
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

export const revalidate = 0;

const donationMethodSelect =
  "id,title,method_type,description,account_holder,account_number,bank_name,document_number,phone,qr_image_url,payment_url,instructions,order_index,is_active,created_at,updated_at";

const PAGE_SIZE = 20;

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminDonacionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("donation_methods")
    .select(donationMethodSelect)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("donation_methods")
    .select("*", { count: "exact", head: true });

  if (query) {
    dataQuery = dataQuery.ilike("title", `%${query}%`);
    filteredCountQuery = filteredCountQuery.ilike("title", `%${query}%`);
  }

  const [
    { data, error },
    { count: filteredCount },
    { count: totalCount },
    { count: activeCount },
    { count: qrCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("donation_methods").select("*", { count: "exact", head: true }),
    supabase
      .from("donation_methods")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("donation_methods")
      .select("*", { count: "exact", head: true })
      .not("qr_image_url", "is", null),
  ]);

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Administración"
          title="Donaciones"
          subtitle="No fue posible cargar los métodos de donación."
          icon="donation"
        />
      </AdminPageShell>
    );
  }

  const methods = (data || []) as DonationMethodRow[];
  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Donaciones"
        subtitle="Configura métodos de donación visibles en la página pública sin quemar datos bancarios en el código."
        icon="donation"
        actions={
          <AdminActionButton href="/donaciones" icon="external" tone="outline" external>
            Ver página pública
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Métodos configurados"
          value={totalCount || 0}
          detail="Opciones registradas"
          icon="donation"
          tone="slate"
        />
        <AdminMetricCard
          label="Métodos activos"
          value={activeCount || 0}
          detail="Visibles en donaciones"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="QR configurados"
          value={qrCount || 0}
          detail="Con imagen de apoyo"
          icon="file"
          tone="navy"
        />
      </section>

      <DonationMethodsPanel
        initialMethods={methods}
        query={query}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />
    </AdminPageShell>
  );
}
