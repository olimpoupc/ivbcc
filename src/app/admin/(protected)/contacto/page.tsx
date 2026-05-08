import { createSupabaseServerClient } from "@/lib/supabase-server";
import ContactMessagesPanel from "./ContactMessagesPanel";

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

  const [{ count: totalMessages }, { data: messages, error }] =
    await Promise.all([
      supabase.from("contact_messages").select("*", { count: "exact", head: true }),
      supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    return <main className="p-8 text-sm text-gray-500">Error cargando mensajes.</main>;
  }

  const metrics = [
    { label: "Mensajes recibidos", value: totalMessages || 0 },
    {
      label: "Pendientes",
      value: (messages || []).filter((message) => message.status === "pending")
        .length,
    },
    {
      label: "Respondidos",
      value: (messages || []).filter((message) => message.status === "responded")
        .length,
    },
  ];

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
    created_at: message.created_at,
    created_at_label: formatDateColombia(message.created_at),
    responded_at_label: formatDateColombia(message.responded_at),
  }));

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-950">Contacto</h1>
        <p className="mt-2 text-gray-600">
          Gestiona mensajes recibidos desde la página pública de contacto de
          IVBCC.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-3xl font-bold text-gray-950">{metric.value}</p>
            <p className="mt-2 text-sm font-medium text-gray-500">{metric.label}</p>
          </article>
        ))}
      </section>

      <ContactMessagesPanel initialMessages={rows} />
    </main>
  );
}
