"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateDocumentFile,
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
  AdminToggleCard,
  adminFileInputClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from "@/components/admin/AdminFormPrimitives";

type PublicationStatus = "draft" | "published";
type PublicationCategory =
  | "devotional"
  | "reflection"
  | "announcement"
  | "bulletin"
  | "document"
  | "resource"
  | "video";

const allowedFileTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const categoryOptions: { value: PublicationCategory; label: string }[] = [
  { value: "devotional", label: "Devocional" },
  { value: "reflection", label: "Reflexión" },
  { value: "announcement", label: "Comunicado" },
  { value: "bulletin", label: "Boletín" },
  { value: "document", label: "Documento" },
  { value: "resource", label: "Recurso" },
  { value: "video", label: "Video" },
];

function toISOStringFromLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildImagePath(file: File) {
  return buildSafeStoragePath("publications", file);
}

function buildFilePath(file: File) {
  return buildSafeStoragePath("publications/files", file);
}

export default function CrearPublicacionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] =
    useState<PublicationCategory>("devotional");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<PublicationStatus>("draft");
  const [featured, setFeatured] = useState(false);
  const [publishedAt, setPublishedAt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileDocument, setFileDocument] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setFileDocument(null);
      return;
    }

    const validationError = await validateDocumentFile(file, allowedFileTypes);
    if (validationError) {
      alert(validationError);
      e.target.value = "";
      setFileDocument(null);
      return;
    }

    setFileDocument(file);
  }

  function handleRemoveImage() {
    setImageFile(null);
    updateImagePreview(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleRemoveDocument() {
    setFileDocument(null);

    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const normalizedSlug = normalizeSlug(slug);
    let imageUrl = null;
    let fileUrl = null;

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
        alert(uploadError.message || "Error al subir la imagen");
        console.error(uploadError);
        return;
      }

      const { data } = supabase.storage
        .from("news-images")
        .getPublicUrl(imagePath);

      imageUrl = data.publicUrl;
    }

    if (fileDocument) {
      const filePath = buildFilePath(fileDocument);
      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(filePath, fileDocument, {
          contentType: fileDocument.type,
          upsert: false,
        });

      if (uploadError) {
        setIsSubmitting(false);
        alert(uploadError.message || "Error al subir el documento");
        console.error(uploadError);
        return;
      }

      const { data } = supabase.storage
        .from("news-images")
        .getPublicUrl(filePath);

      fileUrl = data.publicUrl;
    }

    const { error } = await supabase.from("publications").insert({
      title,
      slug: normalizedSlug,
      summary,
      content,
      category,
      image_url: imageUrl,
      file_url: fileUrl,
      video_url: videoUrl.trim() || null,
      status,
      featured,
      published_at:
        status === "published"
          ? toISOStringFromLocal(publishedAt) || new Date().toISOString()
          : null,
    });

    setIsSubmitting(false);

    if (error) {
      alert(error.message || "Error al crear la publicación");
      console.error(error);
      return;
    }

    alert("Publicación creada correctamente");
    router.push("/admin/publicaciones");
    router.refresh();
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Biblioteca editorial"
        title="Crear publicación"
        subtitle="Registra un nuevo contenido institucional, ministerial o multimedia."
        icon="file"
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

        <AdminFormField label="Resumen">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className={adminTextareaClass}
          />
        </AdminFormField>

        <AdminFormField label="Contenido">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className={adminTextareaClass}
          />
        </AdminFormField>
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminFormField label="Categoría">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as PublicationCategory)
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

          <AdminFormField label="URL de video">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className={adminInputClass}
            />
          </AdminFormField>
        </div>
        </AdminPanelCard>

        <AdminPanelCard>
        <div className="grid gap-5 md:grid-cols-2">
          <AdminFormField label="Imagen" hint="Formatos permitidos: JPG, PNG o WebP.">
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

          <div>
            <AdminFormField label="Documento / archivo" hint="PDF, DOC o DOCX.">
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className={adminFileInputClass}
            />
            </AdminFormField>

            {fileDocument && (
              <div className="mt-4 rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-4 py-3">
                <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">
                  {fileDocument.name}
                </p>
                <button
                  type="button"
                  onClick={handleRemoveDocument}
                  className={`${adminSecondaryButtonClass} mt-3`}
                >
                  Quitar archivo
                </button>
              </div>
            )}
          </div>
        </div>
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
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
                Publicada
              </AdminRadioCard></label>
            </div>
          </AdminFormField>

          <AdminFormField label="Fecha de publicación">
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className={adminInputClass}
            />
          </AdminFormField>
        </div>

        <label>
          <AdminToggleCard checked={featured}>
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          Marcar como destacada
          </AdminToggleCard>
        </label>
        </AdminPanelCard>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/publicaciones")}
            className={adminSecondaryButtonClass}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={adminPrimaryButtonClass}
          >
            {isSubmitting ? "Guardando..." : "Guardar publicación"}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
