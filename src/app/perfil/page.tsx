import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildCourseProgressState,
  getApprovedQuizIds,
} from "@/lib/course-progress";
import ProfileForm from "./ProfileForm";

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
    { data: publishedQuizzes, error: quizzesError },
  ] = courseIds.length
    ? await Promise.all([
        supabase
          .from("lessons")
          .select('id,course_id,"order"')
          .in("course_id", courseIds),
        supabase
          .from("quizzes")
          .select("id,course_id,lesson_id")
          .in("course_id", courseIds)
          .eq("status", "published"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (lessonsError || quizzesError) {
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

  const approvedQuizIds = getApprovedQuizIds(quizAttempts || []);
  const enrolledCoursesCount = courseIds.length;
  let completedCoursesCount = 0;

  for (const courseId of courseIds) {
    const progressState = buildCourseProgressState({
      lessons: (lessonsByCourse.get(courseId) || []).map((lesson) => ({
        id: lesson.id,
        order: lesson.order,
      })),
      quizzes: (quizzesByCourse.get(courseId) || []).map((quiz) => ({
        id: quiz.id,
        lesson_id: quiz.lesson_id,
      })),
      attempts: quizAttempts || [],
      isEnrolled: true,
    });

    if (progressState.certificateAvailable) {
      completedCoursesCount += 1;
    }
  }

  return (
    <main className="premium-page py-12">
      <div className="site-shell-wide">
      <header className="page-hero mb-10">
        <div className="hero-inner p-7 md:p-10">
        <p className="kicker">
          Mi cuenta
        </p>
        <h1 className="section-title mt-3 text-4xl md:text-5xl">
          Perfil de usuario
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
          Administra tus datos personales, consulta tu avance y mantén segura tu
          cuenta.
        </p>
        </div>
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
          <article className="premium-surface rounded-[30px] p-6">
            <p className="kicker">
              Seguridad
            </p>
            <h2 className="section-title mt-2 text-3xl text-gray-950">
              Cambia tu contraseña
            </h2>
            <p className="muted-copy mt-3 text-sm">
              Si necesitas actualizar tu contraseña, puedes iniciar el proceso de
              recuperación de forma segura.
            </p>
            <Link
              href="/recuperar-password"
              className="btn-secondary mt-5"
            >
              Cambiar contraseña
            </Link>
          </article>

          <article className="premium-surface rounded-[30px] p-6">
            <p className="kicker">
              Progreso
            </p>
            <h2 className="section-title mt-2 text-3xl text-gray-950">
              Resumen de formación
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f6f1e8] p-4">
                <p className="font-display text-3xl font-extrabold text-[var(--ivbcc-navy)]">
                  {enrolledCoursesCount}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Cursos inscritos
                </p>
              </div>

              <div className="rounded-2xl bg-[#f6f1e8] p-4">
                <p className="font-display text-3xl font-extrabold text-[var(--ivbcc-navy)]">
                  {completedCoursesCount}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Cursos completados
                </p>
              </div>

              <div className="rounded-2xl bg-[#f6f1e8] p-4">
                <p className="font-display text-3xl font-extrabold text-[var(--ivbcc-navy)]">
                  {approvedQuizIds.size}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Quizzes aprobados
                </p>
              </div>
            </div>

            <Link
              href="/mis-cursos"
              className="btn-ghost mt-6"
            >
              Ir a Mis Cursos
            </Link>
          </article>
        </div>
      </section>
      </div>
    </main>
  );
}
