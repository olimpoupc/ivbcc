import { describe, expect, it } from "vitest";
import {
  buildRegistrationStats,
  getEventRegistrationFilterParts,
  isPendingLinkExpired,
  matchesProgressFilter,
  parseCourseEnrollmentFilters,
  parseEventRegistrationFilters,
  parseExportStatus,
  summarizeStudentProgress,
} from "./admin-registrations";

const EVENT_A = "11111111-1111-4111-8111-111111111111";
const EVENT_B = "22222222-2222-4222-8222-222222222222";

describe("buildRegistrationStats", () => {
  it("cuenta por estado y calcula el % de asistencia sobre los confirmados", () => {
    expect(buildRegistrationStats({ pending: 3, confirmed: 8, cancelled: 1, attended: 6 })).toEqual({
      pending: 3,
      confirmed: 8,
      cancelled: 1,
      attended: 6,
      total: 12,
      attendanceRate: 75,
    });
  });

  it("devuelve 0 % cuando no hay confirmados", () => {
    const stats = buildRegistrationStats({ pending: 4, confirmed: 0, cancelled: 2, attended: 0 });
    expect(stats.attendanceRate).toBe(0);
    expect(stats.total).toBe(6);
  });

  it("ignora valores inválidos y no deja que asistieron supere a confirmados", () => {
    const stats = buildRegistrationStats({ pending: -1, confirmed: 2, cancelled: Number.NaN, attended: 5 });
    expect(stats).toMatchObject({ pending: 0, cancelled: 0, attended: 2, total: 2, attendanceRate: 100 });
    expect(buildRegistrationStats({})).toMatchObject({ total: 0, attendanceRate: 0 });
  });

  it("redondea el porcentaje", () => {
    expect(buildRegistrationStats({ confirmed: 3, attended: 1 }).attendanceRate).toBe(33);
  });
});

describe("parseEventRegistrationFilters", () => {
  it("acepta un evento conocido, estado válido, búsqueda y página", () => {
    expect(
      parseEventRegistrationFilters(
        { evento: EVENT_A, estado: "attended", q: "  maria  ", eventsPage: "3" },
        [EVENT_A]
      )
    ).toEqual({ eventId: EVENT_A, status: "attended", query: "maria", page: 3 });
  });

  it("descarta evento no UUID o desconocido, estado inválido y página inválida", () => {
    expect(
      parseEventRegistrationFilters({ evento: "1 or 1=1", estado: "borrado", eventsPage: "-2" }, [EVENT_A])
    ).toEqual({ eventId: null, status: "all", query: "", page: 1 });
    expect(parseEventRegistrationFilters({ evento: EVENT_B }, [EVENT_A]).eventId).toBeNull();
  });

  it("toma el primer valor si el parámetro viene repetido y recorta la búsqueda", () => {
    const filters = parseEventRegistrationFilters({ estado: ["pending", "confirmed"], q: "x".repeat(300) });
    expect(filters.status).toBe("pending");
    expect(filters.query).toHaveLength(100);
  });
});

describe("getEventRegistrationFilterParts", () => {
  it("'asistió' se traduce a confirmada con asistencia", () => {
    expect(getEventRegistrationFilterParts({ eventId: EVENT_A, status: "attended", query: "" })).toEqual({
      eventId: EVENT_A,
      status: "confirmed",
      attendedOnly: true,
      orFilter: null,
    });
  });

  it("escapa la búsqueda para PostgREST (comas, puntos y comillas)", () => {
    const parts = getEventRegistrationFilterParts({ eventId: null, status: "all", query: 'a,b."c' });
    expect(parts.status).toBeNull();
    expect(parts.orFilter).toBe('full_name.ilike."%a,b.\\"c%",email.ilike."%a,b.\\"c%"');
  });
});

