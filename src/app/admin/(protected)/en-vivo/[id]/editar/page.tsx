"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  AdminActionButton,
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

type LiveStream = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  youtube_url: string;
  thumbnail_url?: string | null;
  category: LiveStreamCategory;
  is_live?: boolean | null;
  featured?: boolean | null;
  status?: LiveStreamStatus | null;
  scheduled_at?: string | null;
  ends_at?: string | null;
};

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

function toISOStringFromLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 16);
}

export default function EditarTransmisionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    async function loadLiveStream() {
      const { data, error } = await supabase
        .from("live_streams")
        .select("id,title,slug,description,youtube_url,thumbnail_url,category,is_live,featured,status,scheduled_at,ends_at")
        .eq("id", id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        alert("No se pudo cargar la transmisión");
        console.error(error);
        router.push("/admin/en-vivo");
        return;
      }

      const currentLiveStream = data as LiveStream;
      setLiveStream(currentLiveStream);
      setTitle(currentLiveStream.title || "");
      setSlug(normalizeSlug(currentLiveStream.slug || ""));
      setDescription(currentLiveStream.description || "");
      setYoutubeUrl(currentLiveStream.youtube_url || "");
      setThumbnailUrl(currentLiveStream.thumbnail_url || "");
      setCategory(currentLiveStream.category || "live");
      setIsLive(Boolean(currentLiveStream.is_live));
      setFeatured(Boolean(currentLiveStream.featured));
      setStatus(currentLiveStream.status || "draft");
      setScheduledAt(toDateTimeLocalValue(currentLiveStream.scheduled_at));
      setEndsAt(toDateTimeLocalValue(currentLiveStream.ends_at));
      setIsLoading(false);
    }

    loadLiveStream();

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!liveStream) return;

    if (!isValidYouTubeUrl(youtubeUrl.trim())) {
      alert("Ingresa una URL válida de YouTube.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("live_streams")
      .update({
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
      })
      .eq("id", liveStream.id);

    setIsSubmitting(false);

    if (error) {
      alert(error.message || "Error al actualizar la transmisión");
      console.error(error);
      return;
    }

    alert("Transmisión actualizada correctamente");
    router.push("/admin/en-vivo");
    router.refresh();
  }

  if (isLoading) {
    return <AdminPageShell><AdminPanelCard>Cargando transmisión...</AdminPanelCard></AdminPageShell>;
  }

  if (!liveStream) {
    return <AdminPageShell><AdminPanelCard>Transmisión no encontrada.</AdminPanelCard></AdminPageShell>;
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Streaming y multimedia"
        title="Editar transmisión"
        subtitle="Actualiza la información, visibilidad y programación de la transmisión."
        icon="stream"
        actions={
          <AdminActionButton href="/admin/en-vivo" icon="arrow" tone="outline">
            Volver a transmisiones
          </AdminActionButton>
        }
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
            />
          </AdminFormField>

          <AdminFormField label="URL de miniatura">
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className={adminInputClass}
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
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
