"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  courseId: string;
  lessonId: string;
  initialCompleted: boolean;
  canMarkComplete?: boolean;
  blockedMessage?: string;
};

export default function LessonProgressButton({
  courseId,
  lessonId,
  initialCompleted,
  canMarkComplete = true,
  blockedMessage = "",
}: Props) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      setUserId(user?.id || null);
      setIsLoadingUser(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleComplete() {
    if (!userId || isCompleted) return;

    setIsSubmitting(true);

    const { error } = await supabase.from("course_progress").upsert(
      {
        user_id: userId,
        course_id: courseId,
        lesson_id: lessonId,
        completed: true,
      },
      {
        onConflict: "user_id,lesson_id",
      }
    );

    setIsSubmitting(false);

    if (error) {
      alert("No pudimos guardar tu progreso.");
      console.error(error);
      return;
    }

    setIsCompleted(true);
    router.refresh();
  }

  if (isLoadingUser) {
    return <p className="text-sm font-medium text-gray-500">Cargando...</p>;
  }

  if (!userId) {
    return (
      <p className="text-sm font-medium text-gray-500">
        Inicia sesión para guardar tu progreso
      </p>
    );
  }

  if (isCompleted) {
    return (
      <p className="text-sm font-semibold text-green-700">
        Lección completada ✅
      </p>
    );
  }

  if (!canMarkComplete) {
    return <p className="text-sm font-medium text-amber-700">{blockedMessage}</p>;
  }

  return (
    <button
      type="button"
      onClick={handleComplete}
      disabled={isSubmitting}
      className="rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {isSubmitting ? "Guardando..." : "Marcar como completada"}
    </button>
  );
}
