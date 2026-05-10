import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildContentMetadata,
  resolveSeoDescription,
  seoConfig,
} from "@/lib/seo";
import TrackedLink from "@/components/analytics/TrackedLink";
import YouTubeEmbed from "@/components/media/YouTubeEmbed";
import SharePublicationButtons from "./SharePublicationButtons";

export const revalidate = 300;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

const categoryConfig = {
  devotional: "Devocional",
  reflection: "Reflexión",
  announcement: "Comunicado",
  bulletin: "Boletín",
  document: "Documento",
  resource: "Recurso",
  video: "Video",
};

type Publication = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  category: keyof typeof categoryConfig;
  image_url: string | null;
  file_url: string | null;
  video_url: string | null;
  featured: boolean | null;
  published_at: string | null;
  created_at: string | null;
  status: string;
};

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
      url.hostname === "youtube.com"
    ) {
      const videoId = url.searchParams.get("v")?.trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function getPublicationTimestamp(publication: {
  published_at?: string | null;
  created_at?: string | null;
}) {
  return new Date(publication.published_at || publication.created_at || 0).getTime();
}

function sortByPublicationDate<T extends { published_at?: string | null; created_at?: string | null }>(
  items: T[]
) {
  return [...items].sort(
    (a, b) => getPublicationTimestamp(b) - getPublicationTimestamp(a)
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: publication } = await supabase
    .from("publications")
    .select("title,summary,content,image_url,video_url,category")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const category =
    categoryConfig[publication?.category as keyof typeof categoryConfig] ||
    "Publicación";

  return buildContentMetadata({
    title: publication?.title || "Publicación",
    description: resolveSeoDescription(publication?.summary, publication?.content),
    path: `/publicaciones/${slug}`,
    image: publication?.image_url || seoConfig.logoPath,
    type: "article",
    keywords: ["publicaciones IVBCC", category, "recursos cristianos"],
  });
}

export default async function PublicacionDetallePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: publications, error } = await supabase
    .from("publications")
    .select(
      "id,title,slug,summary,content,category,image_url,file_url,video_url,featured,published_at,created_at,status"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !publications) {
    return <main className="p-10">Publicación no encontrada.</main>;
  }

  const sortedPublications = sortByPublicationDate(
    publications as Publication[]
  );
  const currentIndex = sortedPublications.findIndex(
    (item) => item.slug === slug
  );
  const publication = currentIndex >= 0 ? sortedPublications[currentIndex] : null;

  if (!publication) {
    return <main className="p-10">Publicación no encontrada.</main>;
  }

  const previousPublication =
    currentIndex < sortedPublications.length - 1
      ? sortedPublications[currentIndex + 1]
      : null;
  const nextPublication =
    currentIndex > 0 ? sortedPublications[currentIndex - 1] : null;
  const morePublications = sortedPublications
    .filter((item) => item.id !== publication.id)
    .sort((a, b) => {
      const sameCategoryA = a.category === publication.category ? 1 : 0;
      const sameCategoryB = b.category === publication.category ? 1 : 0;
      if (sameCategoryA !== sameCategoryB) return sameCategoryB - sameCategoryA;

      const featuredA = a.featured ? 1 : 0;
      const featuredB = b.featured ? 1 : 0;
      if (featuredA !== featuredB) return featuredB - featuredA;

      return getPublicationTimestamp(b) - getPublicationTimestamp(a);
    })
    .slice(0, 3);

  const category =
    categoryConfig[publication.category as keyof typeof categoryConfig] ||
    "Publicación";
  const videoEmbedUrl = getYouTubeEmbedUrl(publication.video_url);

  return (
    <main className="premium-page">
      <div className="site-shell pt-8">
      <Link
        href="/publicaciones"
        className="btn-ghost mb-8"
      >
        Volver a publicaciones
      </Link>
      </div>

      {publication.image_url ? (
        <div className="site-shell mb-10">
        <div className="media-frame overflow-hidden rounded-[30px] bg-[#ebe6dc] p-5 shadow-lg">
          <div className="relative h-[300px] w-full md:h-[420px]">
            <Image
              src={publication.image_url}
              alt={publication.title}
              fill
              sizes="(min-width: 1024px) 1100px, 100vw"
              priority
              className="object-contain"
            />
          </div>
        </div>
        </div>
      ) : null}

      <div className="site-shell grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-8">
          <header className="premium-surface rounded-[30px] p-8 md:p-10">
            <div className="flex flex-wrap gap-2">
              <span className="badge">
                {category}
              </span>
              {publication.featured && (
                <span className="badge">
                  Destacado
                </span>
              )}
              {publication.category === "video" && publication.video_url && (
                <span className="badge border-red-200 bg-red-50 text-red-700">
                  Video
                </span>
              )}
              {publication.file_url && (
                <span className="badge border-amber-200 bg-amber-50 text-amber-700">
                  Descargable
                </span>
              )}
            </div>

            <h1 className="section-title mt-5 text-4xl text-gray-950 md:text-5xl">
              {publication.title}
            </h1>

            <p className="mt-4 text-sm font-medium text-gray-500">
              {formatDateColombia(
                publication.published_at || publication.created_at
              )}
            </p>
          </header>

          {publication.summary && (
            <section className="premium-surface rounded-[30px] p-8">
              <p className="kicker">
                Resumen
              </p>
              <p className="mt-4 text-lg leading-relaxed text-gray-700">
                {publication.summary}
              </p>
            </section>
          )}

          {publication.content && (
            <article className="premium-surface rounded-[30px] p-8">
              <p className="kicker">
                Contenido
              </p>
              <div className="prose-premium mt-5 whitespace-pre-line">
                {publication.content}
              </div>
            </article>
          )}

          {(videoEmbedUrl || publication.file_url) && (
            <section className="premium-surface video-resource-surface rounded-[30px] p-8">
              <p className="kicker">
                Recursos
              </p>

              {videoEmbedUrl && (
                <div className="mt-5 overflow-hidden rounded-[24px] bg-slate-950 shadow-lg">
                  <YouTubeEmbed src={videoEmbedUrl} title={publication.title} />
                </div>
              )}

              {publication.file_url && (
                <div className="mt-6 rounded-[24px] border border-amber-100 bg-amber-50/80 p-6">
                  <p className="text-base font-semibold text-gray-900">
                    Recurso disponible para descarga
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Puedes abrir o descargar este material para consultarlo más
                    tarde.
                  </p>
                  <TrackedLink
                    href={publication.file_url}
                    target="_blank"
                    rel="noreferrer"
                    eventName="download_resource"
                    eventParams={{
                      type: "publication",
                      slug: publication.slug,
                    }}
                    className="btn-primary mt-5"
                  >
                    Descargar recurso
                  </TrackedLink>
                </div>
              )}
            </section>
          )}

          <nav className="premium-surface rounded-[30px] p-8">
            <p className="kicker">
              Navegación
            </p>
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
              {previousPublication ? (
                <Link
                  href={`/publicaciones/${previousPublication.slug}`}
                  className="btn-ghost"
                >
                  Publicación anterior
                </Link>
              ) : null}

              {nextPublication ? (
                <Link
                  href={`/publicaciones/${nextPublication.slug}`}
                  className="btn-ghost"
                >
                  Siguiente publicación
                </Link>
              ) : null}
            </div>
          </nav>

          {morePublications.length > 0 && (
            <section className="premium-surface rounded-[30px] p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="kicker">
                    Más publicaciones
                  </p>
                  <h2 className="section-title mt-2 text-3xl text-gray-950">
                    Sigue explorando
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {morePublications.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-[#e8e2d6] bg-[#fbfaf7] p-5"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="badge bg-white">
                        {categoryConfig[item.category] || "Publicación"}
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
                      {formatDateColombia(item.published_at || item.created_at)}
                    </p>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                      {item.summary || "Sin resumen disponible."}
                    </p>

                    <Link
                      href={`/publicaciones/${item.slug}`}
                      className="mt-4 inline-flex text-sm font-extrabold text-[var(--ivbcc-navy)]"
                    >
                      Ver publicación
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="space-y-6">
          <SharePublicationButtons title={publication.title} />
        </aside>
      </div>
    </main>
  );
}
