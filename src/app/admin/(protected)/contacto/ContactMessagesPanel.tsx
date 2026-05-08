"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthFeedback from "@/components/AuthFeedback";

type MessageStatus = "pending" | "read" | "responded" | "archived";
type MessageCategory =
  | "general"
  | "counseling"
  | "formation"
  | "events"
  | "prayer"
  | "support"
  | "other";

type ContactMessageRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  church_name: string;
  subject: string;
  category: MessageCategory;
  message: string;
  status: MessageStatus;
  admin_response: string;
  responded_at?: string | null;
  created_at?: string | null;
  created_at_label: string;
  responded_at_label: string;
};

type Props = {
  initialMessages: ContactMessageRow[];
};

const statusConfig: Record<
  MessageStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  read: {
    label: "Leído",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  responded: {
    label: "Respondido",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  archived: {
    label: "Archivado",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const categoryConfig: Record<MessageCategory, string> = {
  general: "General",
  counseling: "Consejería",
  formation: "Formación",
  events: "Eventos",
  prayer: "Petición de oración",
  support: "Soporte",
  other: "Otro",
};

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default function ContactMessagesPanel({ initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MessageStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | MessageCategory
  >("all");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    initialMessages[0]?.id || null
  );
  const [responseDraft, setResponseDraft] = useState<{
    messageId: string | null;
    value: string;
  }>({
    messageId: initialMessages[0]?.id || null,
    value: initialMessages[0]?.admin_response || "",
  });
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  }>({ type: "info", message: "" });
  const [isSaving, setIsSaving] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const matchesQuery = normalizedQuery
        ? [message.full_name, message.email, message.subject]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      const matchesStatus =
        statusFilter === "all" ? true : message.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" ? true : message.category === categoryFilter;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [messages, normalizedQuery, statusFilter, categoryFilter]);

  const activeSelectedMessageId =
    filteredMessages.find((message) => message.id === selectedMessageId)?.id ||
    filteredMessages[0]?.id ||
    null;

  const selectedMessage =
    filteredMessages.find((message) => message.id === activeSelectedMessageId) ||
    null;

  const activeResponseDraft =
    responseDraft.messageId === selectedMessage?.id
      ? responseDraft.value
      : selectedMessage?.admin_response || "";

  async function updateMessage(
    id: string,
    values: Partial<{
      status: MessageStatus;
      admin_response: string;
      responded_at: string | null;
    }>
  ) {
    setIsSaving(true);
    setFeedback({ type: "info", message: "Guardando cambios..." });

    const { data, error } = await supabase
      .from("contact_messages")
      .update(values)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    setIsSaving(false);

    if (error || !data) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error?.message || "No pudimos actualizar el mensaje.",
      });
      return null;
    }

    const nextMessage: ContactMessageRow = {
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || "",
      church_name: data.church_name || "",
      subject: data.subject,
      category: data.category,
      message: data.message,
      status: data.status,
      admin_response: data.admin_response || "",
      responded_at: data.responded_at,
      created_at: data.created_at,
      created_at_label: formatDateColombia(data.created_at),
      responded_at_label: formatDateColombia(data.responded_at),
    };

    setMessages((current) =>
      current.map((message) => (message.id === id ? nextMessage : message))
    );

    setFeedback({
      type: "success",
      message: "Cambios guardados correctamente.",
    });

    return nextMessage;
  }

  async function handleStatusChange(status: MessageStatus) {
    if (!selectedMessage) return;

    const respondedAt =
      status === "responded"
        ? new Date().toISOString()
        : status === "archived" || status === "read" || status === "pending"
          ? selectedMessage.responded_at || null
          : null;

    await updateMessage(selectedMessage.id, {
      status,
      responded_at: respondedAt,
    });
  }

  async function handleSaveResponse() {
    if (!selectedMessage) return;

    const nextResponse = activeResponseDraft.trim();

    await updateMessage(selectedMessage.id, {
      admin_response: nextResponse,
      status: "responded",
      responded_at: new Date().toISOString(),
    });

    setResponseDraft({
      messageId: selectedMessage.id,
      value: nextResponse,
    });
  }

  async function handleDelete() {
    if (!selectedMessage) return;

    const confirmed = confirm("¿Seguro que deseas eliminar este mensaje?");
    if (!confirmed) return;

    setIsSaving(true);
    setFeedback({ type: "info", message: "Eliminando mensaje..." });

    const { error } = await supabase
      .from("contact_messages")
      .delete()
      .eq("id", selectedMessage.id);

    setIsSaving(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "No pudimos eliminar el mensaje.",
      });
      return;
    }

    setMessages((current) =>
      current.filter((message) => message.id !== selectedMessage.id)
    );
    setFeedback({
      type: "success",
      message: "Mensaje eliminado correctamente.",
    });
  }

  function handleExportCsv() {
    const header = "Nombre;Correo;Teléfono;Categoría;Asunto;Estado;Fecha";
    const rows = filteredMessages.map((message) =>
      [
        message.full_name,
        message.email,
        message.phone || "",
        categoryConfig[message.category] || "Otro",
        message.subject,
        statusConfig[message.status]?.label || "Pendiente",
        message.created_at_label,
      ]
        .map((value) => escapeCsvValue(value))
        .join(";")
    );

    const csvContent = ["sep=;", header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mensajes-contacto-ivbcc.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Buscar mensajes
            </label>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por nombre, correo o asunto"
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | MessageStatus)
              }
              className="w-full rounded-lg border px-4 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="read">Leído</option>
              <option value="responded">Respondido</option>
              <option value="archived">Archivado</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Categoría
            </label>
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as "all" | MessageCategory)
              }
              className="w-full rounded-lg border px-4 py-2 text-sm"
            >
              <option value="all">Todas</option>
              {Object.entries(categoryConfig).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-lg bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </section>

      <AuthFeedback type={feedback.type} message={feedback.message} />

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-950">Mensajes recibidos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Revisa, clasifica y responde los mensajes enviados desde la página de
              contacto.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4">Nombre</th>
                  <th className="pb-3 pr-4">Correo</th>
                  <th className="pb-3 pr-4">Teléfono</th>
                  <th className="pb-3 pr-4">Categoría</th>
                  <th className="pb-3 pr-4">Asunto</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMessages.map((message) => (
                  <tr
                    key={message.id}
                    className={`cursor-pointer align-top text-gray-700 transition hover:bg-slate-50 ${
                      message.id === activeSelectedMessageId ? "bg-slate-50" : ""
                    }`}
                    onClick={() => setSelectedMessageId(message.id)}
                  >
                    <td className="py-4 pr-4 font-medium">{message.full_name}</td>
                    <td className="py-4 pr-4">{message.email}</td>
                    <td className="py-4 pr-4">
                      {message.phone || "Sin teléfono"}
                    </td>
                    <td className="py-4 pr-4">
                      {categoryConfig[message.category] || "Otro"}
                    </td>
                    <td className="py-4 pr-4">{message.subject}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig[message.status].className}`}
                      >
                        {statusConfig[message.status].label}
                      </span>
                    </td>
                    <td className="py-4">{message.created_at_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMessages.length === 0 && (
            <p className="pt-6 text-center text-sm text-gray-500">
              No se encontraron mensajes con ese criterio.
            </p>
          )}
        </article>

        <article className="rounded-xl bg-white p-6 shadow-sm">
          {selectedMessage ? (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig[selectedMessage.status].className}`}
                  >
                    {statusConfig[selectedMessage.status].label}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {categoryConfig[selectedMessage.category] || "Otro"}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold text-gray-950">
                  {selectedMessage.subject}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Recibido el {selectedMessage.created_at_label}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Nombre
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {selectedMessage.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Correo
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {selectedMessage.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Teléfono
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {selectedMessage.phone || "Sin teléfono"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Iglesia
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {selectedMessage.church_name || "No indicó iglesia"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Mensaje
                </p>
                <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-gray-700">
                  {selectedMessage.message}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleStatusChange("read")}
                  disabled={isSaving}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                >
                  Marcar como leído
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("archived")}
                  disabled={isSaving}
                  className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Archivar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  Eliminar
                </button>
              </div>

              <div className="border-t pt-6">
                <p className="text-sm font-semibold text-gray-900">
                  Respuesta administrativa
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Esta respuesta se guarda internamente por ahora.
                </p>

                <textarea
                  value={activeResponseDraft}
                  onChange={(event) =>
                    setResponseDraft({
                      messageId: selectedMessage.id,
                      value: event.target.value,
                    })
                  }
                  rows={5}
                  className="mt-4 w-full rounded-lg border px-4 py-3 text-sm"
                  placeholder="Escribe aquí la respuesta o seguimiento interno..."
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {selectedMessage.responded_at
                      ? `Respondido: ${selectedMessage.responded_at_label}`
                      : "Aún no hay respuesta registrada."}
                  </p>

                  <button
                    type="button"
                    onClick={handleSaveResponse}
                    disabled={isSaving}
                    className="rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    Guardar respuesta
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-6 py-12 text-center text-sm text-gray-500">
              Selecciona un mensaje para ver su detalle.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
