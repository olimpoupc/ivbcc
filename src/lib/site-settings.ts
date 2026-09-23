import { createSupabasePublicClient } from "@/lib/supabase-server";

export type PublicSiteSettings = {
  church_name: string;
  slogan: string;
  phone: string;
  whatsapp: string;
  address: string;
  primary_email: string;
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

export const defaultPublicSiteSettings: PublicSiteSettings = {
  church_name: "Iglesia Valle de Bendición Cruzada Cristiana",
  slogan: "Iglesia Valle de Bendición Cruzada Cristiana",
  phone: "318 7166545",
  whatsapp: "318 7166545",
  address: "Cl. 18 #11 - 114 V/par, Cesar",
  primary_email: "contacto@ivbcc.com",
  google_maps_url:
    "https://www.google.com/maps/search/?api=1&query=Cl.+18+%2311-114+Valledupar+Cesar",
  facebook_url:
    "https://www.facebook.com/p/Iglesia-Valle-De-Bendici%C3%B3n-Cruzada-Cristiana-100064649477817/",
  instagram_url: "https://www.instagram.com/iglesiavalledebendicion",
  youtube_url: "https://www.youtube.com/@iglesiavalledebendicioncru4554",
  logo_url: "/images/logonegro.png",
  hero_title: "Una casa para crecer en fe, comunión y formación.",
  hero_subtitle:
    "Conecta con las noticias de la iglesia, próximos eventos, espacios de formación y recursos que acompañan la vida espiritual de nuestra comunidad en Valledupar.",
  schedules:
    "Domingo: Servicio dominical | Miércoles: Estudio bíblico | Jóvenes: Actividades juveniles | Contacto pastoral: según disponibilidad",
  footer_text: "Iglesia Valle de Bendición Cruzada Cristiana",
};

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select(
        "church_name,slogan,phone,whatsapp,address,primary_email,google_maps_url,facebook_url,instagram_url,youtube_url,logo_url,hero_title,hero_subtitle,schedules,footer_text"
      )
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return defaultPublicSiteSettings;
    }

    return {
      church_name: data.church_name || defaultPublicSiteSettings.church_name,
      slogan: data.slogan || defaultPublicSiteSettings.slogan,
      phone: data.phone || defaultPublicSiteSettings.phone,
      whatsapp: data.whatsapp || defaultPublicSiteSettings.whatsapp,
      address: data.address || defaultPublicSiteSettings.address,
      primary_email:
        data.primary_email || defaultPublicSiteSettings.primary_email,
      google_maps_url:
        data.google_maps_url || defaultPublicSiteSettings.google_maps_url,
      facebook_url:
        data.facebook_url || defaultPublicSiteSettings.facebook_url,
      instagram_url:
        data.instagram_url || defaultPublicSiteSettings.instagram_url,
      youtube_url: data.youtube_url || defaultPublicSiteSettings.youtube_url,
      logo_url: data.logo_url || defaultPublicSiteSettings.logo_url,
      hero_title: data.hero_title || defaultPublicSiteSettings.hero_title,
      hero_subtitle:
        data.hero_subtitle || defaultPublicSiteSettings.hero_subtitle,
      schedules: data.schedules || defaultPublicSiteSettings.schedules,
      footer_text: data.footer_text || defaultPublicSiteSettings.footer_text,
    };
  } catch {
    return defaultPublicSiteSettings;
  }
}
