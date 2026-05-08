import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DownloadRegistrationsCsvButton from "./DownloadRegistrationsCsvButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function EventoInscritosPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: evento, error: eventError }, { data: inscritos, error: registrationsError }] =
    await Promise.all([
      supabase.from("events").select("id,title").eq("id", id).maybeSingle(),
      supabase
        .from("event_registrations")
        .select("id,full_name,email,phone,created_at")
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (eventError || !evento) {
    return <main className="p-10">Evento no encontrado.</main>;
  }

  if (registrationsError) {
    return <main className="p-10">Error cargando inscritos.</main>;
  }

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Eventos
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Inscritos del evento
          </h1>
          <p className="mt-2 text-sm text-gray-500">{evento.title}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <DownloadRegistrationsCsvButton registrations={inscritos || []} />
          <Link
            href="/admin/eventos"
            className="inline-flex w-fit items-center justify-center rounded-lg border px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Volver a eventos
          </Link>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-gray-950">
            {inscritos?.length || 0}
          </p>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Total de inscritos
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="grid grid-cols-12 border-b bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-600">
          <div className="col-span-3">Nombre completo</div>
          <div className="col-span-3">Correo</div>
          <div className="col-span-2">Teléfono</div>
          <div className="col-span-4">Fecha de inscripción</div>
        </div>

        {inscritos?.length ? (
          inscritos.map((inscrito) => (
            <article
              key={inscrito.id}
              className="grid grid-cols-12 items-center border-b px-5 py-4 text-sm"
            >
              <div className="col-span-3 font-semibold text-gray-900">
                {inscrito.full_name}
              </div>
              <div className="col-span-3 text-gray-600">{inscrito.email}</div>
              <div className="col-span-2 text-gray-600">
                {inscrito.phone || "Sin teléfono"}
              </div>
              <div className="col-span-4 text-gray-600">
                {formatDateTimeColombia(inscrito.created_at)}
              </div>
            </article>
          ))
        ) : (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            Este evento aún no tiene inscritos.
          </div>
        )}
      </section>
    </main>
  );
}
