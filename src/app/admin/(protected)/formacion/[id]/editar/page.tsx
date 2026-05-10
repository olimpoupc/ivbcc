"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buildSafeStoragePath, validateImageFile } from "@/lib/security";
import {
  AdminActionButton,
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

type CourseStatus = "draft" | "published";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url?: string | null;
  status?: CourseStatus | null;
};

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
  return buildSafeStoragePath("courses", file);
}

export default function EditarCursoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,slug,description,image_url,status")
        .eq("id", id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        alert("No se pudo cargar el curso");
        console.error(error);
        router.push("/admin/formacion");
        return;
      }

      const currentCourse = data as Course;
      setCourse(currentCourse);
      setTitle(currentCourse.title || "");
      setSlug(normalizeSlug(currentCourse.slug || ""));
      setDescription(currentCourse.description || "");
      setStatus(currentCourse.status || "draft");
      setIsLoading(false);
    }

    loadCourse();

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!course) return;

    setIsSubmitting(true);
    const normalizedSlug = normalizeSlug(slug);
    let imageUrl = course.image_url || null;

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
      .from("courses")
      .update({
        title,
        slug: normalizedSlug,
        description,
        image_url: imageUrl,
        status,
      })
      .eq("id", course.id);

    setIsSubmitting(false);

    if (error) {
      alert("Error al actualizar el curso");
      console.error(error);
      return;
    }

    alert("Curso actualizado correctamente");
    router.push("/admin/formacion");
    router.refresh();
  }

  if (isLoading) {
    return <AdminPageShell><AdminPanelCard>Cargando curso...</AdminPanelCard></AdminPageShell>;
  }

  if (!course) {
    return <AdminPageShell><AdminPanelCard>Curso no encontrado.</AdminPanelCard></AdminPageShell>;
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Formación IVBCC"
        title="Editar curso"
        subtitle="Actualiza la información, estado e imagen del curso."
        icon="book"
        actions={
          <AdminActionButton href="/admin/formacion" icon="arrow" tone="outline">
            Volver a cursos
          </AdminActionButton>
        }
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
            required
            rows={6}
            className={adminTextareaClass}
          />
        </AdminFormField>
        </AdminPanelCard>

        <AdminPanelCard>
        <div className="grid gap-5 lg:grid-cols-2">
          <AdminFormField label="Imagen actual">

            {course.image_url ? (
              <div className="relative h-56 overflow-hidden rounded-[24px] bg-[var(--ivbcc-paper)]">
                <Image
                  src={course.image_url}
                  alt={course.title}
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
        </AdminPanelCard>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/formacion")}
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
