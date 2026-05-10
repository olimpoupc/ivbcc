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
import DeleteEventButton from "./DeleteEventButton";
import PublishEventButton from "./PublishEventButton";

const statusConfig = {
  published: {
    label: "Publicado",
    tone: "green",
  },
  scheduled: {
    label: "Programado",
    tone: "blue",
  },
  draft: {
    label: "Borrador",
    tone: "amber",
  },
  cancelled: {
    label: "Cancelado",
    tone: "red",
  },
} as const;

const eventSelect =
  "id,title,slug,description,image_url,status,event_date,location,created_at";

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
    .select(eventSelect)
    .order("event_date", { ascending: false });

  const now = new Date();
  const upcomingCount =
    eventos?.filter((evento) => evento.event_date && new Date(evento.event_date) >= now)
      .length || 0;
  const publishedCount =
    eventos?.filter((evento) => (evento.status || "draft") === "published")
      .length || 0;
  const draftCount =
    eventos?.filter((evento) => (evento.status || "draft") === "draft").length || 0;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración"
        title="Administrar eventos"
        subtitle="Gestiona eventos publicados, programados, borradores y cancelados."
        icon="calendar"
        actions={
          <AdminActionButton href="/admin/eventos/crear" icon="plus" tone="gold">
            Crear nuevo evento
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <AdminMetricCard
          label="Eventos totales"
          value={eventos?.length || 0}
          detail="Registros creados"
          icon="calendar"
          tone="slate"
        />
        <AdminMetricCard
          label="Próximos"
          value={upcomingCount}
          detail="Desde hoy en adelante"
          icon="activity"
          tone="gold"
        />
        <AdminMetricCard
          label="Publicados"
          value={publishedCount}
          detail="Visibles en el sitio"
          icon="check"
          tone="navy"
        />
        <AdminMetricCard
          label="Borradores"
          value={draftCount}
          detail="Pendientes de publicar"
          icon="file"
          tone="slate"
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {eventos?.map((evento, index) => {
          const status = evento.status || "draft";
          const currentStatus =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft;

          return (
            <article
              key={evento.id}
              className="premium-surface overflow-hidden rounded-[24px] transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-44 bg-[var(--ivbcc-paper)]">
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

                <span className="absolute left-4 top-4">
                  <AdminStatusBadge tone={currentStatus.tone}>
                    {currentStatus.label}
                  </AdminStatusBadge>
                </span>
              </div>

              <div className="flex min-h-64 flex-col p-5">
                <div className="flex-1">
                  <p className="kicker">
                    {evento.slug}
                  </p>
                  <h2 className="section-title mt-2 line-clamp-2 text-lg leading-tight text-[var(--ivbcc-ink)]">
                    {evento.title}
                  </h2>
                  <p className="muted-copy mt-3 line-clamp-2 text-sm leading-6">
                    {evento.description}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-[var(--ivbcc-line)] pt-4">
                  <div>
                    <p className="kicker">
                      Fecha del evento
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
                      {formatDateTimeColombia(evento.event_date)}
                    </p>
                  </div>

                  <div>
                    <p className="kicker">
                      Ubicación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ivbcc-ink)]">
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
                    className="mt-2 rounded-full border border-[var(--ivbcc-navy)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:bg-[var(--ivbcc-navy)] hover:text-white"
                  >
                    Ver inscritos
                  </Link>
                  <Link
                    href={`/admin/eventos/${evento.id}/editar`}
                    className="mt-2 rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-[var(--ivbcc-navy)] hover:opacity-90"
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
          <div className="md:col-span-2 xl:col-span-3">
            <AdminEmptyState
              title="Aún no hay eventos registrados"
              description="Crea el primer evento para publicarlo en el sitio."
              icon="calendar"
              action={
                <AdminActionButton href="/admin/eventos/crear" icon="plus" tone="gold">
                  Crear evento
                </AdminActionButton>
              }
            />
          </div>
        )}
      </section>
    </AdminPageShell>
  );
}
