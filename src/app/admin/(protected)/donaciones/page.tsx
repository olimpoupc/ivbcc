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

export const revalidate = 0;

const donationMethodSelect =
  "id,title,method_type,description,account_holder,account_number,bank_name,document_number,phone,qr_image_url,payment_url,instructions,order_index,is_active,created_at,updated_at";

export default async function AdminDonacionesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("donation_methods")
    .select(donationMethodSelect)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

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
  const activeMethods = methods.filter((method) => method.is_active ?? true).length;
  const qrMethods = methods.filter((method) => method.qr_image_url).length;

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
          value={methods.length}
          detail="Opciones registradas"
          icon="donation"
          tone="slate"
        />
        <AdminMetricCard
          label="Métodos activos"
          value={activeMethods}
          detail="Visibles en donaciones"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="QR configurados"
          value={qrMethods}
          detail="Con imagen de apoyo"
          icon="file"
          tone="navy"
        />
      </section>

      <DonationMethodsPanel initialMethods={methods} />
    </AdminPageShell>
  );
}
