"use client";

import { useEffect } from "react";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
} from "@/components/admin/AdminPrimitives";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Algo salió mal"
        subtitle="Ocurrió un error inesperado cargando esta sección del panel."
        icon="activity"
      />
      <AdminEmptyState
        title="No pudimos cargar esta página"
        description="Intenta de nuevo. Si el problema continúa, vuelve al dashboard."
        icon="activity"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-[var(--ivbcc-gold)] px-5 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] shadow-sm transition hover:opacity-90"
            >
              Intentar de nuevo
            </button>
            <AdminActionButton href="/admin/dashboard" icon="arrow" tone="outline">
              Volver al dashboard
            </AdminActionButton>
          </div>
        }
      />
    </AdminPageShell>
  );
}
