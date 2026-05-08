import Link from "next/link";
import Image from "next/image";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
  const supabase = await createSupabaseServerClient();

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

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
          IVBCC
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950 md:text-4xl">
          Noticias
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Mantente al día con las noticias, comunicados y novedades de nuestra
          comunidad.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {noticias?.map((noticia, index) => (
          <article
            key={noticia.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg"
          >
            {noticia.image_url ? (
              <div className="relative h-52 w-full overflow-hidden rounded-t-2xl bg-gray-100">
                <Image
                  src={noticia.image_url}
                  alt={noticia.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  priority={index === 0}
                  className="object-cover object-center"
                />
              </div>
            ) : (
              <EmptyImagePlaceholder
                label="IVBCC Noticias"
                subtitle="Novedades y comunicados para nuestra comunidad."
                className="h-52 rounded-t-2xl"
              />
            )}

            <div className="p-6">
              <p className="mb-3 text-sm font-medium text-gray-500">
                {formatDateColombia(noticia.published_at)}
              </p>

              <h2 className="mb-2 text-xl font-bold leading-snug text-gray-950">
                {noticia.title}
              </h2>

              <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                {noticia.summary}
              </p>

              <Link
                href={`/noticias/${noticia.slug}`}
                className="mt-5 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
              >
                Leer más →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
