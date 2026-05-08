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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/noticias"
        className="mb-8 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
      >
        Volver a noticias
      </Link>

      {noticia.image_url ? (
        <div className="mb-10 flex min-h-80 w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-100 p-4 shadow-sm">
          <Image
            src={noticia.image_url}
            alt={noticia.title}
            width={1200}
            height={720}
            sizes="(min-width: 1024px) 896px, 100vw"
            priority
            className="max-h-[32rem] h-auto w-auto object-contain"
          />
        </div>
      ) : null}

      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="mx-auto w-full max-w-3xl">
          <header
            className={`mb-8 rounded-2xl p-8 shadow-sm ${
              noticia.image_url
                ? "bg-white"
                : "bg-[var(--ivbcc-navy)] text-white"
            }`}
          >
            <p
              className={`text-sm font-semibold uppercase tracking-[0.18em] ${
                noticia.image_url
                  ? "text-[var(--ivbcc-gold)]"
                  : "text-[var(--ivbcc-gold)]"
              }`}
            >
              Noticias IVBCC
            </p>
            <h1
              className={`mt-3 text-3xl font-bold leading-tight md:text-4xl ${
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
              className={`mt-5 text-lg leading-relaxed ${
                noticia.image_url ? "text-gray-600" : "text-white/85"
              }`}
            >
              {noticia.summary}
            </p>
          </header>

          <article className="rounded-2xl bg-white p-8 whitespace-pre-line text-lg leading-relaxed text-gray-800 shadow-sm">
            {noticia.content}
          </article>

          <section className="mt-10 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-3">
            <div className="md:col-span-3">
              <h2 className="text-lg font-bold text-gray-950">
                Navegar noticias
              </h2>
            </div>

            <div>
              {previousNews ? (
                <Link
                  href={`/noticias/${previousNews.slug}`}
                  className="inline-flex rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-gray-50"
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
                className="inline-flex rounded-lg bg-[var(--ivbcc-gold)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Volver a noticias
              </Link>
            </div>

            <div className="md:text-right">
              {nextNews ? (
                <Link
                  href={`/noticias/${nextNews.slug}`}
                  className="inline-flex rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-[var(--ivbcc-navy)] transition hover:bg-gray-50"
                >
                  Siguiente noticia
                </Link>
              ) : (
                <span className="text-sm text-gray-400">Sin siguiente</span>
              )}
            </div>
          </section>

          {moreRecentNews.length > 0 && (
            <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-950">
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
                      className="mt-2 inline-flex text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
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
