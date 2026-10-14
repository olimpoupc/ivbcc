"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import {
  cancelRegistration,
  confirmRegistrationManually,
  deleteRegistration,
  resendConfirmationLink,
  toggleRegistrationAttendance,
  type RegistrationActionResult,
} from "./actions";

type Props = {
  registrationId: string;
  eventId: string;
  fullName: string;
  status: string;
  checkedIn: boolean;
};

const itemClass =
  "block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-[var(--ivbcc-ink)] transition hover:bg-[var(--ivbcc-paper)] disabled:opacity-60";

export default function RegistrationActionsMenu({ registrationId, eventId, fullName, status, checkedIn }: Props) {
  const [isPending, startTransition] = useTransition();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function run(action: () => Promise<RegistrationActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    detailsRef.current?.removeAttribute("open");
    startTransition(async () => {
      try {
        const result = await action();
        alert(result.success ? result.message : result.error);
      } catch {
        alert("No hubo conexión con el servidor. Inténtalo de nuevo.");
      }
    });
  }

  const isPendingStatus = status === "pending";
  const isConfirmed = status === "confirmed";

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className="list-none cursor-pointer rounded-full border border-[var(--ivbcc-line)] bg-white px-3 py-1.5 text-xs font-extrabold text-[var(--ivbcc-navy)] transition hover:bg-[var(--ivbcc-paper)] [&::-webkit-details-marker]:hidden"
        aria-label={`Acciones para ${fullName}`}
      >
        {isPending ? "Guardando..." : "Acciones ▾"}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-60 space-y-1 rounded-2xl border border-[var(--ivbcc-line)] bg-white p-2 shadow-lg">
        {isPendingStatus && (
          <>
            <button
              type="button"
              disabled={isPending}
              className={itemClass}
              onClick={() => run(() => resendConfirmationLink(registrationId))}
            >
              Reenviar enlace de confirmación
            </button>
            <button
              type="button"
              disabled={isPending}
              className={itemClass}
              onClick={() =>
                run(
                  () => confirmRegistrationManually(registrationId),
                  `¿Confirmar manualmente la inscripción de ${fullName}? Se le enviará el correo de inscripción confirmada.`
                )
              }
            >
              Confirmar manualmente
            </button>
          </>
        )}
        {isConfirmed && (
          <button
            type="button"
            disabled={isPending}
            className={itemClass}
            onClick={() => run(() => toggleRegistrationAttendance(eventId, registrationId, !checkedIn))}
          >
            {checkedIn ? "Deshacer asistencia" : "Marcar asistencia"}
          </button>
        )}
        {(isPendingStatus || isConfirmed) && (
          <button
            type="button"
            disabled={isPending}
            className={itemClass}
            onClick={() =>
              run(
                () => cancelRegistration(registrationId),
                `¿Cancelar la inscripción de ${fullName}? Si vuelve a inscribirse, quedará pendiente de confirmar.`
              )
            }
          >
            Cancelar inscripción
          </button>
        )}
        <Link href={`/admin/eventos/${eventId}/mensajes`} className={itemClass}>
          Enviar mensaje a inscritos del evento
        </Link>
        <button
          type="button"
          disabled={isPending}
          className={`${itemClass} text-red-700 hover:bg-red-50`}
          onClick={() =>
            run(
              () => deleteRegistration(registrationId),
              `¿Eliminar la inscripción de ${fullName}? Esta acción no se puede deshacer.`
            )
          }
        >
          Eliminar
        </button>
      </div>
    </details>
  );
}
