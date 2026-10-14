/**
 * Lógica pura del panel /admin/inscripciones: filtros por URL, estadísticas
 * de inscritos a eventos y resumen de progreso por estudiante en cursos.
 * Sin acceso a la base de datos para poder probarla.
 */

import {
  getPageParam,
  getParam,
  quoteFilterValue,
  type AdminListSearchParams,
} from "@/lib/admin-query";
import {
  buildCourseProgressState,
  type CourseProgressLesson,
  type CourseProgressQuiz,
  type CourseProgressQuizAttempt,
} from "@/lib/course-progress";

export const REGISTRATIONS_PAGE_SIZE = 15;
export const SEARCH_MAX_LENGTH = 100;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Inscripciones a eventos
// ---------------------------------------------------------------------------

export const EVENT_LIST_STATUSES = ["all", "pending", "confirmed", "cancelled", "attended"] as const;
export type EventListStatus = (typeof EVENT_LIST_STATUSES)[number];

export const eventListStatusOptions: { value: EventListStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "attended", label: "Asistieron" },
];

export function parseEventListStatus(value: string | null | undefined): EventListStatus {
  return (EVENT_LIST_STATUSES as readonly string[]).includes(value || "")
    ? (value as EventListStatus)
    : "all";
}

export type EventRegistrationFilters = {
  eventId: string | null;
  status: EventListStatus;
  query: string;
  page: number;
};

/**
 * Lee los filtros de la URL. El evento solo se acepta si es un UUID y, cuando
 * se pasa la lista de eventos conocidos, si está en ella.
 */
export function parseEventRegistrationFilters(
  params: AdminListSearchParams | undefined,
  knownEventIds?: readonly string[]
): EventRegistrationFilters {
  const rawEvent = getParam(params, "evento");
  const eventId =
    isUuid(rawEvent) && (!knownEventIds || knownEventIds.includes(rawEvent)) ? rawEvent : null;

  return {
    eventId,
    status: parseEventListStatus(getParam(params, "estado")),
    query: (getParam(params, "q") || "").trim().slice(0, SEARCH_MAX_LENGTH),
    page: getPageParam(params, "eventsPage"),
  };
}

/**
 * Traduce los filtros a condiciones de PostgREST. "attended" es "confirmada
 * con asistencia marcada". La búsqueda usa el escapado de quoteFilterValue.
 */
export function getEventRegistrationFilterParts(filters: Pick<EventRegistrationFilters, "eventId" | "status" | "query">) {
  const likeValue = filters.query ? quoteFilterValue(`%${filters.query}%`) : null;
  return {
    eventId: filters.eventId,
    status:
      filters.status === "all" ? null : filters.status === "attended" ? "confirmed" : filters.status,
    attendedOnly: filters.status === "attended",
    orFilter: likeValue ? `full_name.ilike.${likeValue},email.ilike.${likeValue}` : null,
  };
}

export type RegistrationCounts = {
  pending: number;
  confirmed: number;
  cancelled: number;
  attended: number;
};

export type RegistrationStats = RegistrationCounts & {
  total: number;
  /** asistieron / confirmados, en porcentaje entero; 0 si no hay confirmados. */
  attendanceRate: number;
};

export function buildRegistrationStats(counts: Partial<RegistrationCounts>): RegistrationStats {
  const safe = (value: number | null | undefined) =>
    Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : 0;
  const pending = safe(counts.pending);
  const confirmed = safe(counts.confirmed);
  const cancelled = safe(counts.cancelled);
  const attended = Math.min(safe(counts.attended), confirmed);

  return {
    pending,
    confirmed,
    cancelled,
    attended,
    total: pending + confirmed + cancelled,
    attendanceRate: confirmed > 0 ? Math.round((attended / confirmed) * 100) : 0,
  };
}

/** Pendiente con enlace vencido o sin enlace (por ejemplo, tras cancelar). */
export function isPendingLinkExpired(
  registration: { status: string; confirmation_expires_at: string | null },
  now: Date = new Date()
): boolean {
  if (registration.status !== "pending") return false;
  if (!registration.confirmation_expires_at) return true;
  const time = new Date(registration.confirmation_expires_at).getTime();
  return Number.isNaN(time) || time <= now.getTime();
}

/** Estado del CSV: sin parámetro se mantiene el comportamiento anterior (solo confirmados). */
export function parseExportStatus(value: string | null | undefined): EventListStatus {
  if (value === null || value === undefined || value === "") return "confirmed";
  return parseEventListStatus(value);
}

// ---------------------------------------------------------------------------
// Inscripciones a cursos
// ---------------------------------------------------------------------------

export const COURSE_PROGRESS_FILTERS = ["all", "in_progress", "completed", "certified"] as const;
export type CourseProgressFilter = (typeof COURSE_PROGRESS_FILTERS)[number];

export const courseProgressFilterOptions: { value: CourseProgressFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completó" },
  { value: "certified", label: "Certificado" },
];

export type CourseEnrollmentFilters = {
  courseId: string | null;
  progress: CourseProgressFilter;
  page: number;
};

export function parseCourseEnrollmentFilters(
  params: AdminListSearchParams | undefined,
  knownCourseIds?: readonly string[]
): CourseEnrollmentFilters {
  const rawCourse = getParam(params, "curso");
  const rawProgress = getParam(params, "progreso") || "";
  return {
    courseId:
      isUuid(rawCourse) && (!knownCourseIds || knownCourseIds.includes(rawCourse)) ? rawCourse : null,
    progress: (COURSE_PROGRESS_FILTERS as readonly string[]).includes(rawProgress)
      ? (rawProgress as CourseProgressFilter)
      : "all",
    page: getPageParam(params, "coursesPage"),
  };
}

export type StudentProgressStatus = "certified" | "completed" | "in_progress" | "not_started";

export type StudentProgressSummary = {
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  approvedQuizzes: number;
  totalQuizzes: number;
  status: StudentProgressStatus;
};

/**
 * Resumen de un estudiante en un curso. El progreso lo calcula
 * buildCourseProgressState (no se reimplementa); los intentos deben venir
 * ordenados del más reciente al más antiguo, como en el resto del sitio.
 */
export function summarizeStudentProgress({
  lessons,
  quizzes,
  attempts,
  hasValidCertificate,
}: {
  lessons: CourseProgressLesson[];
  quizzes: CourseProgressQuiz[];
  attempts: CourseProgressQuizAttempt[];
  hasValidCertificate: boolean;
}): StudentProgressSummary {
  const state = buildCourseProgressState({ lessons, quizzes, attempts, isEnrolled: true });
  const courseQuizIds = new Set(quizzes.map((quiz) => quiz.id));
  const approvedQuizzes = Array.from(state.approvedQuizIds).filter((id) => courseQuizIds.has(id)).length;
  const courseAttempts = attempts.filter((attempt) => courseQuizIds.has(attempt.quiz_id)).length;

  const status: StudentProgressStatus = hasValidCertificate
    ? "certified"
    : state.certificateAvailable
      ? "completed"
      : state.completedLessons > 0 || courseAttempts > 0
        ? "in_progress"
        : "not_started";

  return {
    completedLessons: state.completedLessons,
    totalLessons: state.totalLessons,
    progressPercentage: state.progressPercentage,
    approvedQuizzes,
    totalQuizzes: courseQuizIds.size,
    status,
  };
}

/** "En progreso" incluye a quien aún no inicia. */
export function matchesProgressFilter(status: StudentProgressStatus, filter: CourseProgressFilter) {
  if (filter === "all") return true;
  if (filter === "in_progress") return status === "in_progress" || status === "not_started";
  return status === filter;
}
