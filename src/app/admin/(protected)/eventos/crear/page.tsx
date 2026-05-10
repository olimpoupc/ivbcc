"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buildSafeStoragePath, validateImageFile } from "@/lib/security";
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
  adminTextareaClass,
} from "@/components/admin/AdminFormPrimitives";

type EventStatus = "draft" | "published" | "scheduled" | "cancelled";

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
  return buildSafeStoragePath("events", file);
}

export default function CrearEventoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<EventStatus>("draft");
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
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
    const normalizedSlug = normalizeSlug(slug);

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

    const { error } = await supabase.from("events").insert({
      title,
      slug: normalizedSlug,
      description,
      image_url: imageUrl,
      event_date: toISOStringFromLocal(eventDate),
      location,
      status,
      registration_enabled: registrationEnabled,
    });

    setIsSubmitting(false);

    if (error) {
      alert("Error al crear el evento");
      console.error(error);
      return;
    }

    alert("Evento creado correctamente");
    router.push("/admin/eventos");
    router.refresh();
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Agenda ministerial"
        title="Crear evento"
        subtitle="Registra un nuevo evento de IVBCC con su fecha, ubicación, estado e imagen."
        icon="calendar"
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

        <AdminPanelCard className="space-y-5">
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
        </AdminPanelCard>

        <AdminPanelCard className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminFormField label="Fecha del evento">
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className={adminInputClass}
            />
          </AdminFormField>

          <AdminFormField label="Ubicación">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={adminInputClass}
            />
          </AdminFormField>
        </div>

        <AdminFormField label="Estado">
          <div className="grid gap-3 md:grid-cols-4">
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

            <label><AdminRadioCard checked={status === "scheduled"}>
              <input
                type="radio"
                name="status"
                value="scheduled"
                checked={status === "scheduled"}
                onChange={() => setStatus("scheduled")}
              />
              Programado
            </AdminRadioCard></label>

            <label><AdminRadioCard checked={status === "cancelled"}>
              <input
                type="radio"
                name="status"
                value="cancelled"
                checked={status === "cancelled"}
                onChange={() => setStatus("cancelled")}
              />
              Cancelado
            </AdminRadioCard></label>
          </div>
        </AdminFormField>

        <label>
          <AdminToggleCard checked={registrationEnabled}>
          <input
            type="checkbox"
            checked={registrationEnabled}
            onChange={(e) => setRegistrationEnabled(e.target.checked)}
          />
          Permitir inscripciones
          </AdminToggleCard>
        </label>
        </AdminPanelCard>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/eventos")}
            className={adminSecondaryButtonClass}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={adminPrimaryButtonClass}
          >
            {isSubmitting ? "Guardando..." : "Guardar evento"}
          </button>
        </div>
      </form>
    </AdminPageShell>
  );
}
