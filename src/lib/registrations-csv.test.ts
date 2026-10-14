import { describe, expect, it } from "vitest";
import { buildRegistrationsCsvContent } from "./registrations-csv";

describe("buildRegistrationsCsvContent", () => {
  it("neutraliza un nombre con fórmula =HYPERLINK(...) escrito por un visitante", () => {
    const csv = buildRegistrationsCsvContent([
      {
        full_name: '=HYPERLINK("https://malicioso.example","Clic aquí")',
        email: "ana@ejemplo.com",
        phone: "3001234567",
        created_at: null,
      },
    ]);
    const dataLine = csv.split("\n")[2];
    expect(dataLine.startsWith(`"'=HYPERLINK(`)).toBe(true);
    expect(dataLine).toContain('""https://malicioso.example""');
    expect(csv).not.toMatch(/(^|;|\n)"?=HYPERLINK/);
  });

  it("neutraliza también + - @ al inicio de cualquier columna", () => {
    const csv = buildRegistrationsCsvContent([
      { full_name: "+cmd", email: "@correo", phone: "-1", created_at: null },
    ]);
    expect(csv.split("\n")[2]).toBe(`"'+cmd";"'@correo";"'-1";"Sin fecha"`);
  });

  it("mantiene el formato sep=; y los encabezados", () => {
    const csv = buildRegistrationsCsvContent([]);
    expect(csv).toBe("sep=;\nNombre;Correo;Telefono;Fecha");
  });
});
