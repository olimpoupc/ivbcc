import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";
import ContactMessagesPanel from "./ContactMessagesPanel";

const contactMessageSelect =
  "id,full_name,email,phone,church_name,subject,category,message,status,admin_response,responded_at,updated_at,created_at";

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function AdminContactoPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: messages, error }] =
    await Promise.all([
      supabase
        .from("contact_messages")
        .select(contactMessageSelect)
        .order("created_at", { ascending: false }),
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
  }));

  const pendingMessages = rows.filter((message) => message.status === "pending").length;
  const respondedMessages = rows.filter((message) => message.status === "responded").length;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Bandeja administrativa"
        title="Contacto"
        subtitle="Gestiona mensajes recibidos desde la página pública de contacto, revisa su estado y responde por correo o WhatsApp usando enlaces rápidos del navegador."
        icon="message"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Mensajes recibidos"
          value={rows.length}
          detail="Total histórico visible"
          icon="message"
          tone="slate"
        />
        <AdminMetricCard
          label="Pendientes"
          value={pendingMessages}
          detail="Requieren atención"
          icon="activity"
          tone="gold"
        />
        <AdminMetricCard
          label="Respondidos"
          value={respondedMessages}
          detail="Seguimiento completado"
          icon="check"
          tone="navy"
        />
      </section>

      <ContactMessagesPanel initialMessages={rows} />
    </AdminPageShell>
  );
}
