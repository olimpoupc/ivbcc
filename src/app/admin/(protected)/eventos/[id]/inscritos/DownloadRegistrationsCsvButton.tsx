"use client";

import { CSV_BOM } from "@/lib/csv";
import {
  buildRegistrationsCsvContent,
  type RegistrationCsvRow,
} from "@/lib/registrations-csv";

type Props = {
  registrations: RegistrationCsvRow[];
};

export default function DownloadRegistrationsCsvButton({
  registrations,
}: Props) {
  function handleDownload() {
    const csvContent = buildRegistrationsCsvContent(registrations);
    const blob = new Blob([`${CSV_BOM}${csvContent}`], {
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
