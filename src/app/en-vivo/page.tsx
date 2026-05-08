import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedNextLink from "@/components/analytics/TrackedNextLink";
import { getPublicSiteSettings } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 300;

type LiveStreamCategory =
  | "live"
  | "sunday"
  | "preaching"
  | "teaching"
  | "special";

type SearchParams = Promise<{
  category?: string;
}>;

const categoryConfig: Record<
  LiveStreamCategory,
  {
    label: string;
    buttonLabel: string;
  }
> = {
  live: {
    label: "En vivo",
    buttonLabel: "En vivo",
  },
  sunday: {
    label: "Dominical",
    buttonLabel: "Dominicales",
  },
  preaching: {
    label: "Prédica",
    buttonLabel: "Prédicas",
  },
  teaching: {
    label: "Enseñanza",
    buttonLabel: "Enseñanzas",
  },
  special: {
    label: "Especial",
    buttonLabel: "Especiales",
  },
};

const categoryFilters: Array<{
  value: "all" | LiveStreamCategory;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "live", label: "En vivo" },
  { value: "sunday", label: "Dominicales" },
  { value: "preaching", label: "Prédicas" },
  { value: "teaching", label: "Enseñanzas" },
  { value: "special", label: "Especiales" },
];

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function getYouTubeEmbedUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.replace("/", "").trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtube.com" ||
      url.hostname === "m.youtube.com"
    ) {
      const videoId = url.searchParams.get("v")?.trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function sortByScheduledDate<
  T extends { scheduled_at?: string | null; created_at?: string | null }
>(items: T[]) {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.scheduled_at || a.created_at || 0).getTime();
    const bDate = new Date(b.scheduled_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });
}

