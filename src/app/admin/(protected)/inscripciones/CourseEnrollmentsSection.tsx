import Link from "next/link";
import {
  AdminEmptyState,
  AdminPagination,
  AdminPanelCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import { adminSelectClass } from "@/components/admin/AdminFormPrimitives";
import { buildListHref, getPageRange, type AdminListSearchParams } from "@/lib/admin-query";
import {
  courseProgressFilterOptions,
  matchesProgressFilter,
  parseCourseEnrollmentFilters,
  REGISTRATIONS_PAGE_SIZE,
  summarizeStudentProgress,
  type StudentProgressStatus,
  type StudentProgressSummary,
} from "@/lib/admin-registrations";
import { chunk } from "@/lib/event-broadcast";
import {
  createSupabaseServiceRoleClient,
  type createSupabaseServerClient,
} from "@/lib/supabase-server";

type SessionClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type EnrollmentRow = {
  id: string;
  course_id: string;
  user_id: string;
  created_at: string;
  course_title: string;
  student_name: string;
};

type Props = {
  supabase: SessionClient;
  params: AdminListSearchParams | undefined;
  keepParams: Record<string, string | undefined>;
};

/** Con filtro de progreso se calcula en memoria sobre las inscripciones más recientes. */
const PROGRESS_SCAN_LIMIT = 300;
// Descarga de archivo (Route Handler), no una página: va en <a>, no en <Link>.
const COURSES_EXPORT_HREF = "/api/export/inscripciones-cursos";
/** Usuarios por consulta .in() para no generar URL demasiado largas. */
const USERS_PER_QUERY = 50;

const statusBadge: Record<StudentProgressStatus, { label: string; tone: "green" | "blue" | "amber" | "slate" }> = {
  certified: { label: "Certificado emitido", tone: "green" },
  completed: { label: "Completó (sin certificado)", tone: "blue" },
  in_progress: { label: "En progreso", tone: "amber" },
  not_started: { label: "Sin iniciar", tone: "slate" },
};

function formatDateColombia(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

/**
 * Progreso de cada inscripción con pocas consultas en lote (lecciones,
 * cuestionarios, intentos y certificados) y la sesión del administrador.
 */
async function loadProgress(supabase: SessionClient, enrollments: EnrollmentRow[]) {
  const summaries = new Map<string, StudentProgressSummary>();
  if (!enrollments.length) return summaries;

  const courseIds = Array.from(new Set(enrollments.map((row) => row.course_id)));
  const userIds = Array.from(new Set(enrollments.map((row) => row.user_id)));

  const [{ data: lessons, error: lessonsError }, { data: quizzes, error: quizzesError }] = await Promise.all([
    supabase.from("lessons").select('id,course_id,"order"').in("course_id", courseIds),
    supabase.from("quizzes").select("id,course_id,lesson_id").eq("status", "published").in("course_id", courseIds),
  ]);
  if (lessonsError || quizzesError) throw lessonsError || quizzesError;

  const quizIds = (quizzes || []).map((quiz) => quiz.id as string);
  const userChunks = chunk(userIds, USERS_PER_QUERY);

  const [attemptResults, certificateResults] = await Promise.all([
    Promise.all(
      quizIds.length
        ? userChunks.map((ids) =>
            supabase
              .from("quiz_attempts")
              .select("user_id,quiz_id,score,total_questions,created_at")
              .in("quiz_id", quizIds)
              .in("user_id", ids)
              .order("created_at", { ascending: false })
          )
        : []
    ),
    Promise.all(
      userChunks.map((ids) =>
        supabase
          .from("course_certificates")
          .select("user_id,course_id")
          .eq("status", "valid")
          .in("course_id", courseIds)
          .in("user_id", ids)
      )
    ),
  ]);
  for (const result of [...attemptResults, ...certificateResults]) {
    if (result.error) throw result.error;
  }

  const attemptsByUser = new Map<string, { quiz_id: string; score: number; total_questions: number }[]>();
  for (const attempt of attemptResults.flatMap((result) => result.data || [])) {
    const list = attemptsByUser.get(attempt.user_id) || [];
    list.push(attempt);
    attemptsByUser.set(attempt.user_id, list);
  }
  const certified = new Set(
    certificateResults.flatMap((result) => result.data || []).map((cert) => `${cert.course_id}:${cert.user_id}`)
  );

  for (const enrollment of enrollments) {
    summaries.set(
      enrollment.id,
      summarizeStudentProgress({
        lessons: (lessons || [])
          .filter((lesson) => lesson.course_id === enrollment.course_id)
          .map((lesson) => ({ id: lesson.id, order: lesson.order })),
        quizzes: (quizzes || [])
          .filter((quiz) => quiz.course_id === enrollment.course_id)
          .map((quiz) => ({ id: quiz.id, lesson_id: quiz.lesson_id })),
        attempts: attemptsByUser.get(enrollment.user_id) || [],
        hasValidCertificate: certified.has(`${enrollment.course_id}:${enrollment.user_id}`),
      })
    );
  }
  return summaries;
}

/**
 * Correos de los estudiantes de ESTA página (no están en profiles): API admin
 * de auth con service_role, solo en el servidor y solo en esta página admin.
 */
async function loadEmails(userIds: string[]) {
  const emails = new Map<string, string>();
  if (!userIds.length) return emails;
  try {
    const admin = createSupabaseServiceRoleClient();
    const results = await Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id)));
    results.forEach((result, index) => {
      const email = result.data.user?.email;
      if (email) emails.set(userIds[index], email);
    });
  } catch (error) {
    console.error("No se pudieron leer los correos de los estudiantes:", error);
  }
  return emails;
}

