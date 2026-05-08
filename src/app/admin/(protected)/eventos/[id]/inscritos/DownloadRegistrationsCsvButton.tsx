"use client";

type Registration = {
  full_name: string;
  email: string;
  phone?: string | null;
  created_at?: string | null;
};

type Props = {
  registrations: Registration[];
};

function formatDateTimeColombia(value?: string | null) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function escapeCsvValue(value: string) {
  const normalizedValue = value.replace(/"/g, '""');
  return `"${normalizedValue}"`;
}

export default function DownloadRegistrationsCsvButton({
  registrations,
}: Props) {
  function handleDownload() {
    const header = "Nombre;Correo;Telefono;Fecha";
    const rows = registrations.map((registration) =>
      [
        escapeCsvValue(registration.full_name),
        escapeCsvValue(registration.email),
        escapeCsvValue(registration.phone || ""),
        escapeCsvValue(formatDateTimeColombia(registration.created_at)),
      ].join(";")
    );

    const csvContent = ["sep=;", header, ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "inscritos-evento.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex w-fit items-center justify-center rounded-lg bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
    >
      Descargar CSV
    </button>
  );
}
