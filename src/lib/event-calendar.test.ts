import { describe, expect, it } from "vitest";
import {
  buildCalendarLinks,
  buildGoogleCalendarUrl,
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  formatCalendarDate,
  type CalendarEventInput,
} from "./event-calendar";

// 18 de octubre de 2026, 6:00 p. m. hora Colombia = 23:00 UTC
const event: CalendarEventInput = {
  id: "11111111-2222-3333-4444-555555555555",
  title: "Noche de alabanza",
  startsAt: "2026-10-18T23:00:00+00:00",
  location: "Templo principal, Calle 10 #5-20",
  eventUrl: "https://ivbcc.org/eventos/noche-de-alabanza",
};

const NOW = new Date("2026-10-09T15:30:00Z");

describe("formatCalendarDate", () => {
  it("usa el formato UTC compacto de iCalendar", () => {
    expect(formatCalendarDate(new Date("2026-10-18T23:00:00Z"))).toBe("20261018T230000Z");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("genera una plantilla de Google Calendar con título, fechas, lugar y descripción", () => {
    const url = new URL(buildGoogleCalendarUrl(event));
    expect(`${url.origin}${url.pathname}`).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Noche de alabanza");
    // Duración por defecto de 2 horas
    expect(url.searchParams.get("dates")).toBe("20261018T230000Z/20261019T010000Z");
    expect(url.searchParams.get("location")).toBe("Templo principal, Calle 10 #5-20");
    expect(url.searchParams.get("details")).toContain(event.eventUrl);
    expect(url.searchParams.get("ctz")).toBe("America/Bogota");
  });

  it("omite el lugar cuando el evento no lo tiene", () => {
    const url = new URL(buildGoogleCalendarUrl({ ...event, location: null }));
    expect(url.searchParams.has("location")).toBe(false);
  });
});

describe("buildCalendarLinks", () => {
  it("apunta el .ics al Route Handler del sitio", () => {
    expect(buildCalendarLinks(event, "https://ivbcc.org").ics).toBe(
      "https://ivbcc.org/api/eventos/11111111-2222-3333-4444-555555555555/calendario.ics"
    );
  });
});

describe("buildIcsCalendar", () => {
  const ics = buildIcsCalendar(event, NOW);
  const lines = ics.split("\r\n");

  it("es un VCALENDAR válido con un VEVENT y líneas terminadas en CRLF", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("END:VEVENT");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("incluye identificador, fechas y datos del evento", () => {
    expect(lines).toContain(`UID:${event.id}@ivbcc`);
    expect(lines).toContain("DTSTAMP:20261009T153000Z");
    expect(lines).toContain("DTSTART:20261018T230000Z");
    expect(lines).toContain("DTEND:20261019T010000Z");
    expect(lines).toContain("SUMMARY:Noche de alabanza");
    // La coma del lugar se escapa
    expect(lines).toContain("LOCATION:Templo principal\\, Calle 10 #5-20");
    expect(ics).toContain(`URL:${event.eventUrl}`);
  });

  it("omite LOCATION cuando el evento no tiene lugar", () => {
    expect(buildIcsCalendar({ ...event, location: null }, NOW)).not.toContain("LOCATION:");
  });
});

describe("escapeIcsText", () => {
  it("escapa barra invertida, punto y coma, coma y saltos de línea", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("foldIcsLine", () => {
  it("no toca líneas cortas", () => {
    expect(foldIcsLine("SUMMARY:Corto")).toBe("SUMMARY:Corto");
  });

  it("parte las líneas largas a 75 octetos sin cortar caracteres con tilde", () => {
    const line = `SUMMARY:${"Reunión de oración ".repeat(10)}`;
    const folded = foldIcsLine(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
    // Al desplegar (quitar CRLF + espacio) se recupera el texto original
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});
