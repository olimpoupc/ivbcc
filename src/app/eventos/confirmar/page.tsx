import type { Metadata } from "next";
import Link from "next/link";
import { formatEventDate } from "@/lib/event-calendar";
import { hashToken, isWellFormedToken } from "@/lib/registration-token";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import ConfirmRegistrationButton from "./ConfirmRegistrationButton";

export const metadata: Metadata = {
  title: "Confirmar inscripción",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type PendingRegistration = {
  full_name: string;
  status: string;
  events: { title: string; event_date: string; location: string | null } | null;
};

/**
 * Solo LEE (GET): muestra a qué evento corresponde el enlace. La confirmación
 * se hace con el botón, que ejecuta una Server Action (POST).
 */
export default async function ConfirmarInscripcionPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  let registration: PendingRegistration | null = null;
  if (isWellFormedToken(token)) {
    try {
      const { data } = await createSupabaseServiceRoleClient()
        .from("event_registrations")
        .select("full_name,status,events(title,event_date,location)")
        .eq("confirmation_token_hash", hashToken(token))
        .maybeSingle();
      registration = data as PendingRegistration | null;
    } catch (error) {
      console.error("Error al cargar la inscripción por token:", error);
    }
  }

  const isUsable = Boolean(registration?.events && registration.status === "pending");

  return (
    <main className="premium-page">
      <section className="site-shell max-w-2xl py-16">
        <div className="premium-surface rounded-[30px] p-8 sm:p-10">
          <p className="kicker">Inscripción a eventos</p>
          <h1 className="section-title mt-3 text-3xl text-gray-950 sm:text-4xl">
            Confirma tu inscripción
          </h1>

          {isUsable && registration?.events ? (
            <>
              <p className="muted-copy mt-4">
                Hola {registration.full_name}, confirma tu inscripción a:
              </p>
              <dl className="mt-5 space-y-2 rounded-2xl border border-[#e8e2d6] bg-[#f6f1e8] p-5 text-sm">
                <div>
                  <dt className="font-bold text-gray-500">Evento</dt>
                  <dd className="text-base font-extrabold text-gray-950">
                    {registration.events.title}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-gray-500">Fecha</dt>
                  <dd className="text-gray-900">
                    {formatEventDate(registration.events.event_date)}
                  </dd>
                </div>
                {registration.events.location && (
                  <div>
                    <dt className="font-bold text-gray-500">Lugar</dt>
                    <dd className="text-gray-900">{registration.events.location}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-6">
                <ConfirmRegistrationButton token={token as string} />
              </div>
            </>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="form-note border-amber-200 bg-amber-50/80 text-amber-900">
                Este enlace no es válido o ya fue usado. Si ya confirmaste, tu inscripción
                está lista. Si el enlace venció, vuelve a inscribirte desde la página del
                evento para recibir uno nuevo.
              </p>
              <Link href="/eventos" className="btn-secondary">
                Ver eventos
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
