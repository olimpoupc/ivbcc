import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 300;

const VideoPreviewModal = dynamic(
  () => import("@/components/publications/VideoPreviewModal")
);

type PublicationCategory =
  | "devotional"
  | "reflection"
  | "announcement"
  | "bulletin"
  | "document"
  | "resource"
  | "video";

type SearchParams = Promise<{
  category?: string;
}>;

const categoryConfig: Record<
  PublicationCategory,
  {
    label: string;
    buttonLabel: string;
  }
> = {
  devotional: {
    label: "Devocional",
    buttonLabel: "Devocionales",
  },
  reflection: {
    label: "Reflexión",
    buttonLabel: "Reflexiones",
  },
  announcement: {
    label: "Comunicado",
    buttonLabel: "Comunicados",
  },
  bulletin: {
    label: "Boletín",
    buttonLabel: "Boletines",
  },
  document: {
    label: "Documento",
    buttonLabel: "Documentos",
  },
  resource: {
    label: "Recurso",
    buttonLabel: "Recursos",
  },
  video: {
    label: "Video",
    buttonLabel: "Videos",
  },
};

const categoryFilters: Array<{
  value: "all" | PublicationCategory;
  label: string;
}> = [
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

function isVideoPublication(publication: {
  category: string;
  video_url?: string | null;
}) {
  return publication.category === "video" || Boolean(getYouTubeEmbedUrl(publication.video_url));
}

function getPublicationBadges(publication: {
  category: string;
  video_url?: string | null;
  file_url?: string | null;
  featured?: boolean | null;
}) {
  const badges: Array<{
    label: string;
    className: string;
  }> = [];

  if (publication.featured) {
    badges.push({
      label: "Destacado",
      className:
        "bg-[var(--ivbcc-gold)]/15 text-[var(--ivbcc-navy)] ring-1 ring-[var(--ivbcc-gold)]/30",
    });
  }

  if (isVideoPublication(publication)) {
    badges.push({
      label: "VIDEO",
      className: "bg-red-50 text-red-700 ring-1 ring-red-100",
    });
  } else {
    badges.push({
      label:
        categoryConfig[publication.category as keyof typeof categoryConfig]
          ?.label || "Publicación",
      className: "bg-slate-100 text-slate-700",
    });
  }

  if (publication.file_url) {
    badges.push({
      label: "Descargable",
      className: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    });
  }

  const dedupedBadges = new Map<string, (typeof badges)[number]>();
  badges.forEach((badge) => {
    const key = badge.label.toLowerCase();
    if (!dedupedBadges.has(key)) {
      dedupedBadges.set(key, badge);
    }
  });

  return Array.from(dedupedBadges.values());
}

export default async function PublicacionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedCategory =
    resolvedSearchParams.category &&
    resolvedSearchParams.category in categoryConfig
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
      : sortedPublications.filter(
          (publication) => publication.category === selectedCategory
        );
  const showFeaturedSection = selectedCategory === "all";
  const featuredPublications = showFeaturedSection
    ? sortedPublications.filter((publication) => publication.featured).slice(0, 3)
    : [];
  const featuredIds = new Set(featuredPublications.map((item) => item.id));
  const gridPublications = showFeaturedSection
    ? filteredPublications.filter((publication) => !featuredIds.has(publication.id))
    : filteredPublications;
  const showPublicationsGrid =
    gridPublications.length > 0 ||
    !showFeaturedSection ||
    featuredPublications.length === 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="overflow-hidden rounded-[28px] bg-[var(--ivbcc-navy)] px-8 py-12 text-white shadow-sm md:px-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ivbcc-gold)]">
            IVBCC
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Publicaciones
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
            Recursos, reflexiones, comunicados y contenido ministerial de
            IVBCC.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap gap-3">
          {categoryFilters.map((filter) => {
            const isActive = selectedCategory === filter.value;
            const href =
              filter.value === "all"
                ? "/publicaciones"
                : `/publicaciones?category=${filter.value}`;

            return (
              <Link
                key={filter.value}
                href={href}
                className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[var(--ivbcc-navy)] bg-[var(--ivbcc-navy)] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[var(--ivbcc-gold)] hover:text-[var(--ivbcc-navy)]"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      {featuredPublications.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
                Destacadas
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-950">
                Publicaciones destacadas
              </h2>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {featuredPublications.map((publication, index) => {
              const badges = getPublicationBadges(publication);
              const videoEmbedUrl = getYouTubeEmbedUrl(publication.video_url);
              const isVideo = isVideoPublication(publication);

              return (
                <article
                  key={publication.id}
                  className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-56 w-full overflow-hidden rounded-t-3xl bg-gray-100">
                    {publication.image_url ? (
                      <Image
                        src={publication.image_url}
                        alt={publication.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        priority={index === 0}
                        className="object-cover object-center"
                      />
                    ) : (
                      <EmptyImagePlaceholder
                        label="IVBCC Publicaciones"
                        subtitle="Recursos, reflexiones y contenido ministerial."
                        className="h-full rounded-t-3xl"
                      />
                    )}
                    {isVideo && (
                      videoEmbedUrl ? (
                        <VideoPreviewModal
                          title={publication.title}
                          embedUrl={videoEmbedUrl}
                          triggerLabel="▶"
                          triggerAriaLabel={`Ver video: ${publication.title}`}
                          triggerClassName="absolute inset-0 flex items-center justify-center bg-slate-950/10 text-5xl text-white transition hover:bg-slate-950/25"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/10 text-5xl text-white">
                          ▶
                        </span>
                      )
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {badges.map((badge, index) => (
                        <span
                          key={`${badge.label}-${index}`}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 text-sm font-medium text-gray-500">
                      {formatDateColombia(
                        publication.published_at || publication.created_at
                      )}
                    </p>

                    <h3 className="mt-2 text-2xl font-bold leading-tight text-gray-950">
                      {publication.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                      {publication.summary || "Sin resumen disponible."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {videoEmbedUrl ? (
                        <VideoPreviewModal
                          title={publication.title}
                          embedUrl={videoEmbedUrl}
                          triggerLabel="Ver video"
                          triggerClassName="inline-flex rounded-full bg-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        />
                      ) : null}
                      <Link
                        href={`/publicaciones/${publication.slug}`}
                        className="inline-flex rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                      >
                        {isVideo ? "Abrir publicación" : "Ver publicación"}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {showPublicationsGrid ? (
        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-950">
              {selectedCategory === "all"
                ? "Todas las publicaciones"
                : categoryConfig[selectedCategory].buttonLabel}
            </h2>
          </div>

          {gridPublications.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {gridPublications.map((publication) => {
              const badges = getPublicationBadges(publication);
              const videoEmbedUrl = getYouTubeEmbedUrl(publication.video_url);
              const isVideo = isVideoPublication(publication);

              return (
                <article
                  key={publication.id}
                  className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-52 w-full overflow-hidden rounded-t-3xl bg-gray-100">
                    {publication.image_url ? (
                      <Image
                        src={publication.image_url}
                        alt={publication.title}
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover object-center"
                      />
                    ) : (
                      <EmptyImagePlaceholder
                        label="IVBCC Publicaciones"
                        subtitle="Contenido para seguir profundizando."
                        className="h-full rounded-t-3xl"
                      />
                    )}
                    {isVideo && (
                      videoEmbedUrl ? (
                        <VideoPreviewModal
                          title={publication.title}
                          embedUrl={videoEmbedUrl}
                          triggerLabel="▶"
                          triggerAriaLabel={`Ver video: ${publication.title}`}
                          triggerClassName="absolute inset-0 flex items-center justify-center bg-slate-950/10 text-5xl text-white transition hover:bg-slate-950/25"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/10 text-5xl text-white">
                          ▶
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex min-h-[260px] flex-col p-6">
                    <div className="flex flex-wrap gap-2">
                      {badges.map((badge, index) => (
                        <span
                          key={`${badge.label}-${index}`}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 text-sm font-medium text-gray-500">
                      {formatDateColombia(
                        publication.published_at || publication.created_at
                      )}
                    </p>

                    <h3 className="mt-2 text-xl font-bold leading-snug text-gray-950">
                      {publication.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                      {publication.summary || "Sin resumen disponible."}
                    </p>

                    <div className="mt-auto flex flex-wrap gap-3 pt-5">
                      {videoEmbedUrl ? (
                        <VideoPreviewModal
                          title={publication.title}
                          embedUrl={videoEmbedUrl}
                          triggerLabel="Ver video"
                          triggerClassName="inline-flex rounded-full bg-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        />
                      ) : null}
                      <Link
                        href={`/publicaciones/${publication.slug}`}
                        className="inline-flex rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
                      >
                        {isVideo ? "Abrir publicación" : "Ver publicación"}
                      </Link>
                    </div>
                  </div>
                </article>
              );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
              No hay publicaciones publicadas en esta categoría todavía.
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
