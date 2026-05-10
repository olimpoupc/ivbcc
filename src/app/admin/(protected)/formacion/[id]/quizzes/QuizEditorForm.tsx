"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AdminPanelCard } from "@/components/admin/AdminPrimitives";
import {
  AdminFormField,
  AdminRadioCard,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from "@/components/admin/AdminFormPrimitives";

type QuizStatus = "draft" | "published";

type Lesson = {
  id: string;
  title: string;
  order: number;
};

type QuizQuestionState = {
  localId: string;
  questionText: string;
  order: number;
  options: QuizOptionState[];
};

type QuizOptionState = {
  localId: string;
  optionText: string;
  isCorrect: boolean;
  order: number;
};

type Props = {
  courseId: string;
  mode: "create" | "edit";
  quizId?: string;
};

function createOption(order: number): QuizOptionState {
  return {
    localId: crypto.randomUUID(),
    optionText: "",
    isCorrect: false,
    order,
  };
}

function createQuestion(order: number): QuizQuestionState {
  return {
    localId: crypto.randomUUID(),
    questionText: "",
    order,
    options: [createOption(1), createOption(2)],
  };
}

export default function QuizEditorForm({ courseId, mode, quizId }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<QuizStatus>("draft");
  const [lessonId, setLessonId] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<QuizQuestionState[]>([
    createQuestion(1),
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id,title,order")
        .eq("course_id", courseId)
        .order("order", { ascending: true });

      if (!isMounted) return;

      if (lessonsError) {
        alert("No se pudieron cargar las lecciones del curso.");
        console.error(lessonsError);
        setIsLoading(false);
        return;
      }

      setLessons((lessonsData || []) as Lesson[]);

      if (mode === "create" || !quizId) {
        setIsLoading(false);
        return;
      }

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id,title,status,lesson_id")
        .eq("id", quizId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (!isMounted) return;

      if (quizError || !quizData) {
        alert("No se pudo cargar el quiz.");
        console.error(quizError);
        router.push(`/admin/formacion/${courseId}/quizzes`);
        return;
      }

      setTitle(quizData.title || "");
      setStatus((quizData.status as QuizStatus) || "draft");
      setLessonId(quizData.lesson_id || "");

      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("id,question_text,order")
        .eq("quiz_id", quizId)
        .order("order", { ascending: true });

      if (!isMounted) return;

      if (questionsError) {
        alert("No se pudieron cargar las preguntas del quiz.");
        console.error(questionsError);
        setIsLoading(false);
        return;
      }

      const questionIds = (questionsData || []).map((question) => question.id);
      const { data: optionsData, error: optionsError } =
        questionIds.length > 0
          ? await supabase
              .from("quiz_options")
              .select("id,question_id,option_text,is_correct,order")
              .in("question_id", questionIds)
              .order("order", { ascending: true })
          : { data: [], error: null };

      if (!isMounted) return;

      if (optionsError) {
        alert("No se pudieron cargar las opciones del quiz.");
        console.error(optionsError);
        setIsLoading(false);
        return;
      }

      const mappedQuestions = (questionsData || []).map((question) => ({
        localId: crypto.randomUUID(),
        questionText: question.question_text || "",
        order: question.order || 1,
        options: (optionsData || [])
          .filter((option) => option.question_id === question.id)
          .map((option) => ({
            localId: crypto.randomUUID(),
            optionText: option.option_text || "",
            isCorrect: Boolean(option.is_correct),
            order: option.order || 1,
          })),
      }));

      setQuestions(
        mappedQuestions.length > 0 ? mappedQuestions : [createQuestion(1)]
      );
      setIsLoading(false);
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [courseId, mode, quizId, router]);

  function addQuestion() {
    setQuestions((currentQuestions) => [
      ...currentQuestions,
      createQuestion(currentQuestions.length + 1),
    ]);
  }

  function removeQuestion(localId: string) {
    setQuestions((currentQuestions) => {
      if (currentQuestions.length === 1) return currentQuestions;

      return currentQuestions
        .filter((question) => question.localId !== localId)
        .map((question, index) => ({
          ...question,
          order: index + 1,
          options: question.options.map((option, optionIndex) => ({
            ...option,
            order: optionIndex + 1,
          })),
        }));
    });
  }

  function updateQuestion(
    localId: string,
    field: "questionText" | "order",
    value: string | number
  ) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.localId === localId
          ? {
              ...question,
              [field]: value,
            }
          : question
      )
    );
  }

  function addOption(questionLocalId: string) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.localId === questionLocalId
          ? {
              ...question,
              options: [
                ...question.options,
                createOption(question.options.length + 1),
              ],
            }
          : question
      )
    );
  }

  function removeOption(questionLocalId: string, optionLocalId: string) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) => {
        if (question.localId !== questionLocalId || question.options.length === 2)
          return question;

        return {
          ...question,
          options: question.options
            .filter((option) => option.localId !== optionLocalId)
            .map((option, index) => ({
              ...option,
              order: index + 1,
            })),
        };
      })
    );
  }

  function updateOption(
    questionLocalId: string,
    optionLocalId: string,
    field: "optionText" | "isCorrect" | "order",
    value: string | boolean | number
  ) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) => {
        if (question.localId !== questionLocalId) return question;

        return {
          ...question,
          options: question.options.map((option) => {
            if (option.localId !== optionLocalId) {
              return field === "isCorrect"
                ? { ...option, isCorrect: false }
                : option;
            }

            return {
              ...option,
              [field]: value,
            };
          }),
        };
      })
    );
  }

  function validateQuiz() {
    if (!title.trim()) {
      alert("El quiz debe tener un título.");
      return false;
    }

    if (questions.length === 0) {
      alert("Debes agregar al menos una pregunta.");
      return false;
    }

    for (const question of questions) {
      if (!question.questionText.trim()) {
        alert("Todas las preguntas deben tener texto.");
        return false;
      }

      if (question.options.length < 2) {
        alert("Cada pregunta debe tener al menos dos opciones.");
        return false;
      }

      if (question.options.some((option) => !option.optionText.trim())) {
        alert("Todas las opciones deben tener texto.");
        return false;
      }

      if (!question.options.some((option) => option.isCorrect)) {
        alert("Cada pregunta debe tener una respuesta correcta.");
        return false;
      }
    }

    return true;
  }

  async function saveQuestionsAndOptions(targetQuizId: string) {
    for (const question of questions) {
      const { data: insertedQuestion, error: questionError } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: targetQuizId,
          question_text: question.questionText.trim(),
          order: Number(question.order),
        })
        .select("id")
        .single();

      if (questionError || !insertedQuestion) {
        throw questionError || new Error("No se pudo crear la pregunta.");
      }

      const optionsPayload = question.options.map((option, index) => ({
        question_id: insertedQuestion.id,
        option_text: option.optionText.trim(),
        is_correct: option.isCorrect,
        order: Number(option.order || index + 1),
      }));

      const { error: optionsError } = await supabase
        .from("quiz_options")
        .insert(optionsPayload);

      if (optionsError) {
        throw optionsError;
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateQuiz()) return;

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const { data: insertedQuiz, error } = await supabase
          .from("quizzes")
          .insert({
            course_id: courseId,
            lesson_id: lessonId || null,
            title: title.trim(),
            status,
          })
          .select("id")
          .single();

        if (error || !insertedQuiz) {
          throw error || new Error("No se pudo crear el quiz.");
        }

        await saveQuestionsAndOptions(insertedQuiz.id);
      } else {
        const { error: quizError } = await supabase
          .from("quizzes")
          .update({
            lesson_id: lessonId || null,
            title: title.trim(),
            status,
          })
          .eq("id", quizId)
          .eq("course_id", courseId);

        if (quizError) {
          throw quizError;
        }

        const { error: deleteQuestionsError } = await supabase
          .from("quiz_questions")
          .delete()
          .eq("quiz_id", quizId);

        if (deleteQuestionsError) {
          throw deleteQuestionsError;
        }

        await saveQuestionsAndOptions(quizId!);
      }
    } catch (error) {
      alert(
        mode === "create"
          ? "No se pudo crear el quiz."
          : "No se pudo actualizar el quiz."
      );
      console.error(error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    alert(mode === "create" ? "Quiz creado correctamente" : "Quiz actualizado correctamente");
    router.push(`/admin/formacion/${courseId}/quizzes`);
    router.refresh();
  }

  if (isLoading) {
    return <AdminPanelCard>Cargando quiz...</AdminPanelCard>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <AdminPanelCard className="space-y-5">
      <AdminFormField label="Título del quiz">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className={adminInputClass}
        />
      </AdminFormField>

      <div className="grid gap-5 md:grid-cols-2">
        <AdminFormField label="Estado">
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <AdminRadioCard checked={status === "draft"}>
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === "draft"}
                onChange={() => setStatus("draft")}
              />
              Borrador
              </AdminRadioCard>
            </label>

            <label>
              <AdminRadioCard checked={status === "published"}>
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === "published"}
                onChange={() => setStatus("published")}
              />
              Publicado
              </AdminRadioCard>
            </label>
          </div>
        </AdminFormField>

        <AdminFormField label="Lección asociada">
          <select
            value={lessonId}
            onChange={(event) => setLessonId(event.target.value)}
            className={adminSelectClass}
          >
            <option value="">Quiz general del curso</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                Lección {lesson.order}: {lesson.title}
              </option>
            ))}
          </select>
        </AdminFormField>
      </div>
      </AdminPanelCard>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-2xl text-[var(--ivbcc-ink)]">Preguntas</h2>
          <button
            type="button"
            onClick={addQuestion}
            className={adminSecondaryButtonClass}
          >
            + Agregar pregunta
          </button>
        </div>

        {questions.map((question, questionIndex) => (
          <article
            key={question.localId}
            className="premium-surface space-y-4 rounded-[24px] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="section-title text-lg text-[var(--ivbcc-ink)]">
                Pregunta {questionIndex + 1}
              </h3>
              <button
                type="button"
                onClick={() => removeQuestion(question.localId)}
                className={adminSecondaryButtonClass}
              >
                Eliminar pregunta
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_120px]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Texto de la pregunta
                </label>
                <textarea
                  value={question.questionText}
                  onChange={(event) =>
                    updateQuestion(
                      question.localId,
                      "questionText",
                      event.target.value
                    )
                  }
                  required
                  rows={3}
                  className={adminTextareaClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Orden
                </label>
                <input
                  type="number"
                  min="1"
                  value={question.order}
                  onChange={(event) =>
                    updateQuestion(
                      question.localId,
                      "order",
                      Number(event.target.value)
                    )
                  }
                  className={adminInputClass}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">Opciones</p>
                <button
                  type="button"
                  onClick={() => addOption(question.localId)}
                  className={adminSecondaryButtonClass}
                >
                  + Agregar opción
                </button>
              </div>

              {question.options.map((option, optionIndex) => (
                <div
                  key={option.localId}
                  className="grid gap-3 rounded-2xl border border-[var(--ivbcc-line)] bg-white/80 p-4 md:grid-cols-[1fr_110px_160px_auto]"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Opción {optionIndex + 1}
                    </label>
                    <input
                      type="text"
                      value={option.optionText}
                      onChange={(event) =>
                        updateOption(
                          question.localId,
                          option.localId,
                          "optionText",
                          event.target.value
                        )
                      }
                      required
                      className={adminInputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Orden
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={option.order}
                      onChange={(event) =>
                        updateOption(
                          question.localId,
                          option.localId,
                          "order",
                          Number(event.target.value)
                        )
                      }
                      className={adminInputClass}
                    />
                  </div>

                  <label className="flex min-h-12 items-center gap-2 self-end rounded-2xl border border-[var(--ivbcc-line)] bg-white/75 px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-ink)]">
                    <input
                      type="radio"
                      name={`correct-option-${question.localId}`}
                      checked={option.isCorrect}
                      onChange={() =>
                        updateOption(
                          question.localId,
                          option.localId,
                          "isCorrect",
                          true
                        )
                      }
                    />
                    Respuesta correcta
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      removeOption(question.localId, option.localId)
                    }
                    className={`${adminSecondaryButtonClass} self-end`}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push(`/admin/formacion/${courseId}/quizzes`)}
          className={adminSecondaryButtonClass}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className={adminPrimaryButtonClass}
        >
          {isSubmitting
            ? "Guardando..."
            : mode === "create"
              ? "Guardar quiz"
              : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
