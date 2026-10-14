import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/AdminPrimitives";
import {
  checkDailyQuota,
  RESEND_DAILY_QUOTA,
  selectBroadcastRecipients,
  startOfUtcDay,
  type BroadcastCandidate,
} from "@/lib/event-broadcast";
import { getMailerConfig } from "@/lib/mailer";
import { getEmailLinkSecret } from "@/lib/registration-token";
import { siteUrl } from "@/lib/seo";
import BroadcastForm from "./BroadcastForm";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDateTimeColombia(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function EventoMensajesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: evento, error: eventError },
    { data: confirmed, error: confirmedError },
    { data: history },
    { data: today },
  ] = await Promise.all([
    supabase.from("events").select("id,title,slug").eq("id", id).maybeSingle(),
    supabase
      .from("event_registrations")
      .select("id,email,full_name,status,marketing_consent")
      .eq("event_id", id)
      .eq("status", "confirmed"),
    supabase
      .from("event_broadcasts")
      .select("id,subject,created_at,recipients_count,sent_count,failed_count")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("event_broadcasts")
      .select("sent_count")
      .gte("created_at", startOfUtcDay().toISOString()),
  ]);

  if (eventError || !evento || confirmedError) {
    return (
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Eventos"
          title="Mensajes a inscritos"
          subtitle="No fue posible cargar el evento."
          icon="message"
          actions={
            <AdminActionButton href="/admin/eventos" icon="arrow" tone="outline">
              Volver a eventos
            </AdminActionButton>
          }
        />
      </AdminPageShell>
    );
  }

  const confirmedRows = (confirmed || []) as BroadcastCandidate[];
  const withConsent = confirmedRows.filter((row) => row.marketing_consent);
  const emails = withConsent.map((row) => row.email.toLowerCase());
  const { data: suppressions } = emails.length
    ? await supabase.from("email_suppressions").select("email").in("email", emails)
    : { data: [] };
  const recipients = selectBroadcastRecipients(
    confirmedRows,
    (suppressions || []).map((row) => row.email as string)
  );

  const sentToday = (today || []).reduce((total, row) => total + (Number(row.sent_count) || 0), 0);
  const quota = checkDailyQuota(sentToday, recipients.length);
  const mailerReady = Boolean(getMailerConfig());
  const secretReady = Boolean(getEmailLinkSecret());
  const canSend = mailerReady && secretReady && !quota.exceeds;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Eventos"
        title="Mensajes a inscritos"
        subtitle={evento.title}
        icon="message"
        actions={
          <AdminActionButton href={`/admin/eventos/${id}/inscritos`} icon="arrow" tone="outline">
            Volver a inscritos
          </AdminActionButton>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Destinatarios"
          value={recipients.length}
          detail="Confirmados, con consentimiento y sin baja"
          icon="users"
          tone="gold"
        />
        <AdminMetricCard
          label="Confirmados sin consentimiento"
          value={confirmedRows.length - withConsent.length}
          detail="No reciben mensajes"
          icon="close"
          tone="slate"
        />
        <AdminMetricCard
          label="Tope diario disponible"
          value={quota.remaining}
          detail={`De ${RESEND_DAILY_QUOTA} (plan gratuito de Resend; se reinicia a medianoche UTC)`}
          icon="analytics"
          tone="navy"
        />
      </section>

      {(!mailerReady || !secretReady || quota.exceeds) && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {!mailerReady && <p>El envío de correos no está configurado (faltan las variables de Resend).</p>}
          {!secretReady && (
            <p>Falta la variable EMAIL_LINK_SECRET (mínimo 32 caracteres) para generar los enlaces de baja.</p>
          )}
          {quota.exceeds && (
            <p>
              Hay {recipients.length} destinatarios y solo quedan {quota.remaining} envíos hoy según el
              tope diario de Resend. Espera a mañana o revisa el plan contratado.
            </p>
          )}
        </div>
      )}

      <AdminPanelCard>
        <p className="mb-5 text-xs font-semibold text-[var(--ivbcc-muted)]">
          El tope cuenta solo los mensajes enviados desde esta pantalla hoy; los correos de
          confirmación y bienvenida también consumen la cuota de Resend.
        </p>
        <BroadcastForm
          eventId={evento.id}
          eventTitle={evento.title}
          eventUrl={`${siteUrl}/eventos/${encodeURIComponent(evento.slug)}`}
          recipientsCount={recipients.length}
          canSend={canSend}
        />
      </AdminPanelCard>

      <AdminPanelCard>
        <h2 className="section-title text-xl text-[var(--ivbcc-ink)]">Mensajes enviados</h2>
        {history?.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--ivbcc-line)] text-sm">
              <thead>
                <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-muted)]">
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Asunto</th>
                  <th className="pb-3 pr-4 text-right">Destinatarios</th>
                  <th className="pb-3 pr-4 text-right">Enviados</th>
                  <th className="pb-3 text-right">Fallidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ivbcc-line)]">
                {history.map((row) => (
                  <tr key={row.id} className="text-[var(--ivbcc-muted)]">
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDateTimeColombia(row.created_at)}</td>
                    <td className="py-3 pr-4 font-semibold text-[var(--ivbcc-ink)]">{row.subject}</td>
                    <td className="py-3 pr-4 text-right">{row.recipients_count}</td>
                    <td className="py-3 pr-4 text-right text-emerald-700">{row.sent_count}</td>
                    <td className="py-3 text-right text-red-700">{row.failed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="Aún no se han enviado mensajes"
            description="Los envíos aparecerán aquí con su conteo de enviados y fallidos."
            icon="message"
          />
        )}
      </AdminPanelCard>
    </AdminPageShell>
  );
}
