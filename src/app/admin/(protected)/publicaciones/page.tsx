import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import DeletePublicationButton from "./DeletePublicationButton";
import PublishPublicationButton from "./PublishPublicationButton";

const statusConfig = {
  published: {
    label: "Publicada",
    tone: "green",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
} as const;

const categoryConfig = {
  devotional: "Devocional",
  reflection: "Reflexión",
  announcement: "Comunicado",
  bulletin: "Boletín",
  document: "Documento",
  resource: "Recurso",
  video: "Video",
};

const publicationSelect =
  "id,title,slug,summary,content,image_url,file_url,status,category,featured,published_at,created_at";

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
    .select(publicationSelect)
    .order("created_at", { ascending: false });

  const publishedCount =
    publications?.filter(
      (publication) => (publication.status || "draft") === "published"
    ).length || 0;
  const draftCount =
    publications?.filter((publication) => (publication.status || "draft") === "draft")
      .length || 0;
  const featuredCount =
    publications?.filter((publication) => publication.featured).length || 0;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar publicaciones"
        subtitle="Gestiona devocionales, reflexiones, comunicados, boletines, documentos, recursos y videos."
        icon="file"
        actions={
          <AdminActionButton href="/admin/publicaciones/crear" icon="plus" tone="gold">
            Crear publicación
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Publicaciones"
          value={publications?.length || 0}
          detail="Contenido registrado"
          icon="file"
          tone="slate"
        />
        <AdminMetricCard
          label="Publicadas"
          value={publishedCount}
          detail="Visibles en el sitio"
          icon="check"
          tone="gold"
        />
        <AdminMetricCard
          label="Borradores"
          value={draftCount}
          detail="Pendientes"
          icon="activity"
          tone="navy"
        />
        <AdminMetricCard
          label="Destacadas"
          value={featuredCount}
          detail="Marcadas como prioridad"
          icon="spark"
          tone="slate"
        />
      </section>

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
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-44 bg-[var(--ivbcc-paper)]">
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
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                  {publication.featured && (
                    <AdminStatusBadge tone="gold">
                      Destacada
                    </AdminStatusBadge>
                  )}
                </div>
              </div>

              <div className="flex min-h-72 flex-col p-5">
                <div className="flex-1">
                  <p className="kicker">
                    {category}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {publication.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-2 text-sm leading-6">
                    {publication.summary || publication.content || "Sin resumen"}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-[var(--ivbcc-line)] pt-4">
                  <div>
                    <p className="kicker">
                      Slug
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {publication.slug}
                    </p>
                  </div>

                  <div>
                    <p className="kicker">
                      Publicación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
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
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
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
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title="Aún no hay publicaciones registradas"
              description="Crea la primera publicación para alimentar el módulo público."
              icon="file"
              action={
                <AdminActionButton href="/admin/publicaciones/crear" icon="plus" tone="gold">
                  Crear publicación
                </AdminActionButton>
              }
            />
          </div>
        )}
      </section>
    </AdminPageShell>
  );
}
