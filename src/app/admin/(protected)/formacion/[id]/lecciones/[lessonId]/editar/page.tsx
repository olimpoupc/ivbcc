"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateDocumentFile,
} from "@/lib/security";

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
        .select("*")
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
    return <main className="text-sm text-gray-500">Cargando lección...</main>;
  }

  if (!lesson) {
    return <main className="text-sm text-gray-500">Lección no encontrada.</main>;
  }

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Editar lección</h1>
        <p className="mt-1 text-gray-500">
          Actualiza el contenido y el orden de la lección.
        </p>
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

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            URL de video de YouTube
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Material actual
          </label>
          {lesson.material_url ? (
            <a
              href={lesson.material_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
            >
              Ver material actual
            </a>
          ) : (
            <p className="text-sm text-gray-500">Sin material actual</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Reemplazar material PDF
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleMaterialChange}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Orden
          </label>
          <input
            type="number"
            min="1"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            required
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/formacion/${courseId}/lecciones`)}
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
