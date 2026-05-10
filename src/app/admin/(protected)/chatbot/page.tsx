import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";
import ChatbotItemsPanel, { type ChatbotItemRow } from "./ChatbotItemsPanel";

const chatbotItemSelect =
  "id,title,message,category,button_text,button_url,order_index,is_active,created_at,updated_at";

export default async function AdminChatbotPage() {
  const supabase = await createSupabaseServerClient();

  const { data: items, error } = await supabase
    .from("chatbot_items")
    .select(chatbotItemSelect)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Asistente digital"
          title="Chatbot IVBCC"
          subtitle="No fue posible cargar las respuestas del chatbot."
          icon="bot"
        />
      </AdminPageShell>
    );
  }

  const rows: ChatbotItemRow[] = (items || []).map((item) => ({
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
        eyebrow="Asistente digital"
        title="Chatbot IVBCC"
        subtitle="Gestiona respuestas rápidas para orientar a visitantes sobre horarios, eventos, formación, contacto y otros temas frecuentes."
        icon="bot"
      />

      <section className="grid gap-6 md:grid-cols-3">
        <AdminMetricCard
          label="Respuestas registradas"
          value={rows.length}
          detail="Base de conocimiento"
          icon="bot"
          tone="slate"
        />
        <AdminMetricCard
          label="Activas"
          value={activeCount}
          detail="Disponibles al visitante"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Inactivas"
          value={rows.length - activeCount}
          detail="Ocultas temporalmente"
          icon="activity"
          tone="navy"
        />
      </section>

      <ChatbotItemsPanel initialItems={rows} />
    </AdminPageShell>
  );
}
