"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateDocumentFile,
  validateImageFile,
} from "@/lib/security";
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

type Publication = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  category: PublicationCategory;
  image_url?: string | null;
  file_url?: string | null;
  video_url?: string | null;
  status?: PublicationStatus | null;
  featured?: boolean | null;
  published_at?: string | null;
};

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

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function buildImagePath(file: File) {
  return buildSafeStoragePath("publications", file);
}

function buildFilePath(file: File) {
  return buildSafeStoragePath("publications/files", file);
}

export default function EditarPublicacionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publication, setPublication] = useState<Publication | null>(null);

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

  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublication() {
      const { data, error } = await supabase
        .from("publications")
        .select("id,title,slug,summary,content,category,image_url,file_url,video_url,status,featured,published_at")
        .eq("id", id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        alert("No se pudo cargar la publicación");
        console.error(error);
        router.push("/admin/publicaciones");
        return;
      }

      const currentPublication = data as Publication;
      setPublication(currentPublication);
      setTitle(currentPublication.title || "");
      setSlug(normalizeSlug(currentPublication.slug || ""));
      setSummary(currentPublication.summary || "");
      setContent(currentPublication.content || "");
      setCategory(currentPublication.category || "devotional");
      setVideoUrl(currentPublication.video_url || "");
      setStatus(currentPublication.status || "draft");
      setFeatured(Boolean(currentPublication.featured));
      setPublishedAt(toDateTimeLocalValue(currentPublication.published_at));
      setIsLoading(false);
    }

    loadPublication();

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

  function handleRemoveNewImage() {
    setImageFile(null);
    updateImagePreview(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleRemoveNewFile() {
    setFileDocument(null);

    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!publication) return;

    setIsSubmitting(true);
    const normalizedSlug = normalizeSlug(slug);

    let imageUrl = publication.image_url || null;
    let fileUrl = publication.file_url || null;

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

    const { error } = await supabase
      .from("publications")
      .update({
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
            ? toISOStringFromLocal(publishedAt) ||
              publication.published_at ||
              new Date().toISOString()
            : null,
      })
      .eq("id", publication.id);

    setIsSubmitting(false);

    if (error) {
      alert(error.message || "Error al actualizar la publicación");
      console.error(error);
      return;
    }

    alert("Publicación actualizada correctamente");
    router.push("/admin/publicaciones");
    router.refresh();
  }

  if (isLoading) {
    return <AdminPageShell><AdminPanelCard>Cargando publicación...</AdminPanelCard></AdminPageShell>;
  }

  if (!publication) {
    return <AdminPageShell><AdminPanelCard>Publicación no encontrada.</AdminPanelCard></AdminPageShell>;
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Biblioteca editorial"
        title="Editar publicación"
        subtitle="Actualiza el contenido, categoría, archivos y visibilidad de la publicación."
        icon="file"
        actions={
          <AdminActionButton href="/admin/publicaciones" icon="arrow" tone="outline">
            Volver a publicaciones
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
        <div className="grid gap-5 lg:grid-cols-2">
          <AdminFormField label="Imagen actual">

            {publication.image_url ? (
              <div className="relative h-56 overflow-hidden rounded-[24px] bg-[var(--ivbcc-paper)]">
                <Image
                  src={publication.image_url}
                  alt={publication.title}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-[24px] bg-[var(--ivbcc-paper)] text-sm font-semibold text-[var(--ivbcc-muted)]">
                Sin imagen actual
              </div>
            )}
          </AdminFormField>

          <div>
            <AdminFormField label="Nueva imagen" hint="Formatos permitidos: JPG, PNG o WebP.">
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
                  alt="Vista previa de la nueva imagen"
                  width={640}
                  height={256}
                  unoptimized
                  className="max-h-56 w-full rounded-[24px] object-cover"
                />

                <button
                  type="button"
                  onClick={handleRemoveNewImage}
                  className={`${adminSecondaryButtonClass} mt-3`}
                >
                  Quitar nueva imagen
                </button>
              </div>
            )}
          </div>
        </div>
        </AdminPanelCard>

        <AdminPanelCard>
        <div className="grid gap-5 lg:grid-cols-2">
          <AdminFormField label="Documento actual">
            {publication.file_url ? (
              <a
                href={publication.file_url}
                target="_blank"
                rel="noreferrer"
                className={adminSecondaryButtonClass}
              >
                Ver documento actual
              </a>
            ) : (
              <p className="rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-4 py-3 text-sm font-semibold text-[var(--ivbcc-muted)]">Sin documento actual</p>
            )}
          </AdminFormField>

          <div>
            <AdminFormField label="Nuevo documento / archivo" hint="PDF, DOC o DOCX.">
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
                  onClick={handleRemoveNewFile}
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
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
