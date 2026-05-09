import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedNextLink from "@/components/analytics/TrackedNextLink";
import { getPublicSiteSettings } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 300;

type LiveStreamCategory = "live" | "sunday" | "preaching" | "teaching" | "special";
type SearchParams = Promise<{ category?: string }>;

const categoryConfig: Record<LiveStreamCategory, { label: string; buttonLabel: string }> = {
  live: { label: "En vivo", buttonLabel: "En vivo" },
  sunday: { label: "Dominical", buttonLabel: "Dominicales" },
  preaching: { label: "Predica", buttonLabel: "Predicas" },
  teaching: { label: "Enseñanza", buttonLabel: "Enseñanzas" },
  special: { label: "Especial", buttonLabel: "Especiales" },
};

const categoryFilters: Array<{ value: "all" | LiveStreamCategory; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "live", label: "En vivo" },
  { value: "sunday", label: "Dominicales" },
  { value: "preaching", label: "Predicas" },
  { value: "teaching", label: "Enseñanzas" },
  { value: "special", label: "Especiales" },
];

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
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const videoId = url.pathname.replace("/", "").trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = url.searchParams.get("v")?.trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function sortByScheduledDate<T extends { scheduled_at?: string | null; created_at?: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.scheduled_at || a.created_at || 0).getTime();
    const bDate = new Date(b.scheduled_at || b.created_at || 0).getTime();
    return bDate - aDate;
  });
}

