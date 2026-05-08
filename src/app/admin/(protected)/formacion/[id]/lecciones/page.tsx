import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DeleteLessonButton from "./DeleteLessonButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CursoLeccionesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: course, error: courseError }, { data: lessons, error: lessonsError }] =
    await Promise.all([
      supabase.from("courses").select("id,title").eq("id", id).maybeSingle(),
      supabase
        .from("lessons")
        .select("*")
        .eq("course_id", id)
        .order("order", { ascending: true }),
    ]);

  if (courseError || !course) {
    return <main className="p-10">Curso no encontrado.</main>;
  }

  if (lessonsError) {
    return <main className="p-10">Error cargando lecciones.</main>;
  }

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Formación
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Lecciones del curso
          </h1>
          <p className="mt-2 text-sm text-gray-500">{course.title}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/formacion/${id}/lecciones/crear`}
            className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          >
            + Crear lección
          </Link>
          <Link
            href="/admin/formacion"
            className="inline-flex w-fit items-center justify-center rounded-lg border px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Volver a cursos
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="grid grid-cols-12 border-b bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-600">
          <div className="col-span-2">Orden</div>
          <div className="col-span-7">Título</div>
          <div className="col-span-3 text-right">Acciones</div>
        </div>

        {lessons?.length ? (
          lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="grid grid-cols-12 items-center border-b px-5 py-4 text-sm"
            >
              <div className="col-span-2 font-semibold text-gray-700">
                {lesson.order}
              </div>
              <div className="col-span-7 font-semibold text-gray-900">
                {lesson.title}
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <Link
                  href={`/admin/formacion/${id}/lecciones/${lesson.id}/editar`}
                  className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                >
                  Editar
                </Link>
                <DeleteLessonButton id={lesson.id} />
              </div>
            </article>
          ))
        ) : (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            Este curso aún no tiene lecciones.
          </div>
        )}
      </section>
    </main>
  );
}
