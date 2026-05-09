import ContactForm from "./ContactForm";
import TrackedLink from "@/components/analytics/TrackedLink";
import { getPublicSiteSettings } from "@/lib/site-settings";

const fallbackScheduleCards = [
  {
    title: "Domingo",
    description: "Servicio dominical para toda la familia.",
  },
  {
    title: "Miércoles",
    description: "Estudio bíblico y tiempo de edificación.",
  },
  {
    title: "Jóvenes",
    description: "Actividades juveniles y espacios de comunión.",
  },
  {
    title: "Contacto pastoral",
    description: "Atención y acompañamiento según disponibilidad.",
  },
];

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "573187166545";
  if (digits.startsWith("57")) return digits;
  return `57${digits}`;
}

function buildGoogleMapsEmbedUrl(googleMapsUrl: string, address: string) {
  try {
    const url = new URL(googleMapsUrl);

    if (url.hostname.includes("google.com")) {
      const query =
        url.searchParams.get("query") ||
        url.searchParams.get("q") ||
        address;

      return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
    }

    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`;
  } catch {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`;
  }
}

function buildScheduleCards(schedules: string) {
  const parsedCards = schedules
    .split(/\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [title, ...rest] = item.split(":");
      return {
        title: title?.trim() || "Horario",
        description: rest.join(":").trim() || "Próximamente más información.",
      };
    });

  return parsedCards.length ? parsedCards : fallbackScheduleCards;
}

export default async function ContactoPage() {
  const siteSettings = await getPublicSiteSettings();
  const mapsHref = siteSettings.google_maps_url;
  const whatsappHref = `https://wa.me/${normalizeWhatsAppNumber(
    siteSettings.whatsapp || siteSettings.phone
  )}`;
  const mapEmbedUrl = buildGoogleMapsEmbedUrl(
    siteSettings.google_maps_url,
    siteSettings.address
  );
  const scheduleCards = buildScheduleCards(siteSettings.schedules);
  const socialLinks = [
    {
      label: "Facebook",
      href: siteSettings.facebook_url,
    },
    {
      label: "Instagram",
      href: siteSettings.instagram_url,
    },
    {
      label: "YouTube",
      href: siteSettings.youtube_url,
    },
  ];

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
        <div className="hero-inner px-6 py-12 md:px-10 md:py-16">
          <p className="kicker">
            IVBCC
          </p>
          <h1 className="display-title mt-4 text-5xl md:text-7xl">
            Contáctanos
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
            Estamos para servirte, orientarte y acompañarte.
          </p>
        </div>
        </div>
      </section>

      <section className="site-shell-wide mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-8">
          <article className="premium-surface rounded-[30px] p-6 md:p-8">
            <p className="kicker">
              Información rápida
            </p>
            <h2 className="section-title mt-2 text-3xl text-gray-950">
              Estamos cerca de ti
            </h2>

            <div className="mt-6 space-y-4 text-sm leading-6 text-gray-600">
              <p>
                <span className="font-semibold text-gray-950">Iglesia:</span>{" "}
                {siteSettings.church_name}
              </p>
              <p>
                <span className="font-semibold text-gray-950">Dirección:</span>{" "}
                {siteSettings.address}
              </p>
              <p>
                <span className="font-semibold text-gray-950">Teléfono:</span>{" "}
                {siteSettings.phone}
              </p>
              <p>
                <span className="font-semibold text-gray-950">WhatsApp:</span>{" "}
                {siteSettings.whatsapp || siteSettings.phone}
              </p>
              <p>
                <span className="font-semibold text-gray-950">Correo:</span>{" "}
                {siteSettings.primary_email}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <TrackedLink
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                eventName="click_whatsapp"
                eventParams={{ location: "contact_page" }}
                className="btn-primary"
              >
                Escribir por WhatsApp
              </TrackedLink>
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                Abrir en Google Maps
              </a>
            </div>
          </article>

          <article className="overflow-hidden rounded-[30px] bg-white shadow-lg">
            <div className="aspect-[16/11] w-full">
              <iframe
                src={mapEmbedUrl}
                title="Mapa IVBCC Valledupar"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </article>
        </div>

        <ContactForm />
      </section>

      <section className="site-shell-wide mt-12">
        <div className="mb-6">
          <p className="kicker">
            Horarios y acompañamiento
          </p>
          <h2 className="section-title mt-2 text-4xl text-gray-950">
            Espacios para conectar
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {scheduleCards.map((card) => (
            <article
              key={card.title}
              className="premium-surface rounded-[24px] p-6"
            >
              <h3 className="section-title text-xl text-gray-950">{card.title}</h3>
              <p className="muted-copy mt-3 text-sm">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-shell-wide mt-12 rounded-[30px] premium-surface p-8">
        <p className="kicker">
          Redes
        </p>
        <h2 className="section-title mt-2 text-3xl text-gray-950">
          Síguenos y mantente conectado
        </h2>

        <div className="mt-6 flex flex-wrap gap-4">
          {socialLinks.map((link) => (
            <TrackedLink
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              eventName={
                link.label === "Facebook"
                  ? "click_facebook"
                  : link.label === "Instagram"
                    ? "click_instagram"
                    : "click_youtube"
              }
              eventParams={{ location: "contact_page" }}
              className="btn-ghost"
            >
              {link.label}
            </TrackedLink>
          ))}
        </div>
      </section>
    </main>
  );
}
