import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DeleteLiveStreamButton from "./DeleteLiveStreamButton";
import PublishLiveStreamButton from "./PublishLiveStreamButton";

const statusConfig = {
  published: {
    label: "Publicado",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  draft: {
    label: "Borrador",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
};

const categoryConfig = {
  live: "En vivo",
  sunday: "Dominical",
  preaching: "Prédica",
  teaching: "Enseñanza",
  special: "Especial",
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function AdminEnVivoPage() {
  const supabase = await createSupabaseServerClient();
  const { data: liveStreams } = await supabase
    .from("live_streams")
    .select("*")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Administración
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Administrar transmisiones
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Gestiona transmisiones en vivo, dominicales, prédicas, enseñanzas
            y videos especiales de IVBCC.
          </p>
        </div>

        <Link
          href="/admin/en-vivo/crear"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          + Crear transmisión
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {liveStreams?.map((stream) => {
          const status = stream.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;
          const category =
            categoryConfig[stream.category as keyof typeof categoryConfig] ||
            "Transmisión";

          return (
            <article
              key={stream.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex min-h-80 flex-col p-5">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${currentStatus.className}`}
                  >
                    {currentStatus.label}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {category}
                  </span>
                  {stream.is_live && (
                    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm">
                      En vivo actual
                    </span>
                  )}
                  {stream.featured && (
                    <span className="inline-flex rounded-full border border-[var(--ivbcc-gold)] bg-[#f6f0dc] px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)] shadow-sm">
                      Destacado
                    </span>
                  )}
                </div>

                <div className="mt-5 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {stream.slug}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-gray-950">
                    {stream.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500">
                    {stream.description || "Sin descripción"}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Programación
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {formatDateTimeColombia(stream.scheduled_at)}
                    </p>
                  </div>

                  {stream.ends_at ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Finalización
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {formatDateTimeColombia(stream.ends_at)}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      YouTube
                    </p>
                    <a
                      href={stream.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 line-clamp-1 block text-sm font-medium text-[var(--ivbcc-navy)] hover:underline"
                    >
                      {stream.youtube_url}
                    </a>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {stream.status === "draft" && (
                    <PublishLiveStreamButton id={stream.id} />
                  )}

                  <Link
                    href={`/admin/en-vivo/${stream.id}/editar`}
                    className="mt-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                  >
                    Editar
                  </Link>

                  <DeleteLiveStreamButton id={stream.id} />
                </div>
              </div>
            </article>
          );
        })}

        {liveStreams?.length === 0 && (
          <div className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-gray-500 md:col-span-2 xl:col-span-3">
            Aún no hay transmisiones registradas.
          </div>
        )}
      </section>
    </main>
  );
}
