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

  const [{ data: messages, error }] =
    await Promise.all([
      supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    return <main className="p-8 text-sm text-gray-500">Error cargando mensajes.</main>;
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

  return (
    <main className="space-y-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
          Bandeja administrativa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Contacto</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Gestiona mensajes recibidos desde la página pública de contacto,
          revisa su estado y responde por correo o WhatsApp usando enlaces
          rápidos del navegador.
        </p>
      </div>

      <ContactMessagesPanel initialMessages={rows} />
    </main>
  );
}
