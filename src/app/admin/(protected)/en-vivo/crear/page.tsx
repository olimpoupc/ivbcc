"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/AdminPrimitives";
import {
  AdminFormField,
  AdminRadioCard,
  AdminToggleCard,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from "@/components/admin/AdminFormPrimitives";

type LiveStreamStatus = "draft" | "published";
type LiveStreamCategory =
  | "live"
  | "sunday"
  | "preaching"
  | "teaching"
  | "special";

const categoryOptions: { value: LiveStreamCategory; label: string }[] = [
  { value: "live", label: "En vivo" },
  { value: "sunday", label: "Dominical" },
  { value: "preaching", label: "Prédica" },
  { value: "teaching", label: "Enseñanza" },
  { value: "special", label: "Especial" },
];

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toISOStringFromLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function isValidYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname === "youtu.be" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtube.com" ||
      url.hostname === "m.youtube.com"
    );
  } catch {
    return false;
  }
}

export default function CrearTransmisionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState<LiveStreamCategory>("live");
  const [isLive, setIsLive] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<LiveStreamStatus>("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isValidYouTubeUrl(youtubeUrl.trim())) {
      alert("Ingresa una URL válida de YouTube.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("live_streams").insert({
      title,
      slug: normalizeSlug(slug),
      description,
      youtube_url: youtubeUrl.trim(),
      thumbnail_url: thumbnailUrl.trim() || null,
      category,
      is_live: isLive,
      featured,
      status,
      scheduled_at: toISOStringFromLocal(scheduledAt),
      ends_at: toISOStringFromLocal(endsAt),
    });

    setIsSubmitting(false);

    if (error) {
      alert(error.message || "Error al crear la transmisión");
      console.error(error);
      return;
    }

    alert("Transmisión creada correctamente");
    router.push("/admin/en-vivo");
    router.refresh();
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Streaming y multimedia"
        title="Crear transmisión"
        subtitle="Registra una transmisión, dominical, prédica o video ministerial de IVBCC."
        icon="stream"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <AdminPanelCard className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminFormField label="Título">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={adminInputClass}
            />
          </AdminFormField>

          <AdminFormField label="Slug">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(normalizeSlug(e.target.value))}
              required
              className={adminInputClass}
            />
          </AdminFormField>
        </div>

        <AdminFormField label="Descripción">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className={adminTextareaClass}
          />
        </AdminFormField>
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminFormField label="URL de YouTube">
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              required
              className={adminInputClass}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </AdminFormField>

          <AdminFormField label="URL de miniatura">
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className={adminInputClass}
              placeholder="https://..."
            />
          </AdminFormField>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <AdminFormField label="Categoría">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as LiveStreamCategory)
              }
              className={adminSelectClass}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField label="Fecha programada">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={adminInputClass}
            />
          </AdminFormField>

          <AdminFormField label="Fecha/hora de finalización">
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={adminInputClass}
            />
          </AdminFormField>
        </div>
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <AdminFormField label="Estado">
          <div className="grid gap-3 md:grid-cols-2">
            <label><AdminRadioCard checked={status === "draft"}>
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === "draft"}
                onChange={() => setStatus("draft")}
              />
              Borrador
            </AdminRadioCard></label>

            <label><AdminRadioCard checked={status === "published"}>
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === "published"}
                onChange={() => setStatus("published")}
              />
              Publicado
            </AdminRadioCard></label>
          </div>
        </AdminFormField>

        <div className="grid gap-4 md:grid-cols-2">
          <label><AdminToggleCard checked={isLive}>
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
            />
            Marcar como En vivo actual
          </AdminToggleCard></label>

          <label><AdminToggleCard checked={featured}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Marcar como Destacado
          </AdminToggleCard></label>
        </div>
        </AdminPanelCard>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/en-vivo")}
            className={adminSecondaryButtonClass}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={adminPrimaryButtonClass}
          >
            {isSubmitting ? "Guardando..." : "Guardar transmisión"}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
