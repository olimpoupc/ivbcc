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
