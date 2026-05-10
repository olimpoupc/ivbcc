import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildCertificateVerificationUrl,
  formatCertificateDate,
} from "@/lib/certificates";
import { buildCourseProgressState } from "@/lib/course-progress";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
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
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Formación"
          title="Certificados emitidos"
          subtitle="No fue posible cargar los certificados."
          icon="certificate"
        />
      </AdminPageShell>
    );
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
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Formación"
        title="Certificados emitidos"
        subtitle="Consulta certificados, enlaces de verificación y estado de emisión."
        icon="certificate"
        actions={
          <AdminActionButton href="/certificados" icon="external" tone="outline" external>
            Verificador público
          </AdminActionButton>
        }
      />

      <AdminPanelCard>
        <form className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="text-sm font-extrabold text-[var(--ivbcc-ink)]">
            Filtrar por curso
            <select
              name="course"
              defaultValue={selectedCourseId}
              className="mt-2 w-full min-w-72 rounded-2xl border border-[var(--ivbcc-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[rgba(201,162,74,0.22)]"
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
            className="rounded-full bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--ivbcc-navy-2)]"
          >
            Aplicar filtro
          </button>
        </form>
      </AdminPanelCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard
          label="Total certificados"
          value={totalCertificates}
          detail="Emitidos en el sistema"
          icon="certificate"
          tone="slate"
        />
        <AdminMetricCard
          label="Válidos"
          value={validCertificates}
          detail="Disponibles para verificar"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Revocados"
          value={revokedCertificates}
          detail="Sin validez pública"
          icon="close"
          tone="slate"
        />
        <AdminMetricCard
          label="Cursos terminados"
          value={completedCourses}
          detail="Con avance completado"
          icon="book"
          tone="navy"
        />
        <AdminMetricCard
          label="Sin certificado"
          value={completedWithoutCertificate.length}
          detail="Pendientes de emisión"
          icon="activity"
          tone="gold"
        />
      </section>

      {completedWithoutCertificate.length ? (
        <AdminSection
          title="Terminados sin certificado"
          subtitle="Usuarios que terminaron un curso y aún no tienen certificado emitido."
          icon="activity"
        >
          <AdminPanelCard>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {completedWithoutCertificate.map((item) => (
              <div
                key={`${item.userId}-${item.courseId}`}
                className="rounded-2xl border border-[rgba(201,162,74,0.28)] bg-[rgba(201,162,74,0.1)] p-4 text-sm"
              >
                <p className="font-extrabold text-[var(--ivbcc-ink)]">{item.studentName}</p>
                <p className="mt-1 text-[var(--ivbcc-muted)]">{item.courseTitle}</p>
              </div>
            ))}
          </div>
          </AdminPanelCard>
        </AdminSection>
      ) : null}

      <AdminSection title="Certificados por curso" icon="book">
        <AdminPanelCard>
        {certificatesByCourse.size ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(certificatesByCourse.entries()).map(([courseTitle, total]) => (
              <div key={courseTitle} className="rounded-2xl border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-4">
                <p className="line-clamp-2 text-sm font-extrabold text-[var(--ivbcc-ink)]">
                  {courseTitle}
                </p>
                <p className="mt-2 text-2xl font-bold text-[var(--ivbcc-navy)]">
                  {total}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Sin certificados para el filtro actual"
            description="Cambia el curso seleccionado o espera nuevas emisiones."
            icon="certificate"
          />
        )}
        </AdminPanelCard>
      </AdminSection>

      <AdminSection title="Listado de certificados" icon="certificate">
        <AdminPanelCard className="overflow-hidden p-0">
          <div className="hidden grid-cols-12 border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-muted)] lg:grid">
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
                className="grid gap-3 border-b border-[var(--ivbcc-line)] px-5 py-4 text-sm lg:grid-cols-12 lg:items-center"
              >
                <div className="font-extrabold text-[var(--ivbcc-ink)] lg:col-span-2">
                  {certificate.student_name}
                </div>
                <div className="text-[var(--ivbcc-muted)] lg:col-span-2">
                  {certificate.course_title}
                </div>
                <div className="break-all font-mono text-xs font-semibold text-[var(--ivbcc-muted)] lg:col-span-2">
                  {certificate.code}
                </div>
                <div className="text-[var(--ivbcc-muted)] lg:col-span-2">
                  {formatCertificateDate(certificate.issued_at)}
                </div>
                <div className="lg:col-span-1">
                  <AdminStatusBadge tone={isValid ? "green" : "red"}>
                    {isValid ? "Válido" : "Revocado"}
                  </AdminStatusBadge>
                </div>
                <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
                  <Link
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[var(--ivbcc-line)] bg-white px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)]"
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
          <div className="p-6">
            <AdminEmptyState
              title="Aún no hay certificados emitidos"
              description="Cuando un estudiante complete su formación, los certificados aparecerán aquí."
              icon="certificate"
            />
          </div>
        )}
        </AdminPanelCard>
      </AdminSection>
    </AdminPageShell>
  );
}
