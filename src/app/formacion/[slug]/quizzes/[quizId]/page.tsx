import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import QuizResponseForm from "./QuizResponseForm";

type Props = {
  params: Promise<{
    slug: string;
    quizId: string;
  }>;
};

export default async function QuizDetallePage({ params }: Props) {
  const { slug, quizId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    return <main className="p-10">Curso no encontrado.</main>;
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("course_id", course.id)
    .eq("status", "published")
    .maybeSingle();

  if (quizError || !quiz) {
    return <main className="p-10">Quiz no encontrado.</main>;
  }

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("order", { ascending: true });

  if (questionsError) {
    return <main className="p-10">Error cargando preguntas.</main>;
  }

  const questionIds = (questions || []).map((question) => question.id);
  const { data: options, error: optionsError } = questionIds.length
    ? await supabase
        .from("quiz_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order", { ascending: true })
    : { data: [], error: null };

  if (optionsError) {
    return <main className="p-10">Error cargando opciones.</main>;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">
            Debes inscribirte para acceder a este quiz
          </p>
          <Link
            href={`/formacion/${course.slug}`}
            className="mt-4 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
          >
            Volver al curso
          </Link>
        </section>
      </main>
    );
  }

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", course.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!enrollment) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">
            Debes inscribirte para acceder a este quiz
          </p>
          <Link
            href={`/formacion/${course.slug}`}
            className="mt-4 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
          >
            Volver al curso
          </Link>
        </section>
      </main>
    );
  }

  const questionsWithOptions = (questions || []).map((question) => ({
    ...question,
    options: (options || []).filter((option) => option.question_id === question.id),
  }));

  const { data: existingAttempts, error: existingAttemptError } = await supabase
    .from("quiz_attempts")
    .select("score,total_questions,created_at")
    .eq("quiz_id", quiz.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingAttemptError) {
    return <main className="p-10">Error cargando intento del quiz.</main>;
  }

  const existingAttempt = existingAttempts?.[0] ?? null;

  const savedPercentage = existingAttempt?.total_questions
    ? Math.round((existingAttempt.score / existingAttempt.total_questions) * 100)
    : 0;
  const passed = savedPercentage >= 60;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <section className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-gray-200 pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            {course.title}
          </p>
          <h1 className="mb-5 text-3xl font-bold leading-tight text-gray-950 md:text-4xl">
            {quiz.title}
          </h1>

          <Link
            href={`/formacion/${course.slug}`}
            className="inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
          >
            Volver al curso
          </Link>
        </header>

        {existingAttempt ? (
          <div className="rounded-2xl bg-white px-6 py-8 shadow-sm">
            <p className="text-lg font-bold text-gray-950">
              Ya respondiste este quiz
            </p>
            <p className="mt-4 text-sm font-semibold text-gray-700">
              Resultado: {existingAttempt.score} de {existingAttempt.total_questions}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              Porcentaje: {savedPercentage}%
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              {passed ? "Aprobaste ✅" : "No aprobaste ❌"}
            </p>
          </div>
        ) : questionsWithOptions.length ? (
          <QuizResponseForm quizId={quiz.id} questions={questionsWithOptions} />
        ) : (
          <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
            Este quiz aún no tiene preguntas disponibles.
          </div>
        )}
      </section>
    </main>
  );
}
