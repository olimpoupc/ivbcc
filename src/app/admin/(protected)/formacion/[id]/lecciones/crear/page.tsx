"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  validateDocumentFile,
} from "@/lib/security";

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

export default function CrearLeccionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [order, setOrder] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadNextOrder() {
      const { data, error } = await supabase
        .from("lessons")
        .select('"order"')
        .eq("course_id", courseId)
        .order("order", { ascending: false })
        .limit(1);

      if (!isMounted) return;

      if (error) {
        console.error(error);
        return;
      }

      const maxOrder = data?.[0]?.order ?? 0;
      setOrder(String(maxOrder + 1));
    }

    loadNextOrder();

    return () => {
      isMounted = false;
    };
  }, [courseId]);

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
    const lessonOrder = Number(order);

    const { data: existingLesson, error: existingLessonError } = await supabase
      .from("lessons")
      .select("id")
      .eq("course_id", courseId)
      .eq('"order"', lessonOrder)
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

    let materialUrl = null;

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

    const { error } = await supabase.from("lessons").insert({
      course_id: courseId,
      title,
      content,
      video_url: videoUrl.trim() || null,
      material_url: materialUrl,
      order: lessonOrder,
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert(getLessonSaveErrorMessage(error.message));
      return;
    }

    alert("Lección creada correctamente");
    router.push(`/admin/formacion/${courseId}/lecciones`);
    router.refresh();
  }

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crear lección</h1>
        <p className="mt-1 text-gray-500">
          Agrega una nueva lección al curso seleccionado.
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
            Material PDF
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
          <p className="mt-2 text-sm text-gray-500">
            Se asignó automáticamente el siguiente orden disponible.
          </p>
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
            {isSubmitting ? "Guardando..." : "Guardar lección"}
          </button>
        </div>
      </form>
    </main>
  );
}
