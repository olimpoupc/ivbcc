import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildContentMetadata, resolveSeoDescription, seoConfig } from "@/lib/seo";
import EventCountdown from "@/components/ui/EventCountdown";
import EventRegistrationForm from "./EventRegistrationForm";
import ShareEventButtons from "./ShareEventButtons";

export const revalidate = 300;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: evento } = await supabase
    .from("events")
    .select("title,description,image_url,location")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return buildContentMetadata({
    title: evento?.title || "Evento",
    description: resolveSeoDescription(evento?.description, evento?.location),
    path: `/eventos/${slug}`,
    image: evento?.image_url || seoConfig.logoPath,
    type: "website",
    keywords: ["eventos IVBCC", "eventos cristianos", "Valledupar"],
  });
}

export default async function EventoDetallePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  const { data: eventos, error } = await supabase
    .from("events")
    .select(
      "id,title,slug,description,image_url,event_date,location,registration_enabled,status,created_at"
    )
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false });

  const eventoIndex = (eventos || []).findIndex((item) => item.slug === slug);
  const evento = eventoIndex >= 0 ? eventos?.[eventoIndex] : null;
  const previousEvent =
    eventoIndex >= 0 && eventos && eventoIndex > 0
      ? eventos[eventoIndex - 1]
      : null;
  const nextEvent =
    eventoIndex >= 0 && eventos && eventoIndex < eventos.length - 1
      ? eventos[eventoIndex + 1]
      : null;
  const moreEvents = (eventos || [])
    .filter((item) => item.slug !== slug)
    .sort((a, b) => {
      const aTime = new Date(a.event_date || a.created_at || 0).getTime();
      const bTime = new Date(b.event_date || b.created_at || 0).getTime();
      const aDistance = Math.abs(aTime - now.getTime());
      const bDistance = Math.abs(bTime - now.getTime());
      return aDistance - bDistance;
    })
    .slice(0, 3);

  if (error || !evento) {
    return <main className="p-10">Evento no encontrado.</main>;
  }

  return (
    <main className="premium-page">
      <div className="site-shell pt-8">
      <Link
        href="/eventos"
        className="btn-ghost mb-8"
      >
        Volver a eventos
      </Link>
      </div>

      {evento.image_url ? (
        <div className="site-shell mb-10">
          <div className="media-frame min-h-80 rounded-[30px] bg-[#ebe6dc] shadow-lg">
            <Image
              src={evento.image_url}
              alt={evento.title}
              width={1400}
              height={820}
              sizes="(min-width: 1024px) 1180px, 100vw"
              priority
              className="mx-auto max-h-[34rem] h-auto w-auto object-contain p-4"
            />
          </div>
        </div>
      ) : null}

      <section className="site-shell grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <header
            className={`rounded-[30px] p-8 shadow-sm md:p-10 ${
              evento.image_url
                ? "premium-surface"
                : "page-hero text-white"
            }`}
          >
            <div className="flex flex-wrap gap-2">
              <span
                className={`badge ${
                  evento.image_url
                    ? ""
                    : "border-white/10 bg-white/10 text-white"
                }`}
              >
                Evento
              </span>
              <span
                className={`badge ${
                  evento.registration_enabled
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-[#e8e2d6] bg-[#f3eee4] text-slate-600"
                }`}
              >
                {evento.registration_enabled
                  ? "Inscripciones disponibles"
                  : "Inscripciones cerradas"}
              </span>
            </div>

            <h1
              className={`section-title mt-5 text-4xl md:text-5xl ${
                evento.image_url ? "text-gray-950" : "text-white"
              }`}
            >
              {evento.title}
            </h1>

            <div
              className={`mt-5 space-y-2 text-sm font-medium ${
                evento.image_url ? "text-gray-500" : "text-white/75"
              }`}
            >
              <p>{formatDateTimeColombia(evento.event_date)}</p>
              <p>{evento.location || "Ubicación por confirmar"}</p>
            </div>
          </header>

          <section className="premium-surface rounded-[30px] p-8">
            <h2 className="section-title text-3xl text-gray-950">
              Información principal
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#f6f1e8] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Fecha y hora
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {formatDateTimeColombia(evento.event_date)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f6f1e8] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Ubicación
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {evento.location || "Ubicación por confirmar"}
                </p>
              </div>
            </div>
            {evento.event_date ? (
              <div className="mt-5">
                <EventCountdown targetDate={evento.event_date} />
              </div>
            ) : null}
          </section>

          <section className="premium-surface rounded-[30px] p-8">
            <h2 className="section-title text-3xl text-gray-950">Descripción</h2>
            <article className="prose-premium mt-5 whitespace-pre-line">
              {evento.description}
            </article>
          </section>

          <section className="premium-surface rounded-[30px] p-8">
            <h2 className="section-title text-3xl text-gray-950">Inscripción</h2>
            <div className="mt-5">
              {evento.registration_enabled ? (
                <EventRegistrationForm eventId={evento.id} />
              ) : (
                <div className="rounded-2xl bg-[#f6f1e8] px-5 py-4 text-sm font-medium text-gray-600">
                  Inscripciones no disponibles para este evento.
                </div>
              )}
            </div>
          </section>

          <section className="premium-surface grid gap-4 rounded-[28px] p-5 md:grid-cols-3">
            <div className="md:col-span-3">
              <h2 className="section-title text-xl text-gray-950">
                Navegar eventos
              </h2>
            </div>

            <div>
              {previousEvent ? (
                <Link
                  href={`/eventos/${previousEvent.slug}`}
                  className="btn-ghost"
                >
                  Evento anterior
                </Link>
              ) : (
                <span className="text-sm text-gray-400">Sin anterior</span>
              )}
            </div>

            <div className="md:text-center">
              <Link
                href="/eventos"
                className="btn-primary"
              >
                Volver a eventos
              </Link>
            </div>

            <div className="md:text-right">
              {nextEvent ? (
                <Link
                  href={`/eventos/${nextEvent.slug}`}
                  className="btn-ghost"
                >
                  Siguiente evento
                </Link>
              ) : (
                <span className="text-sm text-gray-400">Sin siguiente</span>
              )}
            </div>
          </section>

          {moreEvents.length > 0 && (
            <section className="premium-surface rounded-[30px] p-6">
              <h2 className="section-title text-3xl text-gray-950">Más eventos</h2>
              <div className="mt-5 space-y-4">
                {moreEvents.map((item) => (
                  <article
                    key={item.id}
                    className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-gray-500">
                      {formatDateTimeColombia(item.event_date)}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-gray-950">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {item.location || "Ubicación por confirmar"}
                    </p>
                    <Link
                      href={`/eventos/${item.slug}`}
                      className="mt-2 inline-flex text-sm font-extrabold text-[var(--ivbcc-navy)]"
                    >
                      Ver evento
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <ShareEventButtons title={evento.title} />
        </aside>
      </section>
    </main>
  );
}