export default async function CourseEnrollmentsSection({ supabase, params, keepParams }: Props) {
  const { data: courseOptions } = await supabase.from("courses").select("id,title").order("title").limit(500);
  const courses = courseOptions || [];
  const filters = parseCourseEnrollmentFilters(
    params,
    courses.map((course) => course.id as string)
  );

  let enrollments: EnrollmentRow[] = [];
  let summaries = new Map<string, StudentProgressSummary>();
  let totalItems = 0;
  let scanTruncated = false;
  let loadError = false;

  try {
    let baseQuery = supabase
      .from("admin_course_enrollments_view")
      .select("id,course_id,user_id,created_at,course_title,student_name", { count: "exact" })
      .order("created_at", { ascending: false });
    if (filters.courseId) baseQuery = baseQuery.eq("course_id", filters.courseId);

    if (filters.progress === "all") {
      const range = getPageRange(filters.page, REGISTRATIONS_PAGE_SIZE);
      const { data, count, error } = await baseQuery.range(range.from, range.to);
      if (error) throw error;
      enrollments = (data || []) as EnrollmentRow[];
      totalItems = count || 0;
      summaries = await loadProgress(supabase, enrollments);
    } else {
      // El estado depende del progreso calculado: se filtra en memoria.
      const { data, count, error } = await baseQuery.limit(PROGRESS_SCAN_LIMIT);
      if (error) throw error;
      const scanned = (data || []) as EnrollmentRow[];
      scanTruncated = (count || 0) > scanned.length;
      summaries = await loadProgress(supabase, scanned);
      const matching = scanned.filter((row) => {
        const summary = summaries.get(row.id);
        return summary ? matchesProgressFilter(summary.status, filters.progress) : false;
      });
      totalItems = matching.length;
      const range = getPageRange(filters.page, REGISTRATIONS_PAGE_SIZE);
      enrollments = matching.slice(range.from, range.to + 1);
    }
  } catch (error) {
    console.error("Error al cargar las inscripciones a cursos:", error);
    loadError = true;
  }

  const emails = await loadEmails(Array.from(new Set(enrollments.map((row) => row.user_id))));
  const totalPages = Math.max(1, Math.ceil(totalItems / REGISTRATIONS_PAGE_SIZE));
  const buildPageHref = (page: number) =>
    buildListHref("/admin/inscripciones", {
      ...keepParams,
      curso: filters.courseId || undefined,
      progreso: filters.progress !== "all" ? filters.progress : undefined,
      coursesPage: page > 1 ? String(page) : undefined,
    });

  return (
    <AdminPanelCard>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title text-xl text-[var(--ivbcc-ink)]">Inscripciones a cursos</h2>
          <p className="muted-copy mt-1 text-sm">
            Progreso de cada estudiante: lecciones completadas, cuestionarios aprobados y certificado.
          </p>
        </div>
        <a
          href={COURSES_EXPORT_HREF}
          className="rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-navy)] hover:text-white"
        >
          Exportar CSV
        </a>
      </div>

      <form className="mb-5 grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
        {Object.entries(keepParams).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null
        )}
        <label className="block text-sm font-extrabold text-[var(--ivbcc-ink)]">
          Curso
          <select name="curso" defaultValue={filters.courseId || ""} className={`${adminSelectClass} mt-2`}>
            <option value="">Todos los cursos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-extrabold text-[var(--ivbcc-ink)]">
          Estado
          <select name="progreso" defaultValue={filters.progress} className={`${adminSelectClass} mt-2`}>
            {courseProgressFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-12 rounded-full bg-[var(--ivbcc-navy)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--ivbcc-navy-2)]"
          >
            Filtrar
          </button>
          <Link
            href={buildListHref("/admin/inscripciones", keepParams)}
            className="inline-flex h-12 items-center rounded-full border border-[var(--ivbcc-line)] px-4 text-sm font-extrabold text-[var(--ivbcc-muted)] hover:bg-white"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {scanTruncated && (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          El filtro por estado revisa las {PROGRESS_SCAN_LIMIT} inscripciones más recientes. Elige un curso para
          acotar la búsqueda.
        </p>
      )}

      {loadError ? (
        <p className="text-sm text-[var(--ivbcc-muted)]">No fue posible cargar las inscripciones a cursos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--ivbcc-line)] text-sm">
            <thead>
              <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                <th className="pb-3 pr-4">Estudiante</th>
                <th className="pb-3 pr-4">Curso</th>
                <th className="pb-3 pr-4">Progreso</th>
                <th className="pb-3 pr-4">Cuestionarios</th>
                <th className="pb-3 pr-4">Estado</th>
                <th className="pb-3">Inscripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ivbcc-line)]">
              {enrollments.map((enrollment) => {
                const summary = summaries.get(enrollment.id);
                const badge = statusBadge[summary?.status || "not_started"];
                return (
                  <tr key={enrollment.id} className="align-top text-[var(--ivbcc-muted)]">
                    <td className="py-4 pr-4">
                      <span className="block font-semibold text-[var(--ivbcc-ink)]">{enrollment.student_name}</span>
                      <span className="block break-all text-xs">{emails.get(enrollment.user_id) || "Correo no disponible"}</span>
                    </td>
                    <td className="py-4 pr-4">{enrollment.course_title}</td>
                    <td className="min-w-44 py-4 pr-4">
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-[var(--ivbcc-line)]"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={summary?.progressPercentage || 0}
                        aria-label={`Progreso de ${enrollment.student_name}`}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--ivbcc-gold)]"
                          style={{ width: `${summary?.progressPercentage || 0}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-xs">
                        {summary?.completedLessons || 0} de {summary?.totalLessons || 0} lecciones completadas
                      </span>
                    </td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      {summary?.approvedQuizzes || 0}/{summary?.totalQuizzes || 0} aprobados
                    </td>
                    <td className="py-4 pr-4">
                      <AdminStatusBadge tone={badge.tone}>{badge.label}</AdminStatusBadge>
                    </td>
                    <td className="py-4 whitespace-nowrap">{formatDateColombia(enrollment.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loadError && enrollments.length === 0 && (
        <AdminEmptyState
          title="No se encontraron inscripciones a cursos"
          description="Ajusta los filtros para ver otros registros."
          icon="book"
        />
      )}

      <div className="mt-4">
        <AdminPagination
          page={filters.page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={REGISTRATIONS_PAGE_SIZE}
          buildHref={buildPageHref}
        />
      </div>
    </AdminPanelCard>
  );
}
