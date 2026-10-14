import { describe, expect, it } from "vitest";
import { maskEmail } from "./mask-email";

describe("maskEmail", () => {
  it("deja la primera letra y el dominio", () => {
    expect(maskEmail("gabriela@gmail.com")).toBe("g***@gmail.com");
  });

  it("normaliza espacios y mayúsculas", () => {
    expect(maskEmail("  Ana.Perez@Ejemplo.COM ")).toBe("a***@ejemplo.com");
  });

  it("oculta incluso correos de una sola letra", () => {
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
  });

  it("devuelve *** si no parece un correo", () => {
    expect(maskEmail("sin-arroba")).toBe("***");
    expect(maskEmail("@dominio.com")).toBe("***");
    expect(maskEmail("usuario@")).toBe("***");
  });
});
