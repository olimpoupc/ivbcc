"use client";

import { useState, useTransition } from "react";
import { unsubscribeEmail, type UnsubscribeResult } from "./actions";

export default function UnsubscribeButton({ token }: { token: string }) {
  const [result, setResult] = useState<UnsubscribeResult | null>(null);
  const [isPending, startTransition] = useTransition();

  if (result?.success) {
    return (
      <p role="status" className="form-note border-green-200 bg-green-50/80 text-green-800">
        Listo. No volverás a recibir mensajes de la IVBCC sobre eventos en este correo.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              setResult(await unsubscribeEmail(token));
            } catch {
              setResult({
                success: false,
                error: "No pudimos conectarnos. Revisa tu internet e inténtalo nuevamente.",
              });
            }
          })
        }
        className="btn-primary w-full py-4 text-base font-black disabled:opacity-60"
      >
        {isPending ? "Procesando..." : "Darme de baja"}
      </button>
      {result && !result.success && (
        <p role="alert" className="form-note border-red-200 bg-red-50/80 text-red-800">
          {result.error}
        </p>
      )}
    </div>
  );
}