export default async function EnVivoPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const selectedCategory =
    resolvedSearchParams.category && resolvedSearchParams.category in categoryConfig
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
  const currentLiveStream = sortedStreams.find((stream) => stream.is_live) || null;
  const filteredStreams =
    selectedCategory === "all"
      ? sortedStreams
      : sortedStreams.filter((stream) => stream.category === selectedCategory);
  const currentLiveEmbedUrl = getYouTubeEmbedUrl(currentLiveStream?.youtube_url);
  const featuredStreams = filteredStreams
    .filter((stream) => stream.featured && stream.id !== currentLiveStream?.id)
    .slice(0, 3);
  const excludedIds = new Set([
    ...(currentLiveStream ? [currentLiveStream.id] : []),
    ...featuredStreams.map((stream) => stream.id),
  ]);
  const gridStreams = filteredStreams.filter((stream) => !excludedIds.has(stream.id));

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
          <div className="hero-inner grid gap-8 px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[1fr_300px] lg:items-end">
            <div>
              <p className="kicker">IVBCC Streaming</p>
              <h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">
                En vivo, predicas y enseñanzas en un solo lugar.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
                Cultos dominicales, mensajes y momentos especiales para acompañar tu semana.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
              <p className="kicker">Canal oficial</p>
              <p className="mt-3 text-sm leading-7 text-white/70">
                También puedes ver nuestras transmisiones directamente en YouTube.
              </p>
              <TrackedLink
                href={siteSettings.youtube_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_youtube"
                eventParams={{ location: "live_page_header" }}
                className="btn-primary mt-5"
              >
                Ver canal
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>

      {currentLiveStream ? (
        <section className="site-shell-wide py-12">
          <div className="mb-7">
            <p className="kicker text-red-600">Ahora mismo</p>
            <h2 className="section-title mt-2 text-4xl">Transmisión actual</h2>
          </div>
          <article className="editorial-card">
            {currentLiveEmbedUrl ? (
              <div className="bg-slate-950">
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
              </div>
            ) : currentLiveStream.thumbnail_url ? (
              <div className="media-frame aspect-video rounded-none">
                <Image
                  src={currentLiveStream.thumbnail_url}
                  alt={currentLiveStream.title}
                  fill
                  sizes="(min-width: 1024px) 1180px, 100vw"
                  priority
                  className="object-cover"
                />
              </div>
            ) : (
              <EmptyImagePlaceholder
                label="IVBCC En Vivo"
                subtitle="Conéctate con nuestras transmisiones y enseñanzas."
                className="aspect-video"
                variant="detail"
              />
            )}
            <div className="p-7 md:p-9">
              <span className="badge border-red-200 bg-red-50 text-red-700">En vivo</span>
              <h3 className="section-title mt-4 text-4xl">{currentLiveStream.title}</h3>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                {formatDateTimeColombia(currentLiveStream.scheduled_at || currentLiveStream.created_at)}
              </p>
              <p className="muted-copy mt-4 max-w-3xl">
                {currentLiveStream.description || "Sin descripción disponible."}
              </p>
              <TrackedNextLink
                href={`/en-vivo/${currentLiveStream.slug}`}
                eventName="open_live_stream"
                eventParams={{ slug: currentLiveStream.slug, location: "live_page_current" }}
                className="btn-primary mt-7"
              >
                Ver transmisión
              </TrackedNextLink>
            </div>
          </article>
        </section>
      ) : null}

      <section className="site-shell-wide py-8">
        <div className="flex flex-wrap gap-3">
          {categoryFilters.map((filter) => {
            const isActive = selectedCategory === filter.value;
            const href = filter.value === "all" ? "/en-vivo" : `/en-vivo?category=${filter.value}`;

            return (
              <Link key={filter.value} href={href} className={isActive ? "btn-secondary" : "btn-ghost"}>
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      {featuredStreams.length > 0 ? (
        <section className="site-shell-wide py-8">
          <div className="mb-7">
            <p className="kicker">Destacados</p>
            <h2 className="section-title mt-2 text-4xl">Videos recomendados</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredStreams.map((stream, index) => (
              <StreamCard key={stream.id} stream={stream} priority={index === 0} location="live_page_featured" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="site-shell-wide pb-16 pt-8">
        <div className="mb-7">
          <p className="kicker">Archivo</p>
          <h2 className="section-title mt-2 text-4xl">
            {selectedCategory === "all"
              ? "Todas las transmisiones"
              : categoryConfig[selectedCategory].buttonLabel}
          </h2>
        </div>

        {gridStreams.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {gridStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} location="live_page_grid" />
            ))}
          </div>
        ) : (
          <div className="premium-surface rounded-[28px] px-6 py-16 text-center text-sm text-slate-500">
            Aún no hay transmisiones publicadas.
          </div>
        )}
      </section>
    </main>
  );
}

function StreamCard({
  stream,
  priority = false,
  location,
}: {
  stream: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail_url: string | null;
    category: string | null;
    is_live: boolean | null;
    featured: boolean | null;
    scheduled_at: string | null;
    created_at: string | null;
  };
  priority?: boolean;
  location: string;
}) {
  return (
    <article className="editorial-card">
      <TrackedNextLink
        href={`/en-vivo/${stream.slug}`}
        eventName="open_live_stream"
        eventParams={{ slug: stream.slug, location }}
        className="media-frame block aspect-video rounded-none"
      >
        {stream.thumbnail_url ? (
          <Image
            src={stream.thumbnail_url}
            alt={stream.title}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <EmptyImagePlaceholder
            label="IVBCC En Vivo"
            subtitle="Predicas, dominicales y enseñanzas."
            className="h-full"
          />
        )}
      </TrackedNextLink>
      <div className="p-6">
        <div className="flex flex-wrap gap-2">
          <span className="badge">
            {categoryConfig[stream.category as keyof typeof categoryConfig]?.label || "Transmisión"}
          </span>
          {stream.is_live ? (
            <span className="badge border-red-200 bg-red-50 text-red-700">En vivo</span>
          ) : null}
          {stream.featured ? <span className="badge">Destacado</span> : null}
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">
          {formatDateTimeColombia(stream.scheduled_at || stream.created_at)}
        </p>
        <h3 className="section-title mt-2 text-2xl">{stream.title}</h3>
        <p className="muted-copy mt-3 line-clamp-3 text-sm">
          {stream.description || "Sin descripción disponible."}
        </p>
      </div>
    </article>
  );
}
