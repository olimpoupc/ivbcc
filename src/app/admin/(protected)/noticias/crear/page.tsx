"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateImageFile,
} from "@/lib/security";

type PublishOption = "published" | "scheduled" | "draft";

function toISOStringFromLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function buildImagePath(file: File) {
  return buildSafeStoragePath("news", file);
}

export default function CrearNoticiaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [publishOption, setPublishOption] =
    useState<PublishOption>("published");
  const [publishedAt, setPublishedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, []);

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

  function handleRemoveImage() {
    setImageFile(null);
    updateImagePreview(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const status = publishOption;
    const normalizedPublishedAt =
      publishOption === "published"
        ? new Date().toISOString()
        : publishedAt
          ? toISOStringFromLocal(publishedAt)
          : null;

    let imageUrl = null;

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

    const { error } = await supabase.from("news").insert({
      title,
      slug,
      summary,
      content,
      image_url: imageUrl,
      status,
      published_at: normalizedPublishedAt,
      expires_at: toISOStringFromLocal(expiresAt),
    });

    setIsSubmitting(false);

    if (error) {
      alert("Error al crear la noticia");
      console.error(error);
      return;
    }

    alert("Noticia creada correctamente");
    router.push("/admin/noticias");
    router.refresh();
  }

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crear noticia</h1>
        <p className="text-gray-500 mt-1">
          Registra una nueva noticia para publicar, programar o guardar como
          borrador.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Resumen
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            rows={3}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Contenido
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Imagen
          </label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="w-full border rounded-lg px-4 py-2"
          />

          {imagePreviewUrl && (
            <div className="mt-4">
              <Image
                src={imagePreviewUrl}
                alt="Vista previa de la imagen"
                width={640}
                height={256}
                unoptimized
                className="max-h-64 w-full rounded-lg object-cover"
              />

              <button
                type="button"
                onClick={handleRemoveImage}
                className="mt-3 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Quitar imagen
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Tipo de publicación
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="publishOption"
                value="published"
                checked={publishOption === "published"}
                onChange={() => setPublishOption("published")}
              />
              Publicar ahora
            </label>

            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="publishOption"
                value="scheduled"
                checked={publishOption === "scheduled"}
                onChange={() => setPublishOption("scheduled")}
              />
              Programar publicación
            </label>

            <label className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <input
                type="radio"
                name="publishOption"
                value="draft"
                checked={publishOption === "draft"}
                onChange={() => setPublishOption("draft")}
              />
              Guardar como borrador
            </label>
          </div>
        </div>

        {publishOption === "scheduled" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de publicación
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              required
              className="w-full border rounded-lg px-4 py-2"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Fecha de vencimiento
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
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
            {isSubmitting ? "Guardando..." : "Guardar noticia"}
          </button>
        </div>
      </form>
    </main>
  );
}
