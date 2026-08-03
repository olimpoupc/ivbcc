"use client";

import { useState, useTransition } from "react";
import { deleteCourse } from "./actions";

type Props = {
  id: string;
  imageUrl?: string | null;
};

export default function DeleteCourseButton({ id, imageUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    const confirmDelete = confirm("¿Seguro que deseas eliminar este curso?");

    if (!confirmDelete) return;

    setError("");
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
        disabled={isPending}
        className="mt-2 rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? "Eliminando..." : "Eliminar"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
