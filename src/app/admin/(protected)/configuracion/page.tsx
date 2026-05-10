import SiteSettingsForm from "./SiteSettingsForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";

type SiteSettings = {
  id: string;
  church_name: string | null;
  slogan: string | null;
  phone: string | null;
  whatsapp: string | null;
  primary_email: string | null;
  address: string | null;
  google_maps_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  logo_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  schedules: string | null;
  footer_text: string | null;
};

const siteSettingsSelect =
  "id,church_name,slogan,phone,whatsapp,primary_email,address,google_maps_url,facebook_url,instagram_url,youtube_url,logo_url,hero_title,hero_subtitle,schedules,footer_text";

const defaultSettingsPayload = {
  church_name: "Iglesia Valle de Bendición Cruzada Cristiana",
  slogan: "",
  phone: "",
  whatsapp: "",
  primary_email: "",
  address: "",
  google_maps_url: "",
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  logo_url: "",
  hero_title: "",
  hero_subtitle: "",
  schedules: "",
  footer_text: "",
};

export default async function AdminConfiguracionPage() {
  const supabase = await createSupabaseServerClient();

  const { data: existingSettings, error: settingsError } = await supabase
    .from("site_settings")
    .select(siteSettingsSelect)
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Sistema"
          title="Configuración general"
          subtitle="Error cargando la configuración general."
          icon="settings"
        />
      </AdminPageShell>
    );
  }

  let settings = existingSettings as SiteSettings | null;

  if (!settings) {
    const { data: createdSettings, error: createError } = await supabase
      .from("site_settings")
      .insert(defaultSettingsPayload)
      .select(siteSettingsSelect)
      .maybeSingle();

    if (createError || !createdSettings) {
      return (
        <AdminPageShell>
          <AdminPageHeader
            eyebrow="Sistema"
            title="Configuración general"
            subtitle="No se pudo inicializar la configuración general."
            icon="settings"
          />
        </AdminPageShell>
      );
    }

    settings = createdSettings as SiteSettings;
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Sistema"
        title="Configuración general"
        subtitle="Edita la información institucional global del sitio para preparar la integración dinámica en navbar, footer, home y contacto."
        icon="settings"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Identidad"
          value={settings.church_name ? "OK" : "Pendiente"}
          detail="Nombre institucional"
          icon="home"
          tone="slate"
        />
        <AdminMetricCard
          label="Contacto"
          value={settings.primary_email || settings.phone ? "OK" : "Pendiente"}
          detail="Correo o teléfono"
          icon="message"
          tone="gold"
        />
        <AdminMetricCard
          label="Logo"
          value={settings.logo_url ? "OK" : "Pendiente"}
          detail="Marca visual"
          icon="spark"
          tone="navy"
        />
      </section>

      <SiteSettingsForm
        initialSettings={{
          id: settings.id,
          church_name: settings.church_name || "",
          slogan: settings.slogan || "",
          phone: settings.phone || "",
          whatsapp: settings.whatsapp || "",
          primary_email: settings.primary_email || "",
          address: settings.address || "",
          google_maps_url: settings.google_maps_url || "",
          facebook_url: settings.facebook_url || "",
          instagram_url: settings.instagram_url || "",
          youtube_url: settings.youtube_url || "",
          logo_url: settings.logo_url || "",
          hero_title: settings.hero_title || "",
          hero_subtitle: settings.hero_subtitle || "",
          schedules: settings.schedules || "",
          footer_text: settings.footer_text || "",
        }}
      />
    </AdminPageShell>
  );
}
