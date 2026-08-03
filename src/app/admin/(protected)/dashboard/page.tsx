import Link from "next/link";
import { headers } from "next/headers";
import {
  AdminActionButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
  AdminQuickAction,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/AdminPrimitives";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcons";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { siteUrl } from "@/lib/seo";

type CountResult = {
  count: number | null;
  error: unknown;
};

type DataResult<T> = {
  data: T[] | null;
  error: unknown;
};

type ContactMessage = {
  id: string;
  full_name: string | null;
  subject: string | null;
  category: string | null;
  status: string | null;
  created_at: string | null;
};

type Certificate = {
  id: string;
  code: string;
  student_name: string | null;
  course_title: string | null;
  issued_at: string | null;
  status: string | null;
};

type EventRow = {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
  status: string | null;
  created_at: string | null;
};

type CourseRow = {
  id: string;
  title: string;
  status: string | null;
  created_at: string | null;
};

type NewsRow = {
  id: string;
  title: string;
  status: string | null;
  published_at: string | null;
  created_at: string | null;
};

type PublicationRow = {
  id: string;
  title: string;
  category: string | null;
  status: string | null;
  published_at: string | null;
  created_at: string | null;
};

type LiveStreamRow = {
  id: string;
  title: string;
  status: string | null;
  is_live: boolean | null;
  scheduled_at: string | null;
  ends_at: string | null;
};

type DonationMethodRow = {
  id: string;
  title: string;
  method_type: string;
  is_active: boolean | null;
  order_index: number | null;
};

const statusLabels: Record<string, string> = {
  published: "Publicado",
  scheduled: "Programado",
  draft: "Borrador",
  pending: "Pendiente",
  read: "Leído",
  responded: "Respondido",
  archived: "Archivado",
  valid: "Válido",
  revoked: "Revocado",
};

const contentCategoryLabels: Record<string, string> = {
  devotional: "Devocional",
  reflection: "Reflexión",
  announcement: "Comunicado",
  bulletin: "Boletín",
  document: "Documento",
  resource: "Recurso",
  video: "Video",
};

const contactCategoryLabels: Record<string, string> = {
  general: "General",
  counseling: "Consejería",
  formation: "Formación",
  events: "Eventos",
  prayer: "Petición de oración",
  support: "Soporte",
  other: "Otro",
};

const methodLabels: Record<string, string> = {
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  daviplata: "Daviplata",
  davivienda: "Davivienda",
  breb_key: "Bre-B / Llave",
  paypal: "PayPal",
  wompi: "Wompi",
  mercadopago: "Mercado Pago",
  other: "Otro",
};

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("es-CO").format(value || 0);
}

function getEnvLabel() {
  if (process.env.VERCEL_ENV === "production") return "Producción";
  if (process.env.VERCEL_ENV === "preview") return "Preview";
  if (process.env.NODE_ENV === "production") return "Producción";
  return "Local";
}

function statusLabel(value?: string | null) {
  return value ? statusLabels[value] || value : "Sin estado";
}

