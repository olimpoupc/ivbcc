import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedNextLink from "@/components/analytics/TrackedNextLink";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPublicSiteSettings } from "@/lib/site-settings";

export const revalidate = 300;

type LiveCategory = "live" | "sunday" | "preaching" | "teaching" | "special";
type PublicationCategory =
  | "devotional"
  | "reflection"
  | "announcement"
  | "bulletin"
  | "document"
  | "resource"
  | "video";

function formatEventDate(value: string) {
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

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
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

function getDateValue(value?: string | null) {
  return new Date(value || 0).getTime();
}

function isActiveLiveStream(stream: {
  is_live?: boolean | null;
  scheduled_at?: string | null;
  ends_at?: string | null;
}, nowTime: number) {
  if (stream.is_live !== true || !stream.scheduled_at || !stream.ends_at) {
    return false;
  }

  const startsAt = getDateValue(stream.scheduled_at);
  const endsAt = getDateValue(stream.ends_at);

  return startsAt <= nowTime && endsAt >= nowTime;
}

function sortByLivePriority<
  T extends {
    is_live?: boolean | null;
    featured?: boolean | null;
    scheduled_at?: string | null;
    created_at?: string | null;
  }
>(items: T[]) {
  return [...items].sort((a, b) => {
    const liveDiff = Number(b.is_live === true) - Number(a.is_live === true);
    if (liveDiff !== 0) return liveDiff;

    const featuredDiff =
      Number(b.featured === true) - Number(a.featured === true);
    if (featuredDiff !== 0) return featuredDiff;

    return (
      getDateValue(b.scheduled_at || b.created_at) -
      getDateValue(a.scheduled_at || a.created_at)
    );
  });
}

function sortByPublicationDate<
  T extends { published_at?: string | null; created_at?: string | null }
>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      getDateValue(b.published_at || b.created_at) -
      getDateValue(a.published_at || a.created_at)
  );
}

const liveCategoryLabels: Record<LiveCategory, string> = {
  live: "En vivo",
  sunday: "Dominical",
  preaching: "Prédica",
  teaching: "Enseñanza",
  special: "Especial",
};

