import Link from "next/link";
import Image from "next/image";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabasePublicClient } from "@/lib/supabase-server";

export const revalidate = 300;

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

export default async function NoticiasPage() {
  const now = new Date().toISOString();
  const supabase = createSupabasePublicClient();

  const { data: noticias, error } = await supabase
    .from("news")
    .select("id,title,slug,summary,image_url,published_at,created_at,expires_at,status")
    .eq("status", "published")
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="p-10">Error cargando noticias.</main>;
  }

  const featured = noticias?.[0] || null;
  const remaining = (noticias || []).slice(1);

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
          <div className="hero-inner px-6 py-12 md:px-10 md:py-16">
            <p className="kicker">Noticias IVBCC</p>
            <h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">
              Una mirada editorial a la vida de la comunidad.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
              Comunicados, historias y novedades para mantenerte conectado con lo que ocurre en IVBCC.
            </p>
          </div>
        </div>
      </section>

      <section className="site-shell-wide py-12">
        {featured ? (
          <article className="editorial-card grid lg:grid-cols-[1.05fr_0.95fr]">
            <Link href={`/noticias/${featured.slug}`} className="media-frame min-h-[420px] rounded-none">
              {featured.image_url ? (
                <Image
                  src={featured.image_url}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 1024px) 620px, 100vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <EmptyImagePlaceholder
                  label="IVBCC Noticias"
                  subtitle="Novedades y comunicados para nuestra comunidad."
                  className="h-full"
                  variant="detail"
                />
              )}
            </Link>
            <div className="flex flex-col justify-center p-7 md:p-10">
              <span className="badge w-fit">Historia principal</span>
              <p className="mt-6 text-sm font-semibold text-slate-500">
                {formatDateColombia(featured.published_at || featured.created_at)}
              </p>
              <h2 className="section-title mt-3 text-4xl md:text-5xl">
                {featured.title}
              </h2>
              <p className="muted-copy mt-5 line-clamp-5">
                {featured.summary}
              </p>
              <Link href={`/noticias/${featured.slug}`} className="btn-secondary mt-8 w-fit">
                Leer noticia
              </Link>
            </div>
          </article>
        ) : (
          <div className="premium-surface rounded-[28px] px-6 py-16 text-center text-sm text-slate-500">
            No hay noticias publicadas en este momento.
          </div>
        )}
      </section>

      {remaining.length > 0 ? (
        <section className="site-shell-wide pb-16">
          <div className="mb-7">
            <p className="kicker">Archivo reciente</p>
            <h2 className="section-title mt-2 text-4xl">Más noticias</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {remaining.map((noticia) => (
              <article key={noticia.id} className="editorial-card">
                <Link href={`/noticias/${noticia.slug}`} className="media-frame block aspect-[16/10] rounded-none">
                  {noticia.image_url ? (
                    <Image
                      src={noticia.image_url}
                      alt={noticia.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
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

                <div className="p-6">
                  <p className="text-sm font-semibold text-slate-500">
                    {formatDateColombia(noticia.published_at || noticia.created_at)}
                  </p>
                  <h2 className="section-title mt-3 text-2xl">{noticia.title}</h2>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm">{noticia.summary}</p>
                  <Link href={`/noticias/${noticia.slug}`} className="mt-5 inline-flex text-sm font-extrabold text-[var(--ivbcc-navy)]">
                    Leer más
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
