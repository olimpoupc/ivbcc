function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2p(value: string) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;">${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function renderContactReplyEmail({
  recipientName,
  body,
}: {
  recipientName: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f6f0dc;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f0dc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#0f2a4a;padding:24px 32px;">
                <p style="margin:0;color:#f6f0dc;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">
                  Iglesia Valle de Bendición Cruzada Cristiana
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 16px;">Hola ${escapeHtml(recipientName)},</p>
                ${nl2p(body)}
                <p style="margin:24px 0 0;">Bendiciones,<br />IVBCC</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type EventRegistrationEmailData = {
  recipientName: string;
  eventTitle: string;
  /** Fecha ya formateada en hora de Colombia, p. ej. "sábado, 18 de octubre de 2026, 6:00 p. m." */
  eventDateLabel: string;
  eventLocation: string | null;
  eventUrl: string;
  email: string;
  phone: string;
  /** Enlaces "Agregar al calendario" (ver src/lib/event-calendar.ts). */
  calendarLinks: {
    google: string;
    ics: string;
  };
};

function calendarButton(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 18px;border:1px solid #0f2a4a;border-radius:999px;color:#0f2a4a;font-size:13px;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a>`;
}

function detailRow(label: string, value: string) {
  return `<tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:13px;width:110px;vertical-align:top;">${escapeHtml(label)}</td>
                    <td style="padding:8px 0;color:#0f2a4a;font-size:15px;font-weight:bold;">${escapeHtml(value)}</td>
                  </tr>`;
}

export function renderEventRegistrationEmail(data: EventRegistrationEmailData) {
  const details = [
    detailRow("Evento", data.eventTitle),
    detailRow("Fecha", data.eventDateLabel),
    data.eventLocation ? detailRow("Lugar", data.eventLocation) : "",
    detailRow("Inscrito como", data.recipientName),
    detailRow("Correo", data.email),
    detailRow("Teléfono", data.phone),
  ].join("");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f6f0dc;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f0dc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#0f2a4a;padding:24px 32px;">
                <p style="margin:0;color:#f6f0dc;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">
                  Iglesia Valle de Bendición Cruzada Cristiana
                </p>
                <p style="margin:12px 0 0;color:#ffffff;font-size:24px;font-weight:bold;line-height:1.3;">
                  ¡Tu inscripción está confirmada!
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 16px;">Hola ${escapeHtml(data.recipientName)},</p>
                <p style="margin:0 0 24px;">
                  ¡Gracias por inscribirte al evento! Te esperamos con mucha alegría. Aquí están los detalles:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e2d6;border-bottom:1px solid #e8e2d6;margin:0 0 24px;">
                  ${details}
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="background-color:#c9a24a;border-radius:999px;">
                      <a href="${escapeHtml(data.eventUrl)}" style="display:inline-block;padding:12px 24px;color:#0f2a4a;font-size:14px;font-weight:bold;text-decoration:none;">
                        Ver el evento
                      </a>
                    </td>
                  </tr>
                </table>
                <div style="margin:0 0 24px;padding:16px;background-color:#faf7ef;border-radius:12px;">
                  <p style="margin:0 0 12px;color:#0f2a4a;font-size:14px;font-weight:bold;">Agendar evento:</p>
                  ${calendarButton(data.calendarLinks.google, "Google Calendar")}${calendarButton(data.calendarLinks.ics, "Apple / Outlook Calendar")}
                </div>
                <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">
                  Si no fuiste tú quien hizo esta inscripción, puedes ignorar este correo.
                </p>
                <p style="margin:24px 0 0;">Bendiciones,<br />IVBCC</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
