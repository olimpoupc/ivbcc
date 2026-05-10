"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
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
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Formación IVBCC"
        title="Crear lección"
        subtitle="Agrega una nueva lección al curso seleccionado."
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
        <AdminFormField label="Material PDF" hint="Solo se permite PDF.">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleMaterialChange}
            className={adminFileInputClass}
          />
        </AdminFormField>

        <AdminFormField
          label="Orden"
          hint="Se asignó automáticamente el siguiente orden disponible."
        >
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
            {isSubmitting ? "Guardando..." : "Guardar lección"}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
