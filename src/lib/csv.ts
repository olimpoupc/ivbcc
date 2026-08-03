const BOM = "﻿";

export function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCsvResponse(
  headerLabels: string[],
  rows: string[][],
  filename: string
) {
  const header = headerLabels.join(";");
  const lines = rows.map((row) =>
    row.map((value) => escapeCsvValue(value ?? "")).join(";")
  );
  const csvContent = ["sep=;", header, ...lines].join("\n");

  return new Response(BOM + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
