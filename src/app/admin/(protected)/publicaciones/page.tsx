import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DeletePublicationButton from "./DeletePublicationButton";
import PublishPublicationButton from "./PublishPublicationButton";

const statusConfig = {
  published: {
    label: "Publicada",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  draft: {
    label: "Borrador",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
};

const categoryConfig = {
  devotional: "Devocional",
  reflection: "Reflexión",
  announcement: "Comunicado",
  bulletin: "Boletín",
  document: "Documento",
  resource: "Recurso",
  video: "Video",
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function AdminPublicacionesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: publications } = await supabase
    .from("publications")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ivbcc-gold)]">
            Administración
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            Administrar publicaciones
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Gestiona devocionales, reflexiones, comunicados, boletines,
            documentos, recursos y videos.
          </p>
        </div>

        <Link
          href="/admin/publicaciones/crear"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          + Crear publicación
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {publications?.map((publication, index) => {
          const status = publication.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;
          const category =
            categoryConfig[
              publication.category as keyof typeof categoryConfig
            ] || "Publicación";

          return (
            <article
              key={publication.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-44 bg-gray-100">
                {publication.image_url ? (
                  <Image
                    src={publication.image_url}
                    alt={publication.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                    className="object-cover"
                  />
                ) : (
                  <EmptyImagePlaceholder
                    label="IVBCC Publicaciones"
                    subtitle="Vista previa sin portada."
                    className="h-full"
                  />
                )}

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${currentStatus.className}`}
                  >
                    {currentStatus.label}
                  </span>
                  {publication.featured && (
                    <span className="inline-flex rounded-full border border-[var(--ivbcc-gold)] bg-[#f6f0dc] px-3 py-1 text-xs font-semibold text-[var(--ivbcc-navy)] shadow-sm">
                      Destacada
                    </span>
                  )}
                </div>
              </div>

              <div className="flex min-h-72 flex-col p-5">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {category}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-gray-950">
                    {publication.title}
                  </h2>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
                    {publication.summary || publication.content || "Sin resumen"}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Slug
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {publication.slug}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Publicación
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {formatDateTimeColombia(
                        publication.published_at || publication.created_at
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {publication.status === "draft" && (
                    <PublishPublicationButton id={publication.id} />
                  )}

                  <Link
                    href={`/admin/publicaciones/${publication.id}/editar`}
                    className="mt-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                  >
                    Editar
                  </Link>

                  <DeletePublicationButton
                    id={publication.id}
                    imageUrl={publication.image_url}
                    fileUrl={publication.file_url}
                  />
                </div>
              </div>
            </article>
          );
        })}

        {publications?.length === 0 && (
          <div className="rounded-xl border bg-white px-5 py-12 text-center text-sm text-gray-500 md:col-span-2 xl:col-span-3">
            Aún no hay publicaciones registradas.
          </div>
        )}
      </section>
    </main>
  );
}
