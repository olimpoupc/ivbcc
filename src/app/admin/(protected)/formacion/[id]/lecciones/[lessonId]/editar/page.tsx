"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateDocumentFile,
} from "@/lib/security";
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/AdminPrimitives";
import {
  AdminFormField,
  adminFileInputClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTextareaClass,
} from "@/components/admin/AdminFormPrimitives";

type Lesson = {
  id: string;
  title: string;
  content: string;
  video_url?: string | null;
  material_url?: string | null;
  order: number;
};

const allowedMaterialTypes = ["application/pdf"];

function getLessonSaveErrorMessage(message?: string) {
  if (message?.includes("lessons_course_id_order_key")) {
    return "Ya existe una lección con ese número de orden en este curso. Usa otro número.";
  }

  return message || "Error al guardar la lección";
}

function buildMaterialPath(file: File) {
  return buildSafeStoragePath("materials", file);
}

export default function EditarLeccionPage() {
  const router = useRouter();
  const params = useParams<{ id: string; lessonId: string }>();
  const courseId = params.id;
  const lessonId = params.lessonId;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [order, setOrder] = useState("1");

  useEffect(() => {
    let isMounted = true;

    async function loadLesson() {
      const { data, error } = await supabase
        .from("lessons")
        .select("id,title,content,video_url,material_url,order")
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        alert("No se pudo cargar la lección");
        console.error(error);
        router.push(`/admin/formacion/${courseId}/lecciones`);
        return;
      }

      const currentLesson = data as Lesson;
      setLesson(currentLesson);
      setTitle(currentLesson.title || "");
      setContent(currentLesson.content || "");
      setVideoUrl(currentLesson.video_url || "");
      setOrder(String(currentLesson.order || 1));
      setIsLoading(false);
    }

    loadLesson();

    return () => {
      isMounted = false;
    };
  }, [courseId, lessonId, router]);

  async function handleMaterialChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setMaterialFile(null);
      return;
    }

    const validationError = await validateDocumentFile(file, allowedMaterialTypes);
    if (validationError) {
      alert(validationError);
      e.target.value = "";
      setMaterialFile(null);
      return;
    }

    setMaterialFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!lesson) return;

    const lessonOrder = Number(order);

    const { data: existingLesson, error: existingLessonError } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId)
      .eq('"order"', lessonOrder)
      .neq("id", lesson.id)
      .maybeSingle();

    if (existingLessonError) {
      console.error(existingLessonError);
      alert(existingLessonError.message || "Error al guardar la lección");
      return;
    }

    if (existingLesson) {
      alert(
        "Ya existe una lección con ese número de orden en este curso. Usa otro número."
      );
      return;
    }

    setIsSubmitting(true);
    let materialUrl = lesson.material_url || null;

    if (materialFile) {
      const materialPath = buildMaterialPath(materialFile);
      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(materialPath, materialFile, {
          contentType: materialFile.type,
          upsert: false,
        });

      if (uploadError) {
        setIsSubmitting(false);
        alert("Error al subir el material PDF");
        console.error(uploadError);
        return;
      }

      const { data } = supabase.storage
        .from("news-images")
        .getPublicUrl(materialPath);

      materialUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from("lessons")
      .update({
        title,
        content,
        video_url: videoUrl.trim() || null,
        material_url: materialUrl,
        order: lessonOrder,
      })
      .eq("id", lesson.id);

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert(getLessonSaveErrorMessage(error.message));
      return;
    }

    alert("Lección actualizada correctamente");
    router.push(`/admin/formacion/${courseId}/lecciones`);
    router.refresh();
  }

  if (isLoading) {
    return <AdminPageShell><AdminPanelCard>Cargando lección...</AdminPanelCard></AdminPageShell>;
  }

  if (!lesson) {
    return <AdminPageShell><AdminPanelCard>Lección no encontrada.</AdminPanelCard></AdminPageShell>;
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Formación IVBCC"
        title="Editar lección"
        subtitle="Actualiza el contenido y el orden de la lección."
        icon="book"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <AdminPanelCard className="space-y-5">
        <AdminFormField label="Título">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={adminInputClass}
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

        <AdminFormField label="URL de video de YouTube">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className={adminInputClass}
          />
        </AdminFormField>
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <AdminFormField label="Material actual">
          {lesson.material_url ? (
            <a
              href={lesson.material_url}
              target="_blank"
              rel="noreferrer"
              className={adminSecondaryButtonClass}
            >
              Ver material actual
            </a>
          ) : (
            <p className="rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-4 py-3 text-sm font-semibold text-[var(--ivbcc-muted)]">Sin material actual</p>
          )}
        </AdminFormField>

        <AdminFormField label="Reemplazar material PDF" hint="Solo se permite PDF.">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleMaterialChange}
            className={adminFileInputClass}
          />
        </AdminFormField>

        <AdminFormField label="Orden">
          <input
            type="number"
            min="1"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            required
            className={adminInputClass}
          />
        </AdminFormField>
        </AdminPanelCard>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/formacion/${courseId}/lecciones`)}
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
