"use client";

import { useState, useTransition } from "react";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTextareaClass,
  AdminFormField,
} from "@/components/admin/AdminFormPrimitives";
import { renderEventBroadcastEmail } from "@/lib/email-templates";
import {
  BROADCAST_BODY_MAX,
  BROADCAST_SUBJECT_MAX,
  validateBroadcastInput,
} from "@/lib/event-broadcast";
import { sendBroadcastTest, sendEventBroadcast, type BroadcastActionResult } from "./actions";

type Props = {
  eventId: string;
  eventTitle: string;
  eventUrl: string;
  recipientsCount: number;
  canSend: boolean;
};

export default function BroadcastForm({ eventId, eventTitle, eventUrl, recipientsCount, canSend }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<BroadcastActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const validationError = validateBroadcastInput(subject, body);

  function run(action: () => Promise<BroadcastActionResult>) {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await action());
      } catch {
        setResult({ success: false, error: "No hubo conexión con el servidor. Inténtalo de nuevo." });
      }
    });
  }

  function handleSend() {
    if (validationError) {
      setResult({ success: false, error: validationError });
      return;
    }
    const confirmed = window.confirm(
      `¿Enviar este mensaje a ${recipientsCount} ${recipientsCount === 1 ? "inscrito" : "inscritos"}? No se puede deshacer.`
    );
    if (!confirmed) return;
    run(() => sendEventBroadcast(eventId, subject, body));
  }

  const previewHtml = renderEventBroadcastEmail({
    recipientName: "Nombre del inscrito",
    eventTitle,
    eventUrl,
    body: body || "(El contenido del mensaje aparecerá aquí.)",
    unsubscribeUrl: "#",
  });

  return (
    <div className="space-y-5">
      <AdminFormField label="Asunto" hint={`Máximo ${BROADCAST_SUBJECT_MAX} caracteres.`}>
        <input
          type="text"
          value={subject}
          maxLength={BROADCAST_SUBJECT_MAX}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Ejemplo: Cambio de horario del evento"
          className={adminInputClass}
        />
      </AdminFormField>

      <AdminFormField
        label="Mensaje"
        hint={`Texto plano; deja una línea en blanco para separar párrafos. Máximo ${BROADCAST_BODY_MAX} caracteres. Se agrega automáticamente el enlace «Darme de baja».`}
      >
        <textarea
          value={body}
          rows={8}
          maxLength={BROADCAST_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          className={adminTextareaClass}
        />
      </AdminFormField>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowPreview((value) => !value)}
          className={adminSecondaryButtonClass}
        >
          {showPreview ? "Ocultar vista previa" : "Vista previa"}
        </button>
        <button
          type="button"
          disabled={isPending || Boolean(validationError)}
          onClick={() => run(() => sendBroadcastTest(eventId, subject, body))}
          className={adminSecondaryButtonClass}
        >
          Enviarme una prueba
        </button>
        <button
          type="button"
          disabled={isPending || !canSend || recipientsCount === 0}
          onClick={handleSend}
          className={adminPrimaryButtonClass}
        >
          {isPending ? "Enviando..." : `Enviar a ${recipientsCount} ${recipientsCount === 1 ? "inscrito" : "inscritos"}`}
        </button>
      </div>

      {result && (
        <p
          role={result.success ? "status" : "alert"}
          className={`rounded-2xl border p-4 text-sm font-bold ${
            result.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.success ? result.message : result.error}
        </p>
      )}

      {showPreview && (
        <iframe
          title="Vista previa del correo"
          sandbox=""
          srcDoc={previewHtml}
          className="h-[560px] w-full rounded-2xl border border-[var(--ivbcc-line)] bg-white"
        />
      )}
    </div>
  );
}
