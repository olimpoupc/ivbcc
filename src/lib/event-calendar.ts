/**
 * Enlaces "Agregar al calendario" para eventos (Google Calendar y archivo
 * .ics para Apple Calendar / Outlook).
 *
 * Funciones puras: no importan nada del servidor y reciben "ahora" como
 * parámetro cuando lo necesitan, para que las pruebas sean deterministas.
 */

/**
 * La tabla events solo guarda la hora de inicio; los calendarios necesitan
 * una hora de fin, así que se asume una duración de 2 horas.
 */
export const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;

export type CalendarEventInput = {
  id: string;
  title: string;
  /** Inicio en ISO 8601 (timestamptz de Supabase). */
  startsAt: string;
  location: string | null;
  /** URL pública del evento en el sitio; va en la descripción. */
  eventUrl: string;
};

export type CalendarLinks = {
  google: string;
  ics: string;
};

/** Fecha en UTC con el formato de iCalendar y Google: 20261018T230000Z */
export function formatCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function getEventBounds(startsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
  return { start, end };
}

function buildDescription(eventUrl: string) {
  return `Más información del evento: ${eventUrl}`;
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const { start, end } = getEventBounds(event.startsAt);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    details: buildDescription(event.eventUrl),
    ctz: "America/Bogota",
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Ruta del Route Handler que entrega el archivo .ics del evento. */
export function buildIcsPath(eventId: string): string {
  return `/api/eventos/${encodeURIComponent(eventId)}/calendario.ics`;
}

export function buildCalendarLinks(event: CalendarEventInput, siteUrl: string): CalendarLinks {
  return {
    google: buildGoogleCalendarUrl(event),
    ics: `${siteUrl}${buildIcsPath(event.id)}`,
  };
}

/** Escapa texto según RFC 5545 (barra invertida, punto y coma, coma, saltos). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Las líneas de un .ics no deben pasar de 75 octetos; las más largas se
 * parten y la continuación empieza con un espacio. Se cuenta en bytes UTF-8
 * para no cortar tildes ni eñes por la mitad.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // la continuación lleva un espacio
    if (currentBytes + charBytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  parts.push(current);

  return parts.join("\r\n ");
}

export function buildIcsCalendar(event: CalendarEventInput, now: Date = new Date()): string {
  const { start, end } = getEventBounds(event.startsAt);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IVBCC//Eventos//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@ivbcc`,
    `DTSTAMP:${formatCalendarDate(now)}`,
    `DTSTART:${formatCalendarDate(start)}`,
    `DTEND:${formatCalendarDate(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(buildDescription(event.eventUrl))}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `URL:${event.eventUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 exige CRLF al final de cada línea.
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
