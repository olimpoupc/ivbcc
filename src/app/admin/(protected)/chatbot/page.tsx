import { createSupabaseServerClient } from "@/lib/supabase-server";
import ChatbotItemsPanel, { type ChatbotItemRow } from "./ChatbotItemsPanel";

export default async function AdminChatbotPage() {
  const supabase = await createSupabaseServerClient();

  const { data: items, error } = await supabase
    .from("chatbot_items")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <main className="p-8 text-sm text-gray-500">
        Error cargando respuestas del chatbot.
      </main>
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
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-950">Chatbot IVBCC</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Gestiona respuestas rápidas para orientar a visitantes sobre horarios,
          eventos, formación, contacto y otros temas frecuentes.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-gray-950">{rows.length}</p>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Respuestas registradas
          </p>
        </article>
        <article className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-gray-950">{activeCount}</p>
          <p className="mt-2 text-sm font-medium text-gray-500">Activas</p>
        </article>
        <article className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-gray-950">
            {rows.length - activeCount}
          </p>
          <p className="mt-2 text-sm font-medium text-gray-500">Inactivas</p>
        </article>
      </section>

      <ChatbotItemsPanel initialItems={rows} />
    </main>
  );
}
