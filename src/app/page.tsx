import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import TrackedLink from "@/components/analytics/TrackedLink";
import TrackedNextLink from "@/components/analytics/TrackedNextLink";
import HomeContentCarousel, {
  type HomeContentCarouselItem,
} from "@/components/home/HomeContentCarousel";
import YouTubeEmbed from "@/components/media/YouTubeEmbed";
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

type NewsCarouselRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string | null;
};

type EventCarouselRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  created_at: string | null;
};

type PublicationCarouselRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string | null;
};

type SortableCarouselItem = HomeContentCarouselItem & {
  sortDate: number;
};

const liveCategoryLabels: Record<LiveCategory, string> = {
  live: "En vivo",
  sunday: "Dominical",
  preaching: "Predica",
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

function getDateValue(value?: string | null) {
  return new Date(value || 0).getTime();
}

function isActiveLiveStream(
  stream: {
    is_live?: boolean | null;
    scheduled_at?: string | null;
    ends_at?: string | null;
  },
  nowTime: number
) {
  if (stream.is_live !== true || !stream.scheduled_at || !stream.ends_at) {
    return false;
  }

  return (
    getDateValue(stream.scheduled_at) <= nowTime &&
    getDateValue(stream.ends_at) >= nowTime
  );
}

function sortByLivePriority<
  T extends {
    is_live?: boolean | null;
    featured?: boolean | null;
    scheduled_at?: string | null;
    created_at?: string | null;
  },
>(items: T[]) {
  return [...items].sort((a, b) => {
    const liveDiff = Number(b.is_live === true) - Number(a.is_live === true);
    if (liveDiff !== 0) return liveDiff;

    const featuredDiff = Number(b.featured === true) - Number(a.featured === true);
    if (featuredDiff !== 0) return featuredDiff;

    return (
      getDateValue(b.scheduled_at || b.created_at) -
      getDateValue(a.scheduled_at || a.created_at)
    );
  });
}

function sortByPublicationDate<
  T extends { published_at?: string | null; created_at?: string | null },
>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      getDateValue(b.published_at || b.created_at) -
      getDateValue(a.published_at || a.created_at)
  );
}

function buildSummary(value?: string | null) {
  return value?.trim() || "Contenido reciente de la comunidad IVBCC.";
}

function toSortableCarouselItem(
  item: HomeContentCarouselItem,
  value?: string | null
): SortableCarouselItem {
  return {
    ...item,
    sortDate: getDateValue(value),
  };
}

