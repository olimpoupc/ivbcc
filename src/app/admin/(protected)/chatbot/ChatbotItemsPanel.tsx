"use client";

import { useMemo, useState } from "react";
import AuthFeedback from "@/components/AuthFeedback";
import { supabase } from "@/lib/supabase";

type ChatbotCategory =
  | "general"
  | "schedules"
  | "events"
  | "formation"
  | "live"
  | "location"
  | "contact"
  | "prayer"
  | "whatsapp";

export type ChatbotItemRow = {
  id: string;
  title: string;
  message: string;
  category: ChatbotCategory;
  button_text: string;
  button_url: string;
  order_index: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type FormState = {
  title: string;
  message: string;
  category: ChatbotCategory;
  button_text: string;
  button_url: string;
  order_index: string;
  is_active: boolean;
};

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

type Props = {
  initialItems: ChatbotItemRow[];
};

const categoryOptions: Array<{ value: ChatbotCategory; label: string }> = [
  { value: "general", label: "General" },
  { value: "schedules", label: "Horarios" },
  { value: "events", label: "Eventos" },
  { value: "formation", label: "Formación" },
  { value: "live", label: "En Vivo" },
  { value: "location", label: "Ubicación" },
  { value: "contact", label: "Contacto" },
  { value: "prayer", label: "Oración" },
  { value: "whatsapp", label: "WhatsApp" },
];

const emptyForm: FormState = {
  title: "",
  message: "",
  category: "general",
  button_text: "",
  button_url: "",
  order_index: "0",
  is_active: true,
};

const categoryLabels = Object.fromEntries(
  categoryOptions.map((category) => [category.value, category.label])
) as Record<ChatbotCategory, string>;

function toFormState(item: ChatbotItemRow): FormState {
  return {
    title: item.title,
    message: item.message,
    category: item.category,
    button_text: item.button_text,
    button_url: item.button_url,
    order_index: String(item.order_index),
    is_active: item.is_active,
  };
}

function sortItems(items: ChatbotItemRow[]) {
  return [...items].sort((first, second) => {
    if (first.order_index !== second.order_index) {
      return first.order_index - second.order_index;
    }

    return first.title.localeCompare(second.title, "es");
  });
}

export default function ChatbotItemsPanel({ initialItems }: Props) {
  const [items, setItems] = useState(() => sortItems(initialItems));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState<Feedback>({
    type: "info",
    message: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const sortedItems = useMemo(() => sortItems(items), [items]);
  const isEditing = Boolean(editingId);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleEdit(item: ChatbotItemRow) {
    setEditingId(item.id);
    setForm(toFormState(item));
    setFeedback({ type: "info", message: "" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const message = form.message.trim();

    if (!title || !message) {
      setFeedback({
        type: "error",
        message: "Título y mensaje son obligatorios.",
      });
      return;
    }

    const payload = {
      title,
      message,
      category: form.category,
      button_text: form.button_text.trim() || null,
      button_url: form.button_url.trim() || null,
      order_index: Number(form.order_index) || 0,
      is_active: form.is_active,
    };

    setIsSaving(true);
    setFeedback({ type: "info", message: "Guardando respuesta..." });

    if (editingId) {
      const { data, error } = await supabase
        .from("chatbot_items")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .maybeSingle();

      setIsSaving(false);

      if (error || !data) {
        console.error(error);
        setFeedback({
          type: "error",
          message: error?.message || "No se pudo actualizar la respuesta.",
        });
        return;
      }

      const updatedItem = data as ChatbotItemRow;
      setItems((current) =>
        sortItems(
          current.map((item) => (item.id === editingId ? updatedItem : item))
        )
      );
      resetForm();
      setFeedback({
        type: "success",
        message: "Respuesta actualizada correctamente.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("chatbot_items")
      .insert(payload)
      .select("*")
      .maybeSingle();

    setIsSaving(false);

    if (error || !data) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error?.message || "No se pudo crear la respuesta.",
      });
      return;
    }

    const createdItem = data as ChatbotItemRow;
    setItems((current) => sortItems([...current, createdItem]));
    resetForm();
    setFeedback({
      type: "success",
      message: "Respuesta creada correctamente.",
    });
  }

  async function handleToggle(item: ChatbotItemRow) {
    setIsSaving(true);
    setFeedback({ type: "info", message: "Actualizando estado..." });

    const { data, error } = await supabase
      .from("chatbot_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id)
      .select("*")
      .maybeSingle();

    setIsSaving(false);

    if (error || !data) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error?.message || "No se pudo cambiar el estado.",
      });
      return;
    }

    const updatedItem = data as ChatbotItemRow;
    setItems((current) =>
      sortItems(current.map((row) => (row.id === item.id ? updatedItem : row)))
    );
    setFeedback({
      type: "success",
      message: updatedItem.is_active
        ? "Respuesta activada correctamente."
        : "Respuesta desactivada correctamente.",
    });
  }

  async function handleDelete(item: ChatbotItemRow) {
    const confirmed = confirm(`¿Eliminar la respuesta "${item.title}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    setFeedback({ type: "info", message: "Eliminando respuesta..." });

    const { error } = await supabase
      .from("chatbot_items")
      .delete()
      .eq("id", item.id);

    setIsSaving(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "No se pudo eliminar la respuesta.",
      });
      return;
    }

    setItems((current) => current.filter((row) => row.id !== item.id));

    if (editingId === item.id) {
      resetForm();
    }

    setFeedback({
      type: "success",
      message: "Respuesta eliminada correctamente.",
    });
  }

  return (
    <section className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
      <article className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-950">
            {isEditing ? "Editar respuesta" : "Crear respuesta"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Define el texto que verá el visitante y el enlace opcional del
            botón.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Título
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
              placeholder="Ej: Horarios"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Mensaje
            </label>
            <textarea
              value={form.message}
              onChange={(event) => updateForm("message", event.target.value)}
              rows={5}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
              placeholder="Escribe la respuesta rápida del chatbot..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(event) =>
                  updateForm("category", event.target.value as ChatbotCategory)
                }
                className="w-full rounded-lg border px-4 py-2 text-sm"
              >
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Orden
              </label>
              <input
                type="number"
                value={form.order_index}
                onChange={(event) =>
                  updateForm("order_index", event.target.value)
                }
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Texto del botón
              </label>
              <input
                type="text"
                value={form.button_text}
                onChange={(event) =>
                  updateForm("button_text", event.target.value)
                }
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
                placeholder="Ej: Ver eventos"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                URL del botón
              </label>
              <input
                type="text"
                value={form.button_url}
                onChange={(event) =>
                  updateForm("button_url", event.target.value)
                }
                className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ivbcc-gold)]"
                placeholder="/eventos o https://..."
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateForm("is_active", event.target.checked)}
              className="h-4 w-4"
            />
            Activa
          </label>

          <AuthFeedback type={feedback.type} message={feedback.message} />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {isEditing ? "Guardar cambios" : "Crear respuesta"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </article>

      <article className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-950">
            Respuestas rápidas
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Se muestran ordenadas por el campo de orden.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4">Orden</th>
                <th className="pb-3 pr-4">Respuesta</th>
                <th className="pb-3 pr-4">Categoría</th>
                <th className="pb-3 pr-4">Estado</th>
                <th className="pb-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedItems.map((item) => (
                <tr key={item.id} className="align-top text-gray-700">
                  <td className="py-4 pr-4 font-semibold">
                    {item.order_index}
                  </td>
                  <td className="max-w-sm py-4 pr-4">
                    <p className="font-semibold text-gray-950">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-gray-500">
                      {item.message}
                    </p>
                    {(item.button_text || item.button_url) && (
                      <p className="mt-2 text-xs font-medium text-gray-400">
                        {item.button_text || "Botón"} ·{" "}
                        {item.button_url || "Sin URL"}
                      </p>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {categoryLabels[item.category]}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        item.is_active
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        disabled={isSaving}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                      >
                        {item.is_active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        disabled={isSaving}
                        className="rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-60"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={isSaving}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedItems.length === 0 && (
          <div className="rounded-xl bg-slate-50 px-6 py-12 text-center text-sm text-gray-500">
            Aún no hay respuestas rápidas registradas.
          </div>
        )}
      </article>
    </section>
  );
}
