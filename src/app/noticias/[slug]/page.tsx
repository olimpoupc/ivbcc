import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildContentMetadata, resolveSeoDescription, seoConfig } from "@/lib/seo";
import ShareNewsButtons from "./ShareNewsButtons";

export const revalidate = 300;

type Props = {
  params: Promise<{
    slug: string;
  }>;
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

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const now = new Date().toISOString();
  const supabase = await createSupabaseServerClient();

  const { data: noticia } = await supabase
    .from("news")
    .select("title,summary,content,image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  return buildContentMetadata({
    title: noticia?.title || "Noticia",
    description: resolveSeoDescription(noticia?.summary, noticia?.content),
    path: `/noticias/${slug}`,
    image: noticia?.image_url || seoConfig.logoPath,
    type: "article",
    keywords: ["noticias IVBCC", "noticia cristiana", "comunidad IVBCC"],
  });
}

export default async function NoticiaDetallePage({ params }: Props) {
  const { slug } = await params;
  const now = new Date().toISOString();
  const supabase = await createSupabaseServerClient();

  const { data: noticias, error } = await supabase
    .from("news")
    .select("id,title,slug,summary,content,image_url,published_at,created_at,expires_at,status")
    .eq("status", "published")
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  const noticiaIndex = (noticias || []).findIndex((item) => item.slug === slug);
  const noticia = noticiaIndex >= 0 ? noticias?.[noticiaIndex] : null;
  const previousNews =
    noticiaIndex >= 0 && noticias && noticiaIndex > 0
      ? noticias[noticiaIndex - 1]
      : null;
  const nextNews =
    noticiaIndex >= 0 && noticias && noticiaIndex < noticias.length - 1
      ? noticias[noticiaIndex + 1]
      : null;
  const moreRecentNews = (noticias || [])
    .filter((item) => item.slug !== slug)
    .slice(0, 3);

  if (error || !noticia) {
    return <main className="p-10">Noticia no encontrada.</main>;
  }

  return (
    <main className="premium-page">
      <div className="site-shell pt-8">
      <Link
        href="/noticias"
        className="btn-ghost mb-8"
      >
        Volver a noticias
      </Link>
      </div>

      {noticia.image_url ? (
        <div className="site-shell mb-10">
          <div className="media-frame min-h-80 rounded-[30px] bg-[#ebe6dc] shadow-lg">
            <Image
              src={noticia.image_url}
              alt={noticia.title}
              width={1400}
              height={820}
              sizes="(min-width: 1024px) 1180px, 100vw"
              priority
              className="mx-auto max-h-[34rem] h-auto w-auto object-contain p-4"
            />
          </div>
        </div>
      ) : null}

      <section className="site-shell grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="mx-auto w-full max-w-3xl">
          <header
            className={`mb-8 rounded-[30px] p-8 shadow-sm md:p-10 ${
              noticia.image_url
                ? "premium-surface"
                : "page-hero text-white"
            }`}
          >
            <p
              className="kicker"
            >
              Noticias IVBCC
            </p>
            <h1
              className={`section-title mt-4 text-4xl md:text-5xl ${
                noticia.image_url ? "text-gray-950" : "text-white"
              }`}
            >
              {noticia.title}
            </h1>

            <p
              className={`mt-4 text-sm font-medium ${
                noticia.image_url ? "text-gray-500" : "text-white/75"
              }`}
            >
              {formatDateColombia(noticia.published_at)}
            </p>

            <p
              className={`mt-6 text-lg leading-relaxed ${
                noticia.image_url ? "text-gray-600" : "text-white/85"
              }`}
            >
              {noticia.summary}
            </p>
          </header>

          <article className="premium-surface prose-premium whitespace-pre-line rounded-[30px] p-8 md:p-10">
            {noticia.content}
          </article>

          <section className="premium-surface mt-10 grid gap-4 rounded-[28px] p-5 md:grid-cols-3">
            <div className="md:col-span-3">
              <h2 className="section-title text-xl text-gray-950">
                Navegar noticias
              </h2>
            </div>

            <div>
              {previousNews ? (
                <Link
                  href={`/noticias/${previousNews.slug}`}
                  className="btn-ghost"
                >
                  Noticia anterior
                </Link>
              ) : (
                <span className="text-sm text-gray-400">Sin anterior</span>
              )}
            </div>

            <div className="md:text-center">
              <Link
                href="/noticias"
                className="btn-primary"
              >
                Volver a noticias
              </Link>
            </div>

            <div className="md:text-right">
              {nextNews ? (
                <Link
                  href={`/noticias/${nextNews.slug}`}
                  className="btn-ghost"
                >
                  Siguiente noticia
                </Link>
              ) : (
                <span className="text-sm text-gray-400">Sin siguiente</span>
              )}
            </div>
          </section>

          {moreRecentNews.length > 0 && (
            <section className="premium-surface mt-10 rounded-[30px] p-6">
              <h2 className="section-title text-3xl text-gray-950">
                Más noticias recientes
              </h2>
              <div className="mt-5 space-y-4">
                {moreRecentNews.map((item) => (
                  <article
                    key={item.id}
                    className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-gray-500">
                      {formatDateColombia(item.published_at)}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-gray-950">
                      {item.title}
                    </h3>
                    <Link
                      href={`/noticias/${item.slug}`}
                      className="mt-2 inline-flex text-sm font-extrabold text-[var(--ivbcc-navy)]"
                    >
                      Ver noticia
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <ShareNewsButtons title={noticia.title} />
        </aside>
      </section>
    </main>
  );
}
