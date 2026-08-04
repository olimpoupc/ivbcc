"use client";

import { useState, useTransition } from "react";
import { deleteCourse, getCourseDeletionImpact } from "./actions";

type Props = {
  id: string;
  imageUrl?: string | null;
};

export default function DeleteCourseButton({ id, imageUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");
    setIsChecking(true);
    const impact = await getCourseDeletionImpact(id);
    setIsChecking(false);

    if (!impact.success) {
      setError(impact.error);
      return;
    }

    const warningLines = ["¿Seguro que deseas eliminar este curso?", ""];

    if (impact.enrollments > 0 || impact.certificates > 0) {
      warningLines.push("También se eliminará permanentemente:");
      if (impact.enrollments > 0) {
        warningLines.push(`- ${impact.enrollments} inscripción(es) de estudiantes`);
      }
      if (impact.certificates > 0) {
        warningLines.push(
          `- ${impact.certificates} certificado(s) emitido(s): sus enlaces de verificación pública dejarán de funcionar`
        );
      }
      warningLines.push("- Todas sus lecciones, quizzes e intentos asociados", "");
    }

    warningLines.push("Esta acción no se puede deshacer.");

    const confirmDelete = confirm(warningLines.join("\n"));
    if (!confirmDelete) return;

    startTransition(async () => {
      const result = await deleteCourse(id, imageUrl ?? null);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending || isChecking}
        className="mt-2 rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? "Eliminando..." : isChecking ? "Verificando..." : "Eliminar"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
