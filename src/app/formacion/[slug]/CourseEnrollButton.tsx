"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  courseId: string;
};

export default function CourseEnrollButton({ courseId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleEnroll() {
    setIsSubmitting(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSubmitting(false);
      setMessage("Debes iniciar sesión para inscribirte.");
      return;
    }

    const { error } = await supabase.from("course_enrollments").insert({
      course_id: courseId,
      user_id: user.id,
    });

    setIsSubmitting(false);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setMessage("Ya estás inscrito en este curso.");
        router.refresh();
        return;
      }

      setMessage("No pudimos completar tu inscripción.");
      return;
    }

    setMessage("Inscripción completada.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleEnroll}
        disabled={isSubmitting}
        className="btn-primary disabled:opacity-60"
      >
        {isSubmitting ? "Inscribiendo..." : "Inscribirme al curso"}
      </button>

      {message && <p className="form-note">{message}</p>}
    </div>
  );
}
