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
import ContactMessagesPanel from "./ContactMessagesPanel";

const contactMessageSelect =
  "id,full_name,email,phone,church_name,subject,category,message,status,admin_response,responded_at,updated_at,created_at";

const replySelect =
  "id,contact_message_id,subject,body,status,sent_by_email,error_message,created_at";

const PAGE_SIZE = 10;

const validStatuses = ["pending", "read", "responded", "archived"] as const;
const validCategories = [
  "general",
  "counseling",
  "formation",
  "events",
  "prayer",
  "support",
  "other",
] as const;

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

type Props = {
  searchParams?: Promise<AdminListSearchParams>;
};

export default async function AdminContactoPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = getParam(params, "q")?.trim() || "";
  const rawStatus = getParam(params, "status") || "all";
  const rawCategory = getParam(params, "category") || "all";
  const statusFilter = (validStatuses as readonly string[]).includes(rawStatus)
    ? (rawStatus as (typeof validStatuses)[number])
    : "all";
  const categoryFilter = (validCategories as readonly string[]).includes(rawCategory)
    ? (rawCategory as (typeof validCategories)[number])
    : "all";
  const page = getPageParam(params);
  const { from, to } = getPageRange(page, PAGE_SIZE);

  const supabase = await createSupabaseServerClient();

  let dataQuery = supabase
    .from("contact_messages")
    .select(contactMessageSelect)
    .order("created_at", { ascending: false })
    .range(from, to);

  let filteredCountQuery = supabase
    .from("contact_messages")
    .select("*", { count: "exact", head: true });

  if (statusFilter !== "all") {
    dataQuery = dataQuery.eq("status", statusFilter);
    filteredCountQuery = filteredCountQuery.eq("status", statusFilter);
  }

  if (categoryFilter !== "all") {
    dataQuery = dataQuery.eq("category", categoryFilter);
    filteredCountQuery = filteredCountQuery.eq("category", categoryFilter);
  }

  if (query) {
    const orFilter = `full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,subject.ilike.%${query}%,message.ilike.%${query}%`;
    dataQuery = dataQuery.or(orFilter);
    filteredCountQuery = filteredCountQuery.or(orFilter);
  }

  const [
    { data: messages, error },
    { count: filteredCount },
    { count: totalCount },
    { count: pendingCount },
    { count: respondedCount },
  ] = await Promise.all([
    dataQuery,
    filteredCountQuery,
    supabase.from("contact_messages").select("*", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "responded"),
  ]);

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Bandeja administrativa"
          title="Contacto"
          subtitle="No fue posible cargar los mensajes en este momento."
          icon="message"
        />
      </AdminPageShell>
    );
  }

  const messageIds = (messages || []).map((message) => message.id);
  const { data: replies } =
    messageIds.length > 0
      ? await supabase
          .from("contact_message_replies")
          .select(replySelect)
          .in("contact_message_id", messageIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const repliesByMessageId = new Map<string, typeof replies>();
  for (const reply of replies || []) {
    const list = repliesByMessageId.get(reply.contact_message_id) || [];
    list.push(reply);
    repliesByMessageId.set(reply.contact_message_id, list);
  }

  const rows = (messages || []).map((message) => ({
    id: message.id,
    full_name: message.full_name,
    email: message.email,
    phone: message.phone || "",
    church_name: message.church_name || "",
    subject: message.subject,
    category: message.category,
    message: message.message,
    status: message.status,
    admin_response: message.admin_response || "",
    responded_at: message.responded_at,
    updated_at: message.updated_at,
    created_at: message.created_at,
    created_at_label: formatDateColombia(message.created_at),
    responded_at_label: formatDateColombia(message.responded_at),
    updated_at_label: formatDateColombia(message.updated_at),
    replies: (repliesByMessageId.get(message.id) || []).map((reply) => ({
      id: reply.id,
      subject: reply.subject,
      body: reply.body,
      status: reply.status,
      sent_by_email: reply.sent_by_email,
      error_message: reply.error_message,
      created_at_label: formatDateColombia(reply.created_at),
    })),
  }));

  const totalItems = filteredCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Bandeja administrativa"
        title="Contacto"
        subtitle="Gestiona mensajes recibidos desde la página pública de contacto, revisa su estado y responde por correo o WhatsApp."
        icon="message"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Mensajes recibidos"
          value={totalCount || 0}
          detail="Total histórico"
          icon="message"
          tone="slate"
        />
        <AdminMetricCard
          label="Pendientes"
          value={pendingCount || 0}
          detail="Requieren atención"
          icon="activity"
          tone="gold"
        />
        <AdminMetricCard
          label="Respondidos"
          value={respondedCount || 0}
          detail="Seguimiento completado"
          icon="check"
          tone="navy"
        />
      </section>

      <ContactMessagesPanel
        messages={rows}
        query={query}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />
    </AdminPageShell>
  );
}
