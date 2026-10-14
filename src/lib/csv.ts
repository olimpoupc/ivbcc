// Puro y sin dependencias de servidor: se usa tanto en Route Handlers como en
// componentes de cliente que arman el CSV en el navegador.
export const CSV_BOM = "﻿";

export function escapeCsvValue(value: string) {
  const needsNeutralization = /^[=+\-@\t\r]/.test(value);
  const normalized = needsNeutralization ? `'${value}` : value;
  return `"${normalized.replace(/"/g, '""')}"`;
}

/**
 * Contenido CSV (sin BOM) con separador ";" para Excel en español. Cada valor
 * pasa por escapeCsvValue, que neutraliza fórmulas (= + - @ tab CR).
 */
export function buildCsvContent(headerLabels: string[], rows: string[][]) {
  const header = headerLabels.join(";");
  const lines = rows.map((row) =>
    row.map((value) => escapeCsvValue(value ?? "")).join(";")
  );
  return ["sep=;", header, ...lines].join("\n");
}

export function buildCsvResponse(
  headerLabels: string[],
  rows: string[][],
  filename: string
) {
  return new Response(CSV_BOM + buildCsvContent(headerLabels, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
