import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import TrackedLink from "@/components/analytics/TrackedLink";
import YouTubeEmbed from "@/components/media/YouTubeEmbed";
import {
  QUIZ_PASSING_PERCENTAGE,
  buildCourseProgressState,
  getQuizPercentage,
} from "@/lib/course-progress";

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
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Acceso restringido</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950">
            Debes inscribirte para acceder a esta lección
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
            Debes inscribirte para acceder a esta lección
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

  const { data: allPublishedQuizzes, error: lessonQuizzesError } = await supabase
    .from("quizzes")
    .select("id,title,lesson_id")
    .eq("course_id", course.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (lessonQuizzesError) {
    return <main className="p-10">Error cargando quizzes.</main>;
  }

  const publishedQuizIds = (allPublishedQuizzes || []).map((quiz) => quiz.id);
  const { data: quizAttempts, error: lessonQuizAttemptsError } =
    publishedQuizIds.length
      ? await supabase
          .from("quiz_attempts")
          .select("quiz_id,score,total_questions,created_at")
          .eq("user_id", user.id)
          .in("quiz_id", publishedQuizIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (lessonQuizAttemptsError) {
    return <main className="p-10">Error cargando intentos del quiz.</main>;
  }

  const progressState = buildCourseProgressState({
    lessons: (lessons || []).map((courseLesson) => ({
      id: courseLesson.id,
      order: courseLesson.order,
    })),
    quizzes: (allPublishedQuizzes || []).map((quiz) => ({
      id: quiz.id,
      lesson_id: quiz.lesson_id,
    })),
    attempts: quizAttempts || [],
    isEnrolled: true,
  });
  const lessonState = progressState.lessonStateById.get(lesson.id);
  const lessonQuizzes = (allPublishedQuizzes || []).filter(
    (quiz) => quiz.lesson_id === lesson.id
  );

  if (!lessonState?.isUnlocked) {
    return (
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Lección bloqueada</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950">
            Debes completar la lección anterior.
          </h1>
          <p className="muted-copy mt-4 text-sm">
            Aprueba el quiz obligatorio de la lección previa para desbloquear este contenido.
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

  function getQuizStatus(quizId: string) {
    const latestAttempt = progressState.latestAttemptByQuiz.get(quizId);

    if (!latestAttempt) {
      return {
        label: "Pendiente",
        className: "bg-yellow-50 text-yellow-800 border-yellow-200",
      };
    }

    const percentage = getQuizPercentage(latestAttempt);

    if (percentage >= QUIZ_PASSING_PERCENTAGE) {
      return {
        label: "Aprobado",
        className: "bg-green-50 text-green-700 border-green-200",
      };
    }

    return {
      label: "Reprobado",
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return (
    <main className="premium-page py-12">
      <section className="site-shell max-w-4xl">
        <header className="page-hero mb-8">
          <div className="hero-inner p-7 md:p-10">
          <p className="kicker">
            {course.title}
          </p>
          <h1 className="section-title mt-4 max-w-3xl text-4xl md:text-5xl">
            {lesson.title}
          </h1>

          <Link
            href={`/formacion/${course.slug}`}
            className="btn-ghost mt-7 border-white/20 bg-white/10 text-white hover:bg-white/15"
          >
            Volver al curso
          </Link>
          </div>
        </header>

        {videoEmbedUrl && (
          <div className="mb-8 overflow-hidden rounded-[30px] bg-black shadow-xl">
            <YouTubeEmbed src={videoEmbedUrl} title={lesson.title} />
          </div>
        )}

        <article className="premium-surface prose-premium whitespace-pre-line rounded-[30px] p-8">
          {lesson.content}
        </article>

        <div className="premium-surface mt-8 space-y-4 rounded-[28px] p-6">
          <p className="kicker">Progreso</p>
          {lessonState.isCompleted ? (
            <p className="form-note border-green-200 bg-green-50/80 text-green-800">
              ✅ Lección completada por quiz aprobado.
            </p>
          ) : lessonState.missingRequiredQuiz ? (
            <p className="form-note border-amber-200 bg-amber-50/80 text-amber-800">
              Esta lección necesita un quiz publicado para poder completarse.
            </p>
          ) : (
            <p className="form-note">
              Responde y aprueba el quiz obligatorio para completar esta lección y desbloquear la siguiente.
            </p>
          )}

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
                className="btn-secondary"
              >
                Descargar material
              </TrackedLink>
            </div>
          )}
        </div>

        <section className="mt-10 space-y-4">
          <h2 className="section-title text-3xl text-gray-950">
            Quiz de esta lección
          </h2>

          {lessonQuizzes.length ? (
            <div className="space-y-3">
              {!lessonState.isCompleted && (
                <div className="form-note border-amber-200 bg-amber-50/80 text-amber-800">
                  Debes aprobar el quiz de esta lección para registrar progreso.
                </div>
              )}

              {lessonQuizzes.map((quiz) => (
                <article
                  key={quiz.id}
                  className="premium-surface flex flex-col gap-4 rounded-[24px] px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="section-title text-xl text-gray-950">
                      {quiz.title}
                    </h3>
                    <div className="mt-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getQuizStatus(quiz.id).className}`}
                      >
                        {getQuizStatus(quiz.id).label}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/formacion/${course.slug}/quizzes/${quiz.id}`}
                    className="btn-ghost"
                  >
                    Responder quiz
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="premium-surface rounded-[28px] px-6 py-12 text-center text-sm text-slate-500">
              Esta lección aún no tiene quizzes publicados.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
