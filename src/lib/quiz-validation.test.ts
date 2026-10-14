import { describe, expect, it } from "vitest";
import { validateQuizDraft, type QuizDraftQuestion } from "./quiz-validation";

const validQuestion = (localId: string): QuizDraftQuestion => ({
  localId,
  questionText: "¿Quién escribió Romanos?",
  options: [
    { optionText: "Pablo", isCorrect: true },
    { optionText: "Pedro", isCorrect: false },
  ],
});

describe("validateQuizDraft", () => {
  it("acepta un quiz completo", () => {
    const result = validateQuizDraft("Quiz 1", [validQuestion("q1")]);
    expect(result.isValid).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it("exige título y al menos una pregunta", () => {
    const result = validateQuizDraft("   ", []);
    expect(result.titleError).toBe("Escribe un título para el quiz.");
    expect(result.generalErrors).toEqual(["Agrega al menos una pregunta."]);
    expect(result.errorCount).toBe(2);
  });

  it("señala por pregunta: texto vacío, pocas opciones, opciones vacías y sin correcta", () => {
    const result = validateQuizDraft("Quiz", [
      validQuestion("ok"),
      { localId: "bad", questionText: " ", options: [{ optionText: "", isCorrect: false }] },
    ]);
    expect(result.questionErrors.ok).toBeUndefined();
    expect(result.questionErrors.bad).toEqual([
      "Escribe el texto de la pregunta.",
      "Agrega al menos 2 opciones.",
      "Hay 1 opción sin texto.",
      "Marca cuál es la respuesta correcta.",
    ]);
    expect(result.errorCount).toBe(4);
    expect(result.isValid).toBe(false);
  });

  it("cuenta varias opciones sin texto en plural", () => {
    const result = validateQuizDraft("Quiz", [
      {
        localId: "q",
        questionText: "Pregunta",
        options: [
          { optionText: "", isCorrect: true },
          { optionText: " ", isCorrect: false },
        ],
      },
    ]);
    expect(result.questionErrors.q).toEqual(["Hay 2 opciones sin texto."]);
  });
});
