"use client";

type Props = {
  courseTitle: string;
  studentName: string;
};

function formatCertificateDate() {
  return new Date().toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

export default function CourseCertificateButton({
  courseTitle,
  studentName,
}: Props) {
  function handleDownloadCertificate() {
    const certificateWindow = window.open("", "_blank", "width=1100,height=800");

    if (!certificateWindow) {
      alert("No pudimos abrir la vista del certificado.");
      return;
    }

    const issuedDate = formatCertificateDate();

    certificateWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Certificado de finalización</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: #f6f1df;
              color: #12284c;
            }
            .certificate {
              max-width: 980px;
              margin: 40px auto;
              background: white;
              border: 10px solid #c8a64d;
              padding: 56px;
              text-align: center;
              box-sizing: border-box;
            }
            .eyebrow {
              letter-spacing: 0.25em;
              text-transform: uppercase;
              font-size: 12px;
              font-weight: 700;
              color: #c8a64d;
            }
            h1 {
              margin: 18px 0 10px;
              font-size: 42px;
            }
            h2 {
              margin: 28px 0 8px;
              font-size: 34px;
            }
            p {
              margin: 12px 0;
              font-size: 18px;
              line-height: 1.7;
            }
            .course {
              font-size: 28px;
              font-weight: 700;
              color: #12284c;
            }
            .footer {
              margin-top: 48px;
              display: flex;
              justify-content: space-between;
              gap: 24px;
              text-align: left;
            }
            .signature {
              flex: 1;
              border-top: 1px solid #12284c;
              padding-top: 12px;
              font-size: 15px;
            }
            .print-note {
              margin-top: 24px;
              font-size: 14px;
              color: #666;
            }
            @media print {
              body {
                background: white;
              }
              .certificate {
                margin: 0;
                border-width: 8px;
              }
              .print-note {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <section class="certificate">
            <div class="eyebrow">Iglesia Valle de Bendición Cruzada Cristiana</div>
            <h1>Certificado de finalización</h1>
            <p>Se certifica que</p>
            <h2>${studentName}</h2>
            <p>ha completado satisfactoriamente el curso</p>
            <p class="course">${courseTitle}</p>
            <p>en la plataforma de formación de IVBCC.</p>
            <div class="footer">
              <div class="signature">
                Iglesia Valle de Bendición Cruzada Cristiana
              </div>
              <div class="signature">
                Fecha de expedición: ${issuedDate}
              </div>
            </div>
            <p class="print-note">Usa la opción Imprimir o Guardar como PDF desde el navegador.</p>
          </section>
        </body>
      </html>
    `);

    certificateWindow.document.close();
    certificateWindow.focus();
    certificateWindow.print();
  }

  return (
    <button
      type="button"
      onClick={handleDownloadCertificate}
      className="rounded-lg bg-[var(--ivbcc-navy)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
    >
      Descargar certificado
    </button>
  );
}
