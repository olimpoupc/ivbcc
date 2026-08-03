"use client";

import { useState, useTransition } from "react";
import { publishEvent } from "./actions";

type Props = {
  id: string;
};

export default function PublishEventButton({ id }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handlePublish() {
    const confirmPublish = confirm("¿Deseas publicar este evento ahora?");

    if (!confirmPublish) return;

    setError("");
    startTransition(async () => {
      const result = await publishEvent(id);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handlePublish}
        disabled={isPending}
        className="rounded-full bg-green-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        {isPending ? "Publicando..." : "Publicar"}
      </button>
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
