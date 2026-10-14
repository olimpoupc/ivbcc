import { describe, expect, it } from "vitest";
import { formatUploadLimit, uploadHints, uploadLimits } from "./security";

describe("uploadHints", () => {
  it("formatea el límite en MB", () => {
    expect(formatUploadLimit(4 * 1024 * 1024)).toBe("máx. 4 MB");
  });

  it("deriva cada texto de ayuda de uploadLimits", () => {
    expect(uploadHints.image).toContain(formatUploadLimit(uploadLimits.imageMaxBytes));
    expect(uploadHints.logo).toContain(formatUploadLimit(uploadLimits.logoMaxBytes));
    expect(uploadHints.pdf).toContain(formatUploadLimit(uploadLimits.documentMaxBytes));
    expect(uploadHints.document).toContain(formatUploadLimit(uploadLimits.documentMaxBytes));
  });

  it("muestra los valores actuales: imagen 4 MB, logo 2 MB, documentos 8 MB", () => {
    expect(uploadHints.image).toBe("Formatos permitidos: JPG, PNG o WebP (máx. 4 MB).");
    expect(uploadHints.logo).toBe("Formatos permitidos: JPG, PNG o WebP (máx. 2 MB).");
    expect(uploadHints.pdf).toBe("Solo se permite PDF (máx. 8 MB).");
    expect(uploadHints.document).toBe("PDF, DOC o DOCX (máx. 8 MB).");
  });
});
