import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildContentMetadata, resolveSeoDescription, seoConfig } from "@/lib/seo";
import {
  toCertificateViewModel,
  type CourseCertificateRecord,
} from "@/lib/certificates";
import {
  QUIZ_PASSING_PERCENTAGE,
  buildCourseProgressState,
  getQuizPercentage,
} from "@/lib/course-progress";
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

  const progressState = buildCourseProgressState({
    lessons: (lessons || []).map((lesson) => ({
      id: lesson.id,
      order: lesson.order,
    })),
    quizzes: (allPublishedQuizzes || []).map((quiz) => ({
      id: quiz.id,
      lesson_id: quiz.lesson_id,
    })),
    attempts: quizAttempts || [],
    isEnrolled,
  });

  const { data: existingCertificate } = user && isEnrolled
    ? await supabase
        .from("course_certificates")
        .select("id,code,user_id,course_id,student_name,course_title,issued_at,status")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle()
    : { data: null };
  function getQuizStatus(quizId: string) {
    const latestAttempt = progressState.latestAttemptByQuiz.get(quizId);

    if (!latestAttempt) {
      return {
        label: "Pendiente",
        className: "bg-yellow-50 text-yellow-800 border-yellow-200",
      };
    }

    const percentage = latestAttempt.total_questions
      ? getQuizPercentage(latestAttempt)
      : 0;

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

  function getLessonStatus(lessonId: string) {
    const lessonState = progressState.lessonStateById.get(lessonId);

    if (lessonState?.isCompleted) {
      return {
        label: "✅ Completada",
        className: "bg-green-50 text-green-700 border-green-200",
      };
    }

    if (!lessonState?.isUnlocked) {
      return {
        label: "🔒 Bloqueada",
        className: "bg-[#f3eee4] text-slate-500 border-[#e8e2d6]",
      };
    }

    return {
      label: "▶ Disponible",
      className: "bg-yellow-50 text-yellow-800 border-yellow-200",
    };
  }

  return (
    <main className="premium-page">
      <div className="site-shell py-10">
      {course.image_url ? (
        <div className="media-frame mb-10 h-80 rounded-[30px] shadow-lg">
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
          className="mb-10 h-80 rounded-[30px] shadow-lg"
        />
      )}

      <section className="mx-auto max-w-3xl">
        <header
          className="premium-surface mb-8 rounded-[30px] p-8 md:p-10"
        >
          <h1
            className="section-title mb-5 text-4xl text-gray-950 md:text-5xl"
          >
            {course.title}
          </h1>

          <p className="muted-copy text-lg">
            {course.description}
          </p>

          <div className="mt-6 space-y-4">
            {!user ? (
              <div className="rounded-2xl bg-[#f6f1e8] px-5 py-4">
                <p className="text-sm font-medium text-gray-600">
                  Inicia sesión para inscribirte
                </p>
                <Link
                  href="/login"
                  className="btn-secondary mt-3"
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
              <div className="rounded-2xl bg-[#f6f1e8] px-5 py-4">
                <CourseEnrollButton courseId={course.id} />
              </div>
            )}

            {isEnrolled ? (
              <div className="space-y-3">
                <p className="text-sm font-extrabold text-[var(--ivbcc-navy)]">
                  Progreso: {progressState.progressPercentage}%
                </p>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#f3eee4]">
                  <div
                    className="h-full rounded-full bg-[var(--ivbcc-gold)] transition-all"
                    style={{ width: `${progressState.progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {progressState.completedLessons} de {progressState.totalLessons} lecciones completadas por quiz aprobado.
                </p>
                {progressState.certificateAvailable ? (
                  <div className="space-y-3 rounded-2xl bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
                    <p>Curso completado</p>
                    <CourseCertificateButton
                      courseId={course.id}
                      initialFirstName={profile?.first_name || ""}
                      initialLastName={profile?.last_name || ""}
                      userEmail={user?.email || ""}
                      initialCertificate={
                        existingCertificate
                          ? toCertificateViewModel(
                              existingCertificate as CourseCertificateRecord
                            )
                          : null
                      }
                    />
                  </div>
                ) : progressState.finalQuizUnlocked ? (
                  <p className="form-note">
                    Ya completaste las lecciones. Aprueba el quiz final para habilitar tu certificado.
                  </p>
                ) : (
                  <p className="form-note">
                    Aprueba el quiz obligatorio de cada lección para avanzar y desbloquear el quiz final.
                  </p>
                )}
              </div>
            ) : (
              <p className="form-note">
                Inscríbete en este curso para desbloquear progreso, lecciones y quizzes.
              </p>
            )}
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="section-title text-3xl text-gray-950">Lecciones</h2>

          {lessons?.length ? (
            <div className="space-y-3">
              {lessons.map((lesson) => {
                const lessonState = progressState.lessonStateById.get(lesson.id);
                const isLessonAccessible = Boolean(lessonState?.isUnlocked);

                return (
                  <article
                    key={lesson.id}
                    className={`premium-surface rounded-[24px] px-5 py-4 ${
                      isLessonAccessible ? "" : "opacity-70"
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
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          Inscríbete para acceder a esta lección.
                        </p>
                      )}
                      {isEnrolled && !isLessonAccessible && (
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          Debes aprobar el quiz de la lección anterior.
                        </p>
                      )}
                      {isEnrolled && lessonState?.missingRequiredQuiz && isLessonAccessible && (
                        <p className="mt-2 text-sm font-medium text-amber-700">
                          Esta lección necesita un quiz publicado para poder completarse.
                        </p>
                      )}
                    </div>

                    {isLessonAccessible ? (
                      <Link
                        href={`/formacion/${course.slug}/lecciones/${lesson.id}`}
                        className="btn-ghost"
                      >
                        Ver
                      </Link>
                    ) : (
                      <span className="btn-ghost pointer-events-none opacity-60">
                        Bloqueada
                      </span>
                    )}
                  </div>

                  {isEnrolled &&
                    (progressState.lessonQuizIdsByLesson.get(lesson.id) || []).length > 0 && (
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
                                  className="flex items-center justify-between rounded-2xl bg-[#f6f1e8] px-4 py-3"
                                >
                                  <p className="text-sm font-bold text-slate-700">
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
                );
              })}
            </div>
          ) : (
              <div className="premium-surface rounded-[28px] px-6 py-12 text-center text-sm text-slate-500">
                Este curso aún no tiene lecciones.
              </div>
          )}
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="section-title text-3xl text-gray-950">Quizzes del curso</h2>

          {isEnrolled ? (
            quizzes?.length ? (
              <div className="space-y-3">
                {quizzes.map((quiz) => {
                  const quizStatus = getQuizStatus(quiz.id);
                  const canOpenFinalQuiz = progressState.finalQuizUnlocked;

                  return (
                  <article
                  key={quiz.id}
                    className={`premium-surface flex flex-col gap-4 rounded-[24px] px-5 py-4 md:flex-row md:items-center md:justify-between ${
                      canOpenFinalQuiz ? "" : "opacity-70"
                    }`}
                  >
                    <div>
                      <h3 className="section-title text-xl text-gray-950">
                        {quiz.title}
                      </h3>
                      <div className="mt-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${quizStatus.className}`}
                        >
                          {quizStatus.label}
                        </span>
                      </div>
                      {!canOpenFinalQuiz && (
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          🔒 Se desbloquea al completar todas las lecciones.
                        </p>
                      )}
                    </div>

                    {canOpenFinalQuiz ? (
                      <Link
                        href={`/formacion/${course.slug}/quizzes/${quiz.id}`}
                        className="btn-ghost"
                      >
                        Responder quiz final
                      </Link>
                    ) : (
                      <span className="btn-ghost pointer-events-none opacity-60">
                        Bloqueado
                      </span>
                    )}
                  </article>
                  );
                })}
              </div>
            ) : (
              <div className="premium-surface rounded-[28px] px-6 py-12 text-center text-sm text-slate-500">
                Este curso aún no tiene quizzes publicados.
              </div>
            )
          ) : (
            <div className="premium-surface rounded-[28px] px-6 py-12 text-center text-sm text-slate-500">
              Inscríbete en el curso para desbloquear los quizzes.
            </div>
          )}
        </section>
      </section>
      </div>
    </main>
  );
}
