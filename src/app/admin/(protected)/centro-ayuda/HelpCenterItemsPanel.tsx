"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthFeedback from "@/components/AuthFeedback";
import {
  AdminEmptyState,
  AdminPanelCard,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import {
  createHelpCenterItem,
  deleteHelpCenterItem,
  toggleHelpCenterItem,
  updateHelpCenterItem,
  type HelpCenterCategory,
} from "./actions";

export type HelpCenterItemRow = {
  id: string;
  title: string;
  message: string;
  category: HelpCenterCategory;
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
  category: HelpCenterCategory;
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
  initialItems: HelpCenterItemRow[];
};

const categoryOptions: Array<{ value: HelpCenterCategory; label: string }> = [
  { value: "schedules", label: "Horarios" },
  { value: "location", label: "Ubicación" },
  { value: "ministries", label: "Ministerios" },
  { value: "donate", label: "Cómo donar" },
  { value: "events", label: "Eventos" },
  { value: "formation", label: "Formación" },
  { value: "live", label: "En Vivo" },
  { value: "prayer", label: "Oración" },
  { value: "contact", label: "Contacto" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "general", label: "General" },
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
) as Record<HelpCenterCategory, string>;

function toFormState(item: HelpCenterItemRow): FormState {
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

function sortItems(items: HelpCenterItemRow[]) {
  return [...items].sort((first, second) => {
    if (first.order_index !== second.order_index) {
      return first.order_index - second.order_index;
    }

    return first.title.localeCompare(second.title, "es");
  });
}

export default function HelpCenterItemsPanel({ initialItems }: Props) {
  const router = useRouter();
  const sortedItems = useMemo(() => sortItems(initialItems), [initialItems]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState<Feedback>({
    type: "info",
    message: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(editingId);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleEdit(item: HelpCenterItemRow) {
    setEditingId(item.id);
    setForm(toFormState(item));
    setFeedback({ type: "info", message: "" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      title: form.title,
      message: form.message,
      category: form.category,
      button_text: form.button_text,
      button_url: form.button_url,
      order_index: Number(form.order_index) || 0,
      is_active: form.is_active,
    };

    setIsSaving(true);
    setFeedback({ type: "info", message: "Guardando contenido..." });

    const result = editingId
      ? await updateHelpCenterItem(editingId, input)
      : await createHelpCenterItem(input);

    setIsSaving(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    const wasEditing = isEditing;
    resetForm();
    router.refresh();
    setFeedback({
      type: "success",
      message: wasEditing
        ? "Contenido actualizado correctamente."
        : "Contenido creado correctamente.",
    });
  }

  async function handleToggle(item: HelpCenterItemRow) {
    setIsSaving(true);
    setFeedback({ type: "info", message: "Actualizando estado..." });

    const result = await toggleHelpCenterItem(item.id, !item.is_active);

    setIsSaving(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    router.refresh();
    setFeedback({
      type: "success",
      message: item.is_active
        ? "Contenido desactivado correctamente."
        : "Contenido activado correctamente.",
    });
  }

  async function handleDelete(item: HelpCenterItemRow) {
    const confirmed = confirm(`¿Eliminar "${item.title}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    setFeedback({ type: "info", message: "Eliminando contenido..." });

    const result = await deleteHelpCenterItem(item.id);

    setIsSaving(false);

    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    if (editingId === item.id) {
      resetForm();
    }

    router.refresh();
    setFeedback({
      type: "success",
      message: "Contenido eliminado correctamente.",
    });
  }

  return (
    <section className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
      <AdminPanelCard>
        <div className="mb-6">
          <p className="kicker">{isEditing ? "Edición" : "Nuevo contenido"}</p>
          <h2 className="section-title mt-1 text-xl text-[var(--ivbcc-ink)]">
            {isEditing ? "Editar contenido" : "Crear contenido"}
          </h2>
          <p className="muted-copy mt-1 text-sm">
            Cada categoría agrupa el contenido en el widget público. El botón
            opcional puede enlazar a otra página del sitio (ej. /contacto) o a
            una URL externa.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Título
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
              className={inputClassName}
              placeholder="Ej: Horarios de servicios"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
              Mensaje
            </label>
            <textarea
              value={form.message}
              onChange={(event) => updateForm("message", event.target.value)}
              rows={5}
              className={textareaClassName}
              placeholder="Escribe la respuesta corta que verá el visitante..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(event) =>
                  updateForm("category", event.target.value as HelpCenterCategory)
                }
                className={inputClassName}
              >
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
                Orden
              </label>
              <input
                type="number"
                value={form.order_index}
                onChange={(event) =>
                  updateForm("order_index", event.target.value)
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
                Texto del botón
              </label>
              <input
                type="text"
                value={form.button_text}
                onChange={(event) =>
                  updateForm("button_text", event.target.value)
                }
                className={inputClassName}
                placeholder="Ej: Ver todos los horarios"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-extrabold text-[var(--ivbcc-ink)]">
                URL del botón
              </label>
              <input
                type="text"
                value={form.button_url}
                onChange={(event) =>
                  updateForm("button_url", event.target.value)
                }
                className={inputClassName}
                placeholder="/contacto o https://..."
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-[var(--ivbcc-line)] bg-white/70 px-4 py-3 text-sm font-extrabold text-[var(--ivbcc-ink)]">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateForm("is_active", event.target.checked)}
              className="h-4 w-4 accent-[var(--ivbcc-gold)]"
            />
            Activo
          </label>

          <AuthFeedback type={feedback.type} message={feedback.message} />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-navy)] shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {isEditing ? "Guardar cambios" : "Crear contenido"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="rounded-full border border-[var(--ivbcc-line)] bg-white px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)] disabled:opacity-60"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </AdminPanelCard>

      <AdminSection
        title="Contenido del Centro de Ayuda"
        subtitle="Se muestran agrupadas por categoría en el widget público, ordenadas por el campo de orden."
        icon="spark"
      >
        <AdminPanelCard>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--ivbcc-line)] text-sm">
            <thead className="bg-[var(--ivbcc-paper)]">
              <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                <th className="pb-3 pr-4">Orden</th>
                <th className="pb-3 pr-4">Contenido</th>
                <th className="pb-3 pr-4">Categoría</th>
                <th className="pb-3 pr-4">Estado</th>
                <th className="pb-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ivbcc-line)]">
              {sortedItems.map((item) => (
                <tr key={item.id} className="align-top text-[var(--ivbcc-muted)]">
                  <td className="py-4 pr-4 font-semibold">
                    {item.order_index}
                  </td>
                  <td className="max-w-sm py-4 pr-4">
                    <p className="font-extrabold text-[var(--ivbcc-ink)]">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-[var(--ivbcc-muted)]">
                      {item.message}
                    </p>
                    {(item.button_text || item.button_url) && (
                      <p className="mt-2 text-xs font-semibold text-[var(--ivbcc-muted)]">
                        {item.button_text || "Botón"} ·{" "}
                        {item.button_url || "Sin URL"}
                      </p>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <AdminStatusBadge tone="blue">
                      {categoryLabels[item.category]}
                    </AdminStatusBadge>
                  </td>
                  <td className="py-4 pr-4">
                    <AdminStatusBadge tone={item.is_active ? "green" : "slate"}>
                      {item.is_active ? "Activo" : "Inactivo"}
                    </AdminStatusBadge>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        disabled={isSaving}
                        className="rounded-full border border-[var(--ivbcc-line)] bg-white px-3 py-2 text-xs font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)] disabled:opacity-60"
                      >
                        {item.is_active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        disabled={isSaving}
                        className="rounded-full bg-[var(--ivbcc-gold)] px-3 py-2 text-xs font-extrabold text-[var(--ivbcc-navy)] transition hover:opacity-90 disabled:opacity-60"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={isSaving}
                        className="rounded-full bg-red-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
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
          <AdminEmptyState
            title="Aún no hay contenido"
            description="Crea el primer elemento para alimentar el Centro de Ayuda."
            icon="spark"
          />
        )}
        </AdminPanelCard>
      </AdminSection>
    </section>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]";

const textareaClassName =
  "w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]";
