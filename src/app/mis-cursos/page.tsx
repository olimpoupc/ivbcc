import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildCourseProgressState } from "@/lib/course-progress";

export default async function MisCursosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Formación</p>
          <h1 className="section-title mt-3 text-4xl text-gray-950">Mis cursos</h1>
          <p className="muted-copy mt-4 text-sm">
            Debes iniciar sesión para ver tus cursos
          </p>
          <Link
            href="/login"
            className="btn-primary mt-6"
          >
            Ir al login
          </Link>
        </section>
      </main>
    );
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("course_enrollments")
    .select("course_id,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (enrollmentsError) {
    return <main className="p-10">Error cargando tus cursos.</main>;
  }

  const courseIds = (enrollments || []).map((enrollment) => enrollment.course_id);

  if (!courseIds.length) {
    return (
      <main className="premium-page py-12">
        <section className="premium-surface site-shell max-w-3xl rounded-[30px] px-6 py-12 text-center">
          <p className="kicker">Formación</p>
          <h1 className="section-title mt-3 text-4xl text-gray-950">Mis cursos</h1>
          <p className="muted-copy mt-4 text-sm">
            Aún no estás inscrito en ningún curso.
          </p>
          <Link
            href="/formacion"
            className="btn-primary mt-6"
          >
            Explorar formación
          </Link>
        </section>
      </main>
    );
  }

  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id,title,slug,description,image_url,status")
    .in("id", courseIds)
    .eq("status", "published");

  if (coursesError) {
    return <main className="p-10">Error cargando tus cursos.</main>;
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select('id,course_id,"order"')
    .in("course_id", courseIds);

  if (lessonsError) {
    return <main className="p-10">Error cargando el progreso.</main>;
  }

  const { data: publishedQuizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id,course_id,lesson_id")
    .eq("status", "published")
    .in("course_id", courseIds);

  if (quizzesError) {
    return <main className="p-10">Error cargando quizzes.</main>;
  }

  const quizIds = (publishedQuizzes || []).map((quiz) => quiz.id);
  const { data: quizAttempts, error: quizAttemptsError } = quizIds.length
    ? await supabase
        .from("quiz_attempts")
        .select("quiz_id,score,total_questions,created_at")
        .eq("user_id", user.id)
        .in("quiz_id", quizIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (quizAttemptsError) {
    return <main className="p-10">Error cargando intentos de quizzes.</main>;
  }

  const lessonsByCourse = new Map<string, typeof lessons>();
  const quizzesByCourse = new Map<string, typeof publishedQuizzes>();

  for (const lesson of lessons || []) {
    const current = lessonsByCourse.get(lesson.course_id) || [];
    current.push(lesson);
    lessonsByCourse.set(lesson.course_id, current);
  }

  for (const quiz of publishedQuizzes || []) {
    const current = quizzesByCourse.get(quiz.course_id) || [];
    current.push(quiz);
    quizzesByCourse.set(quiz.course_id, current);
  }

  const coursesById = new Map((courses || []).map((course) => [course.id, course]));
  const enrolledCourses = courseIds
    .map((courseId) => coursesById.get(courseId))
    .filter(Boolean);

  return (
    <main className="premium-page py-12">
      <div className="site-shell-wide">
      <header className="page-hero mb-10">
        <div className="hero-inner p-7 md:p-10">
        <p className="kicker">Mi formación</p>
        <h1 className="section-title mt-3 text-4xl md:text-5xl">
          Mis cursos
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
          Consulta tus cursos inscritos y revisa cómo va tu avance.
        </p>
        </div>
      </header>

      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {enrolledCourses.map((course) => {
          if (!course) return null;

          const progressState = buildCourseProgressState({
            lessons: (lessonsByCourse.get(course.id) || []).map((lesson) => ({
              id: lesson.id,
              order: lesson.order,
            })),
            quizzes: (quizzesByCourse.get(course.id) || []).map((quiz) => ({
              id: quiz.id,
              lesson_id: quiz.lesson_id,
            })),
            attempts: quizAttempts || [],
            isEnrolled: true,
          });

          return (
            <article
              key={course.id}
              className="editorial-card"
            >
              {course.image_url ? (
                <div className="media-frame h-48 w-full rounded-none">
                  <Image
                    src={course.image_url}
                    alt={course.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
              ) : (
                <EmptyImagePlaceholder
                  label="IVBCC Formación"
                  subtitle="Tu proceso de aprendizaje sigue aquí."
                  className="h-48"
                />
              )}

              <div className="space-y-4 p-6">
                <div>
                  <h2 className="section-title text-2xl text-gray-950">
                    {course.title}
                  </h2>
                  <p className="muted-copy mt-2 line-clamp-3 text-sm">
                    {course.description}
                  </p>
                </div>

                <div className="space-y-2">
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
                    {progressState.completedLessons} de {progressState.totalLessons} lecciones completadas
                  </p>
                </div>

                <p
                  className={`text-sm font-semibold ${
                    progressState.certificateAvailable ? "text-green-700" : "text-slate-600"
                  }`}
                >
                  {progressState.certificateAvailable ? "Curso completado" : "En progreso"}
                </p>

                <Link
                  href={`/formacion/${course.slug}`}
                  className="btn-ghost"
                >
                  Ver curso
                </Link>
              </div>
            </article>
          );
        })}
      </section>
      </div>
    </main>
  );
}
