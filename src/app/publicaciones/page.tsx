import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import InlineVideoPreview, {
  InlineVideoOpenButton,
} from "@/components/publications/InlineVideoPreview";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 300;

type PublicationCategory =
  | "devotional"
  | "reflection"
  | "announcement"
  | "bulletin"
  | "document"
  | "resource"
  | "video";

type SearchParams = Promise<{ category?: string }>;

const categoryConfig: Record<PublicationCategory, { label: string; buttonLabel: string }> = {
  devotional: { label: "Devocional", buttonLabel: "Devocionales" },
  reflection: { label: "Reflexión", buttonLabel: "Reflexiones" },
  announcement: { label: "Comunicado", buttonLabel: "Comunicados" },
  bulletin: { label: "Boletín", buttonLabel: "Boletines" },
  document: { label: "Documento", buttonLabel: "Documentos" },
  resource: { label: "Recurso", buttonLabel: "Recursos" },
  video: { label: "Video", buttonLabel: "Videos" },
};

const categoryFilters: Array<{ value: "all" | PublicationCategory; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "devotional", label: "Devocionales" },
  { value: "reflection", label: "Reflexiones" },
  { value: "announcement", label: "Comunicados" },
  { value: "bulletin", label: "Boletines" },
  { value: "document", label: "Documentos" },
  { value: "resource", label: "Recursos" },
  { value: "video", label: "Videos" },
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

