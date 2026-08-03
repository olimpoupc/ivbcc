"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalErrorBoundary({
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
    <main className="premium-page">
      <section className="site-shell-wide py-16 md:py-24">
        <div className="page-hero">
          <div className="hero-inner flex flex-col items-start gap-6 px-6 py-14 md:px-10 md:py-20">
            <span className="badge">Algo salió mal</span>
            <h1 className="display-title max-w-2xl text-5xl md:text-6xl">
              No pudimos cargar esta página
            </h1>
            <p className="max-w-xl text-base leading-8 text-white/72 md:text-lg">
              Ocurrió un error inesperado. Puedes intentarlo de nuevo o volver
              al inicio; si el problema continúa, cuéntanos qué pasó.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button type="button" onClick={reset} className="btn-primary">
                Intentar de nuevo
              </button>
              <Link
                href="/"
                className="btn-ghost border-white/20 bg-white/10 text-white hover:bg-white/15"
              >
                Volver al inicio
              </Link>
              <Link
                href="/contacto"
                className="btn-ghost border-white/20 bg-white/10 text-white hover:bg-white/15"
              >
                Contáctanos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
