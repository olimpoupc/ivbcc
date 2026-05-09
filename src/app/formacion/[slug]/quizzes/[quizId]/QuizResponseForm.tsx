"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {infoMessage && (
        <div className="form-note border-blue-200 bg-blue-50/80 text-blue-800">
          {infoMessage}
        </div>
      )}

      {result && (
        <div className="premium-surface rounded-[28px] p-6">
          <p className="kicker">Resultado</p>
          <h2 className="section-title mt-3 text-3xl text-gray-950">
            {result.passed ? "Aprobaste" : "Sigue intentándolo"}
          </h2>
          <p className="muted-copy mt-3 text-sm">
            Obtuviste {result.score} de {result.total} respuestas correctas.
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#f3eee4]">
            <div
              className="h-full rounded-full bg-[var(--ivbcc-gold)]"
              style={{ width: `${result.percentage}%` }}
            />
          </div>
          <p className="mt-3 text-sm font-extrabold text-[var(--ivbcc-navy)]">
            Porcentaje: {result.percentage}%
          </p>
        </div>
      )}

      {!result && currentQuestion && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <article className="premium-surface rounded-[28px] p-6">
            <p className="kicker">
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </p>

            <h2 className="section-title mt-3 text-2xl text-gray-950">
              {currentQuestion.question_text}
            </h2>

            <div className="mt-4 space-y-3">
              {currentQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    selectedAnswer === option.id
                      ? "border-[var(--ivbcc-gold)] bg-[#f6f1e8] text-gray-950"
                      : "border-[#e8e2d6] bg-white/72 text-slate-700 hover:border-[var(--ivbcc-gold)]/50"
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
              <p className="form-note mt-4 border-red-200 bg-red-50/80 text-red-800">
                {stepError}
              </p>
            )}
          </article>

          <div className="flex justify-end">
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-60"
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
