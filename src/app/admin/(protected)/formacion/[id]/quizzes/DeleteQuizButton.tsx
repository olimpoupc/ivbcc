"use client";

import { useState, useTransition } from "react";
import { deleteQuiz } from "./actions";

type Props = {
  id: string;
  courseId: string;
};

export default function DeleteQuizButton({ id, courseId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    const confirmDelete = confirm("¿Seguro que deseas eliminar este quiz?");

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
        disabled={isPending}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? "Eliminando..." : "Eliminar"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
