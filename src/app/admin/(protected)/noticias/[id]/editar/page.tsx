"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateImageFile,
} from "@/lib/security";

type NewsStatus = "published" | "scheduled" | "draft";

type News = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  image_url?: string | null;
  status?: NewsStatus | null;
  published_at?: string | null;
  expires_at?: string | null;
};

function toISOStringFromLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function buildImagePath(file: File) {
  return buildSafeStoragePath("news", file);
}

export default function EditarNoticiaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticia, setNoticia] = useState<News | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<NewsStatus>("published");
  const [publishedAt, setPublishedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        alert("No se pudo cargar la noticia");
        console.error(error);
        router.push("/admin/noticias");
        return;
      }

      const news = data as News;
      setNoticia(news);
      setTitle(news.title || "");
      setSlug(news.slug || "");
      setSummary(news.summary || "");
      setContent(news.content || "");
      setStatus(news.status || "published");
      setPublishedAt(toDateTimeLocalValue(news.published_at));
      setExpiresAt(toDateTimeLocalValue(news.expires_at));
      setIsLoading(false);
    }

    loadNews();

    return () => {
      isMounted = false;

      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, [id, router]);

  function updateImagePreview(file: File | null) {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }

    if (!file) {
      setImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    imagePreviewUrlRef.current = previewUrl;
    setImagePreviewUrl(previewUrl);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setImageFile(null);
      updateImagePreview(null);
      return;
    }

    const validationError = await validateImageFile(file);
    if (validationError) {
      alert(validationError);
      e.target.value = "";
      setImageFile(null);
      updateImagePreview(null);
      return;
    }

    setImageFile(file);
    updateImagePreview(file);
  }

  function handleRemoveNewImage() {
    setImageFile(null);
    updateImagePreview(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleStatusChange(nextStatus: NewsStatus) {
    setStatus(nextStatus);

    if (nextStatus === "published" || nextStatus === "draft") {
      setPublishedAt("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!noticia) return;

    if (status === "scheduled" && !publishedAt) {
      alert("Selecciona la fecha de publicación.");
      return;
    }

    setIsSubmitting(true);

    const normalizedPublishedAt =
      status === "draft"
        ? null
        : status === "published"
          ? toISOStringFromLocal(publishedAt) || new Date().toISOString()
          : toISOStringFromLocal(publishedAt);

    let imageUrl = noticia.image_url || null;

    if (imageFile) {
      const imagePath = buildImagePath(imageFile);
      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(imagePath, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        setIsSubmitting(false);
        alert("Error al subir la imagen");
        console.error(uploadError);
        return;
      }

      const { data } = supabase.storage
        .from("news-images")
        .getPublicUrl(imagePath);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from("news")
      .update({
        title,
        slug,
        summary,
        content,
        image_url: imageUrl,
        status,
        published_at: normalizedPublishedAt,
        expires_at: status === "draft" ? null : toISOStringFromLocal(expiresAt),
      })
      .eq("id", noticia.id);

    setIsSubmitting(false);

    if (error) {
      alert("Error al actualizar la noticia");
      console.error(error);
      return;
    }

    alert("Noticia actualizada correctamente");
    router.push("/admin/noticias");
    router.refresh();
  }

  if (isLoading) {
    return <main className="text-sm text-gray-500">Cargando noticia...</main>;
  }

  if (!noticia) {
    return <main className="text-sm text-gray-500">Noticia no encontrada.</main>;
  }

  return (
    <main>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editar noticia</h1>
          <p className="mt-1 text-gray-500">
            Actualiza la información, estado, fechas e imagen de la noticia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/noticias")}
          className="w-fit rounded-lg border px-5 py-2 font-semibold text-gray-700"
        >
          Volver a noticias
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
      >
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
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Resumen
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            rows={3}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Contenido
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Imagen actual
            </label>

            {noticia.image_url ? (
              <div className="relative h-56 overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={noticia.image_url}
                  alt={noticia.title}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
                Sin imagen actual
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Nueva imagen
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="w-full rounded-lg border px-4 py-2"
            />

            {imagePreviewUrl && (
              <div className="mt-4">
                <Image
                  src={imagePreviewUrl}
                  alt="Vista previa de la nueva imagen"
                  width={640}
                  height={256}
                  unoptimized
                  className="max-h-56 w-full rounded-lg object-cover"
                />

                <button
                  type="button"
                  onClick={handleRemoveNewImage}
                  className="mt-3 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Quitar nueva imagen
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-gray-700">
            Estado
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === "published"}
                onChange={() => handleStatusChange("published")}
              />
              Publicada
            </label>

            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="status"
                value="scheduled"
                checked={status === "scheduled"}
                onChange={() => handleStatusChange("scheduled")}
              />
              Programada
            </label>

            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === "draft"}
                onChange={() => handleStatusChange("draft")}
              />
              Borrador
            </label>
          </div>
        </div>

        {status === "scheduled" && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Fecha de publicación
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-2"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Fecha de vencimiento
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/noticias")}
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
