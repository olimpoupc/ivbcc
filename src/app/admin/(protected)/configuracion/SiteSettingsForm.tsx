"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import AuthFeedback from "@/components/AuthFeedback";
import { AdminPanelCard } from "@/components/admin/AdminPrimitives";
import {
  adminFileInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/components/admin/AdminFormPrimitives";
import { supabase } from "@/lib/supabase";
import {
  buildSafeStoragePath,
  uploadLimits,
  validateImageFile,
} from "@/lib/security";

type SiteSettingsFormValues = {
  id: string;
  church_name: string;
  slogan: string;
  phone: string;
  whatsapp: string;
  primary_email: string;
  address: string;
  google_maps_url: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  logo_url: string;
  hero_title: string;
  hero_subtitle: string;
  schedules: string;
  footer_text: string;
};

type Props = {
  initialSettings: SiteSettingsFormValues;
};

function getStoragePathFromPublicUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/news-images/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function buildLogoPath(file: File) {
  return buildSafeStoragePath("settings/logo", file);
}

function buildPayload(values: SiteSettingsFormValues) {
  return {
    church_name: values.church_name.trim() || null,
    slogan: values.slogan.trim() || null,
    phone: values.phone.trim() || null,
    whatsapp: values.whatsapp.trim() || null,
    primary_email: values.primary_email.trim() || null,
    address: values.address.trim() || null,
    google_maps_url: values.google_maps_url.trim() || null,
    facebook_url: values.facebook_url.trim() || null,
    instagram_url: values.instagram_url.trim() || null,
    youtube_url: values.youtube_url.trim() || null,
    logo_url: values.logo_url.trim() || null,
    hero_title: values.hero_title.trim() || null,
    hero_subtitle: values.hero_subtitle.trim() || null,
    schedules: values.schedules.trim() || null,
    footer_text: values.footer_text.trim() || null,
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <AdminPanelCard>
      <div className="mb-5">
        <h2 className="section-title text-xl text-[var(--ivbcc-ink)]">{title}</h2>
        <p className="muted-copy mt-1 text-sm">{description}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </AdminPanelCard>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="form-control"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="md:col-span-2">
      <label className="form-label">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="form-control"
      />
    </div>
  );
}

export default function SiteSettingsForm({ initialSettings }: Props) {
  const [values, setValues] = useState(initialSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  }>({ type: "info", message: "" });

  function updateField<K extends keyof SiteSettingsFormValues>(
    key: K,
    value: SiteSettingsFormValues[K]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setLogoFile(null);
      return;
    }

    const validationError = await validateImageFile(file, uploadLimits.logoMaxBytes);
    if (validationError) {
      setFeedback({
        type: "error",
        message: validationError,
      });
      event.target.value = "";
      setLogoFile(null);
      return;
    }

    setLogoFile(file);
    setFeedback({
      type: "info",
      message: `Logo listo para subir: ${file.name}`,
    });
  }

  function clearLogoSelection() {
    setLogoFile(null);

    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setFeedback({ type: "info", message: "Guardando configuración..." });

    let nextLogoUrl = values.logo_url.trim() || null;

    if (logoFile) {
      const previousLogoPath = getStoragePathFromPublicUrl(values.logo_url);
      const logoPath = buildLogoPath(logoFile);

      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(logoPath, logoFile, {
          contentType: logoFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setIsSubmitting(false);
        setFeedback({
          type: "error",
          message: uploadError.message || "No pudimos subir el logo.",
        });
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("news-images")
        .getPublicUrl(logoPath);

      nextLogoUrl = publicUrlData.publicUrl;

      if (previousLogoPath && previousLogoPath !== logoPath) {
        const { error: removeError } = await supabase.storage
          .from("news-images")
          .remove([previousLogoPath]);

        if (removeError) {
          console.error(removeError);
        }
      }
    }

    const { error } = await supabase
      .from("site_settings")
      .update({
        ...buildPayload(values),
        logo_url: nextLogoUrl,
      })
      .eq("id", values.id);

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "No pudimos guardar la configuración.",
      });
      return;
    }

    setValues((current) => ({
      ...current,
      logo_url: nextLogoUrl || "",
    }));
    clearLogoSelection();
    setFeedback({
      type: "success",
      message: "Configuración actualizada correctamente.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AuthFeedback type={feedback.type} message={feedback.message} />

      <Section
        title="Información general"
        description="Datos base de identidad institucional."
      >
        <Field
          label="Nombre de la iglesia"
          value={values.church_name}
          onChange={(value) => updateField("church_name", value)}
        />
        <Field
          label="Slogan"
          value={values.slogan}
          onChange={(value) => updateField("slogan", value)}
        />
        <Field
          label="URL del logo"
          value={values.logo_url}
          onChange={(value) => updateField("logo_url", value)}
          type="url"
          placeholder="https://..."
        />
        <div className="md:col-span-2">
          <label className="form-label">
            Logo actual
          </label>

          {values.logo_url ? (
            <div className="rounded-[24px] border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-4">
              <div className="flex min-h-28 items-center justify-center rounded-2xl bg-white p-4">
                {values.logo_url.startsWith("/") ? (
                  <Image
                    src={values.logo_url}
                    alt="Logo actual"
                    width={220}
                    height={90}
                    className="h-auto max-h-24 w-auto object-contain"
                  />
                ) : (
                  <Image
                    src={values.logo_url}
                    alt="Logo actual"
                    width={220}
                    height={90}
                    unoptimized
                    className="h-auto max-h-24 w-auto object-contain"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[rgba(7,22,45,0.18)] bg-[var(--ivbcc-paper)] px-4 py-8 text-center text-sm font-semibold text-[var(--ivbcc-muted)]">
              Aún no hay logo configurado.
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="form-label">
            Subir nuevo logo
          </label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoChange}
            className={adminFileInputClass}
          />
          <p className="mt-2 text-xs font-semibold text-[var(--ivbcc-muted)]">
            Formatos permitidos: JPG, PNG, WEBP o SVG. Tamaño máximo: 5MB.
          </p>

          {logoFile && (
            <div className="mt-3 rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">{logoFile.name}</p>
              <button
                type="button"
                onClick={clearLogoSelection}
                className={`${adminSecondaryButtonClass} mt-3`}
              >
                Quitar archivo
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Contacto"
        description="Información principal de contacto y ubicación."
      >
        <Field
          label="Teléfono"
          value={values.phone}
          onChange={(value) => updateField("phone", value)}
        />
        <Field
          label="WhatsApp"
          value={values.whatsapp}
          onChange={(value) => updateField("whatsapp", value)}
        />
        <Field
          label="Correo principal"
          value={values.primary_email}
          onChange={(value) => updateField("primary_email", value)}
          type="email"
        />
        <Field
          label="Google Maps URL"
          value={values.google_maps_url}
          onChange={(value) => updateField("google_maps_url", value)}
          type="url"
          placeholder="https://..."
        />
        <TextAreaField
          label="Dirección"
          value={values.address}
          onChange={(value) => updateField("address", value)}
          rows={3}
        />
      </Section>

      <Section
        title="Redes"
        description="Enlaces sociales institucionales."
      >
        <Field
          label="Facebook URL"
          value={values.facebook_url}
          onChange={(value) => updateField("facebook_url", value)}
          type="url"
          placeholder="https://facebook.com/..."
        />
        <Field
          label="Instagram URL"
          value={values.instagram_url}
          onChange={(value) => updateField("instagram_url", value)}
          type="url"
          placeholder="https://instagram.com/..."
        />
        <Field
          label="YouTube URL"
          value={values.youtube_url}
          onChange={(value) => updateField("youtube_url", value)}
          type="url"
          placeholder="https://youtube.com/..."
        />
      </Section>

      <Section
        title="Hero"
        description="Textos principales para el encabezado institucional."
      >
        <Field
          label="Hero title"
          value={values.hero_title}
          onChange={(value) => updateField("hero_title", value)}
        />
        <TextAreaField
          label="Hero subtitle"
          value={values.hero_subtitle}
          onChange={(value) => updateField("hero_subtitle", value)}
          rows={4}
        />
      </Section>

      <Section
        title="Footer"
        description="Horarios y texto institucional de pie de página."
      >
        <TextAreaField
          label="Horarios"
          value={values.schedules}
          onChange={(value) => updateField("schedules", value)}
          rows={4}
        />
        <TextAreaField
          label="Footer text"
          value={values.footer_text}
          onChange={(value) => updateField("footer_text", value)}
          rows={4}
        />
      </Section>

      <div className="flex justify-end">
      <button
          type="submit"
          disabled={isSubmitting}
          className={adminPrimaryButtonClass}
        >
          {isSubmitting ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}