function hasError(result: { error: unknown }) {
  return Boolean(result.error);
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const headersList = await headers();
  const today = new Date();
  const nowIso = today.toISOString();

  const [
    newsPublished,
    upcomingEvents,
    activeCourses,
    eventRegistrations,
    courseEnrollments,
    certificatesIssued,
    pendingMessages,
    activeDonationMethods,
    publishedLiveStreams,
    draftCourses,
    liveActiveStreams,
    upcomingLiveStreams,
    recentMessages,
    recentCertificates,
    upcomingEventsList,
    latestCreatedEvents,
    recentNews,
    recentPublications,
    donationMethods,
    latestContactMessage,
    helpCenterItems,
  ] = await Promise.all([
    supabase
      .from("news")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("event_date", nowIso)
      .neq("status", "cancelled"),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("course_enrollments")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("course_certificates")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("donation_methods")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("live_streams")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("courses")
      .select("id,title,status,created_at")
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("live_streams")
      .select("id,title,status,is_live,scheduled_at,ends_at")
      .eq("is_live", true)
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("live_streams")
      .select("id,title,status,is_live,scheduled_at,ends_at")
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("contact_messages")
      .select("id,full_name,subject,category,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("course_certificates")
      .select("id,code,student_name,course_title,issued_at,status")
      .order("issued_at", { ascending: false })
      .limit(5),
    supabase
      .from("events")
      .select("id,title,event_date,location,status,created_at")
      .gte("event_date", nowIso)
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("events")
      .select("id,title,event_date,location,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("news")
      .select("id,title,status,published_at,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("publications")
      .select("id,title,category,status,published_at,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("donation_methods")
      .select("id,title,method_type,is_active,order_index")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(5),
    supabase
      .from("contact_messages")
      .select("id,full_name,subject,category,status,created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("help_center_items")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const count = (result: CountResult) => (result.error ? 0 : result.count || 0);
  const rows = <T,>(result: DataResult<T>) => (result.error ? [] : result.data || []);

  const eventRegistrationsCount = count(eventRegistrations);
  const courseEnrollmentsCount = count(courseEnrollments);
  const totalRegistrations = eventRegistrationsCount + courseEnrollmentsCount;
  const recentMessagesRows = rows<ContactMessage>(recentMessages);
  const recentCertificatesRows = rows<Certificate>(recentCertificates);
  const upcomingEventRows = rows<EventRow>(upcomingEventsList);
  const latestCreatedEventRows = rows<EventRow>(latestCreatedEvents);
  const recentEventsRows = Array.from(
    new Map(
      [...upcomingEventRows, ...latestCreatedEventRows].map((event) => [
        event.id,
        event,
      ])
    ).values()
  ).slice(0, 5);
  const recentNewsRows = rows<NewsRow>(recentNews);
  const recentPublicationsRows = rows<PublicationRow>(recentPublications);
  const draftCourseRows = rows<CourseRow>(draftCourses);
  const activeLiveRows = rows<LiveStreamRow>(liveActiveStreams);
  const upcomingLiveRows = rows<LiveStreamRow>(upcomingLiveStreams);
  const activeDonationRows = rows<DonationMethodRow>(donationMethods);
  const latestMessage = rows<ContactMessage>(latestContactMessage)[0] || null;

  const metrics = [
    {
      label: "Noticias publicadas",
      value: count(newsPublished),
      href: "/admin/noticias",
      icon: "news",
      tone: "navy",
      detail: hasError(newsPublished) ? "Consulta no disponible" : "Contenido visible",
    },
    {
      label: "Eventos próximos",
      value: count(upcomingEvents),
      href: "/admin/eventos",
      icon: "calendar",
      tone: "gold",
      detail: hasError(upcomingEvents) ? "Consulta no disponible" : "Agenda por venir",
    },
    {
      label: "Cursos activos",
      value: count(activeCourses),
      href: "/admin/formacion",
      icon: "book",
      tone: "navy",
      detail: hasError(activeCourses) ? "Consulta no disponible" : "Formación publicada",
    },
    {
      label: "Inscripciones totales",
      value: totalRegistrations,
      href: "/admin/inscripciones",
      icon: "users",
      tone: "slate",
      detail: `${formatNumber(eventRegistrationsCount)} eventos / ${formatNumber(courseEnrollmentsCount)} cursos`,
    },
    {
      label: "Certificados emitidos",
      value: count(certificatesIssued),
      href: "/admin/certificados",
      icon: "certificate",
      tone: "navy",
      detail: hasError(certificatesIssued) ? "Consulta no disponible" : "Historial académico",
    },
    {
      label: "Mensajes pendientes",
      value: count(pendingMessages),
      href: "/admin/contacto",
      icon: "message",
      tone: "gold",
      detail: hasError(pendingMessages) ? "Consulta no disponible" : "Requieren respuesta",
    },
    {
      label: "Métodos de donación activos",
      value: count(activeDonationMethods),
      href: "/admin/donaciones",
      icon: "donation",
      tone: "slate",
      detail: hasError(activeDonationMethods) ? "Consulta no disponible" : "Disponibles al público",
    },
    {
      label: "Transmisiones publicadas",
      value: count(publishedLiveStreams),
      href: "/admin/en-vivo",
      icon: "stream",
      tone: "navy",
      detail: hasError(publishedLiveStreams) ? "Consulta no disponible" : "Videos y directos",
    },
  ];

  const quickActions = [
    {
      href: "/admin/noticias/crear",
      label: "Crear noticia",
      description: "Publica una novedad institucional.",
      icon: "news",
    },
    {
      href: "/admin/eventos/crear",
      label: "Crear evento",
      description: "Agenda una actividad próxima.",
      icon: "calendar",
    },
    {
      href: "/admin/formacion/crear",
      label: "Crear curso",
      description: "Abre un nuevo espacio formativo.",
      icon: "book",
    },
    {
      href: "/admin/donaciones",
      label: "Gestionar donaciones",
      description: "Actualiza métodos visibles.",
      icon: "donation",
    },
    {
      href: "/admin/contacto",
      label: "Ver mensajes",
      description: "Responde solicitudes recientes.",
      icon: "message",
    },
    {
      href: "/admin/centro-ayuda",
      label: "Gestionar Centro de Ayuda",
      description: "Edita contenido por categoría.",
      icon: "spark",
    },
    {
      href: "/admin/certificados",
      label: "Ver certificados",
      description: "Consulta emisiones y estados.",
      icon: "certificate",
    },
    {
      href: "/admin/configuracion",
      label: "Configuración",
      description: "Ajusta datos generales del sitio.",
      icon: "settings",
    },
  ];

  const recentContent = [
    ...recentNewsRows.map((item) => ({
      id: `news-${item.id}`,
      title: item.title,
      type: "Noticia",
      date: item.published_at || item.created_at,
      status: item.status,
      href: "/admin/noticias",
    })),
    ...recentPublicationsRows.map((item) => ({
      id: `publication-${item.id}`,
      title: item.title,
      type: contentCategoryLabels[item.category || ""] || "Publicación",
      date: item.published_at || item.created_at,
      status: item.status,
      href: "/admin/publicaciones",
    })),
  ]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 5);

  const attentionItems = [
    {
      title: "Mensajes de contacto pendientes",
      value: count(pendingMessages),
      href: "/admin/contacto",
      description: "Solicitudes que necesitan lectura o respuesta.",
    },
    {
      title: "Eventos próximos",
      value: count(upcomingEvents),
      href: "/admin/eventos",
      description:
        upcomingEventRows[0]?.event_date
          ? `Próximo: ${upcomingEventRows[0].title}`
          : "No hay eventos próximos cargados.",
    },
    {
      title: "Certificados recientes",
      value: recentCertificatesRows.length,
      href: "/admin/certificados",
      description:
        recentCertificatesRows[0]?.student_name
          ? `Último: ${recentCertificatesRows[0].student_name}`
          : "No hay certificados recientes.",
    },
    {
      title: "Cursos sin publicar",
      value: draftCourseRows.length,
      href: "/admin/formacion",
      description:
        draftCourseRows[0]?.title || "No se detectaron cursos en borrador.",
    },
    {
      title: "Transmisiones activas o programadas",
      value: activeLiveRows.length + upcomingLiveRows.length,
      href: "/admin/en-vivo",
      description:
        activeLiveRows[0]?.title ||
        upcomingLiveRows[0]?.title ||
        "No hay transmisiones activas o programadas.",
    },
  ];

  const publicUrl =
    siteUrl ||
    `${headersList.get("x-forwarded-proto") || "http"}://${headersList.get("host") || "localhost:3000"}`;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Administración IVBCC"
        title="Panel de control IVBCC"
        subtitle="Resumen general del sistema web de la iglesia"
        icon="dashboard"
        actions={
          <>
            <AdminStatusBadge tone="gold">
              {formatDate(today.toISOString())}
            </AdminStatusBadge>
            <AdminStatusBadge tone="navy">
              Gestión del sistema
            </AdminStatusBadge>
            <AdminActionButton href="/" icon="external" tone="outline" external>
              Ver sitio público
            </AdminActionButton>
          </>
        }
      />

      <AdminPanelCard className="dark-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <DashboardStat label="Entorno" value={getEnvLabel()} />
          <DashboardStat
            label="Centro de Ayuda activo"
            value={`${formatNumber(count(helpCenterItems))} contenidos`}
          />
          <DashboardStat
            label="Transmisión"
            value={activeLiveRows.length ? "En vivo activo" : "Sin directo activo"}
          />
        </div>
      </AdminPanelCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <AdminMetricCard
            key={metric.label}
            href={metric.href}
            label={metric.label}
            value={formatNumber(metric.value)}
            detail={metric.detail}
            icon={metric.icon as AdminIconName}
            tone={metric.tone as "navy" | "gold" | "slate"}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <AdminPanelCard>
          <SectionHeader
            eyebrow="Prioridad"
            title="Pendientes de atención"
            subtitle="Elementos que conviene revisar para mantener el sitio al día."
            icon="activity"
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {attentionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="premium-surface rounded-[24px] p-4 transition hover:-translate-y-0.5 hover:border-[rgba(201,162,74,0.5)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-extrabold text-[var(--ivbcc-ink)]">{item.title}</p>
                  <span className="rounded-full bg-[var(--ivbcc-navy)] px-3 py-1 text-xs font-extrabold text-white">
                    {formatNumber(item.value)}
                  </span>
                </div>
                <p className="muted-copy mt-2 line-clamp-2 text-sm">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </AdminPanelCard>

        <AdminSection
          eyebrow="Accesos"
          title="Acciones rápidas"
          subtitle="Atajos a las tareas habituales del equipo."
          icon="arrow"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickActions.map((action) => (
              <AdminQuickAction
                key={action.href}
                href={action.href}
                title={action.label}
                description={action.description}
                icon={action.icon as AdminIconName}
              />
            ))}
          </div>
        </AdminSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <ModuleCard
          title="Donaciones"
          eyebrow="Generosidad"
          icon="donation"
          actionHref="/admin/donaciones"
          actionLabel="Gestionar donaciones"
          secondaryHref="/donaciones"
          secondaryLabel="Ver página pública"
        >
          <p className="section-title text-4xl text-[var(--ivbcc-ink)]">
            {formatNumber(count(activeDonationMethods))}
          </p>
          <p className="muted-copy mt-1 text-sm">Métodos activos</p>
          <div className="mt-4 space-y-2">
            {activeDonationRows.map((method) => (
              <p key={method.id} className="text-sm font-semibold text-[var(--ivbcc-ink)]">
                {method.title} · {methodLabels[method.method_type] || "Otro"}
              </p>
            ))}
            {!activeDonationRows.length ? (
              <p className="muted-copy text-sm">Sin métodos activos visibles.</p>
            ) : null}
          </div>
        </ModuleCard>

        <ModuleCard
          title="Contacto"
          eyebrow="Atención pastoral"
          icon="message"
          actionHref="/admin/contacto"
          actionLabel="Responder mensajes"
        >
          <p className="section-title text-4xl text-[var(--ivbcc-ink)]">
            {formatNumber(count(pendingMessages))}
          </p>
          <p className="muted-copy mt-1 text-sm">Mensajes pendientes</p>
          <div className="mt-4 rounded-[20px] border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-4">
            <p className="kicker">
              Último mensaje
            </p>
            <p className="mt-2 line-clamp-1 text-sm font-extrabold text-[var(--ivbcc-ink)]">
              {latestMessage?.subject || "Sin mensajes recientes"}
            </p>
            <p className="mt-1 text-xs text-[var(--ivbcc-muted)]">
              {latestMessage
                ? `${latestMessage.full_name || "Visitante"} · ${formatDateTime(latestMessage.created_at)}`
                : "Cuando llegue un mensaje aparecerá aquí."}
            </p>
          </div>
        </ModuleCard>

        <ModuleCard
          title="Formación"
          eyebrow="Discipulado"
          icon="book"
          actionHref="/admin/formacion"
          actionLabel="Gestionar formación"
          secondaryHref="/admin/certificados"
          secondaryLabel="Ver certificados"
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniMetric label="Cursos" value={count(activeCourses)} />
            <MiniMetric label="Inscripciones" value={courseEnrollmentsCount} />
            <MiniMetric label="Certificados" value={count(certificatesIssued)} />
          </div>
          <p className="muted-copy mt-4 text-sm">
            {draftCourseRows.length
              ? `${draftCourseRows.length} curso(s) en borrador por revisar.`
              : "Todos los cursos consultados están sin pendientes de publicación."}
          </p>
        </ModuleCard>

        <ModuleCard
          title="En Vivo"
          eyebrow="Transmisiones"
          icon="stream"
          actionHref="/admin/en-vivo"
          actionLabel="Gestionar transmisiones"
        >
          <p className="section-title text-lg text-[var(--ivbcc-ink)]">
            {activeLiveRows.length ? "En vivo activo" : "Sin directo activo"}
          </p>
          <p className="muted-copy mt-2 text-sm">
            {activeLiveRows[0]?.title ||
              (upcomingLiveRows[0]
                ? `Próxima: ${upcomingLiveRows[0].title}`
                : "No hay transmisiones programadas.")}
          </p>
          {upcomingLiveRows[0]?.scheduled_at ? (
            <p className="mt-3 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {formatDateTime(upcomingLiveRows[0].scheduled_at)}
            </p>
          ) : null}
        </ModuleCard>

        <ModuleCard
          title="Estado del sitio"
          eyebrow="Operación"
          icon="globe"
          actionHref={publicUrl}
          actionLabel="Ver sitio público"
          external
        >
          <div className="space-y-3 text-sm">
            <StatusRow label="URL pública" value={publicUrl} />
            <StatusRow
              label="Sitemap"
              value={`Disponible · ${publicUrl}/sitemap.xml`}
            />
            <StatusRow
              label="Robots"
              value={`Disponible · ${publicUrl}/robots.txt`}
            />
            <StatusRow label="Entorno" value={getEnvLabel()} />
          </div>
        </ModuleCard>

        <ModuleCard
          title="Centro de Ayuda"
          eyebrow="Orientación"
          icon="spark"
          actionHref="/admin/centro-ayuda"
          actionLabel="Gestionar Centro de Ayuda"
        >
          <p className="section-title text-4xl text-[var(--ivbcc-ink)]">
            {formatNumber(count(helpCenterItems))}
          </p>
          <p className="muted-copy mt-1 text-sm">Contenidos activos</p>
          <p className="muted-copy mt-4 text-sm">
            Mantén actualizado el contenido por categoría sobre horarios,
            eventos, formación y contacto.
          </p>
        </ModuleCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentPanel
          title="Últimos mensajes de contacto"
          subtitle="Solicitudes recientes enviadas desde la página pública."
          empty="Aún no hay mensajes de contacto."
          icon="message"
        >
          {recentMessagesRows.map((message) => (
            <RecentItem
              key={message.id}
              title={message.subject || "Mensaje sin asunto"}
              meta={`${message.full_name || "Visitante"} · ${
                contactCategoryLabels[message.category || ""] || "General"
              }`}
              date={formatDateTime(message.created_at)}
              badge={statusLabel(message.status)}
              href="/admin/contacto"
            />
          ))}
        </RecentPanel>

        <RecentPanel
          title="Certificados emitidos recientemente"
          subtitle="Últimos certificados generados por el módulo de formación."
          empty="Aún no hay certificados emitidos."
          icon="certificate"
        >
          {recentCertificatesRows.map((certificate) => (
            <RecentItem
              key={certificate.id}
              title={certificate.student_name || "Estudiante sin nombre"}
              meta={certificate.course_title || certificate.code}
              date={formatDateTime(certificate.issued_at)}
              badge={statusLabel(certificate.status)}
              href="/admin/certificados"
            />
          ))}
        </RecentPanel>

        <RecentPanel
          title="Eventos creados o próximos"
          subtitle="Agenda reciente ordenada por fecha de evento."
          empty="Aún no hay eventos registrados."
          icon="calendar"
        >
          {recentEventsRows.map((event) => (
            <RecentItem
              key={event.id}
              title={event.title}
              meta={event.location || "Ubicación por confirmar"}
              date={formatDateTime(event.event_date || event.created_at)}
              badge={statusLabel(event.status)}
              href="/admin/eventos"
            />
          ))}
        </RecentPanel>

        <RecentPanel
          title="Noticias y publicaciones recientes"
          subtitle="Contenido creado más recientemente por el equipo."
          empty="Aún no hay contenido reciente."
          icon="news"
        >
          {recentContent.map((item) => (
            <RecentItem
              key={item.id}
              title={item.title}
              meta={item.type}
              date={formatDateTime(item.date)}
              badge={statusLabel(item.status)}
              href={item.href}
            />
          ))}
        </RecentPanel>
      </section>
    </AdminPageShell>
  );
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 px-4 py-3">
      <p className="text-sm text-white/64">{label}</p>
      <p className="text-sm font-extrabold text-white">{value}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon?: AdminIconName;
}) {
  return (
    <div className="flex gap-4">
      {icon ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ivbcc-navy)] text-[var(--ivbcc-gold-2)]">
          <AdminIcon name={icon} />
        </span>
      ) : null}
      <div>
        <p className="kicker">
          {eyebrow}
        </p>
        <h2 className="section-title mt-2 text-2xl text-[var(--ivbcc-ink)]">{title}</h2>
        <p className="muted-copy mt-2 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

function ModuleCard({
  eyebrow,
  title,
  icon,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  external,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: AdminIconName;
  actionHref: string;
  actionLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdminPanelCard>
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="kicker">
                {eyebrow}
              </p>
              <h2 className="section-title mt-2 text-2xl text-[var(--ivbcc-ink)]">
                {title}
              </h2>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ivbcc-navy)] text-[var(--ivbcc-gold-2)]">
              <AdminIcon name={icon} />
            </span>
          </div>
          <div className="mt-5">{children}</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <AdminActionButton
            href={actionHref}
            external={external}
            tone="navy"
          >
            {actionLabel}
          </AdminActionButton>
          {secondaryHref && secondaryLabel ? (
            <AdminActionButton
              href={secondaryHref}
              tone="outline"
            >
              {secondaryLabel}
            </AdminActionButton>
          ) : null}
        </div>
      </div>
    </AdminPanelCard>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-[var(--ivbcc-line)] bg-[var(--ivbcc-paper)] p-3">
      <p className="section-title text-xl text-[var(--ivbcc-ink)]">{formatNumber(value)}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--ivbcc-muted)]">{label}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ivbcc-gold)]">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold text-[var(--ivbcc-ink)]">{value}</p>
    </div>
  );
}

function RecentPanel({
  title,
  subtitle,
  empty,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  empty: string;
  icon: AdminIconName;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <AdminPanelCard>
      <SectionHeader
        eyebrow="Actividad"
        title={title}
        subtitle={subtitle}
        icon={icon}
      />
      <div className="mt-5 divide-y divide-slate-100">
        {isEmpty ? (
          <AdminEmptyState title={empty} icon={icon} />
        ) : (
          items
        )}
      </div>
    </AdminPanelCard>
  );
}

function RecentItem({
  title,
  meta,
  date,
  badge,
  href,
}: {
  title: string;
  meta: string;
  date: string;
  badge: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="grid gap-3 py-4 text-sm transition hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center"
    >
      <div>
        <p className="line-clamp-1 font-extrabold text-[var(--ivbcc-ink)]">{title}</p>
        <p className="muted-copy mt-1 line-clamp-1">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <AdminStatusBadge>{badge}</AdminStatusBadge>
        <span className="text-xs font-semibold text-[var(--ivbcc-muted)]">{date}</span>
      </div>
    </Link>
  );
}
