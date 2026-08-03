"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthFeedback from "@/components/AuthFeedback";
import {
  AdminEmptyState,
  AdminPanelCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import { deleteContactMessage, sendContactReply, updateContactMessage } from "./actions";

type MessageStatus = "pending" | "read" | "responded" | "archived";
type MessageCategory =
  | "general"
  | "counseling"
  | "formation"
  | "events"
  | "prayer"
  | "support"
  | "other";

type ContactReplyRow = {
  id: string;
  subject: string;
  body: string;
  status: "sent" | "failed";
  sent_by_email: string | null;
  error_message: string | null;
  created_at_label: string;
};

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
  updated_at?: string | null;
  created_at?: string | null;
  created_at_label: string;
  responded_at_label: string;
  updated_at_label: string;
  replies: ContactReplyRow[];
};

type Props = {
  initialMessages: ContactMessageRow[];
};

const statusConfig: Record<MessageStatus, { label: string; className: string; dot: string }> = {
  pending: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  read: {
    label: "Leído",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  responded: {
    label: "Respondido",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  archived: {
    label: "Archivado",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
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

function getStatusConfig(status: MessageStatus) {
  return statusConfig[status] || statusConfig.pending;
}

function getStatusTone(status: MessageStatus) {
  if (status === "pending") return "amber";
  if (status === "read") return "blue";
  if (status === "responded") return "green";
  return "slate";
}

function buildMailtoHref(message: ContactMessageRow) {
  const subject = `Respuesta IVBCC - ${message.subject}`;
  const body = `Hola ${message.full_name},

Bendiciones. Gracias por comunicarte con la Iglesia Valle de Bendición Cruzada Cristiana.

[aquí escribe tu respuesta]

Atentamente,
Iglesia Valle de Bendición Cruzada Cristiana`;

  return `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function normalizeColombianPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("57") && digits.length >= 12) return digits;
  if (digits.startsWith("3") && digits.length === 10) return `57${digits}`;

  return digits;
}

function buildWhatsAppHref(message: ContactMessageRow) {
  const phone = normalizeColombianPhone(message.phone);
  const text = `Hola ${message.full_name}, bendiciones. Te saludamos de la Iglesia Valle de Bendición Cruzada Cristiana. Recibimos tu mensaje sobre "${message.subject}".`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : null;
}

export default function ContactMessagesPanel({ initialMessages }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MessageStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | MessageCategory>("all");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    initialMessages[0]?.id || null
  );
  const [noteDraft, setNoteDraft] = useState<{
    messageId: string | null;
    value: string;
  }>({
    messageId: initialMessages[0]?.id || null,
    value: initialMessages[0]?.admin_response || "",
  });
  const [replyDraft, setReplyDraft] = useState<{
    messageId: string | null;
    subject: string;
    body: string;
  }>({
    messageId: initialMessages[0]?.id || null,
    subject: initialMessages[0] ? `Re: ${initialMessages[0].subject}` : "",
    body: "",
  });
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  }>({ type: "info", message: "" });
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredMessages = useMemo(() => {
    return initialMessages.filter((message) => {
      const matchesQuery = normalizedQuery
        ? [
            message.full_name,
            message.email,
            message.phone,
            message.subject,
            message.message,
          ]
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
  }, [initialMessages, normalizedQuery, statusFilter, categoryFilter]);

  const activeSelectedMessageId =
    filteredMessages.find((message) => message.id === selectedMessageId)?.id ||
    filteredMessages[0]?.id ||
    null;

  const selectedMessage =
    filteredMessages.find((message) => message.id === activeSelectedMessageId) ||
    null;

  const activeNoteDraft =
    noteDraft.messageId === selectedMessage?.id
      ? noteDraft.value
      : selectedMessage?.admin_response || "";

  const activeReplySubject =
    replyDraft.messageId === selectedMessage?.id
      ? replyDraft.subject
      : selectedMessage
        ? `Re: ${selectedMessage.subject}`
        : "";

  const activeReplyBody =
    replyDraft.messageId === selectedMessage?.id ? replyDraft.body : "";

  const selectedStatus = selectedMessage
    ? getStatusConfig(selectedMessage.status)
    : null;
  const whatsappHref = selectedMessage ? buildWhatsAppHref(selectedMessage) : null;
  const mailtoHref = selectedMessage ? buildMailtoHref(selectedMessage) : "#";

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    const qs = params.toString();
    return `/api/export/contacto${qs ? `?${qs}` : ""}`;
  }, [query, statusFilter, categoryFilter]);

  async function handleStatusChange(status: MessageStatus) {
    if (!selectedMessage) return;

    setIsSaving(true);
    setFeedback({ type: "info", message: "Guardando cambios..." });

    const result = await updateContactMessage(selectedMessage.id, {
      status,
      responded_at:
        status === "responded"
          ? new Date().toISOString()
          : selectedMessage.responded_at || null,
    });

    setIsSaving(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    router.refresh();
    setFeedback({ type: "success", message: "Cambios guardados correctamente." });
  }

  async function handleSaveNote() {
    if (!selectedMessage) return;

    const nextNote = activeNoteDraft.trim();

    setIsSaving(true);
    setFeedback({ type: "info", message: "Guardando cambios..." });

    const result = await updateContactMessage(selectedMessage.id, {
      admin_response: nextNote,
    });

    setIsSaving(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setNoteDraft({ messageId: selectedMessage.id, value: nextNote });
    router.refresh();
    setFeedback({
      type: "success",
      message: "Nota interna guardada. No se envió ningún correo.",
    });
  }

  async function handleSendReply() {
    if (!selectedMessage) return;

    const subject = activeReplySubject.trim();
    const body = activeReplyBody.trim();

    if (!subject || !body) {
      setFeedback({
        type: "error",
        message: "Escribe un asunto y un mensaje antes de enviar el correo.",
      });
      return;
    }

    setIsSendingReply(true);
    setFeedback({ type: "info", message: "Enviando correo..." });

    const result = await sendContactReply(selectedMessage.id, { subject, body });

    setIsSendingReply(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setReplyDraft({
      messageId: selectedMessage.id,
      subject: `Re: ${selectedMessage.subject}`,
      body: "",
    });
    router.refresh();
    setFeedback({ type: "success", message: "Correo enviado correctamente." });
  }

  async function handleDelete() {
    if (!selectedMessage) return;

    const confirmed = confirm("¿Seguro que deseas eliminar este mensaje?");
    if (!confirmed) return;

    setIsSaving(true);
    setFeedback({ type: "info", message: "Eliminando mensaje..." });

    const result = await deleteContactMessage(selectedMessage.id);

    setIsSaving(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setSelectedMessageId(null);
    router.refresh();
    setFeedback({ type: "success", message: "Mensaje eliminado correctamente." });
  }

  async function copyToClipboard(value: string, label: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copiado`);
      setFeedback({ type: "success", message: `${label} copiado al portapapeles.` });
    } catch {
      setCopyFeedback("");
      setFeedback({
        type: "error",
        message: `No pudimos copiar ${label.toLowerCase()}.`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <AdminPanelCard>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.7fr_0.8fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Buscar
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, correo, teléfono, asunto o mensaje"
              className="w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Estado
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | MessageStatus)
              }
              className="w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="read">Leído</option>
              <option value="responded">Respondido</option>
              <option value="archived">Archivado</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Categoría
            </span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as "all" | MessageCategory)
              }
              className="w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm"
            >
              <option value="all">Todas</option>
              {Object.entries(categoryConfig).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <a
              href={exportHref}
              className="flex w-full items-center justify-center rounded-full bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--ivbcc-navy-2)]"
            >
              Exportar CSV
            </a>
          </div>
        </div>
      </AdminPanelCard>

      <AuthFeedback type={feedback.type} message={feedback.message} />

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <AdminPanelCard className="overflow-hidden p-0">
          <div className="border-b border-[var(--ivbcc-line)] p-5">
            <h2 className="section-title text-xl text-[var(--ivbcc-ink)]">Mensajes</h2>
            <p className="muted-copy mt-1 text-sm">
              {filteredMessages.length} mensaje(s) según los filtros actuales.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] divide-y divide-[var(--ivbcc-line)] text-sm">
              <thead className="bg-[var(--ivbcc-paper)]">
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Categoría</th>
                  <th className="px-5 py-3">Asunto</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ivbcc-line)] bg-white/70">
                {filteredMessages.map((message) => {
                  const status = getStatusConfig(message.status);
                  const isSelected = message.id === activeSelectedMessageId;

                  return (
                    <tr
                      key={message.id}
                      className={`cursor-pointer align-top transition hover:bg-[var(--ivbcc-paper)] ${
                        isSelected ? "bg-[rgba(201,162,74,0.1)] ring-1 ring-inset ring-[rgba(201,162,74,0.35)]" : ""
                      }`}
                      onClick={() => {
                        setSelectedMessageId(message.id);
                        setNoteDraft({
                          messageId: message.id,
                          value: message.admin_response,
                        });
                        setReplyDraft({
                          messageId: message.id,
                          subject: `Re: ${message.subject}`,
                          body: "",
                        });
                      }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${
                              message.status === "pending"
                                ? "bg-amber-500"
                                : "bg-transparent"
                            }`}
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-extrabold text-[var(--ivbcc-ink)]">
                              {message.full_name}
                            </p>
                            <p className="mt-1 text-xs text-[var(--ivbcc-muted)]">
                              {message.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--ivbcc-muted)]">
                        {message.phone || "Sin teléfono"}
                      </td>
                      <td className="px-5 py-4 text-[var(--ivbcc-muted)]">
                        {categoryConfig[message.category] || "Otro"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[var(--ivbcc-ink)]">
                        {message.subject}
                      </td>
                      <td className="px-5 py-4">
                        <AdminStatusBadge tone={getStatusTone(message.status)}>
                          {status.label}
                        </AdminStatusBadge>
                      </td>
                      <td className="px-5 py-4 text-[var(--ivbcc-muted)]">
                        {message.created_at_label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredMessages.length === 0 && (
            <div className="p-6">
              <AdminEmptyState
                title="No hay mensajes para mostrar"
                description="Ajusta los filtros o espera nuevos mensajes desde la página pública."
                icon="message"
              />
            </div>
          )}
        </AdminPanelCard>

        <AdminPanelCard>
          {selectedMessage && selectedStatus ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-[var(--ivbcc-line)] pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge tone={getStatusTone(selectedMessage.status)}>
                    <span className={`h-2 w-2 rounded-full ${selectedStatus.dot}`} />
                    {selectedStatus.label}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="slate">
                    {categoryConfig[selectedMessage.category] || "Otro"}
                  </AdminStatusBadge>
                </div>

                <div>
                  <h2 className="section-title text-2xl leading-tight text-[var(--ivbcc-ink)]">
                    {selectedMessage.subject}
                  </h2>
                  <p className="muted-copy mt-2 text-sm">
                    Recibido el {selectedMessage.created_at_label}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Nombre" value={selectedMessage.full_name} />
                <DetailItem label="Correo" value={selectedMessage.email} />
                <DetailItem
                  label="Teléfono"
                  value={selectedMessage.phone || "Sin teléfono"}
                />
                <DetailItem
                  label="Iglesia"
                  value={selectedMessage.church_name || "No indicó iglesia"}
                />
              </div>

              <div>
                <p className="kicker">
                  Mensaje completo
                </p>
                <div className="mt-2 whitespace-pre-line rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-4 text-sm leading-6 text-[var(--ivbcc-muted)]">
                  {selectedMessage.message}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--ivbcc-line)] bg-white p-4">
                <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">
                  Enviar respuesta por correo
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--ivbcc-muted)]">
                  Este correo se envía de verdad a {selectedMessage.email} y queda
                  registrado en el historial de abajo.
                </p>

                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                    Asunto
                  </span>
                  <input
                    type="text"
                    value={activeReplySubject}
                    onChange={(event) =>
                      setReplyDraft({
                        messageId: selectedMessage.id,
                        subject: event.target.value,
                        body: activeReplyBody,
                      })
                    }
                    className="w-full rounded-2xl border border-[var(--ivbcc-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                    Mensaje
                  </span>
                  <textarea
                    value={activeReplyBody}
                    onChange={(event) =>
                      setReplyDraft({
                        messageId: selectedMessage.id,
                        subject: activeReplySubject,
                        body: event.target.value,
                      })
                    }
                    rows={6}
                    placeholder={`Hola ${selectedMessage.full_name}, bendiciones...`}
                    className="w-full rounded-2xl border border-[var(--ivbcc-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
                  />
                </label>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={isSendingReply}
                    className="rounded-full bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)] disabled:opacity-60"
                  >
                    {isSendingReply ? "Enviando..." : "Enviar correo"}
                  </button>
                </div>

                {selectedMessage.replies.length > 0 ? (
                  <div className="mt-6 border-t border-[var(--ivbcc-line)] pt-4">
                    <p className="kicker">Historial de respuestas enviadas</p>
                    <ul className="mt-3 space-y-3">
                      {selectedMessage.replies.map((reply) => (
                        <li
                          key={reply.id}
                          className="rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">
                              {reply.subject}
                            </p>
                            <AdminStatusBadge tone={reply.status === "sent" ? "green" : "red"}>
                              {reply.status === "sent" ? "Enviado" : "Falló"}
                            </AdminStatusBadge>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                            {reply.body}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">
                            {reply.created_at_label}
                            {reply.sent_by_email ? ` · ${reply.sent_by_email}` : ""}
                          </p>
                          {reply.error_message ? (
                            <p className="mt-1 text-xs font-semibold text-red-600">
                              {reply.error_message}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[rgba(201,162,74,0.28)] bg-[rgba(201,162,74,0.1)] p-4">
                <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">Acciones rápidas</p>
                <p className="mt-1 text-xs leading-5 text-[var(--ivbcc-muted)]">
                  Estas acciones abren herramientas externas o copian datos. No
                  envían correos automáticamente desde IVBCC.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <a
                    href={mailtoHref}
                    className="rounded-full bg-[var(--ivbcc-navy)] px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)]"
                  >
                    Abrir en mi correo (manual)
                  </a>
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-emerald-600 px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-emerald-700"
                    >
                      Responder por WhatsApp
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-full bg-gray-100 px-4 py-3 text-sm font-extrabold text-gray-400"
                    >
                      Sin WhatsApp
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedMessage.email, "Correo")}
                    className="rounded-full border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)]"
                  >
                    Copiar correo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(selectedMessage.phone, "Teléfono")
                    }
                    disabled={!selectedMessage.phone}
                    className="rounded-full border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)] disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    Copiar teléfono
                  </button>
                </div>

                {copyFeedback ? (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">
                    {copyFeedback}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange("read")}
                  disabled={isSaving}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                >
                  Marcar como leído
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("responded")}
                  disabled={isSaving}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  Marcar como respondido
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("archived")}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Archivar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  Eliminar
                </button>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">
                  Nota interna / seguimiento
                </p>
                <p className="muted-copy mt-1 text-sm">
                  Esta nota queda guardada para el equipo administrativo. No
                  envía correo automáticamente.
                </p>

                {selectedMessage.admin_response ? (
                  <div className="mt-4 rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-4">
                    <p className="kicker">
                      Última nota guardada
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {selectedMessage.admin_response}
                    </p>
                    <p className="mt-3 text-xs text-gray-500">
                      Fecha:{" "}
                      {selectedMessage.updated_at
                        ? selectedMessage.updated_at_label
                        : selectedMessage.responded_at
                          ? selectedMessage.responded_at_label
                          : "Sin fecha registrada"}
                    </p>
                  </div>
                ) : null}

                <textarea
                  value={activeNoteDraft}
                  onChange={(event) =>
                    setNoteDraft({
                      messageId: selectedMessage.id,
                      value: event.target.value,
                    })
                  }
                  rows={5}
                  className="mt-4 w-full rounded-2xl border border-[var(--ivbcc-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
                  placeholder="Escribe una nota de seguimiento para el equipo..."
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {selectedMessage.responded_at
                      ? `Marcado como respondido: ${selectedMessage.responded_at_label}`
                      : "Este mensaje aún no está marcado como respondido."}
                  </p>

                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    className="rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-navy)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    Guardar nota interna
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <AdminEmptyState
              title="Selecciona un mensaje"
              description="El detalle, las acciones rápidas y la nota interna aparecerán aquí."
              icon="message"
            />
          )}
        </AdminPanelCard>
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ivbcc-line)] bg-white/80 p-4">
      <p className="kicker">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-[var(--ivbcc-ink)]">
        {value}
      </p>
    </div>
  );
}
