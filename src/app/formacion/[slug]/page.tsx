import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildContentMetadata, resolveSeoDescription, seoConfig } from "@/lib/seo";
import CourseEnrollButton from "./CourseEnrollButton";
import CourseCertificateButton from "./CourseCertificateButton";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: course } = await supabase
    .from("courses")
    .select("title,description,image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return buildContentMetadata({
    title: course?.title || "Formación",
    description: resolveSeoDescription(course?.description),
    path: `/formacion/${slug}`,
    image: course?.image_url || seoConfig.logoPath,
    type: "website",
    keywords: ["formación IVBCC", "cursos cristianos", "discipulado"],
  });
}

export default async function CursoDetallePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !course) {
    return <main className="p-10">Curso no encontrado.</main>;
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .order("order", { ascending: true });

  if (lessonsError) {
    return <main className="p-10">Error cargando lecciones.</main>;
  }

  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("course_id", course.id)
    .is("lesson_id", null)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (quizzesError) {
    return <main className="p-10">Error cargando quizzes.</main>;
  }

  const { data: allPublishedQuizzes, error: allPublishedQuizzesError } =
    await supabase
      .from("quizzes")
      .select("id,lesson_id,title")
      .eq("course_id", course.id)
      .eq("status", "published");

  if (allPublishedQuizzesError) {
    return <main className="p-10">Error cargando quizzes.</main>;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("first_name,last_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: enrollment } = user
    ? await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const isEnrolled = Boolean(enrollment);

  const { data: progress } = user && isEnrolled
    ? await supabase
        .from("course_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .eq("completed", true)
    : { data: [] };

  const publishedQuizIds = (allPublishedQuizzes || []).map((quiz) => quiz.id);
  const { data: quizAttempts, error: quizAttemptsError } =
    user && isEnrolled && publishedQuizIds.length
      ? await supabase
          .from("quiz_attempts")
          .select("quiz_id,score,total_questions,created_at")
          .eq("user_id", user.id)
          .in("quiz_id", publishedQuizIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  if (quizAttemptsError) {
    return <main className="p-10">Error cargando intentos de quizzes.</main>;
  }

  const totalLessons = lessons?.length || 0;
  const latestAttemptByQuiz = new Map<string, { score: number; total_questions: number }>();

  for (const attempt of quizAttempts || []) {
    if (!latestAttemptByQuiz.has(attempt.quiz_id)) {
      latestAttemptByQuiz.set(attempt.quiz_id, {
        score: attempt.score,
        total_questions: attempt.total_questions,
      });
    }
  }

  const approvedQuizIds = new Set(
    Array.from(latestAttemptByQuiz.entries())
      .filter(([, attempt]) => {
        const percentage = attempt.total_questions
          ? Math.round((attempt.score / attempt.total_questions) * 100)
          : 0;
        return percentage >= 60;
      })
      .map(([quizId]) => quizId)
  );
  const lessonStatusById = new Map<
    string,
    "completed" | "pending" | "blocked"
  >();

  const publishedLessonQuizIdsByLesson = new Map<string, string[]>();

  for (const quiz of allPublishedQuizzes || []) {
    if (!quiz.lesson_id) continue;

    const current = publishedLessonQuizIdsByLesson.get(quiz.lesson_id) || [];
    current.push(quiz.id);
    publishedLessonQuizIdsByLesson.set(quiz.lesson_id, current);
  }

  const effectiveCompletedLessonIds = new Set(
    (progress || [])
      .map((item) => item.lesson_id)
      .filter((lessonId) => {
        const lessonQuizIds = publishedLessonQuizIdsByLesson.get(lessonId) || [];

        if (!lessonQuizIds.length) {
          return true;
        }

        return lessonQuizIds.every((quizId) => approvedQuizIds.has(quizId));
      })
  );

  for (const lesson of lessons || []) {
    if (!isEnrolled) {
      lessonStatusById.set(lesson.id, "blocked");
      continue;
    }

    if (effectiveCompletedLessonIds.has(lesson.id)) {
      lessonStatusById.set(lesson.id, "completed");
      continue;
    }

    lessonStatusById.set(lesson.id, "pending");
  }

  const completedLessons = effectiveCompletedLessonIds.size;
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const allLessonsCompleted = totalLessons > 0 && completedLessons === totalLessons;
  const allQuizzesApproved =
    publishedQuizIds.length === 0 || publishedQuizIds.every((quizId) => approvedQuizIds.has(quizId));
  const isCourseCompleted = isEnrolled && allLessonsCompleted && allQuizzesApproved;
  const certificateStudentName =
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Estudiante IVBCC";

  function getQuizStatus(quizId: string) {
    const latestAttempt = latestAttemptByQuiz.get(quizId);

    if (!latestAttempt) {
      return {
        label: "Pendiente",
        className: "bg-yellow-50 text-yellow-800 border-yellow-200",
      };
    }

    const percentage = latestAttempt.total_questions
      ? Math.round((latestAttempt.score / latestAttempt.total_questions) * 100)
      : 0;

    if (percentage >= 60) {
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

  function getLessonStatus(lessonId: string) {
    const status = lessonStatusById.get(lessonId) || "pending";

    if (status === "completed") {
      return {
        label: "Completada",
        className: "bg-green-50 text-green-700 border-green-200",
      };
    }

    if (status === "blocked") {
      return {
        label: "Bloqueada",
        className: "bg-gray-100 text-gray-500 border-gray-200",
      };
    }

    return {
      label: "Pendiente",
      className: "bg-yellow-50 text-yellow-800 border-yellow-200",
    };
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {course.image_url ? (
        <div className="relative mb-10 h-72 w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
          <Image
            src={course.image_url}
            alt={course.title}
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      ) : (
        <EmptyImagePlaceholder
          label="IVBCC Formación"
          subtitle="Un espacio para aprender, avanzar y fortalecer la fe."
          variant="detail"
          className="mb-10 h-72 rounded-2xl shadow-sm"
        />
      )}

      <section className="mx-auto max-w-3xl">
        <header
          className={`mb-8 pb-8 ${
            course.image_url ? "border-b border-gray-200" : ""
          }`}
        >
          <h1
            className={`mb-5 text-3xl font-bold leading-tight md:text-4xl ${
              course.image_url ? "text-gray-950" : "text-gray-950"
            }`}
          >
            {course.title}
          </h1>

          <p className="text-lg leading-relaxed text-gray-600">
            {course.description}
          </p>

          <div className="mt-6 space-y-4">
            {!user ? (
              <div className="rounded-2xl bg-gray-50 px-5 py-4">
                <p className="text-sm font-medium text-gray-600">
                  Inicia sesión para inscribirte
                </p>
                <Link
                  href="/login"
                  className="mt-3 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
                >
                  Inicia sesión para inscribirte
                </Link>
              </div>
            ) : isEnrolled ? (
              <div className="rounded-2xl bg-green-50 px-5 py-4">
                <p className="text-sm font-semibold text-green-700">
                  Ya estás inscrito
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-gray-50 px-5 py-4">
                <CourseEnrollButton courseId={course.id} />
              </div>
            )}

            {isEnrolled ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  Progreso: {progressPercentage}%
                </p>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[var(--ivbcc-gold)] transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {isCourseCompleted && (
                  <div className="space-y-3 rounded-2xl bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
                    <p>Curso completado 🎉</p>
                    <CourseCertificateButton
                      courseTitle={course.title}
                      studentName={certificateStudentName}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-500">
                Inscríbete en este curso para desbloquear progreso, lecciones y quizzes.
              </p>
            )}
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-950">Lecciones</h2>

          {lessons?.length ? (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className={`rounded-2xl px-5 py-4 shadow-sm ${
                    isEnrolled ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Lección {lesson.order}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-gray-950">
                        {lesson.title}
                      </h3>

                      <div className="mt-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getLessonStatus(lesson.id).className}`}
                        >
                          {getLessonStatus(lesson.id).label}
                        </span>
                      </div>

                      {!isEnrolled && (
                        <p className="mt-2 text-sm font-medium text-gray-500">
                          Inscríbete para acceder a esta lección.
                        </p>
                      )}
                    </div>

                    {isEnrolled ? (
                      <Link
                        href={`/formacion/${course.slug}/lecciones/${lesson.id}`}
                        className="rounded-lg border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)]"
                      >
                        Ver
                      </Link>
                    ) : (
                      <span className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-400">
                        Bloqueada
                      </span>
                    )}
                  </div>

                  {isEnrolled &&
                    (publishedLessonQuizIdsByLesson.get(lesson.id) || []).length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Quizzes de la lección
                        </p>

                        <div className="mt-3 space-y-2">
                          {(allPublishedQuizzes || [])
                            .filter((quiz) => quiz.lesson_id === lesson.id)
                            .map((quiz) => {
                              const quizStatus = getQuizStatus(quiz.id);

                              return (
                                <div
                                  key={quiz.id}
                                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                                >
                                  <p className="text-sm font-medium text-gray-700">
                                    {quiz.title}
                                  </p>
                                  <span
                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${quizStatus.className}`}
                                  >
                                    {quizStatus.label}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
              Este curso aún no tiene lecciones.
            </div>
          )}
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold text-gray-950">Quizzes del curso</h2>

          {isEnrolled ? (
            quizzes?.length ? (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <article
                    key={quiz.id}
                    className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-950">
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
                      className="rounded-lg border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)]"
                    >
                      Responder quiz
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
                Este curso aún no tiene quizzes publicados.
              </div>
            )
          ) : (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm">
              Inscríbete en el curso para desbloquear los quizzes.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
