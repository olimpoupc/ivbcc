import { describe, expect, it } from "vitest";
import { buildCsvResponse, escapeCsvValue } from "./csv";

describe("escapeCsvValue", () => {
  it("wraps the value in quotes", () => {
    expect(escapeCsvValue("hola")).toBe('"hola"');
  });

  it("escapes embedded double quotes", () => {
    expect(escapeCsvValue('dijo "hola"')).toBe('"dijo ""hola"""');
  });

  it("neutralizes formula injection characters (=, +, -, @, tab, CR)", () => {
    expect(escapeCsvValue("=SUM(1+1)")).toBe('"\'=SUM(1+1)"');
    expect(escapeCsvValue("+573001234567")).toBe('"\'+573001234567"');
    expect(escapeCsvValue("-100")).toBe('"\' -100"'.replace(" ", ""));
    expect(escapeCsvValue("@admin")).toBe('"\'@admin"');
    expect(escapeCsvValue("\tTAB")).toBe('"\'\tTAB"');
    expect(escapeCsvValue("\rCR")).toBe('"\'\rCR"');
  });

  it("does not prefix single quotes for regular text", () => {
    expect(escapeCsvValue("Donación 2026")).toBe('"Donación 2026"');
    expect(escapeCsvValue("usuario@email.com")).toBe('"usuario@email.com"');
  });
});

describe("buildCsvResponse", () => {
  it("sets CSV content-type and attachment headers", async () => {
    const response = buildCsvResponse(
      ["Nombre", "Correo"],
      [["Ana", "ana@test.com"]],
      "export.csv"
    );

    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8"
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="export.csv"'
    );
  });

  it("includes the sep hint, header row, and escaped data rows", async () => {
    const response = buildCsvResponse(
      ["Nombre", "Correo"],
      [["Ana", "ana@test.com"]],
      "export.csv"
    );
    const body = await response.text();
    const lines = body.replace(/^﻿/, "").split("\n");

    expect(lines[0]).toBe("sep=;");
    expect(lines[1]).toBe("Nombre;Correo");
    expect(lines[2]).toBe('"Ana";"ana@test.com"');
  });

  it("treats null/undefined cell values as empty strings", async () => {
    const response = buildCsvResponse(
      ["A", "B"],
      [["value", undefined as unknown as string]],
      "export.csv"
    );
    const body = await response.text();

    expect(body).toContain('"value";""');
  });
});