describe("parseExportStatus", () => {
  it("sin estado exporta solo confirmados; 'all' exporta todo", () => {
    expect(parseExportStatus(null)).toBe("confirmed");
    expect(parseExportStatus("all")).toBe("all");
    expect(parseExportStatus("attended")).toBe("attended");
    expect(parseExportStatus("raro")).toBe("all");
  });
});

describe("isPendingLinkExpired", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  it("solo marca pendientes con enlace vencido o sin enlace", () => {
    expect(isPendingLinkExpired({ status: "pending", confirmation_expires_at: "2026-10-13T11:00:00Z" }, now)).toBe(true);
    expect(isPendingLinkExpired({ status: "pending", confirmation_expires_at: null }, now)).toBe(true);
    expect(isPendingLinkExpired({ status: "pending", confirmation_expires_at: "2026-10-14T11:00:00Z" }, now)).toBe(false);
    expect(isPendingLinkExpired({ status: "confirmed", confirmation_expires_at: null }, now)).toBe(false);
  });
});

describe("parseCourseEnrollmentFilters", () => {
  it("valida curso y estado de progreso", () => {
    expect(parseCourseEnrollmentFilters({ curso: EVENT_A, progreso: "certified", coursesPage: "2" }, [EVENT_A])).toEqual({
      courseId: EVENT_A,
      progress: "certified",
      page: 2,
    });
    expect(parseCourseEnrollmentFilters({ curso: "abc", progreso: "hackeado" })).toEqual({
      courseId: null,
      progress: "all",
      page: 1,
    });
  });
});

describe("summarizeStudentProgress", () => {
  const lessons = [
    { id: "l1", order: 1 },
    { id: "l2", order: 2 },
  ];
  const quizzes = [
    { id: "q1", lesson_id: "l1" },
    { id: "q2", lesson_id: "l2" },
    { id: "qf", lesson_id: null },
  ];
  const pass = (quiz_id: string) => ({ quiz_id, score: 9, total_questions: 10 });
  const fail = (quiz_id: string) => ({ quiz_id, score: 2, total_questions: 10 });

  it("sin intentos: sin iniciar", () => {
    expect(summarizeStudentProgress({ lessons, quizzes, attempts: [], hasValidCertificate: false })).toEqual({
      completedLessons: 0,
      totalLessons: 2,
      progressPercentage: 0,
      approvedQuizzes: 0,
      totalQuizzes: 3,
      status: "not_started",
    });
  });

  it("cuenta lecciones y cuestionarios aprobados según el intento más reciente", () => {
    // El primer intento de cada cuestionario es el más reciente.
    const summary = summarizeStudentProgress({
      lessons,
      quizzes,
      attempts: [pass("q1"), fail("q2"), pass("q2")],
      hasValidCertificate: false,
    });
    expect(summary).toMatchObject({ completedLessons: 1, progressPercentage: 50, approvedQuizzes: 1, status: "in_progress" });
  });

  it("con todo aprobado incluido el final: completó; con certificado válido: certificado", () => {
    const attempts = [pass("q1"), pass("q2"), pass("qf")];
    expect(summarizeStudentProgress({ lessons, quizzes, attempts, hasValidCertificate: false })).toMatchObject({
      completedLessons: 2,
      approvedQuizzes: 3,
      status: "completed",
    });
    expect(summarizeStudentProgress({ lessons, quizzes, attempts, hasValidCertificate: true }).status).toBe("certified");
  });

  it("ignora intentos de cuestionarios de otros cursos", () => {
    const summary = summarizeStudentProgress({ lessons, quizzes, attempts: [pass("otro")], hasValidCertificate: false });
    expect(summary).toMatchObject({ approvedQuizzes: 0, status: "not_started" });
  });

  it("el filtro 'en progreso' incluye a quien no ha iniciado", () => {
    expect(matchesProgressFilter("not_started", "in_progress")).toBe(true);
    expect(matchesProgressFilter("completed", "in_progress")).toBe(false);
    expect(matchesProgressFilter("certified", "certified")).toBe(true);
    expect(matchesProgressFilter("completed", "all")).toBe(true);
  });
});
