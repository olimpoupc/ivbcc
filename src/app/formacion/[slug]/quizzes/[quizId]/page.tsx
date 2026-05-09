import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  QUIZ_PASSING_PERCENTAGE,
  buildCourseProgressState,
  getQuizPercentage,
} from "@/lib/course-progress";
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
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Acceso restringido</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950">
            Debes inscribirte para acceder a este quiz
          </h1>
          <Link
            href={`/formacion/${course.slug}`}
            className="btn-primary mt-6"
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
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Formación IVBCC</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950">
            Debes inscribirte para acceder a este quiz
          </h1>
          <Link
            href={`/formacion/${course.slug}`}
            className="btn-primary mt-6"
          >
            Volver al curso
          </Link>
        </section>
      </main>
    );
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select('id,"order"')
    .eq("course_id", course.id)
    .order("order", { ascending: true });

  if (lessonsError) {
    return <main className="p-10">Error cargando lecciones.</main>;
  }

  const { data: allPublishedQuizzes, error: allPublishedQuizzesError } =
    await supabase
      .from("quizzes")
      .select("id,lesson_id")
      .eq("course_id", course.id)
      .eq("status", "published");

  if (allPublishedQuizzesError) {
    return <main className="p-10">Error cargando quizzes.</main>;
  }

  const publishedQuizIds = (allPublishedQuizzes || []).map((publishedQuiz) => publishedQuiz.id);
  const { data: quizAttempts, error: existingAttemptError } =
    publishedQuizIds.length
      ? await supabase
          .from("quiz_attempts")
          .select("quiz_id,score,total_questions,created_at")
          .eq("user_id", user.id)
          .in("quiz_id", publishedQuizIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (existingAttemptError) {
    return <main className="p-10">Error cargando intentos del quiz.</main>;
  }

  const progressState = buildCourseProgressState({
    lessons: (lessons || []).map((lesson) => ({
      id: lesson.id,
      order: lesson.order,
    })),
    quizzes: (allPublishedQuizzes || []).map((publishedQuiz) => ({
      id: publishedQuiz.id,
      lesson_id: publishedQuiz.lesson_id,
    })),
    attempts: quizAttempts || [],
    isEnrolled: true,
  });

  const isFinalQuiz = !quiz.lesson_id;
  const lessonState = quiz.lesson_id
    ? progressState.lessonStateById.get(quiz.lesson_id)
    : null;

  if (quiz.lesson_id && !lessonState?.isUnlocked) {
    return (
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Quiz bloqueado</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950">
            Debes completar la lección anterior.
          </h1>
          <p className="muted-copy mt-4 text-sm">
            Aprueba el quiz de la lección previa para desbloquear este quiz.
          </p>
          <Link
            href={`/formacion/${course.slug}`}
            className="btn-primary mt-6"
          >
            Volver al curso
          </Link>
        </section>
      </main>
    );
  }

  if (isFinalQuiz && !progressState.finalQuizUnlocked) {
    return (
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Quiz final bloqueado</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950">
            Completa todas las lecciones primero.
          </h1>
          <p className="muted-copy mt-4 text-sm">
            El quiz final se habilita cuando todos los quizzes de lección están aprobados.
          </p>
          <Link
            href={`/formacion/${course.slug}`}
            className="btn-primary mt-6"
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

  const existingAttempt = progressState.latestAttemptByQuiz.get(quiz.id) ?? null;
  const savedPercentage = getQuizPercentage(existingAttempt);
  const passed = savedPercentage >= QUIZ_PASSING_PERCENTAGE;

  return (
    <main className="premium-page py-12">
      <section className="site-shell max-w-4xl">
        <header className="page-hero mb-8">
          <div className="hero-inner p-7 md:p-10">
          <p className="kicker">
            {course.title}
          </p>
          <h1 className="section-title mt-4 max-w-3xl text-4xl md:text-5xl">
            {quiz.title}
          </h1>

          <Link
            href={`/formacion/${course.slug}`}
            className="btn-ghost mt-7 border-white/20 bg-white/10 text-white hover:bg-white/15"
          >
            Volver al curso
          </Link>
          </div>
        </header>

        {passed && existingAttempt ? (
          <div className="premium-surface rounded-[28px] px-6 py-8">
            <p className="kicker">
              Ya respondiste este quiz
            </p>
            <h2 className="section-title mt-3 text-3xl text-gray-950">
              {passed ? "Aprobaste" : "No aprobaste"}
            </h2>
            <p className="mt-4 text-sm font-semibold text-gray-700">
              Resultado: {existingAttempt.score} de {existingAttempt.total_questions}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              Porcentaje: {savedPercentage}%
            </p>
            <Link
              href={`/formacion/${course.slug}`}
              className="btn-primary mt-6"
            >
              Volver al curso
            </Link>
          </div>
        ) : questionsWithOptions.length ? (
          <>
          {existingAttempt ? (
            <div className="form-note mb-6 border-amber-200 bg-amber-50/80 text-amber-800">
              Tu último intento fue de {savedPercentage}%. Puedes intentarlo nuevamente.
            </div>
          ) : null}
          <QuizResponseForm quizId={quiz.id} questions={questionsWithOptions} />
          </>
        ) : (
          <div className="premium-surface rounded-[28px] px-6 py-12 text-center text-sm text-slate-500">
            Este quiz aún no tiene preguntas disponibles.
          </div>
        )}
      </section>
    </main>
  );
}
