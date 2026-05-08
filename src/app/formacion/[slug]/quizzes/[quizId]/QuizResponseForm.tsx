"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type QuizOption = {
  id: string;
  option_text: string;
  is_correct: boolean;
  order: number;
};

type QuizQuestion = {
  id: string;
  question_text: string;
  order: number;
  options: QuizOption[];
};

type Props = {
  quizId: string;
  questions: QuizQuestion[];
};

export default function QuizResponseForm({ quizId, questions }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
  } | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  function handleSelect(questionId: string, optionId: string) {
    setStepError("");
    setInfoMessage("");
    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));
  }

  function handleNext() {
    if (!currentQuestion) {
      return;
    }

    if (!answers[currentQuestion.id]) {
      setStepError("Selecciona una respuesta para continuar.");
      return;
    }

    setStepError("");
    setCurrentQuestionIndex((current) => current + 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentQuestion || !answers[currentQuestion.id]) {
      setStepError("Selecciona una respuesta antes de enviar.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Debes iniciar sesión para responder este quiz.");
      return;
    }

    const { data: existingAttempts, error: existingAttemptError } = await supabase
      .from("quiz_attempts")
      .select("score,total_questions,created_at")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingAttemptError) {
      console.error(existingAttemptError);
      setStepError("No pudimos validar tu intento anterior.");
      return;
    }

    const existingAttempt = existingAttempts?.[0] ?? null;

    if (existingAttempt) {
      const savedPercentage = existingAttempt.total_questions
        ? Math.round(
            (existingAttempt.score / existingAttempt.total_questions) * 100
          )
        : 0;

      setInfoMessage("Ya respondiste este quiz.");
      setResult({
        score: existingAttempt.score,
        total: existingAttempt.total_questions,
        percentage: savedPercentage,
        passed: savedPercentage >= 60,
      });
      return;
    }

    let score = 0;

    for (const question of questions) {
      const selectedOptionId = answers[question.id];
      const selectedOption = question.options.find(
        (option) => option.id === selectedOptionId
      );

      if (selectedOption?.is_correct) {
        score += 1;
      }
    }

    setStepError("");
    setIsSubmitting(true);

    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: quizId,
      user_id: user.id,
      score,
      total_questions: questions.length,
    });

    setIsSubmitting(false);

    if (error) {
      alert("No pudimos guardar tu intento.");
      console.error(error);
      return;
    }

    const percentage = questions.length
      ? Math.round((score / questions.length) * 100)
      : 0;

    setResult({
      score,
      total: questions.length,
      percentage,
      passed: percentage >= 60,
    });
  }

  return (
    <div className="space-y-6">
      {infoMessage && (
        <div className="rounded-2xl bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700">
          {infoMessage}
        </div>
      )}

      {result && (
        <div className="rounded-2xl bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
          Obtuviste {result.score} de {result.total} respuestas correctas.
          <div className="mt-2">Porcentaje: {result.percentage}%</div>
          <div className="mt-2">
            {result.passed ? "Aprobaste ✅" : "No aprobaste ❌"}
          </div>
        </div>
      )}

      {!result && currentQuestion && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-500">
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </p>

            <h2 className="mt-2 text-lg font-bold text-gray-950">
              {currentQuestion.question_text}
            </h2>

            <div className="mt-4 space-y-3">
              {currentQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    selectedAnswer === option.id
                      ? "border-[var(--ivbcc-gold)] bg-yellow-50 text-gray-900"
                      : "text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={selectedAnswer === option.id}
                    onChange={() => handleSelect(currentQuestion.id, option.id)}
                  />
                  {option.option_text}
                </label>
              ))}
            </div>

            {stepError && (
              <p className="mt-4 text-sm font-medium text-red-600">
                {stepError}
              </p>
            )}
          </article>

          <div className="flex justify-end">
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting ? "Enviando..." : "Enviar respuestas"}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
