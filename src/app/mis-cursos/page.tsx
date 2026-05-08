import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function MisCursosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-950">Mis cursos</h1>
          <p className="mt-4 text-sm font-medium text-gray-600">
            Debes iniciar sesión para ver tus cursos
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
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
      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-gray-950">Mis cursos</h1>
          <p className="mt-4 text-sm font-medium text-gray-600">
            Aún no estás inscrito en ningún curso.
          </p>
          <Link
            href="/formacion"
            className="mt-4 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
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

  const { data: progress, error: progressError } = await supabase
    .from("course_progress")
    .select("course_id,lesson_id,completed")
    .eq("user_id", user.id)
    .in("course_id", courseIds)
    .eq("completed", true);

  if (progressError) {
    return <main className="p-10">Error cargando el progreso.</main>;
  }

  const lessonsByCourse = new Map<string, number>();
  const completedByCourse = new Map<string, Set<string>>();

  for (const lesson of lessons || []) {
    lessonsByCourse.set(
      lesson.course_id,
      (lessonsByCourse.get(lesson.course_id) || 0) + 1
    );
  }

  for (const item of progress || []) {
    const current = completedByCourse.get(item.course_id) || new Set<string>();
    current.add(item.lesson_id);
    completedByCourse.set(item.course_id, current);
  }

  const coursesById = new Map((courses || []).map((course) => [course.id, course]));
  const enrolledCourses = courseIds
    .map((courseId) => coursesById.get(courseId))
    .filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-950 md:text-4xl">
          Mis cursos
        </h1>
        <p className="mt-2 text-gray-600">
          Consulta tus cursos inscritos y revisa cómo va tu avance.
        </p>
      </header>

      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {enrolledCourses.map((course) => {
          if (!course) return null;

          const totalLessons = lessonsByCourse.get(course.id) || 0;
          const completedLessons = completedByCourse.get(course.id)?.size || 0;
          const progressPercentage =
            totalLessons > 0
              ? Math.round((completedLessons / totalLessons) * 100)
              : 0;
          const isCompleted = totalLessons > 0 && completedLessons === totalLessons;

          return (
            <article
              key={course.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg"
            >
              {course.image_url ? (
                <div className="relative h-48 w-full bg-gray-100">
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
                  <h2 className="text-xl font-bold text-gray-950">
                    {course.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                    {course.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Progreso: {progressPercentage}%
                  </p>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[var(--ivbcc-gold)] transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                <p
                  className={`text-sm font-semibold ${
                    isCompleted ? "text-green-700" : "text-gray-600"
                  }`}
                >
                  {isCompleted ? "Curso completado 🎉" : "En progreso"}
                </p>

                <Link
                  href={`/formacion/${course.slug}`}
                  className="inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
                >
                  Ver curso
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
