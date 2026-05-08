import Link from "next/link";
import Image from "next/image";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { supabase } from "@/lib/supabase";
import DeleteNewsButton from "./DeleteNewsButton";
import PublishNewsButton from "./PublishNewsButton";

const statusConfig = {
  published: {
    label: "Publicada",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  scheduled: {
    label: "Programada",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  draft: {
    label: "Borrador",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
};

const statusFilters = [
  { label: "Todas", value: "all" },
  { label: "Publicadas", value: "published" },
  { label: "Programadas", value: "scheduled" },
  { label: "Borradores", value: "draft" },
];

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

type Props = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

export default async function AdminNoticiasPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params?.q?.trim() || "";
  const selectedStatus = params?.status || "all";

  const { data: noticias } = await supabase
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });

  const filteredNoticias = noticias?.filter((noticia) => {
    const status = noticia.status || "published";
    const matchesStatus =
      selectedStatus === "all" || status === selectedStatus;
    const normalizedQuery = query.toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      noticia.title?.toLowerCase().includes(normalizedQuery) ||
      noticia.slug?.toLowerCase().includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Administración
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Administrar noticias
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Administra las noticias publicadas, programadas y borradores.
          </p>
        </div>

        <Link
          href="/admin/noticias/crear"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          + Crear nueva noticia
        </Link>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <form className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Buscar por título o slug
            </label>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Escribe para encontrar una noticia"
              className="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none transition focus:border-[var(--ivbcc-gold)] focus:ring-2 focus:ring-[var(--ivbcc-gold)]/20"
            />
          </div>

          <input type="hidden" name="status" value={selectedStatus} />

          <button
            type="submit"
            className="h-11 rounded-lg bg-[var(--ivbcc-navy)] px-6 text-sm font-bold text-white transition hover:opacity-90"
          >
            Buscar
          </button>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const href =
              filter.value === "all"
                ? `/admin/noticias${query ? `?q=${encodeURIComponent(query)}` : ""}`
                : `/admin/noticias?status=${filter.value}${
                    query ? `&q=${encodeURIComponent(query)}` : ""
                  }`;
            const isActive = selectedStatus === filter.value;

            return (
              <Link
                key={filter.value}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[var(--ivbcc-gold)] text-white border-[var(--ivbcc-gold)]"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-white"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredNoticias?.map((noticia, index) => {
          const status = noticia.status || "published";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.published;

          return (
            <article
              key={noticia.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-44 bg-gray-100">
                {noticia.image_url ? (
                  <Image
                    src={noticia.image_url}
                    alt={noticia.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Noticias"
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
                    {noticia.slug}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-gray-950">
                    {noticia.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500">
                    {noticia.summary}
                  </p>
                </div>

                <div className="mt-5 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Publicación
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {formatDateTimeColombia(noticia.published_at)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {noticia.status === "draft" && (
                    <PublishNewsButton id={noticia.id} />
                  )}

                  <Link
                    href={`/admin/noticias/${noticia.id}/editar`}
                    className="mt-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                  >
                    Editar
                  </Link>
                  <DeleteNewsButton
                    id={noticia.id}
                    imageUrl={noticia.image_url}
                  />
                </div>
              </div>
            </article>
          );
        })}

        {filteredNoticias?.length === 0 && (
          <div className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-gray-500 md:col-span-2 xl:col-span-3">
            No se encontraron noticias con esos filtros.
          </div>
        )}
      </section>
    </main>
  );
}
