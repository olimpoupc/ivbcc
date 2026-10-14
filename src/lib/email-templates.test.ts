import { describe, expect, it } from "vitest";
import {
  renderCourseCompletedEmail,
  renderCourseWelcomeEmail,
  renderEventChangeEmail,
  renderEventRegistrationEmail,
} from "./email-templates";

const baseData = {
  recipientName: "Ana Pérez",
  eventTitle: "Noche de alabanza",
  eventDateLabel: "sábado, 18 de octubre de 2026, 6:00 p. m.",
  eventLocation: "Templo principal",
  eventUrl: "https://ivbcc.org/eventos/noche-de-alabanza",
  email: "ana@ejemplo.com",
  phone: "3001234567",
  calendarLinks: {
    google: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Noche",
    ics: "https://ivbcc.org/api/eventos/abc/calendario.ics",
  },
};

describe("renderEventRegistrationEmail", () => {
  it("incluye el agradecimiento y los datos del evento y del inscrito", () => {
    const html = renderEventRegistrationEmail(baseData);
    expect(html).toContain("¡Gracias por inscribirte al evento!");
    expect(html).toContain("Hola Ana Pérez,");
    expect(html).toContain("Noche de alabanza");
    expect(html).toContain("sábado, 18 de octubre de 2026, 6:00 p. m.");
    expect(html).toContain("Templo principal");
    expect(html).toContain("ana@ejemplo.com");
    expect(html).toContain("3001234567");
    expect(html).toContain('href="https://ivbcc.org/eventos/noche-de-alabanza"');
  });

  it("incluye la sección «Agendar evento» con los dos enlaces de calendario", () => {
    const html = renderEventRegistrationEmail(baseData);
    expect(html).toContain("Agendar evento:");
    expect(html).toContain("Google Calendar");
    expect(html).toContain("Apple / Outlook Calendar");
    // Los & del enlace se escapan como &amp; dentro del atributo href
    expect(html).toContain(
      'href="https://calendar.google.com/calendar/render?action=TEMPLATE&amp;text=Noche"'
    );
    expect(html).toContain('href="https://ivbcc.org/api/eventos/abc/calendario.ics"');
    // La sección va después del botón "Ver el evento"
    expect(html.indexOf("Agendar evento:")).toBeGreaterThan(html.indexOf("Ver el evento"));
  });

  it("omite la fila de lugar cuando el evento no tiene lugar", () => {
    const html = renderEventRegistrationEmail({ ...baseData, eventLocation: null });
    expect(html).not.toContain(">Lugar<");
  });

  it("escapa el HTML que escriba el usuario", () => {
    const html = renderEventRegistrationEmail({
      ...baseData,
      recipientName: '<script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
});

describe("correos de cursos", () => {
  it("bienvenida: escapa el nombre y el curso, y enlaza a Mis cursos", () => {
    const html = renderCourseWelcomeEmail({
      recipientName: '<img src=x onerror="alert(1)">',
      courseTitle: "Fe & <b>Obras</b>",
      courseUrl: "https://ivbcc.org/formacion/fe",
      myCoursesUrl: "https://ivbcc.org/mis-cursos",
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("Fe &amp; &lt;b&gt;Obras&lt;/b&gt;");
    expect(html).toContain('href="https://ivbcc.org/mis-cursos"');
  });

  it("aprobación: escapa nombre y curso, e incluye código y enlace de verificación", () => {
    const html = renderCourseCompletedEmail({
      recipientName: "Ana <script>",
      courseTitle: 'Curso "Básico"',
      certificateCode: "IVBCC-2026-ABC123",
      verificationUrl: "https://ivbcc.org/certificados/verificar/IVBCC-2026-ABC123",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ana &lt;script&gt;");
    expect(html).toContain("Curso &quot;Básico&quot;");
    expect(html).toContain("IVBCC-2026-ABC123");
    expect(html).toContain('href="https://ivbcc.org/certificados/verificar/IVBCC-2026-ABC123"');
  });
});

describe("renderEventChangeEmail", () => {
  const base = {
    recipientName: "Ana",
    eventTitle: "Retiro <juvenil>",
    changes: [{ label: "Lugar", from: "Templo & Sede", to: '<script>alert("x")</script>' }],
    cancelled: false,
    eventUrl: "https://ivbcc.org/eventos/retiro",
    calendarLinks: {
      google: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Retiro",
      ics: "https://ivbcc.org/api/eventos/abc/calendario.ics",
    },
    eventsUrl: "https://ivbcc.org/eventos",
  };

  it("escapa título y valores, y muestra anterior y nuevo con Agendar evento", () => {
    const html = renderEventChangeEmail(base);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Retiro &lt;juvenil&gt;");
    expect(html).toContain("Templo &amp; Sede");
    expect(html).toContain("Cambio en el evento");
    expect(html).toContain("Ver el evento");
    expect(html).toContain("Agendar evento");
    expect(html).toContain("Recibes este aviso porque");
  });

  it("si se canceló: título Evento cancelado, sin calendario y con enlace a otros eventos", () => {
    const html = renderEventChangeEmail({ ...base, cancelled: true, calendarLinks: null });
    expect(html).toContain("Evento cancelado");
    expect(html).not.toContain("Agendar evento");
    expect(html).toContain('href="https://ivbcc.org/eventos"');
  });
});

describe("filas de detalle", () => {
  it("la columna de etiquetas tiene ancho mínimo y separación a la derecha", () => {
    const html = renderEventRegistrationEmail(baseData);
    const labelCells = html.match(/<td style="[^"]*">(Evento|Fecha|Lugar|Inscrito como|Correo|Teléfono)<\/td>/g) || [];
    expect(labelCells).toHaveLength(6);
    for (const cell of labelCells) {
      expect(cell).toContain("min-width:110px");
      expect(cell).toContain("padding:8px 16px 8px 0");
    }
  });
});
