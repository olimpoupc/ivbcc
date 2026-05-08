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

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-10 text-3xl font-bold text-gray-950 md:text-4xl">
        Formación
      </h1>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((course, index) => (
          <article
            key={course.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg"
          >
            {course.image_url ? (
              <div className="relative h-48 w-full overflow-hidden rounded-t-2xl bg-gray-100">
                <Image
                  src={course.image_url}
                  alt={course.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  priority={index === 0}
                  className="object-cover object-center"
                />
              </div>
            ) : (
              <EmptyImagePlaceholder
                label="IVBCC Formación"
                subtitle="Cursos y recursos para crecer en la fe."
                className="h-48 rounded-t-2xl"
              />
            )}

            <div className="p-6">
              <h2 className="mb-2 text-xl font-bold leading-snug text-gray-950">
                {course.title}
              </h2>

              <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                {course.description}
              </p>

              <Link
                href={`/formacion/${course.slug}`}
                className="mt-5 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
              >
                Ver curso →
              </Link>
            </div>
          </article>
        ))}

        {courses?.length === 0 && (
          <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm md:col-span-2 lg:col-span-3">
            No hay cursos publicados en este momento.
          </div>
        )}
      </div>
    </main>
  );
}
