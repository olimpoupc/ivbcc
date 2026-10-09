import { buildIcsCalendar } from "@/lib/event-calendar";
import { siteUrl } from "@/lib/seo";
import { createSupabasePublicClient } from "@/lib/supabase-server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound() {
  return new Response("Evento no encontrado.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Archivo .ics de un evento publicado, para "Agregar a Apple / Outlook
 * Calendar". Es público (como la página del evento) y solo lee eventos
 * publicados con el cliente anónimo y RLS.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return notFound();

  const supabase = createSupabasePublicClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id,title,slug,event_date,location")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Error al generar el calendario del evento:", error);
    return new Response("No pudimos generar el calendario.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (!event) return notFound();

  const ics = buildIcsCalendar({
    id: event.id,
    title: event.title,
    startsAt: event.event_date,
    location: event.location,
    eventUrl: `${siteUrl}/eventos/${encodeURIComponent(event.slug)}`,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="evento-${event.id}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
