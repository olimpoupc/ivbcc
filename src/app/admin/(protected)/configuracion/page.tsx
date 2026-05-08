import SiteSettingsForm from "./SiteSettingsForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
    .select("*")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    return (
      <main className="p-8 text-sm text-gray-500">
        Error cargando la configuración general.
      </main>
    );
  }

  let settings = existingSettings as SiteSettings | null;

  if (!settings) {
    const { data: createdSettings, error: createError } = await supabase
      .from("site_settings")
      .insert(defaultSettingsPayload)
      .select("*")
      .maybeSingle();

    if (createError || !createdSettings) {
      return (
        <main className="p-8 text-sm text-gray-500">
          No se pudo inicializar la configuración general.
        </main>
      );
    }

    settings = createdSettings as SiteSettings;
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-950">
          Configuración general
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Edita la información institucional global del sitio para preparar la
          integración dinámica en navbar, footer, home y contacto.
        </p>
      </div>

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
    </main>
  );
}