const publicationCategoryLabels: Record<PublicationCategory, string> = {
  devotional: "Devocional",
  reflection: "Reflexión",
  announcement: "Comunicado",
  bulletin: "Boletín",
  document: "Documento",
  resource: "Recurso",
  video: "Video",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const siteSettings = await getPublicSiteSettings();

  const [
    { data: recentNews },
    { data: upcomingEvents },
    { data: publishedLiveStreams },
    { data: publishedPublications },
    { data: publishedCourses },
  ] = await Promise.all([
    supabase
      .from("news")
      .select("id,title,slug,summary,image_url,published_at,created_at,status,expires_at")
      .in("status", ["published", "scheduled"])
      .lte("published_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("events")
      .select(
        "id,title,slug,description,image_url,event_date,location,registration_enabled,status"
      )
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .limit(4),
    supabase
      .from("live_streams")
      .select(
        "id,title,slug,description,thumbnail_url,youtube_url,category,is_live,featured,scheduled_at,ends_at,created_at,status"
      )
      .eq("status", "published")
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("publications")
      .select(
        "id,title,slug,summary,image_url,category,featured,file_url,video_url,published_at,created_at,status"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("courses")
      .select("id,title,slug,description,image_url,created_at,status")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const nowTime = getDateValue(now);
  const prioritizedLiveStreams = sortByLivePriority(publishedLiveStreams || []);
  const currentLiveStream =
    prioritizedLiveStreams.find((stream) => isActiveLiveStream(stream, nowTime)) ||
    null;
  const currentLiveEmbedUrl = getYouTubeEmbedUrl(currentLiveStream?.youtube_url);
  const featuredLiveStreams = prioritizedLiveStreams
    .filter((stream) => stream.featured === true && stream.id !== currentLiveStream?.id)
    .slice(0, 2);
  const secondaryLiveStreams = prioritizedLiveStreams
    .filter((stream) => stream.id !== currentLiveStream?.id)
    .slice(0, 3);

  const sortedPublications = sortByPublicationDate(publishedPublications || []);
  const manuallyFeaturedPublications = sortedPublications.filter(
    (publication) => publication.featured
  );
  const featuredPublications = (
    manuallyFeaturedPublications.length > 0
      ? [
          ...manuallyFeaturedPublications,
          ...sortedPublications.filter((publication) => !publication.featured),
        ]
      : sortedPublications
  ).slice(0, 3);
  const principalNews = recentNews?.[0] || null;
  const secondaryNews = (recentNews || []).slice(1, 4);
  const visibleEvents = upcomingEvents || [];
  const visibleCourses = publishedCourses || [];

  const shouldShowHighlights =
    featuredPublications.length > 0 ||
    secondaryNews.length > 0;

  return (
    <main className="bg-[#faf8f2] text-gray-900">
      <section className="bg-[var(--ivbcc-navy)] text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-18">
          {currentLiveStream ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-start">
              <article className="overflow-hidden rounded-[32px] bg-white/6 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-3 px-6 pt-6 md:px-8">
                  <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                    EN VIVO
                  </span>
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
                    {liveCategoryLabels[
                      currentLiveStream.category as keyof typeof liveCategoryLabels
                    ] || "Transmisión"}
                  </span>
                </div>

                <div className="px-6 pb-6 pt-5 md:px-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
                    {siteSettings.church_name}
                  </p>
                  <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
                    {currentLiveStream.title}
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-white/82 md:text-lg">
                    {currentLiveStream.description ||
                      "Conéctate con nuestra transmisión actual y acompaña a IVBCC desde cualquier lugar."}
                  </p>
                </div>

                {currentLiveEmbedUrl ? (
                  <div className="overflow-hidden bg-slate-950">
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
                      <TrackedLink
                        href={currentLiveStream.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        eventName="click_youtube"
                        eventParams={{ location: "home_live_embed", slug: currentLiveStream.slug }}
                        className="inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-white/90"
                      >
                        Ver en YouTube
                      </TrackedLink>
                    </div>
                  </div>
                ) : currentLiveStream.thumbnail_url ? (
                  <div className="relative h-72 w-full bg-slate-100">
                    <Image
                      src={currentLiveStream.thumbnail_url}
                      alt={currentLiveStream.title}
                      fill
                      sizes="(min-width: 1024px) 70vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC En Vivo"
                    subtitle="Transmisiones, prédicas y enseñanzas para acompañarte en tiempo real."
                    variant="detail"
                    className="h-72"
                  />
                )}

                <div className="flex flex-wrap gap-4 px-6 py-6 md:px-8">
                  <TrackedNextLink
                    href={`/en-vivo/${currentLiveStream.slug}`}
                    eventName="open_live_stream"
                    eventParams={{ slug: currentLiveStream.slug, location: "home_live_hero" }}
                    className="inline-flex rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Ver transmisión
                  </TrackedNextLink>
                  <TrackedLink
                    href={siteSettings.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    eventName="click_youtube"
                    eventParams={{ location: "home_live_hero" }}
                    className="inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Ir al canal de YouTube
                  </TrackedLink>
                  <Link
                    href="/eventos"
                    className="inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Ver eventos
                  </Link>
                  <Link
                    href="/en-vivo"
                    className="inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Ver transmisiones
                  </Link>
                </div>
              </article>

              <aside className="space-y-5">
                <div className="rounded-[28px] bg-white p-6 text-gray-900 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                    Contacto rápido
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-gray-950">
                    Estamos contigo
                  </h2>
                  <div className="mt-5 space-y-3 text-sm leading-6 text-gray-600">
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
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={siteSettings.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                    >
                      Ver ubicación
                    </a>
                    <Link
                      href="/contacto"
                      className="inline-flex rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Contáctanos
                    </Link>
                  </div>
                </div>

                {featuredLiveStreams.map((stream) => (
                  <article
                    key={stream.id}
                    className="rounded-[28px] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {liveCategoryLabels[
                          stream.category as keyof typeof liveCategoryLabels
                        ] || "Transmisión"}
                      </span>
                      <span className="inline-flex rounded-full bg-[var(--ivbcc-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)]">
                        Destacado
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-gray-950">
                      {stream.title}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                      {formatDateTimeColombia(
                        stream.scheduled_at || stream.created_at
                      )}
                    </p>
                    <TrackedNextLink
                      href={`/en-vivo/${stream.slug}`}
                      eventName="open_live_stream"
                      eventParams={{ slug: stream.slug, location: "home_live_aside" }}
                      className="mt-4 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
                    >
                      Ver video
                    </TrackedNextLink>
                  </article>
                ))}
              </aside>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
                  {siteSettings.slogan || siteSettings.church_name}
                </p>
                <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
                  {siteSettings.hero_title}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
                  {siteSettings.hero_subtitle}
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/formacion"
                    className="rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Explorar formación
                  </Link>
                  <Link
                    href="/noticias"
                    className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Ver noticias
                  </Link>
                  <Link
                    href="/eventos"
                    className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Ver eventos
                  </Link>
                  <Link
                    href="/en-vivo"
                    className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Ver transmisiones
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-6 text-gray-900 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-[#f5f0de] p-3">
                    <Image
                      src="/images/logonegro.png"
                      alt="Logo IVBCC"
                      width={150}
                      height={56}
                      className="h-auto w-auto"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ivbcc-navy)]">
                      {siteSettings.church_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {siteSettings.slogan}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4 text-sm text-gray-600">
                  <div>
                    <p className="font-semibold text-gray-900">Dirección</p>
                    <p>{siteSettings.address}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Teléfono</p>
                    <p>{siteSettings.phone}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">YouTube</p>
                    <TrackedLink
                      href={siteSettings.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      eventName="click_youtube"
                      eventParams={{ location: "home_institutional_card" }}
                      className="font-medium text-[var(--ivbcc-navy)] hover:underline"
                    >
                      Ver canal
                    </TrackedLink>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {shouldShowHighlights ? (
        <section className="mx-auto max-w-7xl px-6 py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                Destacados
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-950">
                Lo que queremos poner al frente hoy
              </h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            {principalNews ? (
              <article className="overflow-hidden rounded-[28px] bg-white shadow-sm">
                {principalNews.image_url ? (
                  <div className="relative h-72 w-full bg-slate-100">
                    <Image
                      src={principalNews.image_url}
                      alt={principalNews.title}
                      fill
                      sizes="(min-width: 1024px) 66vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Noticias"
                    subtitle="Comunicados y novedades recientes de la iglesia."
                    variant="detail"
                    className="h-72"
                  />
                )}

                <div className="p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                    Noticia principal
                  </p>
                  <h3 className="mt-3 text-3xl font-bold leading-tight text-gray-950">
                    {principalNews.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium text-gray-500">
                    {formatDateColombia(principalNews.published_at)}
                  </p>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    {principalNews.summary}
                  </p>
                  <Link
                    href={`/noticias/${principalNews.slug}`}
                    className="mt-6 inline-flex rounded-full bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Leer noticia
                  </Link>
                </div>
              </article>
            ) : null}

            <div className="space-y-5">
              {featuredPublications.map((publication) => (
                <article
                  key={publication.id}
                  className="rounded-[28px] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-[var(--ivbcc-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)]">
                      Destacado
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {publicationCategoryLabels[
                        publication.category as keyof typeof publicationCategoryLabels
                      ] || "Publicación"}
                    </span>
                    {publication.video_url ? (
                      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Video
                      </span>
                    ) : null}
                    {publication.file_url ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Descargable
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-gray-950">
                    {publication.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    {formatDateColombia(
                      publication.published_at || publication.created_at
                    )}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {publication.summary || "Sin resumen disponible."}
                  </p>
                  <Link
                    href={`/publicaciones/${publication.slug}`}
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
                  >
                    Ver publicación
                  </Link>
                </article>
              ))}

              {!featuredPublications.length && secondaryNews.length
                ? secondaryNews.slice(0, 2).map((news) => (
                    <article
                      key={news.id}
                      className="rounded-[28px] bg-white p-5 shadow-sm"
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                        Más noticias
                      </p>
                      <h3 className="mt-3 text-xl font-bold text-gray-950">
                        {news.title}
                      </h3>
                      <p className="mt-2 text-sm font-medium text-gray-500">
                        {formatDateColombia(news.published_at)}
                      </p>
                      <Link
                        href={`/noticias/${news.slug}`}
                        className="mt-4 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
                      >
                        Leer noticia
                      </Link>
                    </article>
                  ))
                : null}
            </div>
          </div>
        </section>
      ) : null}

      {!currentLiveStream && secondaryLiveStreams.length ? (
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                En Vivo y Transmisiones
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-950">
                Últimas transmisiones
              </h2>
            </div>
            <Link
              href="/en-vivo"
              className="text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
            >
              Ver transmisiones
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {secondaryLiveStreams.map((stream) => (
              <article
                key={stream.id}
                className="overflow-hidden rounded-[28px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {stream.thumbnail_url ? (
                  <div className="relative h-52 w-full bg-slate-100">
                    <Image
                      src={stream.thumbnail_url}
                      alt={stream.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC En Vivo"
                    subtitle="Transmisiones, prédicas y enseñanzas recientes."
                    className="h-52"
                  />
                )}

                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {liveCategoryLabels[
                        stream.category as keyof typeof liveCategoryLabels
                      ] || "Transmisión"}
                    </span>
                    {stream.featured ? (
                      <span className="inline-flex rounded-full bg-[var(--ivbcc-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)]">
                        Destacado
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-gray-950">
                    {stream.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    {formatDateTimeColombia(
                      stream.scheduled_at || stream.created_at
                    )}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {stream.description ||
                      "Mira esta transmisión y sigue conectado con IVBCC."}
                  </p>
                  <TrackedNextLink
                    href={`/en-vivo/${stream.slug}`}
                    eventName="open_live_stream"
                    eventParams={{ slug: stream.slug, location: "home_latest_streams" }}
                    className="mt-4 inline-flex rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver transmisión
                  </TrackedNextLink>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visibleEvents.length ? (
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                Eventos próximos
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-950">
                Próximos encuentros de la comunidad
              </h2>
            </div>
            <Link
              href="/eventos"
              className="text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
            >
              Ver todos los eventos
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {visibleEvents.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-[28px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {event.image_url ? (
                  <div className="relative h-52 w-full bg-slate-100">
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Eventos"
                    subtitle="Encuentros, actividades y espacios para compartir."
                    className="h-52"
                  />
                )}

                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Evento
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        event.registration_enabled
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {event.registration_enabled
                        ? "Inscripción activa"
                        : "Inscripción cerrada"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-gray-950">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    {formatEventDate(event.event_date)}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {event.location || "Ubicación por confirmar"}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {event.description || "Pronto compartiremos más detalles."}
                  </p>
                  <Link
                    href={`/eventos/${event.slug}`}
                    className="mt-4 inline-flex rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {sortedPublications.length ? (
        <section className="mx-auto max-w-7xl px-6 py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                Publicaciones destacadas
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-950">
                Recursos para seguir profundizando
              </h2>
            </div>
            <Link
              href="/publicaciones"
              className="text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
            >
              Ver publicaciones
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {sortedPublications.slice(0, 3).map((publication) => (
              <article
                key={publication.id}
                className="overflow-hidden rounded-[28px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                {publication.image_url ? (
                  <div className="relative h-52 w-full bg-slate-100">
                    <Image
                      src={publication.image_url}
                      alt={publication.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Publicaciones"
                    subtitle="Devocionales, reflexiones, documentos y recursos."
                    className="h-52"
                  />
                )}

                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {publicationCategoryLabels[
                        publication.category as keyof typeof publicationCategoryLabels
                      ] || "Publicación"}
                    </span>
                    {publication.featured ? (
                      <span className="inline-flex rounded-full bg-[var(--ivbcc-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)]">
                        Destacado
                      </span>
                    ) : null}
                    {publication.video_url ? (
                      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Video
                      </span>
                    ) : null}
                    {publication.file_url ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Descargable
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-gray-950">
                    {publication.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    {formatDateColombia(
                      publication.published_at || publication.created_at
                    )}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {publication.summary || "Sin resumen disponible."}
                  </p>
                  <Link
                    href={`/publicaciones/${publication.slug}`}
                    className="mt-4 inline-flex rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver publicación
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {visibleCourses.length ? (
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <article className="rounded-[28px] bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                Formación
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-950">
                Espacios para crecer con profundidad
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-600">
                Actualmente contamos con {visibleCourses.length}{" "}
                {visibleCourses.length === 1 ? "curso publicado" : "cursos publicados"}{" "}
                para acompañar procesos de aprendizaje, discipulado y estudio.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/formacion"
                  className="inline-flex rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Explorar formación
                </Link>
                <Link
                  href="/mis-cursos"
                  className="inline-flex rounded-full border border-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                >
                  Ir a mis cursos
                </Link>
              </div>
            </article>

            <div className="grid gap-5">
              {visibleCourses.map((course) => (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-[28px] bg-white shadow-sm"
                >
                  <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                    {course.image_url ? (
                      <div className="relative min-h-48 bg-slate-100">
                        <Image
                          src={course.image_url}
                          alt={course.title}
                          fill
                          sizes="(min-width: 768px) 180px, 100vw"
                          className="object-cover object-center"
                        />
                      </div>
                    ) : (
                      <EmptyImagePlaceholder
                        label="IVBCC Formación"
                        subtitle="Aprender también es discipularse."
                        className="min-h-48"
                      />
                    )}

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-950">
                        {course.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                        {course.description || "Curso disponible para fortalecer tu proceso formativo."}
                      </p>
                      <Link
                        href={`/formacion/${course.slug}`}
                        className="mt-4 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
                      >
                        Ver curso
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
              Nosotros
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950">
              Fe, servicio y comunidad
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              {siteSettings.hero_title ||
                "IVBCC acompaña a niños, jóvenes, familias y nuevos creyentes con una visión centrada en Cristo, el discipulado y el servicio a la ciudad."}
            </p>
            <p className="mt-4 text-base leading-7 text-gray-600">
              {siteSettings.hero_subtitle ||
                "Este espacio digital reúne noticias, eventos y recursos de formación para fortalecer la comunicación y la vida comunitaria de la iglesia."}
            </p>
            <Link
              href="/nosotros"
              className="mt-6 inline-block rounded-full bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Conocer más
            </Link>
          </article>

          <article className="rounded-[28px] bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
              Contacto
            </p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950">
              Queremos escucharte
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-gray-600">
              <p>
                <span className="font-semibold text-gray-950">Teléfono:</span>{" "}
                {siteSettings.phone}
              </p>
              <p>
                <span className="font-semibold text-gray-950">WhatsApp:</span>{" "}
                {siteSettings.whatsapp || siteSettings.phone}
              </p>
              <p>
                <span className="font-semibold text-gray-950">Dirección:</span>{" "}
                {siteSettings.address}
              </p>
              <p>
                <span className="font-semibold text-gray-950">Correo:</span>{" "}
                {siteSettings.primary_email}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={siteSettings.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Ver en Google Maps
              </a>
              <TrackedLink
                href={siteSettings.facebook_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_facebook"
                eventParams={{ location: "home_contact" }}
                className="inline-block rounded-full border border-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
              >
                Facebook
              </TrackedLink>
              <TrackedLink
                href={siteSettings.instagram_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_instagram"
                eventParams={{ location: "home_contact" }}
                className="inline-block rounded-full border border-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
              >
                Instagram
              </TrackedLink>
              <TrackedLink
                href={siteSettings.youtube_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_youtube"
                eventParams={{ location: "home_contact" }}
                className="inline-block rounded-full border border-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
              >
                YouTube
              </TrackedLink>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
