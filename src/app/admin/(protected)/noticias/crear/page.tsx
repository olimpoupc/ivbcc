"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateImageFile,
} from "@/lib/security";
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/AdminPrimitives";
import {
  AdminFormField,
  AdminRadioCard,
  adminFileInputClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTextareaClass,
} from "@/components/admin/AdminFormPrimitives";

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
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Contenido editorial"
        title="Crear noticia"
        subtitle="Registra una nueva noticia para publicar, programar o guardar como borrador."
        icon="news"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <AdminPanelCard className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
        <AdminFormField label="Título">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={adminInputClass}
          />
        </AdminFormField>

        <AdminFormField
          label="Slug"
          hint="Se usa en la URL pública de la noticia."
        >
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className={adminInputClass}
          />
        </AdminFormField>
          </div>

        <AdminFormField label="Resumen">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            rows={3}
            className={adminTextareaClass}
          />
        </AdminFormField>

        <AdminFormField label="Contenido">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className={adminTextareaClass}
          />
        </AdminFormField>
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <AdminFormField
          label="Imagen"
          hint="Formatos permitidos: JPG, PNG o WebP."
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className={adminFileInputClass}
          />
        </AdminFormField>

          {imagePreviewUrl && (
            <div className="mt-4">
              <Image
                src={imagePreviewUrl}
                alt="Vista previa de la imagen"
                width={640}
                height={256}
                unoptimized
                className="max-h-80 w-full rounded-[24px] object-cover"
              />

              <button
                type="button"
                onClick={handleRemoveImage}
                className={`${adminSecondaryButtonClass} mt-3`}
              >
                Quitar imagen
              </button>
            </div>
          )}
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <AdminFormField label="Tipo de publicación">
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <AdminRadioCard checked={publishOption === "published"}>
              <input
                type="radio"
                name="publishOption"
                value="published"
                checked={publishOption === "published"}
                onChange={() => setPublishOption("published")}
              />
              Publicar ahora
              </AdminRadioCard>
            </label>

            <label>
              <AdminRadioCard checked={publishOption === "scheduled"}>
              <input
                type="radio"
                name="publishOption"
                value="scheduled"
                checked={publishOption === "scheduled"}
                onChange={() => setPublishOption("scheduled")}
              />
              Programar publicación
              </AdminRadioCard>
            </label>

            <label>
              <AdminRadioCard checked={publishOption === "draft"}>
              <input
                type="radio"
                name="publishOption"
                value="draft"
                checked={publishOption === "draft"}
                onChange={() => setPublishOption("draft")}
              />
              Guardar como borrador
              </AdminRadioCard>
            </label>
          </div>
        </AdminFormField>

        {publishOption === "scheduled" && (
          <AdminFormField label="Fecha de publicación">
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              required
              className={adminInputClass}
            />
          </AdminFormField>
        )}

        <AdminFormField label="Fecha de vencimiento">
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={adminInputClass}
          />
        </AdminFormField>
        </AdminPanelCard>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/noticias")}
            className={adminSecondaryButtonClass}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={adminPrimaryButtonClass}
          >
            {isSubmitting ? "Guardando..." : "Guardar noticia"}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
