import type { Metadata } from "next";
import Link from "next/link";
import { isWellFormedToken } from "@/lib/registration-token";
import UnsubscribeButton from "./UnsubscribeButton";

export const metadata: Metadata = {
  title: "Darme de baja",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Solo muestra el botón; la baja se hace por POST con la Server Action. */
export default async function DarmeDeBajaPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  return (
    <main className="premium-page">
      <section className="site-shell max-w-2xl py-16">
        <div className="premium-surface rounded-[30px] p-8 sm:p-10">
          <p className="kicker">Comunicaciones de eventos</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950 sm:text-4xl">Darme de baja</h1>
          {isWellFormedToken(token) ? (
            <>
              <p className="muted-copy mt-4">
                Si confirmas, dejaremos de enviarte mensajes sobre eventos de la IVBCC a este
                correo. Tus inscripciones no se cancelan.
              </p>
              <div className="mt-6">
                <UnsubscribeButton token={token} />
              </div>
            </>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="form-note border-amber-200 bg-amber-50/80 text-amber-900">
                Este enlace no es válido. Si quieres dejar de recibir mensajes, escríbenos por la
                página de contacto.
              </p>
              <Link href="/contacto" className="btn-secondary">
                Ir a contacto
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
