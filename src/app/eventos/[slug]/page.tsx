import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildContentMetadata, resolveSeoDescription, seoConfig } from "@/lib/seo";
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
      "id,title,slug,description,image_url,event_date,location,registration_enabled,registration_deadline,status,created_at"
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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/eventos"
        className="mb-8 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
      >
        Volver a eventos
      </Link>

      {evento.image_url ? (
        <div className="mb-10 flex min-h-80 w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-100 p-4 shadow-sm">
          <Image
            src={evento.image_url}
            alt={evento.title}
            width={1200}
            height={720}
            sizes="(min-width: 1024px) 896px, 100vw"
            priority
            className="max-h-[32rem] h-auto w-auto object-contain"
          />
        </div>
      ) : null}

      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <header
            className={`rounded-2xl p-8 shadow-sm ${
              evento.image_url
                ? "bg-white"
                : "bg-[var(--ivbcc-navy)] text-white"
            }`}
          >
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  evento.image_url
                    ? "bg-slate-100 text-slate-700"
                    : "bg-white/10 text-white"
                }`}
              >
                Evento
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  evento.registration_enabled
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {evento.registration_enabled
                  ? "Inscripciones disponibles"
                  : "Inscripciones cerradas"}
              </span>
            </div>

            <h1
              className={`mt-4 text-3xl font-bold leading-tight md:text-4xl ${
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

          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-950">
              Información principal
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Fecha y hora
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {formatDateTimeColombia(evento.event_date)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Ubicación
                </p>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {evento.location || "Ubicación por confirmar"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-950">Descripción</h2>
            <article className="mt-5 whitespace-pre-line text-lg leading-relaxed text-gray-800">
              {evento.description}
            </article>
          </section>

          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-950">Inscripción</h2>
            <div className="mt-5">
              {evento.registration_enabled ? (
                <EventRegistrationForm eventId={evento.id} />
              ) : (
                <div className="rounded-xl bg-slate-50 px-5 py-4 text-sm font-medium text-gray-600">
                  Inscripciones no disponibles para este evento.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-3">
            <div className="md:col-span-3">
              <h2 className="text-lg font-bold text-gray-950">
                Navegar eventos
              </h2>
            </div>

            <div>
              {previousEvent ? (
                <Link
                  href={`/eventos/${previousEvent.slug}`}
                  className="inline-flex rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-gray-50"
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
                className="inline-flex rounded-lg bg-[var(--ivbcc-gold)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Volver a eventos
              </Link>
            </div>

            <div className="md:text-right">
              {nextEvent ? (
                <Link
                  href={`/eventos/${nextEvent.slug}`}
                  className="inline-flex rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-gray-50"
                >
                  Siguiente evento
                </Link>
              ) : (
                <span className="text-sm text-gray-400">Sin siguiente</span>
              )}
            </div>
          </section>

          {moreEvents.length > 0 && (
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-950">Más eventos</h2>
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
                      className="mt-2 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
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
