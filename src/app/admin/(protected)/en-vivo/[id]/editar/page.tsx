"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
        .select("*")
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
    return <main className="text-sm text-gray-500">Cargando transmisión...</main>;
  }

  if (!liveStream) {
    return <main className="text-sm text-gray-500">Transmisión no encontrada.</main>;
  }

  return (
    <main>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editar transmisión</h1>
          <p className="mt-1 text-gray-500">
            Actualiza la información, visibilidad y programación de la
            transmisión.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/en-vivo")}
          className="w-fit rounded-lg border px-5 py-2 font-semibold text-gray-700"
        >
          Volver a transmisiones
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(normalizeSlug(e.target.value))}
              required
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              URL de YouTube
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              URL de miniatura
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as LiveStreamCategory)
              }
              className="w-full rounded-lg border px-4 py-2"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Fecha programada
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Fecha/hora de finalización
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-gray-700">
            Estado
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === "draft"}
                onChange={() => setStatus("draft")}
              />
              Borrador
            </label>

            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === "published"}
                onChange={() => setStatus("published")}
              />
              Publicado
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
            />
            <span className="text-sm font-semibold text-gray-700">
              Marcar como En vivo actual
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            <span className="text-sm font-semibold text-gray-700">
              Marcar como Destacado
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/en-vivo")}
            className="rounded-lg border px-5 py-2 font-semibold text-gray-700"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[var(--ivbcc-gold)] px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </main>
  );
}
