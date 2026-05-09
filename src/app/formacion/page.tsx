import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 600;

export default async function FormacionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id,title,slug,description,image_url,created_at,status")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return <main className="p-10">Error cargando cursos.</main>;
  }

  const featured = courses?.[0] || null;
  const remaining = (courses || []).slice(1);

  return (
    <main className="premium-page">
      <section className="site-shell-wide pt-8">
        <div className="page-hero">
          <div className="hero-inner grid gap-10 px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="kicker">Formación IVBCC</p>
              <h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">
                Cursos para crecer con dirección y profundidad.
              </h1>
            </div>
            <p className="max-w-2xl text-base leading-8 text-white/70 md:text-lg">
              Un espacio de aprendizaje para discipulado, estudio bíblico y acompañamiento de procesos.
            </p>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="site-shell-wide py-12">
          <article className="editorial-card grid lg:grid-cols-[1fr_0.95fr]">
            <Link href={`/formacion/${featured.slug}`} className="media-frame min-h-[420px] rounded-none">
              {featured.image_url ? (
                <Image
                  src={featured.image_url}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 1024px) 600px, 100vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <EmptyImagePlaceholder
                  label="IVBCC Formación"
                  subtitle="Cursos y recursos para crecer en la fe."
                  className="h-full"
                  variant="detail"
                />
              )}
            </Link>
            <div className="flex flex-col justify-center p-7 md:p-10">
              <span className="badge w-fit">Curso destacado</span>
              <h2 className="section-title mt-5 text-4xl md:text-5xl">
                {featured.title}
              </h2>
              <p className="muted-copy mt-5 line-clamp-5">{featured.description}</p>
              <Link href={`/formacion/${featured.slug}`} className="btn-secondary mt-8 w-fit">
                Ver curso
              </Link>
            </div>
          </article>
        </section>
      ) : (
        <section className="site-shell-wide py-12">
          <div className="premium-surface rounded-[28px] px-6 py-16 text-center text-sm text-slate-500">
            No hay cursos publicados en este momento.
          </div>
        </section>
      )}

      {remaining.length > 0 ? (
        <section className="site-shell-wide pb-16">
          <div className="mb-7">
            <p className="kicker">Catálogo</p>
            <h2 className="section-title mt-2 text-4xl">Más cursos disponibles</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {remaining.map((course) => (
              <article key={course.id} className="editorial-card">
                <Link href={`/formacion/${course.slug}`} className="media-frame block aspect-[16/10] rounded-none">
                  {course.image_url ? (
                    <Image
                      src={course.image_url}
                      alt={course.title}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <EmptyImagePlaceholder
                      label="IVBCC Formación"
                      subtitle="Cursos y recursos para crecer en la fe."
                      className="h-full"
                    />
                  )}
                </Link>
                <div className="p-6">
                  <span className="badge">Formación</span>
                  <h2 className="section-title mt-4 text-2xl">{course.title}</h2>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm">{course.description}</p>
                  <Link href={`/formacion/${course.slug}`} className="mt-5 inline-flex text-sm font-extrabold text-[var(--ivbcc-navy)]">
                    Ver curso
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
