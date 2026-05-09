import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildContentMetadata, resolveSeoDescription, seoConfig } from "@/lib/seo";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedNextLink from "@/components/analytics/TrackedNextLink";
import ShareLiveStreamButtons from "./ShareLiveStreamButtons";

export const revalidate = 300;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

const categoryConfig = {
  live: "En vivo",
  sunday: "Dominical",
  preaching: "Prédica",
  teaching: "Enseñanza",
  special: "Especial",
};

type LiveStream = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  category: keyof typeof categoryConfig;
  is_live: boolean | null;
  featured: boolean | null;
  scheduled_at: string | null;
  created_at: string | null;
  status: string;
};

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

function getStreamTimestamp(stream: {
  scheduled_at?: string | null;
  created_at?: string | null;
}) {
  return new Date(stream.scheduled_at || stream.created_at || 0).getTime();
}

function sortByScheduledDate<
  T extends { scheduled_at?: string | null; created_at?: string | null }
>(items: T[]) {
  return [...items].sort((a, b) => getStreamTimestamp(b) - getStreamTimestamp(a));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: stream } = await supabase
    .from("live_streams")
    .select("title,description,thumbnail_url,category")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const category =
    categoryConfig[stream?.category as keyof typeof categoryConfig] ||
    "Transmisión";

  return buildContentMetadata({
    title: stream?.title || "En Vivo",
    description: resolveSeoDescription(stream?.description),
    path: `/en-vivo/${slug}`,
    image: stream?.thumbnail_url || seoConfig.logoPath,
    type: "website",
    keywords: ["en vivo IVBCC", "transmisiones IVBCC", category],
  });
}

export default async function EnVivoDetallePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: liveStreams, error } = await supabase
    .from("live_streams")
    .select(
      "id,title,slug,description,youtube_url,thumbnail_url,category,is_live,featured,scheduled_at,created_at,status"
    )
    .eq("status", "published")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !liveStreams) {
    return <main className="p-10">Transmisión no encontrada.</main>;
  }

  const sortedStreams = sortByScheduledDate(liveStreams as LiveStream[]);
  const currentIndex = sortedStreams.findIndex((item) => item.slug === slug);
  const stream = currentIndex >= 0 ? sortedStreams[currentIndex] : null;

  if (!stream) {
    return <main className="p-10">Transmisión no encontrada.</main>;
  }

  const previousStream =
    currentIndex < sortedStreams.length - 1
      ? sortedStreams[currentIndex + 1]
      : null;
  const nextStream =
    currentIndex > 0 ? sortedStreams[currentIndex - 1] : null;
  const relatedStreams = sortedStreams
    .filter((item) => item.id !== stream.id)
    .sort((a, b) => {
      const sameCategoryA = a.category === stream.category ? 1 : 0;
      const sameCategoryB = b.category === stream.category ? 1 : 0;
      if (sameCategoryA !== sameCategoryB) return sameCategoryB - sameCategoryA;

      const featuredA = a.featured ? 1 : 0;
      const featuredB = b.featured ? 1 : 0;
      if (featuredA !== featuredB) return featuredB - featuredA;

      return getStreamTimestamp(b) - getStreamTimestamp(a);
    })
    .slice(0, 3);

  const category =
    categoryConfig[stream.category as keyof typeof categoryConfig] ||
    "Transmisión";
  const videoEmbedUrl = getYouTubeEmbedUrl(stream.youtube_url);

  return (
    <main className="premium-page">
      <div className="site-shell pt-8">
      <Link
        href="/en-vivo"
        className="btn-ghost mb-8"
      >
        Volver a En Vivo
      </Link>
      </div>

      <div className="site-shell grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-8">
          {videoEmbedUrl ? (
            <section className="overflow-hidden rounded-[30px] bg-slate-950 shadow-lg">
              <div className="relative aspect-video w-full">
                <iframe
                  src={videoEmbedUrl}
                  title={stream.title}
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
                <TrackedLink
                  href={stream.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  eventName="click_youtube"
                  eventParams={{ location: "live_stream_detail", slug: stream.slug }}
                  className="btn-primary"
                >
                  Ver en YouTube
                </TrackedLink>
              </div>
            </section>
          ) : null}

          <header className="premium-surface rounded-[30px] p-8 md:p-10">
            <div className="flex flex-wrap gap-2">
              <span className="badge">
                {category}
              </span>
              {stream.featured && (
                <span className="badge">
                  Destacado
                </span>
              )}
              {stream.is_live && (
                <span className="badge border-red-200 bg-red-50 text-red-700">
                  En vivo actual
                </span>
              )}
            </div>

            <h1 className="section-title mt-5 text-4xl text-gray-950 md:text-5xl">
              {stream.title}
            </h1>

            <p className="mt-4 text-sm font-medium text-gray-500">
              {formatDateTimeColombia(stream.scheduled_at || stream.created_at)}
            </p>
          </header>

          <section className="premium-surface rounded-[30px] p-8">
            <p className="kicker">
              Descripción
            </p>
            <p className="prose-premium mt-5 whitespace-pre-line">
              {stream.description || "Sin descripción disponible."}
            </p>
          </section>

          <nav className="premium-surface rounded-[30px] p-8">
            <p className="kicker">
              Navegación
            </p>
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
              {previousStream ? (
                <Link
                  href={`/en-vivo/${previousStream.slug}`}
                  className="btn-ghost"
                >
                  Video anterior
                </Link>
              ) : null}

              {nextStream ? (
                <Link
                  href={`/en-vivo/${nextStream.slug}`}
                  className="btn-ghost"
                >
                  Siguiente video
                </Link>
              ) : null}
            </div>
          </nav>

          {relatedStreams.length > 0 ? (
            <section className="premium-surface rounded-[30px] p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="kicker">
                    Más transmisiones
                  </p>
                  <h2 className="section-title mt-2 text-3xl text-gray-950">
                    Sigue viendo
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {relatedStreams.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-[#e8e2d6] bg-[#fbfaf7] p-5"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="badge bg-white">
                        {categoryConfig[item.category] || "Transmisión"}
                      </span>
                      {item.featured ? (
                        <span className="badge">
                          Destacado
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-4 text-lg font-bold leading-snug text-gray-950">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      {formatDateTimeColombia(item.scheduled_at || item.created_at)}
                    </p>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                      {item.description || "Sin descripción disponible."}
                    </p>

                    <TrackedNextLink
                      href={`/en-vivo/${item.slug}`}
                      eventName="open_live_stream"
                      eventParams={{ slug: item.slug, location: "live_stream_related" }}
                      className="mt-4 inline-flex text-sm font-extrabold text-[var(--ivbcc-navy)]"
                    >
                      Ver video
                    </TrackedNextLink>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-6">
          <ShareLiveStreamButtons title={stream.title} />
        </aside>
      </div>
    </main>
  );
}
