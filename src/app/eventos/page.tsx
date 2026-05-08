import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 300;

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function EventosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: eventos, error } = await supabase
    .from("events")
    .select("id,title,slug,description,image_url,event_date,location,registration_enabled,status")
    .eq("status", "published")
    .order("event_date", { ascending: true });

  if (error) {
    return <main className="p-10">Error cargando eventos.</main>;
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
          IVBCC
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950 md:text-4xl">
          Eventos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Encuentros, actividades y espacios especiales para compartir como
          comunidad.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {eventos?.map((evento, index) => (
          <article
            key={evento.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg"
          >
            {evento.image_url ? (
              <div className="relative h-52 w-full overflow-hidden rounded-t-2xl bg-gray-100">
                <Image
                  src={evento.image_url}
                  alt={evento.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  priority={index === 0}
                  className="object-cover object-center"
                />
              </div>
            ) : (
              <EmptyImagePlaceholder
                label="IVBCC Eventos"
                subtitle="Encuentros y actividades para vivir en comunidad."
                className="h-52 rounded-t-2xl"
              />
            )}

            <div className="p-6">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Evento
                </span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    evento.registration_enabled
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {evento.registration_enabled
                    ? "Inscripciones disponibles"
                    : "Inscripciones cerradas"}
                </span>
              </div>

              <p className="mb-3 text-sm font-medium text-gray-500">
                {formatDateTimeColombia(evento.event_date)}
              </p>

              <h2 className="mb-2 text-xl font-bold leading-snug text-gray-950">
                {evento.title}
              </h2>

              <p className="mb-5 text-sm font-medium text-gray-500">
                {evento.location || "Ubicación por confirmar"}
              </p>

              <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                {evento.description}
              </p>

              <Link
                href={`/eventos/${evento.slug}`}
                className="mt-5 inline-block font-semibold text-[var(--ivbcc-navy)] hover:underline"
              >
                Ver detalle →
              </Link>
            </div>
          </article>
        ))}

        {eventos?.length === 0 && (
          <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-sm md:col-span-2 lg:col-span-3">
            No hay eventos publicados en este momento.
          </div>
        )}
      </div>
    </main>
  );
}
