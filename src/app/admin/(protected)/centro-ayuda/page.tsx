import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";
import HelpCenterItemsPanel, { type HelpCenterItemRow } from "./HelpCenterItemsPanel";

const helpCenterItemSelect =
  "id,title,message,category,button_text,button_url,order_index,is_active,created_at,updated_at";

export default async function AdminHelpCenterPage() {
  const supabase = await createSupabaseServerClient();

  const { data: items, error } = await supabase
    .from("help_center_items")
    .select(helpCenterItemSelect)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Autoservicio para visitantes"
          title="Centro de Ayuda"
          subtitle="No fue posible cargar el contenido del centro de ayuda."
          icon="spark"
        />
      </AdminPageShell>
    );
  }

  const rows: HelpCenterItemRow[] = (items || []).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    category: item.category,
    button_text: item.button_text || "",
    button_url: item.button_url || "",
    order_index: item.order_index || 0,
    is_active: Boolean(item.is_active),
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));

  const activeCount = rows.filter((item) => item.is_active).length;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Autoservicio para visitantes"
        title="Centro de Ayuda"
        subtitle="Gestiona el contenido que guía a los visitantes por categorías (horarios, ubicación, ministerios, donaciones, eventos, formación y más) antes de derivarlos a WhatsApp."
        icon="spark"
      />

      <section className="grid gap-6 md:grid-cols-3">
        <AdminMetricCard
          label="Contenido registrado"
          value={rows.length}
          detail="Base de conocimiento"
          icon="spark"
          tone="slate"
        />
        <AdminMetricCard
          label="Activo"
          value={activeCount}
          detail="Visible para el visitante"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Inactivo"
          value={rows.length - activeCount}
          detail="Oculto temporalmente"
          icon="activity"
          tone="navy"
        />
      </section>

      <HelpCenterItemsPanel initialItems={rows} />
    </AdminPageShell>
  );
}
