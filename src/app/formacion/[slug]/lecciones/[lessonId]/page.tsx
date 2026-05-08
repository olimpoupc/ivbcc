import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import TrackedLink from "@/components/analytics/TrackedLink";
import LessonProgressButton from "./LessonProgressButton";

type Props = {
  params: Promise<{
    slug: string;
    lessonId: string;
  }>;
};

function getYouTubeEmbedUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.replace("/", "").trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtube.com"
    ) {
      const videoId = url.searchParams.get("v")?.trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

export default async function LeccionDetallePage({ params }: Props) {
  const { slug, lessonId } = await params;
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

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("course_id", course.id)
    .maybeSingle();

  if (lessonError || !lesson) {
    return <main className="p-10">Lección no encontrada.</main>;
  }

  const videoEmbedUrl = getYouTubeEmbedUrl(lesson.video_url);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-600">
            Debes inscribirte para acceder a esta lección
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
            Debes inscribirte para acceder a esta lección
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

  const { data: progress } = await supabase
    .from("course_progress")
    .select("id,completed")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  const { data: lessonQuizzes, error: lessonQuizzesError } = await supabase
    .from("quizzes")
    .select("id,title")
    .eq("course_id", course.id)
    .eq("lesson_id", lesson.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (lessonQuizzesError) {
    return <main className="p-10">Error cargando quizzes.</main>;
  }

  const lessonQuizIds = (lessonQuizzes || []).map((quiz) => quiz.id);
  const { data: lessonQuizAttempts, error: lessonQuizAttemptsError } =
    lessonQuizIds.length
      ? await supabase
          .from("quiz_attempts")
          .select("quiz_id,score,total_questions,created_at")
          .eq("user_id", user.id)
          .in("quiz_id", lessonQuizIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (lessonQuizAttemptsError) {
    return <main className="p-10">Error cargando intentos del quiz.</main>;
  }

  const latestLessonAttemptByQuiz = new Map<
    string,
    { score: number; total_questions: number }
  >();

  for (const attempt of lessonQuizAttempts || []) {
    if (!latestLessonAttemptByQuiz.has(attempt.quiz_id)) {
      latestLessonAttemptByQuiz.set(attempt.quiz_id, {
        score: attempt.score,
        total_questions: attempt.total_questions,
      });
    }
  }

  const allLessonQuizzesApproved =
    !lessonQuizIds.length ||
    lessonQuizIds.every((quizId) => {
      const attempt = latestLessonAttemptByQuiz.get(quizId);

      if (!attempt) {
        return false;
      }

      const percentage = attempt.total_questions
        ? Math.round((attempt.score / attempt.total_questions) * 100)
        : 0;

      return percentage >= 60;
    });
  const mustApproveLessonQuiz = lessonQuizIds.length > 0 && !allLessonQuizzesApproved;

  const isCompleted = Boolean(progress?.completed);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <section className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-gray-200 pb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            {course.title}
          </p>
          <h1 className="mb-5 text-3xl font-bold leading-tight text-gray-950 md:text-4xl">
            {lesson.title}
          </h1>

          <Link
            href={`/formacion/${course.slug}`}
            className="inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
          >
            Volver al curso
          </Link>
        </header>

        {videoEmbedUrl && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-black shadow-sm">
            <div className="relative aspect-video w-full">
              <iframe
                src={videoEmbedUrl}
                title={lesson.title}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        )}

        <article className="whitespace-pre-line text-lg leading-relaxed text-gray-800">
          {lesson.content}
        </article>

        <div className="mt-8 space-y-4">
          <LessonProgressButton
            courseId={course.id}
            lessonId={lesson.id}
            initialCompleted={isCompleted}
            canMarkComplete={allLessonQuizzesApproved}
            blockedMessage="Debes aprobar el quiz de esta lección antes de marcarla como completada."
          />

          {lesson.material_url && (
            <div>
              <TrackedLink
                href={lesson.material_url}
                target="_blank"
                rel="noreferrer"
                eventName="download_resource"
                eventParams={{
                  type: "lesson_material",
                  lesson_id: lesson.id,
                }}
                className="inline-block rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Descargar material
              </TrackedLink>
            </div>
          )}
        </div>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold text-gray-950">
            Quiz de esta lección
          </h2>

          {lessonQuizzes?.length ? (
            <div className="space-y-3">
              {mustApproveLessonQuiz && (
                <div className="rounded-2xl bg-yellow-50 px-5 py-4 text-sm font-medium text-yellow-800">
                  Debes aprobar el quiz de esta lección antes de marcarla como completada.
                </div>
              )}

              {lessonQuizzes.map((quiz) => (
                <article
                  key={quiz.id}
                  className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm"
                >
                  <div>
                    <h3 className="text-lg font-bold text-gray-950">
                      {quiz.title}
                    </h3>
                  </div>

                  <Link
                    href={`/formacion/${course.slug}/quizzes/${quiz.id}`}
                    className="rounded-lg border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)]"
                  >
                    Responder quiz
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
              Esta lección aún no tiene quizzes publicados.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
