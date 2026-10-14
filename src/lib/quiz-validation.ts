/**
 * Validación del editor de quizzes (panel admin). Pura: la usa el formulario
 * para mostrar errores en línea, con las mismas reglas que exige la función
 * save_quiz en la base de datos (supabase/migrations/20260803130000_validate_save_quiz.sql).
 */

export type QuizDraftOption = {
  optionText: string;
  isCorrect: boolean;
};

export type QuizDraftQuestion = {
  localId: string;
  questionText: string;
  options: QuizDraftOption[];
};

export type QuizValidation = {
  titleError: string | null;
  /** Errores por pregunta, indexados por localId. */
  questionErrors: Record<string, string[]>;
  /** Errores que no pertenecen a una pregunta concreta. */
  generalErrors: string[];
  errorCount: number;
  isValid: boolean;
};

export const MIN_OPTIONS_PER_QUESTION = 2;

export function validateQuizDraft(title: string, questions: QuizDraftQuestion[]): QuizValidation {
  const titleError = title.trim() ? null : "Escribe un título para el quiz.";
  const generalErrors =
    questions.length === 0 ? ["Agrega al menos una pregunta."] : [];
  const questionErrors: Record<string, string[]> = {};

  for (const question of questions) {
    const errors: string[] = [];

    if (!question.questionText.trim()) {
      errors.push("Escribe el texto de la pregunta.");
    }
    if (question.options.length < MIN_OPTIONS_PER_QUESTION) {
      errors.push(`Agrega al menos ${MIN_OPTIONS_PER_QUESTION} opciones.`);
    }
    const emptyOptions = question.options.filter((option) => !option.optionText.trim()).length;
    if (emptyOptions > 0) {
      errors.push(
        emptyOptions === 1
          ? "Hay 1 opción sin texto."
          : `Hay ${emptyOptions} opciones sin texto.`
      );
    }
    if (!question.options.some((option) => option.isCorrect)) {
      errors.push("Marca cuál es la respuesta correcta.");
    }

    if (errors.length) questionErrors[question.localId] = errors;
  }

  const errorCount =
    (titleError ? 1 : 0) +
    generalErrors.length +
    Object.values(questionErrors).reduce((total, errors) => total + errors.length, 0);

  return { titleError, questionErrors, generalErrors, errorCount, isValid: errorCount === 0 };
}
