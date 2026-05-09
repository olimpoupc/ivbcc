import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import EventCountdown from "@/components/ui/EventCountdown";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 300;

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function eventDay(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function eventMonth(value?: string | null) {
  if (!value) return "Fecha";
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function EventosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: eventos, error } = await supabase
    .from("events")
    .select("id,title,slug,description,image_url,event_date,location,registration_enabled,status")
    .eq("status", "published")
    .order("event_date", { ascending: true });

  if (error) {
    return <main className="p-10">Error cargando eventos.</main>;
  }

  const featured = eventos?.[0] || null;
  const remaining = (eventos || []).slice(1);

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
          <div className="hero-inner px-6 py-12 md:px-10 md:py-16">
            <p className="kicker">Agenda IVBCC</p>
            <h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">
              Encuentros diseñados para vivir comunidad.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
              Revisa los próximos espacios, actividades e invitaciones especiales de la iglesia.
            </p>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="site-shell-wide py-12">
          <article className="editorial-card grid lg:grid-cols-[0.95fr_1.05fr]">
            <Link href={`/eventos/${featured.slug}`} className="media-frame min-h-[460px] rounded-none">
              {featured.image_url ? (
                <Image
                  src={featured.image_url}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 1024px) 600px, 100vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <EmptyImagePlaceholder
                  label="IVBCC Eventos"
                  subtitle="Encuentros y actividades para vivir en comunidad."
                  className="h-full"
                  variant="detail"
                />
              )}
              <div className="absolute left-6 top-6 rounded-2xl bg-white/95 px-5 py-4 text-center shadow-xl">
                <p className="font-display text-4xl font-extrabold text-[var(--ivbcc-navy)]">
                  {eventDay(featured.event_date)}
                </p>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                  {eventMonth(featured.event_date)}
                </p>
              </div>
            </Link>
            <div className="flex flex-col justify-center p-7 md:p-10">
              <span className="badge w-fit">
                {featured.registration_enabled ? "Inscripción disponible" : "Evento"}
              </span>
              <h2 className="section-title mt-5 text-4xl md:text-5xl">
                {featured.title}
              </h2>
              <p className="mt-5 text-sm font-semibold text-slate-500">
                {formatDateTimeColombia(featured.event_date)}
              </p>
              <p className="muted-copy mt-2">{featured.location || "Ubicación por confirmar"}</p>
              <p className="muted-copy mt-5 line-clamp-4">{featured.description}</p>
              {featured.event_date ? (
                <div className="mt-6">
                  <EventCountdown targetDate={featured.event_date} />
                </div>
              ) : null}
              <Link href={`/eventos/${featured.slug}`} className="btn-secondary mt-8 w-fit">
                Ver detalle
              </Link>
            </div>
          </article>
        </section>
      ) : (
        <section className="site-shell-wide py-12">
          <div className="premium-surface rounded-[28px] px-6 py-16 text-center text-sm text-slate-500">
            No hay eventos publicados en este momento.
          </div>
        </section>
      )}

      {remaining.length > 0 ? (
        <section className="site-shell-wide pb-16">
          <div className="mb-7">
            <p className="kicker">Próximamente</p>
            <h2 className="section-title mt-2 text-4xl">Más eventos</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {remaining.map((evento) => (
              <article key={evento.id} className="editorial-card">
                <Link href={`/eventos/${evento.slug}`} className="media-frame block aspect-[4/5] rounded-none">
                  {evento.image_url ? (
                    <Image
                      src={evento.image_url}
                      alt={evento.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <EmptyImagePlaceholder
                      label="IVBCC Eventos"
                      subtitle="Encuentros y actividades para vivir en comunidad."
                      className="h-full"
                    />
                  )}
                  <div className="absolute left-5 top-5 rounded-2xl bg-white/95 px-4 py-3 text-center shadow-xl">
                    <p className="font-display text-3xl font-extrabold text-[var(--ivbcc-navy)]">
                      {eventDay(evento.event_date)}
                    </p>
                    <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-[var(--ivbcc-gold)]">
                      {eventMonth(evento.event_date)}
                    </p>
                  </div>
                </Link>
                <div className="p-6">
                  <span className="badge">
                    {evento.registration_enabled ? "Inscripción activa" : "Evento"}
                  </span>
                  <h2 className="section-title mt-4 text-2xl">{evento.title}</h2>
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    {formatDateTimeColombia(evento.event_date)}
                  </p>
                  <p className="muted-copy mt-2 line-clamp-2 text-sm">
                    {evento.location || "Ubicación por confirmar"}
                  </p>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm">{evento.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