export default async function EnVivoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedCategory =
    resolvedSearchParams.category &&
    resolvedSearchParams.category in categoryConfig
      ? (resolvedSearchParams.category as LiveStreamCategory)
      : "all";

  const siteSettings = await getPublicSiteSettings();
  const supabase = await createSupabaseServerClient();
  const { data: liveStreams, error } = await supabase
    .from("live_streams")
    .select(
      "id,title,slug,description,thumbnail_url,youtube_url,category,is_live,featured,scheduled_at,created_at,status"
    )
    .eq("status", "published")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="p-10">Error cargando transmisiones.</main>;
  }

  const sortedStreams = sortByScheduledDate(liveStreams || []);
  const currentLiveStream =
    sortedStreams.find((stream) => stream.is_live) || null;
  const filteredStreams =
    selectedCategory === "all"
      ? sortedStreams
      : sortedStreams.filter((stream) => stream.category === selectedCategory);
  const featuredStreams = filteredStreams
    .filter((stream) => stream.featured && stream.id !== currentLiveStream?.id)
    .slice(0, 3);
  const excludedIds = new Set([
    ...(currentLiveStream ? [currentLiveStream.id] : []),
    ...featuredStreams.map((stream) => stream.id),
  ]);
  const gridStreams = filteredStreams.filter(
    (stream) => !excludedIds.has(stream.id)
  );
  const currentLiveEmbedUrl = getYouTubeEmbedUrl(currentLiveStream?.youtube_url);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="overflow-hidden rounded-[28px] bg-[var(--ivbcc-navy)] px-8 py-12 text-white shadow-sm md:px-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
              IVBCC
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              En Vivo y Transmisiones
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
              Cultos dominicales, prédicas, enseñanzas y momentos especiales
              para acompañar la vida espiritual de nuestra comunidad.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
              Comunidad IVBCC
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Encuentra transmisiones actuales y contenido reciente para seguir
              conectado desde cualquier lugar.
            </p>
            <TrackedLink
              href={siteSettings.youtube_url}
              target="_blank"
              rel="noreferrer"
              eventName="click_youtube"
              eventParams={{ location: "live_page_header" }}
              className="mt-5 inline-flex rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ver canal en YouTube
            </TrackedLink>
          </div>
        </div>
      </section>

      {currentLiveStream && (
        <section className="mt-12">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
              Ahora mismo
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">
              Transmisión actual
            </h2>
          </div>

          <article className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            {currentLiveEmbedUrl ? (
              <div className="overflow-hidden bg-slate-950 shadow-inner">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={currentLiveEmbedUrl}
                    title={currentLiveStream.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 text-white md:flex-row md:items-center md:justify-between md:px-8">
                  <p className="text-sm leading-6 text-white/78">
                    Si el video no se reproduce aquí, puedes verlo directamente en YouTube.
                  </p>
                  <a
                    href={currentLiveStream.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-white/90"
                  >
                    Ver en YouTube
                  </a>
                </div>
              </div>
            ) : currentLiveStream.thumbnail_url ? (
              <div className="relative h-80 w-full bg-slate-100">
                <Image
                  src={currentLiveStream.thumbnail_url}
                  alt={currentLiveStream.title}
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  priority
                  className="object-cover object-center"
                />
              </div>
            ) : (
              <EmptyImagePlaceholder
                label="IVBCC En Vivo"
                subtitle="Conéctate con nuestras transmisiones y enseñanzas."
                className="h-72"
                variant="detail"
              />
            )}

            <div className="p-8">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                  En vivo
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {categoryConfig[
                    currentLiveStream.category as keyof typeof categoryConfig
                  ]?.label || "Transmisión"}
                </span>
              </div>

              <h3 className="mt-4 text-3xl font-bold leading-tight text-gray-950">
                {currentLiveStream.title}
              </h3>

              <p className="mt-3 text-sm font-medium text-gray-500">
                {formatDateTimeColombia(
                  currentLiveStream.scheduled_at || currentLiveStream.created_at
                )}
              </p>

              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
                {currentLiveStream.description || "Sin descripción disponible."}
              </p>

              <TrackedNextLink
                href={`/en-vivo/${currentLiveStream.slug}`}
                eventName="open_live_stream"
                eventParams={{ slug: currentLiveStream.slug, location: "live_page_current" }}
                className="mt-6 inline-flex rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Ver transmisión
              </TrackedNextLink>
            </div>
          </article>
        </section>
      )}

      {featuredStreams.length > 0 && (
        <section className="mt-12">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
              Destacados
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">
              Videos destacados
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {featuredStreams.map((stream, index) => (
              <article
                key={stream.id}
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-56 w-full overflow-hidden rounded-t-3xl bg-slate-100">
                  {stream.thumbnail_url ? (
                    <Image
                      src={stream.thumbnail_url}
                      alt={stream.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      priority={index === 0}
                      className="object-cover object-center"
                    />
                  ) : (
                    <EmptyImagePlaceholder
                      label="IVBCC En Vivo"
                      subtitle="Contenido destacado para nuestra comunidad."
                      className="h-full rounded-t-3xl"
                    />
                  )}
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {categoryConfig[
                        stream.category as keyof typeof categoryConfig
                      ]?.label || "Transmisión"}
                    </span>
                    <span className="inline-flex rounded-full bg-[var(--ivbcc-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)] ring-1 ring-[var(--ivbcc-gold)]/30">
                      Destacado
                    </span>
                    {stream.is_live ? (
                      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                        En vivo
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 text-sm font-medium text-gray-500">
                    {formatDateColombia(stream.scheduled_at || stream.created_at)}
                  </p>

                  <h3 className="mt-2 text-2xl font-bold leading-tight text-gray-950">
                    {stream.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {stream.description || "Sin descripción disponible."}
                  </p>

                  <TrackedNextLink
                    href={`/en-vivo/${stream.slug}`}
                    eventName="open_live_stream"
                    eventParams={{ slug: stream.slug, location: "live_page_featured" }}
                    className="mt-5 inline-flex rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver video
                  </TrackedNextLink>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap gap-3">
          {categoryFilters.map((filter) => {
            const isActive = selectedCategory === filter.value;
            const href =
              filter.value === "all"
                ? "/en-vivo"
                : `/en-vivo?category=${filter.value}`;

            return (
              <Link
                key={filter.value}
                href={href}
                className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[var(--ivbcc-navy)] bg-[var(--ivbcc-navy)] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[var(--ivbcc-gold)] hover:bg-amber-50/40 hover:text-[var(--ivbcc-navy)]"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-950">
            {selectedCategory === "all"
              ? "Todas las transmisiones"
              : categoryConfig[selectedCategory].buttonLabel}
          </h2>
        </div>

        {gridStreams.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {gridStreams.map((stream) => (
              <article
                key={stream.id}
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-52 w-full overflow-hidden rounded-t-3xl bg-slate-100">
                  {stream.thumbnail_url ? (
                    <Image
                      src={stream.thumbnail_url}
                      alt={stream.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover object-center"
                    />
                  ) : (
                    <EmptyImagePlaceholder
                      label="IVBCC En Vivo"
                      subtitle="Prédicas, dominicales y enseñanzas."
                      className="h-full rounded-t-3xl"
                    />
                  )}
                </div>

                <div className="flex min-h-[260px] flex-col p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {categoryConfig[stream.category as keyof typeof categoryConfig]
                        ?.label || "Transmisión"}
                    </span>
                    {stream.is_live && (
                      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                        En vivo
                      </span>
                    )}
                    {stream.featured && (
                      <span className="inline-flex rounded-full bg-[var(--ivbcc-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)] ring-1 ring-[var(--ivbcc-gold)]/30">
                        Destacado
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm font-medium text-gray-500">
                    {formatDateTimeColombia(stream.scheduled_at || stream.created_at)}
                  </p>

                  <h3 className="mt-2 text-xl font-bold leading-snug text-gray-950">
                    {stream.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {stream.description || "Sin descripción disponible."}
                  </p>

                  <TrackedNextLink
                    href={`/en-vivo/${stream.slug}`}
                    eventName="open_live_stream"
                    eventParams={{ slug: stream.slug, location: "live_page_grid" }}
                    className="mt-auto inline-flex pt-5 text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
                  >
                    Ver video
                  </TrackedNextLink>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
            Aún no hay transmisiones publicadas.
          </div>
        )}
      </section>
    </main>
  );
}
