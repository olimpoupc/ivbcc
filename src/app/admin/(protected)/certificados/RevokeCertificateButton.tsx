"use client";

import { useState, useTransition } from "react";
import { revokeCertificate } from "./actions";

type Props = {
  certificateId: string;
  disabled?: boolean;
};

export default function RevokeCertificateButton({
  certificateId,
  disabled = false,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleRevoke() {
    const confirmed = window.confirm(
      "¿Seguro que deseas revocar este certificado?"
    );

    if (!confirmed) return;

    setMessage("");
    startTransition(async () => {
      const result = await revokeCertificate(certificateId);
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleRevoke}
        disabled={disabled || isPending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? "Revocando..." : "Revocar"}
      </button>
      {message ? <p className="text-xs text-gray-500">{message}</p> : null}
    </div>
  );
}
