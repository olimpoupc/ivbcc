"use client";

import { useState, useTransition } from "react";
import { deleteQuiz, getQuizDeletionImpact } from "./actions";

type Props = {
  id: string;
  courseId: string;
};

export default function DeleteQuizButton({ id, courseId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");
    setIsChecking(true);
    const impact = await getQuizDeletionImpact(id);
    setIsChecking(false);

    if (!impact.success) {
      setError(impact.error);
      return;
    }

    const warningLines = ["¿Seguro que deseas eliminar este quiz?", ""];

    if (impact.attempts > 0) {
      warningLines.push(
        `También se eliminará permanentemente el historial de ${impact.attempts} intento(s) que ya respondieron los estudiantes. Si alguien ya lo había aprobado, esa lección volverá a bloquearse.`,
        ""
      );
    }

    warningLines.push("Esta acción no se puede deshacer.");

    const confirmDelete = confirm(warningLines.join("\n"));
    if (!confirmDelete) return;

    setError("");
    startTransition(async () => {
      const result = await deleteQuiz(id, courseId);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending || isChecking}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? "Eliminando..." : isChecking ? "Verificando..." : "Eliminar"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
