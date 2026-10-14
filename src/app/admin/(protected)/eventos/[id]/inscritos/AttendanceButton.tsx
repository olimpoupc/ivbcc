"use client";

import { useTransition } from "react";
import { setAttendance } from "./actions";

type Props = {
  eventId: string;
  registrationId: string;
  checkedInAt: string | null;
};

export default function AttendanceButton({ eventId, registrationId, checkedInAt }: Props) {
  const [isPending, startTransition] = useTransition();
  const attended = Boolean(checkedInAt);

  function toggle() {
    startTransition(async () => {
      const result = await setAttendance(eventId, registrationId, !attended);
      if (!result.success) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition disabled:opacity-60 ${
        attended
          ? "border border-[var(--ivbcc-line)] bg-white text-[var(--ivbcc-muted)] hover:bg-[var(--ivbcc-paper)]"
          : "bg-emerald-600 text-white hover:bg-emerald-700"
      }`}
    >
      {isPending ? "Guardando..." : attended ? "Deshacer" : "Marcó asistencia"}
    </button>
  );
}
