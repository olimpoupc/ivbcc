import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
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
import HelpCenterItemsPanel, { type HelpCenterItemRow } from "./HelpCenterItemsPanel";

const helpCenterItemSelect =
  "id,title,message,category,button_text,button_url,order_index,is_active,created_at,updated_at";

const PAGE_SIZE = 20;

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminHelpCenterPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("help_center_items")
    .select(helpCenterItemSelect)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("help_center_items")
    .select("*", { count: "exact", head: true });

  if (query) {
    dataQuery = dataQuery.ilike("title", `%${query}%`);
    filteredCountQuery = filteredCountQuery.ilike("title", `%${query}%`);
  }

  const [
    { data: items, error },
    { count: filteredCount },
    { count: totalCount },
    { count: activeCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("help_center_items").select("*", { count: "exact", head: true }),
    supabase
      .from("help_center_items")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

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

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

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
          value={totalCount || 0}
          detail="Base de conocimiento"
          icon="spark"
          tone="slate"
        />
        <AdminMetricCard
          label="Activo"
          value={activeCount || 0}
          detail="Visible para el visitante"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Inactivo"
          value={(totalCount || 0) - (activeCount || 0)}
          detail="Oculto temporalmente"
          icon="activity"
          tone="navy"
        />
      </section>

      <HelpCenterItemsPanel
        initialItems={rows}
        query={query}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />
    </AdminPageShell>
  );
}
