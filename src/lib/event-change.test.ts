import { describe, expect, it } from "vitest";
import { diffEventChanges, normalizeLocation, summarizeEventChanges } from "./event-change";

const base = {
  event_date: "2026-10-18T23:00:00.000Z",
  location: "Templo principal",
  status: "published",
};

describe("diffEventChanges", () => {
  it("sin cambios devuelve una lista vacía", () => {
    expect(diffEventChanges(base, { ...base })).toEqual([]);
  });

  it("compara la fecha por instante, no por texto", () => {
    expect(diffEventChanges(base, { ...base, event_date: "2026-10-18T18:00:00-05:00" })).toEqual([]);
    const changes = diffEventChanges(base, { ...base, event_date: "2026-10-19T23:00:00Z" });
    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe("date");
    expect(changes[0].from).not.toBe(changes[0].to);
  });

  it("ignora diferencias de espacios en el lugar", () => {
    expect(diffEventChanges(base, { ...base, location: "  Templo   principal " })).toEqual([]);
    expect(diffEventChanges(base, { ...base, location: "Auditorio" })).toEqual([
      { field: "location", label: "Lugar", from: "Templo principal", to: "Auditorio" },
    ]);
  });

  it("muestra 'Sin lugar' cuando se quita o se agrega el lugar", () => {
    expect(diffEventChanges(base, { ...base, location: "   " })[0]).toMatchObject({
      from: "Templo principal",
      to: "Sin lugar",
    });
  });

  it("detecta la cancelación y la reactivación, pero no otros cambios de estado", () => {
    expect(diffEventChanges(base, { ...base, status: "cancelled" })).toEqual([
      { field: "status", label: "Estado", from: "Publicado", to: "Cancelado" },
    ]);
    expect(diffEventChanges({ ...base, status: "cancelled" }, base)[0].to).toBe("Publicado");
    expect(diffEventChanges(base, { ...base, status: "draft" })).toEqual([]);
  });

  it("resume varios cambios en una línea", () => {
    const changes = diffEventChanges(base, { ...base, location: "Auditorio", status: "cancelled" });
    expect(summarizeEventChanges(changes)).toBe(
      "Lugar: Templo principal → Auditorio; Estado: Publicado → Cancelado"
    );
  });
});

describe("normalizeLocation", () => {
  it("colapsa espacios y trata null como vacío", () => {
    expect(normalizeLocation("  a \n  b ")).toBe("a b");
    expect(normalizeLocation(null)).toBe("");
  });
});
