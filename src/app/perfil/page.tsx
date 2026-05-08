import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ProfileForm from "./ProfileForm";

function getApprovedQuizIds(
  attempts: Array<{ quiz_id: string; score: number; total_questions: number }>
) {
  const latestAttemptsByQuiz = new Map<
    string,
    { score: number; total_questions: number }
  >();

  for (const attempt of attempts) {
    if (!latestAttemptsByQuiz.has(attempt.quiz_id)) {
      latestAttemptsByQuiz.set(attempt.quiz_id, {
        score: attempt.score,
        total_questions: attempt.total_questions,
      });
    }
  }

  return new Set(
    [...latestAttemptsByQuiz.entries()]
      .filter(([, attempt]) => {
        const percentage = attempt.total_questions
          ? Math.round((attempt.score / attempt.total_questions) * 100)
          : 0;

        return percentage >= 60;
      })
      .map(([quizId]) => quizId)
  );
}

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,age,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return <main className="p-10">Error cargando tu perfil.</main>;
  }

  let profile = existingProfile;

  if (!profile) {
    const metadata = user.user_metadata || {};
    const firstName =
      String(metadata.nombre || metadata.first_name || metadata.full_name || "").trim();
    const lastName =
      String(metadata.apellidos || metadata.last_name || "").trim();

    const { data: createdProfile, error: createProfileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        role: "user",
        first_name: firstName,
        last_name: lastName,
        age: null,
      })
      .select("id,first_name,last_name,age,role")
      .maybeSingle();

    if (createProfileError || !createdProfile) {
      return <main className="p-10">No pudimos inicializar tu perfil.</main>;
    }

    profile = createdProfile;
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("course_enrollments")
    .select("course_id")
    .eq("user_id", user.id);

  if (enrollmentsError) {
    return <main className="p-10">Error cargando tu progreso.</main>;
  }

  const courseIds = Array.from(
    new Set((enrollments || []).map((enrollment) => enrollment.course_id).filter(Boolean))
  );

  const [
    { data: lessons, error: lessonsError },
    { data: progress, error: progressError },
    { data: publishedQuizzes, error: quizzesError },
  ] = courseIds.length
    ? await Promise.all([
        supabase
          .from("lessons")
          .select("id,course_id")
          .in("course_id", courseIds),
        supabase
          .from("course_progress")
          .select("course_id,lesson_id,completed")
          .eq("user_id", user.id)
          .in("course_id", courseIds)
          .eq("completed", true),
        supabase
          .from("quizzes")
          .select("id,course_id")
          .in("course_id", courseIds)
          .eq("status", "published"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (lessonsError || progressError || quizzesError) {
    return <main className="p-10">Error cargando tu progreso.</main>;
  }

  const quizIds = Array.from(
    new Set((publishedQuizzes || []).map((quiz) => quiz.id).filter(Boolean))
  );

  const { data: quizAttempts, error: quizAttemptsError } = quizIds.length
    ? await supabase
        .from("quiz_attempts")
        .select("quiz_id,score,total_questions,created_at")
        .eq("user_id", user.id)
        .in("quiz_id", quizIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (quizAttemptsError) {
    return <main className="p-10">Error cargando tus quizzes.</main>;
  }

  const lessonsByCourse = new Map<string, Set<string>>();
  const completedLessonsByCourse = new Map<string, Set<string>>();
  const quizzesByCourse = new Map<string, Set<string>>();

  for (const lesson of lessons || []) {
    const current = lessonsByCourse.get(lesson.course_id) || new Set<string>();
    current.add(lesson.id);
    lessonsByCourse.set(lesson.course_id, current);
  }

  for (const item of progress || []) {
    const current =
      completedLessonsByCourse.get(item.course_id) || new Set<string>();
    current.add(item.lesson_id);
    completedLessonsByCourse.set(item.course_id, current);
  }

  for (const quiz of publishedQuizzes || []) {
    const current = quizzesByCourse.get(quiz.course_id) || new Set<string>();
    current.add(quiz.id);
    quizzesByCourse.set(quiz.course_id, current);
  }

  const approvedQuizIds = getApprovedQuizIds(quizAttempts || []);
  const enrolledCoursesCount = courseIds.length;
  let completedCoursesCount = 0;

  for (const courseId of courseIds) {
    const totalLessons = lessonsByCourse.get(courseId)?.size || 0;
    const completedLessons =
      completedLessonsByCourse.get(courseId)?.size || 0;
    const courseQuizIds = quizzesByCourse.get(courseId) || new Set<string>();
    const allCourseQuizzesApproved = [...courseQuizIds].every((quizId) =>
      approvedQuizIds.has(quizId)
    );
    const allLessonsCompleted =
      totalLessons > 0 && completedLessons === totalLessons;

    if (allLessonsCompleted && allCourseQuizzesApproved) {
      completedCoursesCount += 1;
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
          Mi cuenta
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950 md:text-4xl">
          Perfil de usuario
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Administra tus datos personales, consulta tu avance y mantén segura tu
          cuenta.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <ProfileForm
          initialProfile={{
            id: profile.id,
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            age: profile.age ? String(profile.age) : "",
            role: profile.role || "user",
            email: user.email || "",
          }}
        />

        <div className="space-y-6">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
              Seguridad
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">
              Cambia tu contraseña
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Si necesitas actualizar tu contraseña, puedes iniciar el proceso de
              recuperación de forma segura.
            </p>
            <Link
              href="/recuperar-password"
              className="mt-5 inline-flex rounded-lg bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Cambiar contraseña
            </Link>
          </article>

          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
              Progreso
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">
              Resumen de formación
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-3xl font-bold text-gray-950">
                  {enrolledCoursesCount}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Cursos inscritos
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-3xl font-bold text-gray-950">
                  {completedCoursesCount}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Cursos completados
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-3xl font-bold text-gray-950">
                  {approvedQuizIds.size}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Quizzes aprobados
                </p>
              </div>
            </div>

            <Link
              href="/mis-cursos"
              className="mt-6 inline-flex rounded-lg border border-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
            >
              Ir a Mis Cursos
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
