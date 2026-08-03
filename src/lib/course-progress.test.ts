import { describe, expect, it } from "vitest";
import {
  buildCourseProgressState,
  getApprovedQuizIds,
  getLatestAttemptByQuiz,
  getQuizPercentage,
  isQuizAttemptApproved,
} from "./course-progress";

describe("getQuizPercentage", () => {
  it("computes a rounded percentage", () => {
    expect(getQuizPercentage({ score: 3, total_questions: 4 })).toBe(75);
  });

  it("returns 0 when there is no attempt or total_questions is 0", () => {
    expect(getQuizPercentage(null)).toBe(0);
    expect(getQuizPercentage({ score: 0, total_questions: 0 })).toBe(0);
  });
});

describe("isQuizAttemptApproved", () => {
  it("approves at or above the 60% passing threshold", () => {
    expect(isQuizAttemptApproved({ score: 6, total_questions: 10 })).toBe(true);
    expect(isQuizAttemptApproved({ score: 5, total_questions: 10 })).toBe(false);
  });
});

describe("getLatestAttemptByQuiz", () => {
  it("keeps the first attempt seen per quiz (callers pass newest-first)", () => {
    const attempts = [
      { quiz_id: "q1", score: 9, total_questions: 10 },
      { quiz_id: "q1", score: 2, total_questions: 10 },
    ];

    const latest = getLatestAttemptByQuiz(attempts);
    expect(latest.get("q1")).toEqual({ score: 9, total_questions: 10 });
  });
});

describe("getApprovedQuizIds", () => {
  it("only includes quizzes whose latest attempt passed", () => {
    const approved = getApprovedQuizIds([
      { quiz_id: "passed", score: 8, total_questions: 10 },
      { quiz_id: "failed", score: 2, total_questions: 10 },
    ]);

    expect(approved.has("passed")).toBe(true);
    expect(approved.has("failed")).toBe(false);
  });
});

describe("buildCourseProgressState", () => {
  const lessons = [
    { id: "l1", order: 1 },
    { id: "l2", order: 2 },
  ];
  const quizzes = [
    { id: "q1", lesson_id: "l1" },
    { id: "q2", lesson_id: "l2" },
    { id: "final", lesson_id: null },
  ];

  it("blocks every lesson when the user is not enrolled", () => {
    const state = buildCourseProgressState({
      lessons,
      quizzes,
      attempts: [],
      isEnrolled: false,
    });

    expect(state.lessonStates.every((lesson) => lesson.status === "blocked")).toBe(
      true
    );
    expect(state.certificateAvailable).toBe(false);
  });

  it("unlocks only the first lesson when enrolled with no quiz attempts", () => {
    const state = buildCourseProgressState({
      lessons,
      quizzes,
      attempts: [],
      isEnrolled: true,
    });

    expect(state.lessonStateById.get("l1")?.status).toBe("available");
    expect(state.lessonStateById.get("l2")?.status).toBe("blocked");
  });

  it("unlocks the next lesson only after the previous lesson's quiz is passed", () => {
    const state = buildCourseProgressState({
      lessons,
      quizzes,
      attempts: [{ quiz_id: "q1", score: 10, total_questions: 10 }],
      isEnrolled: true,
    });

    expect(state.lessonStateById.get("l1")?.status).toBe("completed");
    expect(state.lessonStateById.get("l2")?.status).toBe("available");
  });

  it("keeps the next lesson blocked if the previous quiz was failed", () => {
    const state = buildCourseProgressState({
      lessons,
      quizzes,
      attempts: [{ quiz_id: "q1", score: 1, total_questions: 10 }],
      isEnrolled: true,
    });

    expect(state.lessonStateById.get("l1")?.status).toBe("available");
    expect(state.lessonStateById.get("l2")?.status).toBe("blocked");
  });

  it("makes the certificate available once all lessons and the final quiz are passed", () => {
    const state = buildCourseProgressState({
      lessons,
      quizzes,
      attempts: [
        { quiz_id: "q1", score: 10, total_questions: 10 },
        { quiz_id: "q2", score: 10, total_questions: 10 },
        { quiz_id: "final", score: 10, total_questions: 10 },
      ],
      isEnrolled: true,
    });

    expect(state.allLessonsCompleted).toBe(true);
    expect(state.progressPercentage).toBe(100);
    expect(state.certificateAvailable).toBe(true);
  });

  it("never makes the certificate available for a course with no final quiz", () => {
    const state = buildCourseProgressState({
      lessons,
      quizzes: [
        { id: "q1", lesson_id: "l1" },
        { id: "q2", lesson_id: "l2" },
      ],
      attempts: [
        { quiz_id: "q1", score: 10, total_questions: 10 },
        { quiz_id: "q2", score: 10, total_questions: 10 },
      ],
      isEnrolled: true,
    });

    expect(state.allLessonsCompleted).toBe(true);
    expect(state.finalQuizIds).toHaveLength(0);
    expect(state.certificateAvailable).toBe(false);
  });

  it("does not mark a lesson without any quiz as completed", () => {
    const state = buildCourseProgressState({
      lessons: [{ id: "l1", order: 1 }],
      quizzes: [],
      attempts: [],
      isEnrolled: true,
    });

    const lessonState = state.lessonStateById.get("l1");
    expect(lessonState?.missingRequiredQuiz).toBe(true);
    expect(lessonState?.isCompleted).toBe(false);
  });
});
