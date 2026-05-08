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
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="overflow-hidden rounded-[28px] bg-[var(--ivbcc-navy)] px-8 py-12 text-white shadow-sm md:px-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
            IVBCC
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Contáctanos
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
            Estamos para servirte, orientarte y acompañarte.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-8">
          <article className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
              Información rápida
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">
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
                className="inline-flex rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Escribir por WhatsApp
              </TrackedLink>
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
              >
                Abrir en Google Maps
              </a>
            </div>
          </article>

          <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
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

      <section className="mt-12">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
            Horarios y acompañamiento
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-950">
            Espacios para conectar
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {scheduleCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-gray-950">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
          Redes
        </p>
        <h2 className="mt-2 text-2xl font-bold text-gray-950">
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
              className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:border-[var(--ivbcc-gold)]"
            >
              {link.label}
            </TrackedLink>
          ))}
        </div>
      </section>
    </main>
  );
}
