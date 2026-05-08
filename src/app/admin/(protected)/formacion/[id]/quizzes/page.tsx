import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DeleteQuizButton from "./DeleteQuizButton";
import PublishQuizButton from "./PublishQuizButton";

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

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CursoQuizzesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: course, error: courseError }, { data: lessons }, { data: quizzes, error: quizzesError }] =
    await Promise.all([
      supabase.from("courses").select("id,title").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("id,title").eq("course_id", id),
      supabase
        .from("quizzes")
        .select("*")
        .eq("course_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (courseError || !course) {
    return <main className="p-10">Curso no encontrado.</main>;
  }

  if (quizzesError) {
    return <main className="p-10">Error cargando quizzes.</main>;
  }

  const lessonsMap = new Map((lessons || []).map((lesson) => [lesson.id, lesson.title]));

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Formación
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Quizzes del curso
          </h1>
          <p className="mt-2 text-sm text-gray-500">{course.title}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/formacion/${id}/quizzes/crear`}
            className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          >
            + Crear quiz
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
          <div className="col-span-4">Título</div>
          <div className="col-span-3">Estado</div>
          <div className="col-span-3">Lección</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {quizzes?.length ? (
          quizzes.map((quiz) => {
            const status = quiz.status || "draft";
            const currentStatus =
              statusConfig[status as keyof typeof statusConfig] ||
              statusConfig.draft;

            return (
              <article
                key={quiz.id}
                className="grid grid-cols-12 items-center border-b px-5 py-4 text-sm"
              >
                <div className="col-span-4 font-semibold text-gray-900">
                  {quiz.title}
                </div>
                <div className="col-span-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${currentStatus.className}`}
                  >
                    {currentStatus.label}
                  </span>
                </div>
                <div className="col-span-3 text-gray-600">
                  {quiz.lesson_id ? lessonsMap.get(quiz.lesson_id) || "Lección no encontrada" : "Quiz general"}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  {quiz.status === "draft" && <PublishQuizButton id={quiz.id} />}
                  <Link
                    href={`/admin/formacion/${id}/quizzes/${quiz.id}/editar`}
                    className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                  >
                    Editar
                  </Link>
                  <DeleteQuizButton id={quiz.id} />
                </div>
              </article>
            );
          })
        ) : (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            Este curso aún no tiene quizzes.
          </div>
        )}
      </section>
    </main>
  );
}
