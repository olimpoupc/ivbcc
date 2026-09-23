"use server";

import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import { getQuizPercentage, isQuizAttemptApproved } from "@/lib/course-progress";
import { getUserFacingErrorMessage } from "@/lib/user-facing-error";

export type SubmitQuizAttemptResult =
  | {
      success: true;
      score: number;
      total: number;
      percentage: number;
      passed: boolean;
    }
  | { success: false; error: string };

export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, string>
): Promise<SubmitQuizAttemptResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para responder este quiz." };
  }

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, course_id")
    .eq("id", quizId)
    .maybeSingle();

  if (quizError || !quiz) {
    return { success: false, error: "Quiz no encontrado." };
  }

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", quiz.course_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!enrollment) {
    return { success: false, error: "Debes inscribirte al curso para responder este quiz." };
  }

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("id")
    .eq("quiz_id", quizId);

  if (questionsError || !questions?.length) {
    return { success: false, error: "No se encontraron preguntas para este quiz." };
  }

  const questionIds = questions.map((question) => question.id);

  // quiz_options (and is_correct specifically) is admin-only under RLS — the
  // student's own session, already verified above, can't read it. This is
  // the one place in the app allowed to see correct answers, to grade the
  // attempt server-side.
  const { data: options, error: optionsError } = await createSupabaseServiceRoleClient()
    .from("quiz_options")
    .select("id, question_id, is_correct")
    .in("question_id", questionIds);

  if (optionsError) {
    return { success: false, error: "No pudimos cargar las opciones del quiz." };
  }

  // Grading happens here, server-side, so correct answers never reach the
  // browser and a submitted score can never be spoofed by the client.
  let score = 0;
  for (const questionId of questionIds) {
    const selectedOptionId = answers[questionId];
    const isCorrect = (options || []).some(
      (option) =>
        option.question_id === questionId &&
        option.id === selectedOptionId &&
        option.is_correct
    );
    if (isCorrect) score += 1;
  }

  const total = questionIds.length;
  const attempt = { score, total_questions: total };

  // Written with the service-role client on purpose: there is no INSERT policy
  // on quiz_attempts for signed-in users, because otherwise anyone could call the
  // Supabase API directly and insert an attempt with any score, skipping the
  // grading above. Everything that makes this write legitimate has been checked
  // by now (verified session, visible quiz, enrollment, server-side grading), and
  // user_id comes from the verified session, never from the client.
  const { error: insertError } = await createSupabaseServiceRoleClient().from("quiz_attempts").insert({
    quiz_id: quizId,
    user_id: user.id,
    score,
    total_questions: total,
  });

  if (insertError) {
    console.error(insertError);
    return {
      success: false,
      error: getUserFacingErrorMessage(insertError, "No pudimos guardar tu intento."),
    };
  }

  return {
    success: true,
    score,
    total,
    percentage: getQuizPercentage(attempt),
    passed: isQuizAttemptApproved(attempt),
  };
}
