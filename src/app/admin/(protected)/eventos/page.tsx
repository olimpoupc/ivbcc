import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DeleteEventButton from "./DeleteEventButton";
import PublishEventButton from "./PublishEventButton";

const statusConfig = {
  published: {
    label: "Publicado",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  scheduled: {
    label: "Programado",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  draft: {
    label: "Borrador",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function AdminEventosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: eventos } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Administración
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Administrar eventos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Gestiona eventos publicados, programados, borradores y cancelados.
          </p>
        </div>

        <Link
          href="/admin/eventos/crear"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          + Crear nuevo evento
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {eventos?.map((evento, index) => {
          const status = evento.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;

          return (
            <article
              key={evento.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-44 bg-gray-100">
                {evento.image_url ? (
                  <Image
                    src={evento.image_url}
                    alt={evento.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Eventos"
                    subtitle="Vista previa sin portada."
                    className="h-full"
                  />
                )}

                <span
                  className={`absolute left-4 top-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${currentStatus.className}`}
                >
                  {currentStatus.label}
                </span>
              </div>

              <div className="flex min-h-64 flex-col p-5">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {evento.slug}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-gray-950">
                    {evento.title}
                  </h2>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
                    {evento.description}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Fecha del evento
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {formatDateTimeColombia(evento.event_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Ubicación
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {evento.location || "Sin ubicación"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {evento.status === "draft" && (
                    <PublishEventButton id={evento.id} />
                  )}

                  <Link
                    href={`/admin/eventos/${evento.id}/inscritos`}
                    className="mt-2 rounded-lg border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver inscritos
                  </Link>
                  <Link
                    href={`/admin/eventos/${evento.id}/editar`}
                    className="mt-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                  >
                    Editar
                  </Link>
                  <DeleteEventButton id={evento.id} imageUrl={evento.image_url} />
                </div>
              </div>
            </article>
          );
        })}

        {eventos?.length === 0 && (
          <div className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-gray-500 md:col-span-2 xl:col-span-3">
            Aún no hay eventos registrados.
          </div>
        )}
      </section>
    </main>
  );
}
