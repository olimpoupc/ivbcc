import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DeleteCourseButton from "./DeleteCourseButton";
import PublishCourseButton from "./PublishCourseButton";

const statusConfig = {
  published: {
    label: "Publicado",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  draft: {
    label: "Borrador",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
};

export default async function AdminFormacionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Administración
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Administrar cursos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Gestiona cursos publicados y borradores para el módulo de formación.
          </p>
        </div>

        <Link
          href="/admin/formacion/crear"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          + Crear curso
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses?.map((course, index) => {
          const status = course.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;

          return (
            <article
              key={course.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-44 bg-gray-100">
                {course.image_url ? (
                  <Image
                    src={course.image_url}
                    alt={course.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Formación"
                    subtitle="Vista previa sin portada."
                    className="h-full"
                  />
                )}

                <span
                  className={`absolute left-4 top-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${currentStatus.className}`}
                >
                  {currentStatus.label}
                </span>
              </div>

              <div className="flex min-h-64 flex-col p-5">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {course.slug}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-gray-950">
                    {course.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500">
                    {course.description}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {course.status === "draft" && (
                    <PublishCourseButton id={course.id} />
                  )}

                  <Link
                    href={`/admin/formacion/${course.id}/quizzes`}
                    className="mt-2 rounded-lg border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver quizzes
                  </Link>
                  <Link
                    href={`/admin/formacion/${course.id}/lecciones`}
                    className="mt-2 rounded-lg border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver lecciones
                  </Link>
                  <Link
                    href={`/admin/formacion/${course.id}/editar`}
                    className="mt-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                  >
                    Editar
                  </Link>
                  <DeleteCourseButton id={course.id} imageUrl={course.image_url} />
                </div>
              </div>
            </article>
          );
        })}

        {courses?.length === 0 && (
          <div className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-gray-500 md:col-span-2 xl:col-span-3">
            Aún no hay cursos registrados.
          </div>
        )}
      </section>
    </main>
  );
}
