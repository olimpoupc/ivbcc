import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import DeleteLiveStreamButton from "./DeleteLiveStreamButton";
import PublishLiveStreamButton from "./PublishLiveStreamButton";

const statusConfig = {
  published: {
    label: "Publicado",
    tone: "green",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
} as const;

const categoryConfig = {
  live: "En vivo",
  sunday: "Dominical",
  preaching: "Prédica",
  teaching: "Enseñanza",
  special: "Especial",
};

const liveStreamSelect =
  "id,title,slug,description,youtube_url,status,category,is_live,featured,scheduled_at,ends_at,created_at";

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
    .select(liveStreamSelect)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const now = new Date();
  const activeLiveCount = liveStreams?.filter((stream) => stream.is_live).length || 0;
  const scheduledCount =
    liveStreams?.filter(
      (stream) => stream.scheduled_at && new Date(stream.scheduled_at) >= now
    ).length || 0;
  const publishedCount =
    liveStreams?.filter((stream) => (stream.status || "draft") === "published")
      .length || 0;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar transmisiones"
        subtitle="Gestiona transmisiones en vivo, dominicales, prédicas, enseñanzas y videos especiales de IVBCC."
        icon="stream"
        actions={
          <AdminActionButton href="/admin/en-vivo/crear" icon="plus" tone="gold">
            Crear transmisión
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Transmisiones"
          value={liveStreams?.length || 0}
          detail="Registros totales"
          icon="stream"
          tone="slate"
        />
        <AdminMetricCard
          label="En vivo"
          value={activeLiveCount}
          detail="Marcadas como activas"
          icon="activity"
          tone="gold"
        />
        <AdminMetricCard
          label="Programadas"
          value={scheduledCount}
          detail="Próximas emisiones"
          icon="calendar"
          tone="navy"
        />
        <AdminMetricCard
          label="Publicadas"
          value={publishedCount}
          detail="Visibles públicamente"
          icon="check"
          tone="slate"
        />
      </section>

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
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="flex min-h-80 flex-col p-5">
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="slate">
                    {category}
                  </AdminStatusBadge>
                  {stream.is_live && (
                    <AdminStatusBadge tone="red">
                      En vivo actual
                    </AdminStatusBadge>
                  )}
                  {stream.featured && (
                    <AdminStatusBadge tone="gold">
                      Destacado
                    </AdminStatusBadge>
                  )}
                </div>

                <div className="mt-5 flex-1">
                  <p className="kicker">
                    {stream.slug}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {stream.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-3 text-sm leading-6">
                    {stream.description || "Sin descripción"}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-[var(--ivbcc-line)] pt-4">
                  <div>
                    <p className="kicker">
                      Programación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {formatDateTimeColombia(stream.scheduled_at)}
                    </p>
                  </div>

                  {stream.ends_at ? (
                    <div>
                      <p className="kicker">
                        Finalización
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                        {formatDateTimeColombia(stream.ends_at)}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="kicker">
                      YouTube
                    </p>
                    <a
                      href={stream.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 line-clamp-1 block text-sm font-semibold text-[var(--ivbcc-navy)] hover:underline"
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
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
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
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title="Aún no hay transmisiones registradas"
              description="Crea una transmisión para gestionar videos y emisiones en vivo."
              icon="stream"
              action={
                <AdminActionButton href="/admin/en-vivo/crear" icon="plus" tone="gold">
                  Crear transmisión
                </AdminActionButton>
              }
            />
          </div>
        )}
      </section>
    </AdminPageShell>
  );
}
