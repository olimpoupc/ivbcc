"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin-auth";

export type ActionResult = { success: true } | { success: false; error: string };

export type QuizOptionInput = {
  option_text: string;
  is_correct: boolean;
  order: number;
};

export type QuizQuestionInput = {
  question_text: string;
  order: number;
  options: QuizOptionInput[];
};

export type SaveQuizInput = {
  quizId: string | null;
  courseId: string;
  lessonId: string | null;
  title: string;
  status: "draft" | "published";
  questions: QuizQuestionInput[];
};

export type SaveQuizResult =
  | { success: true; quizId: string }
  | { success: false; error: string };

export async function saveQuiz(input: SaveQuizInput): Promise<SaveQuizResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { data, error } = await supabase.rpc("save_quiz", {
    p_quiz_id: input.quizId,
    p_course_id: input.courseId,
    p_lesson_id: input.lessonId,
    p_title: input.title,
    p_status: input.status,
    p_questions: input.questions,
  });

  if (error) {
    return {
      success: false,
      error: input.quizId
        ? "No se pudo actualizar el quiz."
        : "No se pudo crear el quiz.",
    };
  }

  revalidatePath(`/admin/formacion/${input.courseId}/quizzes`);
  return { success: true, quizId: data as string };
}

export async function deleteQuiz(
  id: string,
  courseId: string
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) return { success: false, error: "No se pudo eliminar el quiz." };

  revalidatePath(`/admin/formacion/${courseId}/quizzes`);
  return { success: true };
}

export async function publishQuiz(
  id: string,
  courseId: string
): Promise<ActionResult> {
  const { supabase, isAdmin } = await getAdminUser();
  if (!isAdmin) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("quizzes")
    .update({ status: "published" })
    .eq("id", id);

  if (error) return { success: false, error: "No se pudo publicar el quiz." };

  revalidatePath(`/admin/formacion/${courseId}/quizzes`);
  return { success: true };
}
