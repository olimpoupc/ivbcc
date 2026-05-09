export const QUIZ_PASSING_PERCENTAGE = 60;

export type CourseProgressLesson = {
  id: string;
  order: number | null;
};

export type CourseProgressQuiz = {
  id: string;
  lesson_id: string | null;
};

export type CourseProgressQuizAttempt = {
  quiz_id: string;
  score: number;
  total_questions: number;
};

export type LessonProgressStatus = "completed" | "available" | "blocked";

export type LessonProgressState = {
  lessonId: string;
  quizIds: string[];
  status: LessonProgressStatus;
  isUnlocked: boolean;
  isCompleted: boolean;
  missingRequiredQuiz: boolean;
  previousLessonId: string | null;
};

export function getQuizPercentage(
  attempt?: { score: number; total_questions: number } | null
) {
  if (!attempt?.total_questions) return 0;
  return Math.round((attempt.score / attempt.total_questions) * 100);
}

export function isQuizAttemptApproved(
  attempt?: { score: number; total_questions: number } | null
) {
  return getQuizPercentage(attempt) >= QUIZ_PASSING_PERCENTAGE;
}

export function getLatestAttemptByQuiz(attempts: CourseProgressQuizAttempt[]) {
  const latestAttemptByQuiz = new Map<
    string,
    { score: number; total_questions: number }
  >();

  for (const attempt of attempts) {
    if (!latestAttemptByQuiz.has(attempt.quiz_id)) {
      latestAttemptByQuiz.set(attempt.quiz_id, {
        score: attempt.score,
        total_questions: attempt.total_questions,
      });
    }
  }

  return latestAttemptByQuiz;
}

export function getApprovedQuizIds(attempts: CourseProgressQuizAttempt[]) {
  const latestAttemptByQuiz = getLatestAttemptByQuiz(attempts);

  return new Set(
    Array.from(latestAttemptByQuiz.entries())
      .filter(([, attempt]) => isQuizAttemptApproved(attempt))
      .map(([quizId]) => quizId)
  );
}

export function getLessonQuizIdsByLesson(quizzes: CourseProgressQuiz[]) {
  const quizIdsByLesson = new Map<string, string[]>();

  for (const quiz of quizzes) {
    if (!quiz.lesson_id) continue;

    const current = quizIdsByLesson.get(quiz.lesson_id) || [];
    current.push(quiz.id);
    quizIdsByLesson.set(quiz.lesson_id, current);
  }

  return quizIdsByLesson;
}

export function buildCourseProgressState({
  lessons,
  quizzes,
  attempts,
  isEnrolled,
}: {
  lessons: CourseProgressLesson[];
  quizzes: CourseProgressQuiz[];
  attempts: CourseProgressQuizAttempt[];
  isEnrolled: boolean;
}) {
  const sortedLessons = [...lessons].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0)
  );
  const approvedQuizIds = getApprovedQuizIds(attempts);
  const latestAttemptByQuiz = getLatestAttemptByQuiz(attempts);
  const lessonQuizIdsByLesson = getLessonQuizIdsByLesson(quizzes);
  const finalQuizIds = quizzes
    .filter((quiz) => !quiz.lesson_id)
    .map((quiz) => quiz.id);
  const lessonStates: LessonProgressState[] = [];

  let previousLessonCompleted = true;
  let previousLessonId: string | null = null;

  for (const lesson of sortedLessons) {
    const quizIds = lessonQuizIdsByLesson.get(lesson.id) || [];
    const isUnlocked = isEnrolled && previousLessonCompleted;
    const isCompleted =
      isEnrolled &&
      quizIds.length > 0 &&
      quizIds.every((quizId) => approvedQuizIds.has(quizId));
    const status: LessonProgressStatus = !isUnlocked
      ? "blocked"
      : isCompleted
        ? "completed"
        : "available";

    lessonStates.push({
      lessonId: lesson.id,
      quizIds,
      status,
      isUnlocked,
      isCompleted,
      missingRequiredQuiz: quizIds.length === 0,
      previousLessonId,
    });

    previousLessonCompleted = isCompleted;
    previousLessonId = lesson.id;
  }

  const completedLessons = lessonStates.filter((lesson) => lesson.isCompleted).length;
  const totalLessons = sortedLessons.length;
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const allLessonsCompleted =
    totalLessons > 0 && completedLessons === totalLessons;
  const finalQuizUnlocked = isEnrolled && allLessonsCompleted;
  const finalQuizApproved =
    finalQuizIds.length > 0 &&
    finalQuizIds.every((quizId) => approvedQuizIds.has(quizId));
  const certificateAvailable = finalQuizUnlocked && finalQuizApproved;

  return {
    approvedQuizIds,
    latestAttemptByQuiz,
    lessonQuizIdsByLesson,
    lessonStates,
    lessonStateById: new Map(
      lessonStates.map((lessonState) => [lessonState.lessonId, lessonState])
    ),
    finalQuizIds,
    completedLessons,
    totalLessons,
    progressPercentage,
    allLessonsCompleted,
    finalQuizUnlocked,
    finalQuizApproved,
    certificateAvailable,
  };
}
