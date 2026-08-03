import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/AdminPrimitives";
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
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Eventos"
          title="Evento no encontrado"
          icon="calendar"
          actions={
            <AdminActionButton href="/admin/eventos" icon="arrow" tone="outline">
              Volver a eventos
            </AdminActionButton>
          }
        />
      </AdminPageShell>
    );
  }

  if (registrationsError) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Eventos"
          title="Inscritos del evento"
          subtitle="No fue posible cargar los inscritos."
          icon="calendar"
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Eventos"
        title="Inscritos del evento"
        subtitle={evento.title}
        icon="calendar"
        actions={
          <>
            <DownloadRegistrationsCsvButton registrations={inscritos || []} />
            <AdminActionButton href="/admin/eventos" icon="arrow" tone="outline">
              Volver a eventos
            </AdminActionButton>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Total de inscritos"
          value={inscritos?.length || 0}
          detail="Registros recibidos"
          icon="users"
          tone="slate"
        />
      </section>

      <AdminPanelCard className="overflow-hidden p-0">
        <div className="hidden grid-cols-12 border-b border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] px-5 py-3 text-sm font-extrabold text-[var(--ivbcc-muted)] lg:grid">
          <div className="col-span-3">Nombre completo</div>
          <div className="col-span-3">Correo</div>
          <div className="col-span-2">Teléfono</div>
          <div className="col-span-4">Fecha de inscripción</div>
        </div>

        {inscritos?.length ? (
          inscritos.map((inscrito) => (
            <article
              key={inscrito.id}
              className="grid gap-2 border-b border-[var(--ivbcc-line)] px-5 py-4 text-sm lg:grid-cols-12 lg:items-center lg:gap-0"
            >
              <div className="font-extrabold text-[var(--ivbcc-ink)] lg:col-span-3">
                {inscrito.full_name}
              </div>
              <div className="text-[var(--ivbcc-muted)] lg:col-span-3">{inscrito.email}</div>
              <div className="text-[var(--ivbcc-muted)] lg:col-span-2">
                {inscrito.phone || "Sin teléfono"}
              </div>
              <div className="text-[var(--ivbcc-muted)] lg:col-span-4">
                {formatDateTimeColombia(inscrito.created_at)}
              </div>
            </article>
          ))
        ) : (
          <div className="p-6">
            <AdminEmptyState
              title="Este evento aún no tiene inscritos"
              description="Cuando alguien se inscriba desde la página pública, aparecerá aquí."
              icon="users"
            />
          </div>
        )}
      </AdminPanelCard>
    </AdminPageShell>
  );
}