function buildHomeCarouselItems({
  news,
  events,
  publications,
}: {
  news: NewsCarouselRow[];
  events: EventCarouselRow[];
  publications: PublicationCarouselRow[];
}) {
  const items: SortableCarouselItem[] = [
    ...news.map((item) =>
      toSortableCarouselItem(
        {
          id: `news-${item.id}`,
          type: "Noticia",
          title: item.title,
          summary: buildSummary(item.summary),
          imageUrl: item.image_url,
          dateLabel: formatDateColombia(item.published_at || item.created_at),
          href: `/noticias/${item.slug}`,
        },
        item.published_at || item.created_at
      )
    ),
    ...events.map((item) =>
      toSortableCarouselItem(
        {
          id: `event-${item.id}`,
          type: "Evento",
          title: item.title,
          summary: buildSummary(item.description),
          imageUrl: item.image_url,
          dateLabel: formatDateColombia(item.event_date || item.created_at),
          href: `/eventos/${item.slug}`,
        },
        item.event_date || item.created_at
      )
    ),
    ...publications.map((item) =>
      toSortableCarouselItem(
        {
          id: `publication-${item.id}`,
          type: "Publicación",
          title: item.title,
          summary: buildSummary(item.summary),
          imageUrl: item.image_url,
          dateLabel: formatDateColombia(item.published_at || item.created_at),
          href: `/publicaciones/${item.slug}`,
        },
        item.published_at || item.created_at
      )
    ),
  ];

  return items
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, 8)
    .map(({ id, type, title, summary, imageUrl, dateLabel, href }) => ({
      id,
      type,
      title,
      summary,
      imageUrl,
      dateLabel,
      href,
    }));
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const siteSettings = await getPublicSiteSettings();

  const [
    { data: recentNews },
    { data: upcomingEvents },
    { data: carouselEvents },
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
      .select("id,title,slug,description,image_url,event_date,location,registration_enabled,status")
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .limit(4),
    supabase
      .from("events")
      .select("id,title,slug,description,image_url,event_date,created_at,status")
      .eq("status", "published")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(8),
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
  const latestStreams = prioritizedLiveStreams
    .filter((stream) => stream.id !== currentLiveStream?.id)
    .slice(0, 3);
  const sortedPublications = sortByPublicationDate(publishedPublications || []);
  const featuredPublications = sortedPublications
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 3);
  const principalNews = recentNews?.[0] || null;
  const secondaryNews = (recentNews || []).slice(1, 4);
  const visibleEvents = upcomingEvents || [];
  const visibleCourses = publishedCourses || [];
  const carouselItems = buildHomeCarouselItems({
    news: (recentNews || []) as NewsCarouselRow[],
    events: (carouselEvents || []) as EventCarouselRow[],
    publications: (publishedPublications || []) as PublicationCarouselRow[],
  });

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
          <div className="hero-inner grid gap-10 px-6 py-10 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:py-16">
            <div>
              <p className="kicker">{siteSettings.slogan || siteSettings.church_name}</p>
              <h1 className="display-title mt-5 max-w-4xl text-5xl md:text-7xl lg:text-8xl">
                {currentLiveStream ? "Estamos transmitiendo ahora" : siteSettings.hero_title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/72 md:text-lg">
                {currentLiveStream
                  ? currentLiveStream.description ||
                    "Acompaña la transmisión actual de IVBCC desde cualquier lugar."
                  : siteSettings.hero_subtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {currentLiveStream ? (
                  <TrackedNextLink
                    href={`/en-vivo/${currentLiveStream.slug}`}
                    eventName="open_live_stream"
                    eventParams={{ slug: currentLiveStream.slug, location: "home_hero" }}
                    className="btn-primary"
                  >
                    Ver transmisión
                  </TrackedNextLink>
                ) : (
                  <Link href="/formacion" className="btn-primary">
                    Explorar formación
                  </Link>
                )}
                <Link href="/noticias" className="btn-ghost border-white/20 bg-white/10 text-white hover:bg-white/15">
                  Leer noticias
                </Link>
                <Link href="/eventos" className="btn-ghost border-white/20 bg-white/10 text-white hover:bg-white/15">
                  Próximos eventos
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/12 bg-white/8 shadow-2xl">
              {currentLiveStream ? (
                currentLiveEmbedUrl ? (
                  <div className="bg-slate-950">
                    <YouTubeEmbed src={currentLiveEmbedUrl} title={currentLiveStream.title} />
                  </div>
                ) : currentLiveStream.thumbnail_url ? (
                  <div className="relative aspect-[16/10]">
                    <Image
                      src={currentLiveStream.thumbnail_url}
                      alt={currentLiveStream.title}
                      fill
                      sizes="(min-width: 1024px) 620px, 100vw"
                      priority
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC En Vivo"
                    subtitle="Transmisiones, predicas y enseñanzas en tiempo real."
                    className="aspect-[16/10]"
                  />
                )
              ) : principalNews?.image_url ? (
                <div className="relative aspect-[16/10]">
                  <Image
                    src={principalNews.image_url}
                    alt={principalNews.title}
                    fill
                    sizes="(min-width: 1024px) 620px, 100vw"
                    priority
                    className="object-cover"
                  />
                </div>
              ) : (
                <EmptyImagePlaceholder
                  label="IVBCC"
                  subtitle="Un portal para vivir la comunidad, la palabra y la formación."
                  className="aspect-[16/10]"
                />
              )}
              <div className="bg-white p-6 text-[var(--ivbcc-ink)]">
                <span className="badge">
                  {currentLiveStream
                    ? "En vivo"
                    : principalNews
                      ? "Noticia destacada"
                      : "Comunidad IVBCC"}
                </span>
                <h2 className="section-title mt-4 text-2xl">
                  {currentLiveStream?.title || principalNews?.title || siteSettings.church_name}
                </h2>
                <p className="muted-copy mt-3 line-clamp-3 text-sm">
                  {currentLiveStream?.description ||
                    principalNews?.summary ||
                    "Fe, servicio y formación para acompañar a la comunidad."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {currentLiveStream ? (
        <section className="site-shell-wide py-10">
          <div className="dark-panel grid gap-5 rounded-[28px] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="kicker text-red-300">Transmisión activa</p>
              <h2 className="section-title mt-2 text-3xl">{currentLiveStream.title}</h2>
              <p className="mt-3 text-sm text-white/64">
                {formatDateTimeColombia(currentLiveStream.scheduled_at)}
              </p>
            </div>
            <TrackedLink
              href={currentLiveStream.youtube_url}
              target="_blank"
              rel="noreferrer"
              eventName="click_youtube"
              eventParams={{ location: "home_live_bar", slug: currentLiveStream.slug }}
              className="btn-primary"
            >
              Ver en YouTube
            </TrackedLink>
          </div>
        </section>
      ) : null}

      <HomeContentCarousel items={carouselItems} />

      {principalNews ? (
        <section className="site-shell-wide py-12">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="kicker">Editorial IVBCC</p>
              <h2 className="section-title mt-2 text-4xl md:text-5xl">Noticias recientes</h2>
            </div>
            <Link href="/noticias" className="btn-ghost w-fit">
              Ver todas
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="editorial-card grid md:grid-cols-[0.95fr_1fr]">
              <Link href={`/noticias/${principalNews.slug}`} className="media-frame min-h-80 rounded-none">
                {principalNews.image_url ? (
                  <Image
                    src={principalNews.image_url}
                    alt={principalNews.title}
                    fill
                    sizes="(min-width: 1024px) 520px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Noticias"
                    subtitle="Novedades y comunicados para nuestra comunidad."
                    className="h-full"
                  />
                )}
              </Link>
              <div className="flex flex-col justify-center p-7 md:p-9">
                <span className="badge w-fit">Principal</span>
                <p className="mt-5 text-sm font-semibold text-slate-500">
                  {formatDateColombia(principalNews.published_at || principalNews.created_at)}
                </p>
                <h3 className="section-title mt-3 text-3xl">{principalNews.title}</h3>
                <p className="muted-copy mt-4 line-clamp-4">{principalNews.summary}</p>
                <Link href={`/noticias/${principalNews.slug}`} className="btn-secondary mt-7 w-fit">
                  Leer noticia
                </Link>
              </div>
            </article>

            <div className="grid gap-4">
              {secondaryNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/noticias/${item.slug}`}
                  className="premium-surface rounded-[22px] p-5 transition hover:-translate-y-1"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ivbcc-gold)]">
                    {formatDateColombia(item.published_at || item.created_at)}
                  </p>
                  <h3 className="section-title mt-3 text-xl">{item.title}</h3>
                  <p className="muted-copy mt-2 line-clamp-2 text-sm">{item.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {visibleEvents.length ? (
        <section className="site-shell-wide py-12">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="kicker">Agenda</p>
              <h2 className="section-title mt-2 text-4xl md:text-5xl">Próximos encuentros</h2>
            </div>
            <Link href="/eventos" className="btn-ghost w-fit">
              Ver agenda
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {visibleEvents.map((event) => (
              <article key={event.id} className="editorial-card">
                <Link href={`/eventos/${event.slug}`} className="media-frame block aspect-[4/5] rounded-none">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.title}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <EmptyImagePlaceholder
                      label="IVBCC Eventos"
                      subtitle="Encuentros, actividades y espacios para compartir."
                      className="h-full"
                    />
                  )}
                </Link>
                <div className="p-5">
                  <span className="badge">{event.registration_enabled ? "Inscripción activa" : "Evento"}</span>
                  <h3 className="section-title mt-4 text-xl">{event.title}</h3>
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    {formatDateTimeColombia(event.event_date)}
                  </p>
                  <p className="muted-copy mt-2 line-clamp-2 text-sm">
                    {event.location || "Ubicación por confirmar"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {(featuredPublications.length || latestStreams.length) ? (
        <section className="site-shell-wide py-12">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            {featuredPublications.length ? (
              <div>
                <p className="kicker">Biblioteca</p>
                <h2 className="section-title mt-2 text-4xl">Publicaciones para profundizar</h2>
                <div className="mt-7 grid gap-4">
                  {featuredPublications.map((publication) => (
                    <Link
                      key={publication.id}
                      href={`/publicaciones/${publication.slug}`}
                      className="premium-surface grid gap-4 rounded-[24px] p-4 transition hover:-translate-y-1 md:grid-cols-[140px_1fr]"
                    >
                      <div className="media-frame aspect-[4/3] rounded-[18px]">
                        {publication.image_url ? (
                          <Image
                            src={publication.image_url}
                            alt={publication.title}
                            fill
                            sizes="140px"
                            className="object-cover"
                          />
                        ) : (
                          <EmptyImagePlaceholder
                            label="Publicación"
                            subtitle="Recursos IVBCC"
                            className="h-full"
                          />
                        )}
                      </div>
                      <div>
                        <span className="badge">
                          {publicationCategoryLabels[
                            publication.category as keyof typeof publicationCategoryLabels
                          ] || "Publicación"}
                        </span>
                        <h3 className="section-title mt-3 text-xl">{publication.title}</h3>
                        <p className="muted-copy mt-2 line-clamp-2 text-sm">{publication.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="dark-panel rounded-[30px] p-7 md:p-9">
              <p className="kicker">Streaming</p>
              <h2 className="section-title mt-3 text-4xl">Contenido reciente en video</h2>
              <p className="mt-4 text-sm leading-7 text-white/68">
                Predicas, enseñanzas y especiales para seguir conectado con la vida de la iglesia.
              </p>
              <div className="mt-7 grid gap-4">
                {latestStreams.map((stream) => (
                  <TrackedNextLink
                    key={stream.id}
                    href={`/en-vivo/${stream.slug}`}
                    eventName="open_live_stream"
                    eventParams={{ slug: stream.slug, location: "home_streams" }}
                    className="rounded-2xl border border-white/10 bg-white/8 p-5 transition hover:bg-white/12"
                  >
                    <span className="badge bg-white/10 text-white">
                      {liveCategoryLabels[stream.category as keyof typeof liveCategoryLabels] ||
                        "Transmisión"}
                    </span>
                    <h3 className="section-title mt-3 text-xl">{stream.title}</h3>
                    <p className="mt-2 text-sm text-white/58">
                      {formatDateTimeColombia(stream.scheduled_at || stream.created_at)}
                    </p>
                  </TrackedNextLink>
                ))}
                <Link href="/en-vivo" className="btn-primary mt-2 w-fit">
                  Ver transmisiones
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {visibleCourses.length ? (
        <section className="site-shell-wide py-12">
          <div className="page-hero">
            <div className="hero-inner grid gap-8 p-7 md:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="kicker">Formación</p>
                <h2 className="section-title mt-3 text-4xl md:text-5xl">
                  Aprende, avanza y acompaña tu proceso.
                </h2>
                <p className="mt-5 text-sm leading-7 text-white/68">
                  Cursos publicados para fortalecer procesos de discipulado, estudio y servicio.
                </p>
                <Link href="/formacion" className="btn-primary mt-7">
                  Explorar cursos
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {visibleCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/formacion/${course.slug}`}
                    className="rounded-[22px] border border-white/10 bg-white p-4 text-[var(--ivbcc-ink)] shadow-xl transition hover:-translate-y-1"
                  >
                    <div className="media-frame aspect-[4/3] rounded-[18px]">
                      {course.image_url ? (
                        <Image
                          src={course.image_url}
                          alt={course.title}
                          fill
                          sizes="(min-width: 768px) 220px, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <EmptyImagePlaceholder
                          label="Formación"
                          subtitle="Aprender también es discipularse."
                          className="h-full"
                        />
                      )}
                    </div>
                    <h3 className="section-title mt-4 text-lg">{course.title}</h3>
                    <p className="muted-copy mt-2 line-clamp-2 text-sm">{course.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="site-shell-wide py-12">
        <div className="dark-panel grid gap-6 rounded-[30px] p-7 md:grid-cols-[1fr_auto] md:items-center md:p-9">
          <div>
            <p className="kicker">Generosidad</p>
            <h2 className="section-title mt-3 text-4xl">
              Apoya la misión de IVBCC
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">
              Tu aporte ayuda a sostener espacios de adoración, formación,
              servicio y acompañamiento para nuestra comunidad.
            </p>
          </div>
          <Link href="/donaciones" className="btn-primary w-fit">
            Donar ahora
          </Link>
        </div>
      </section>

      <section className="site-shell-wide py-12">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="premium-surface rounded-[30px] p-7 md:p-9">
            <p className="kicker">Nosotros</p>
            <h2 className="section-title mt-3 text-4xl">Fe, servicio y comunidad</h2>
            <p className="muted-copy mt-5">
              Este portal reúne noticias, eventos, transmisiones y recursos de formación para
              fortalecer la comunicación y la vida comunitaria de IVBCC.
            </p>
            <Link href="/nosotros" className="btn-secondary mt-7">
              Conocer IVBCC
            </Link>
          </article>
          <article className="premium-surface rounded-[30px] p-7 md:p-9">
            <p className="kicker">Contacto</p>
            <h2 className="section-title mt-3 text-4xl">Estamos contigo</h2>
            <div className="muted-copy mt-5 space-y-2 text-sm">
              <p>{siteSettings.address}</p>
              <p>{siteSettings.phone}</p>
              <p>{siteSettings.primary_email}</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/contacto" className="btn-primary">
                Contactar
              </Link>
              <TrackedLink
                href={siteSettings.youtube_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_youtube"
                eventParams={{ location: "home_contact" }}
                className="btn-ghost"
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
