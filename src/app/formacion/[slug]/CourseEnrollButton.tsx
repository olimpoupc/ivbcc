"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enrollInCourse } from "./enroll-actions";

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

    try {
      const result = await enrollInCourse(courseId);
      setMessage(result.success ? result.message : result.error);
      if (result.success) router.refresh();
    } catch {
      setMessage("No pudimos conectarnos. Revisa tu internet e inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
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