function sortByPublicationDate<T extends { published_at?: string | null; created_at?: string | null }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.published_at || a.created_at || 0).getTime();
    const bDate = new Date(b.published_at || b.created_at || 0).getTime();
    return bDate - aDate;
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
      if (url.pathname.startsWith("/embed/")) {
        const videoId = url.pathname.split("/embed/")[1]?.split("/")[0]?.trim();
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const videoId = url.pathname.split("/shorts/")[1]?.split("/")[0]?.trim();
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      const videoId = url.searchParams.get("v")?.trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function isVideoPublication(publication: { category: string; video_url?: string | null }) {
  return publication.category === "video" || Boolean(getYouTubeEmbedUrl(publication.video_url));
}

function getPublicationBadges(publication: {
  category: string;
  video_url?: string | null;
  file_url?: string | null;
  featured?: boolean | null;
}) {
  const badges: string[] = [];

  if (publication.featured) badges.push("Destacado");
  if (isVideoPublication(publication)) {
    badges.push("Video");
  } else {
    badges.push(categoryConfig[publication.category as keyof typeof categoryConfig]?.label || "Publicación");
  }
  if (publication.file_url) badges.push("Descargable");

  return Array.from(new Set(badges));
}

export default async function PublicacionesPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const selectedCategory =
    resolvedSearchParams.category && resolvedSearchParams.category in categoryConfig
      ? (resolvedSearchParams.category as PublicationCategory)
      : "all";

  const supabase = await createSupabaseServerClient();
  const { data: publications, error } = await supabase
    .from("publications")
    .select(
      "id,title,slug,summary,image_url,category,featured,file_url,video_url,published_at,created_at,status"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="p-10">Error cargando publicaciones.</main>;
  }

  const sortedPublications = sortByPublicationDate(publications || []);
  const filteredPublications =
    selectedCategory === "all"
      ? sortedPublications
      : sortedPublications.filter((publication) => publication.category === selectedCategory);
  const featuredPublications =
    selectedCategory === "all"
      ? sortedPublications.filter((publication) => publication.featured).slice(0, 3)
      : [];
  const featuredIds = new Set(featuredPublications.map((item) => item.id));
  const gridPublications =
    selectedCategory === "all"
      ? filteredPublications.filter((publication) => !featuredIds.has(publication.id))
      : filteredPublications;
  const leadPublication = featuredPublications[0] || filteredPublications[0] || null;

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
          <div className="hero-inner px-6 py-12 md:px-10 md:py-16">
            <p className="kicker">Publicaciones IVBCC</p>
            <h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">
              Recursos para leer, ver y profundizar.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
              Devocionales, reflexiones, comunicados y materiales ministeriales organizados para una lectura cómoda.
            </p>
          </div>
        </div>
      </section>

      <section className="site-shell-wide py-8">
        <div className="flex flex-wrap gap-3">
          {categoryFilters.map((filter) => {
            const isActive = selectedCategory === filter.value;
            const href = filter.value === "all" ? "/publicaciones" : `/publicaciones?category=${filter.value}`;

            return (
              <Link key={filter.value} href={href} className={isActive ? "btn-secondary" : "btn-ghost"}>
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      {leadPublication ? (
        <section className="site-shell-wide pb-12">
          <article
            className={`editorial-card grid lg:grid-cols-[1.05fr_0.95fr] ${
              isVideoPublication(leadPublication) ? "has-video-embed" : ""
            }`}
          >
            <PublicationMedia
              publication={leadPublication}
              priority
              large
              videoPlayerId={`lead-${leadPublication.id}`}
            />
            <div className="flex flex-col justify-center p-7 md:p-10">
              <div className="flex flex-wrap gap-2">
                {getPublicationBadges(leadPublication).map((badge) => (
                  <span key={badge} className="badge">
                    {badge}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-sm font-semibold text-slate-500">
                {formatDateColombia(leadPublication.published_at || leadPublication.created_at)}
              </p>
              <h2 className="section-title mt-3 text-4xl md:text-5xl">
                {leadPublication.title}
              </h2>
              <p className="muted-copy mt-5 line-clamp-5">
                {leadPublication.summary || "Sin resumen disponible."}
              </p>
              <PublicationActions
                publication={leadPublication}
                videoPlayerId={`lead-${leadPublication.id}`}
              />
            </div>
          </article>
        </section>
      ) : null}

      <section className="site-shell-wide pb-16">
        <div className="mb-7">
          <p className="kicker">Biblioteca</p>
          <h2 className="section-title mt-2 text-4xl">
            {selectedCategory === "all"
              ? "Todas las publicaciones"
              : categoryConfig[selectedCategory].buttonLabel}
          </h2>
        </div>

        {gridPublications.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {gridPublications.map((publication) => {
              const videoPlayerId = `grid-${publication.id}`;

              return (
                <article
                  key={publication.id}
                  className={`editorial-card ${
                    isVideoPublication(publication) ? "has-video-embed" : ""
                  }`}
                >
                  <PublicationMedia
                    publication={publication}
                    videoPlayerId={videoPlayerId}
                  />
                  <div className="flex min-h-[260px] flex-col p-6">
                    <div className="flex flex-wrap gap-2">
                      {getPublicationBadges(publication).map((badge) => (
                        <span key={badge} className="badge">
                          {badge}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-500">
                      {formatDateColombia(publication.published_at || publication.created_at)}
                    </p>
                    <h3 className="section-title mt-2 text-2xl">{publication.title}</h3>
                    <p className="muted-copy mt-3 line-clamp-3 text-sm">
                      {publication.summary || "Sin resumen disponible."}
                    </p>
                    <div className="mt-auto pt-5">
                      <PublicationActions
                        publication={publication}
                        compact
                        videoPlayerId={videoPlayerId}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="premium-surface rounded-[28px] px-6 py-16 text-center text-sm text-slate-500">
            No hay publicaciones publicadas en esta categoría todavía.
          </div>
        )}
      </section>
    </main>
  );
}

function PublicationMedia({
  publication,
  priority = false,
  large = false,
  videoPlayerId,
}: {
  publication: {
    id: string;
    title: string;
    image_url: string | null;
    video_url: string | null;
    category: string;
  };
  priority?: boolean;
  large?: boolean;
  videoPlayerId: string;
}) {
  const videoEmbedUrl = getYouTubeEmbedUrl(publication.video_url);
  const isVideo = isVideoPublication(publication);

  const mediaContent = publication.image_url ? (
    <Image
      src={publication.image_url}
      alt={publication.title}
      fill
      sizes={large ? "(min-width: 1024px) 620px, 100vw" : "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"}
      priority={priority}
      className="object-cover"
    />
  ) : (
    <EmptyImagePlaceholder
      label="IVBCC Publicaciones"
      subtitle="Recursos, reflexiones y contenido ministerial."
      className="h-full"
      variant={large ? "detail" : "card"}
    />
  );

  return (
    <div className={`media-frame rounded-none ${large ? "min-h-[440px]" : "aspect-[16/10]"}`}>
      {isVideo && videoEmbedUrl ? (
        <InlineVideoPreview
          playerId={videoPlayerId}
          title={publication.title}
          embedUrl={videoEmbedUrl}
          triggerLabel="Ver video"
          triggerAriaLabel={`Ver video: ${publication.title}`}
          triggerClassName="absolute inset-0 flex items-center justify-center bg-slate-950/28 text-sm font-extrabold uppercase tracking-[0.18em] text-white transition hover:bg-slate-950/38"
        >
          {mediaContent}
        </InlineVideoPreview>
      ) : (
        <>
          {mediaContent}
          {isVideo ? (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/28 text-sm font-extrabold uppercase tracking-[0.18em] text-white">
              Video
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

function PublicationActions({
  publication,
  compact = false,
  videoPlayerId,
}: {
  publication: {
    slug: string;
    title: string;
    video_url: string | null;
    category: string;
  };
  compact?: boolean;
  videoPlayerId: string;
}) {
  const videoEmbedUrl = getYouTubeEmbedUrl(publication.video_url);
  const isVideo = isVideoPublication(publication);

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {videoEmbedUrl ? (
        <InlineVideoOpenButton
          playerId={videoPlayerId}
          title={publication.title}
          triggerLabel="Ver video"
          triggerClassName={compact ? "btn-primary" : "btn-primary"}
        />
      ) : null}
      <Link href={`/publicaciones/${publication.slug}`} className={compact ? "btn-ghost" : "btn-secondary"}>
        {isVideo ? "Abrir publicación" : "Leer publicación"}
      </Link>
    </div>
  );
}
