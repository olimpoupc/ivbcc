import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildCertificateVerificationUrl,
  formatCertificateDate,
} from "@/lib/certificates";
import { buildCourseProgressState } from "@/lib/course-progress";
import RevokeCertificateButton from "./RevokeCertificateButton";

type Props = {
  searchParams: Promise<{
    course?: string;
  }>;
};

export default async function AdminCertificadosPage({ searchParams }: Props) {
  const { course: selectedCourseId = "all" } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id,title")
    .order("title", { ascending: true });
  const visibleCourseIds =
    selectedCourseId === "all"
      ? (courses || []).map((course) => course.id)
      : [selectedCourseId];

  let certificatesQuery = supabase
    .from("course_certificates")
    .select("id,code,user_id,student_name,course_title,course_id,issued_at,status")
    .order("issued_at", { ascending: false });

  if (selectedCourseId !== "all") {
    certificatesQuery = certificatesQuery.eq("course_id", selectedCourseId);
  }

  const { data: certificates, error } = await certificatesQuery;

  if (error) {
    return <main className="p-10">Error cargando certificados.</main>;
  }

  const totalCertificates = certificates?.length || 0;
  const validCertificates =
    certificates?.filter((certificate) => certificate.status === "valid").length || 0;
  const revokedCertificates =
    certificates?.filter((certificate) => certificate.status === "revoked").length || 0;
  const certificatesByCourse = new Map<string, number>();

  for (const certificate of certificates || []) {
    certificatesByCourse.set(
      certificate.course_title,
      (certificatesByCourse.get(certificate.course_title) || 0) + 1
    );
  }

  const [
    { data: enrollments },
    { data: lessons },
    { data: quizzes },
  ] = visibleCourseIds.length
    ? await Promise.all([
        supabase
          .from("course_enrollments")
          .select("user_id,course_id")
          .in("course_id", visibleCourseIds),
        supabase
          .from("lessons")
          .select('id,course_id,"order"')
          .in("course_id", visibleCourseIds),
        supabase
          .from("quizzes")
          .select("id,course_id,lesson_id")
          .eq("status", "published")
          .in("course_id", visibleCourseIds),
      ])
    : [
        { data: [] },
        { data: [] },
        { data: [] },
      ];
  const quizIds = (quizzes || []).map((quiz) => quiz.id);
  const userIds = Array.from(
    new Set((enrollments || []).map((enrollment) => enrollment.user_id))
  );
  const [{ data: attempts }, { data: profiles }] = await Promise.all([
    quizIds.length
      ? supabase
          .from("quiz_attempts")
          .select("user_id,quiz_id,score,total_questions,created_at")
          .in("quiz_id", quizIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id,first_name,last_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);
  const coursesById = new Map((courses || []).map((course) => [course.id, course]));
  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const certificatesByUserCourse = new Set(
    (certificates || []).map(
      (certificate) => `${certificate.course_id}:${certificate.user_id}`
    )
  );

  const completedWithoutCertificate: Array<{
    userId: string;
    courseId: string;
    studentName: string;
    courseTitle: string;
  }> = [];
  let completedCourses = 0;

  for (const enrollment of enrollments || []) {
    const courseLessons = (lessons || []).filter(
      (lesson) => lesson.course_id === enrollment.course_id
    );
    const courseQuizzes = (quizzes || []).filter(
      (quiz) => quiz.course_id === enrollment.course_id
    );
    const userAttempts = (attempts || []).filter(
      (attempt) => attempt.user_id === enrollment.user_id
    );
    const progressState = buildCourseProgressState({
      lessons: courseLessons.map((lesson) => ({
        id: lesson.id,
        order: lesson.order,
      })),
      quizzes: courseQuizzes.map((quiz) => ({
        id: quiz.id,
        lesson_id: quiz.lesson_id,
      })),
      attempts: userAttempts,
      isEnrolled: true,
    });

    if (!progressState.certificateAvailable) continue;

    completedCourses += 1;

    const profile = profilesById.get(enrollment.user_id);
    const studentName =
      `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
      "Usuario sin nombre";
    const courseTitle = coursesById.get(enrollment.course_id)?.title || "Curso";
    const hasCertificate = certificatesByUserCourse.has(
      `${enrollment.course_id}:${enrollment.user_id}`
    );

    if (!hasCertificate) {
      completedWithoutCertificate.push({
        userId: enrollment.user_id,
        courseId: enrollment.course_id,
        studentName,
        courseTitle,
      });
    }
  }

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Formación
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Certificados emitidos
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Consulta certificados, enlaces de verificación y estado de emisión.
          </p>
        </div>

        <form className="rounded-xl border bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-gray-700">
            Filtrar por curso
            <select
              name="course"
              defaultValue={selectedCourseId}
              className="mt-2 w-full rounded-lg border px-4 py-2"
            >
              <option value="all">Todos los cursos</option>
              {(courses || []).map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-3 rounded-lg bg-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-white"
          >
            Aplicar filtro
          </button>
        </form>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Total certificados</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">
            {totalCertificates}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Válidos</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {validCertificates}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Revocados</p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {revokedCertificates}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Cursos terminados</p>
          <p className="mt-2 text-3xl font-bold text-[var(--ivbcc-navy)]">
            {completedCourses}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">Terminados sin certificado</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {completedWithoutCertificate.length}
          </p>
        </div>
      </section>

      {completedWithoutCertificate.length ? (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">
            Usuarios que terminaron curso sin certificado emitido
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {completedWithoutCertificate.map((item) => (
              <div
                key={`${item.userId}-${item.courseId}`}
                className="rounded-lg bg-amber-50 p-4 text-sm"
              >
                <p className="font-bold text-gray-950">{item.studentName}</p>
                <p className="mt-1 text-gray-600">{item.courseTitle}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Certificados por curso</h2>
        {certificatesByCourse.size ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(certificatesByCourse.entries()).map(([courseTitle, total]) => (
              <div key={courseTitle} className="rounded-lg bg-gray-50 p-4">
                <p className="line-clamp-2 text-sm font-semibold text-gray-700">
                  {courseTitle}
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--ivbcc-navy)]">
                  {total}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Sin certificados para el filtro actual.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="grid grid-cols-12 border-b bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-600">
          <div className="col-span-2">Estudiante</div>
          <div className="col-span-2">Curso</div>
          <div className="col-span-2">Código</div>
          <div className="col-span-2">Emisión</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-3 text-right">Acciones</div>
        </div>

        {certificates?.length ? (
          certificates.map((certificate) => {
            const verificationUrl = buildCertificateVerificationUrl(
              certificate.code
            );
            const isValid = certificate.status === "valid";

            return (
              <article
                key={certificate.id}
                className="grid grid-cols-12 items-center gap-3 border-b px-5 py-4 text-sm"
              >
                <div className="col-span-2 font-semibold text-gray-900">
                  {certificate.student_name}
                </div>
                <div className="col-span-2 text-gray-700">
                  {certificate.course_title}
                </div>
                <div className="col-span-2 break-all font-mono text-xs font-semibold text-gray-700">
                  {certificate.code}
                </div>
                <div className="col-span-2 text-gray-600">
                  {formatCertificateDate(certificate.issued_at)}
                </div>
                <div className="col-span-1">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      isValid
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {isValid ? "Válido" : "Revocado"}
                  </span>
                </div>
                <div className="col-span-3 flex flex-wrap justify-end gap-2">
                  <Link
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Verificar
                  </Link>
                  <RevokeCertificateButton
                    certificateId={certificate.id}
                    disabled={!isValid}
                  />
                </div>
              </article>
            );
          })
        ) : (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            Aún no hay certificados emitidos.
          </div>
        )}
      </section>
    </main>
  );
}
