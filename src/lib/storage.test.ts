import { describe, expect, it } from "vitest";
import { buildDirectDownloadUrl, getStoragePathFromPublicUrl } from "./storage";

describe("getStoragePathFromPublicUrl", () => {
  it("extracts the storage path from a public Supabase URL", () => {
    const url =
      "https://project.supabase.co/storage/v1/object/public/news-images/events/foo.png";

    expect(getStoragePathFromPublicUrl(url)).toBe("events/foo.png");
  });

  it("decodes URI-encoded characters in the path", () => {
    const url =
      "https://project.supabase.co/storage/v1/object/public/news-images/events/mi%20archivo.png";

    expect(getStoragePathFromPublicUrl(url)).toBe("events/mi archivo.png");
  });

  it("respects a custom bucket name", () => {
    const url =
      "https://project.supabase.co/storage/v1/object/public/other-bucket/file.pdf";

    expect(getStoragePathFromPublicUrl(url, "other-bucket")).toBe("file.pdf");
  });

  it("returns null for a URL from a different bucket", () => {
    const url =
      "https://project.supabase.co/storage/v1/object/public/other-bucket/file.pdf";

    expect(getStoragePathFromPublicUrl(url, "news-images")).toBeNull();
  });

  it("returns null for null/undefined/invalid input", () => {
    expect(getStoragePathFromPublicUrl(null)).toBeNull();
    expect(getStoragePathFromPublicUrl(undefined)).toBeNull();
    expect(getStoragePathFromPublicUrl("not-a-url")).toBeNull();
  });
});

describe("buildDirectDownloadUrl", () => {
  const base = "https://project.supabase.co/storage/v1/object/public/news-images";

  it("añade ?download con el nombre limpio para archivos de Supabase Storage", () => {
    const { href, isDirect } = buildDirectDownloadUrl(
      `${base}/lessons/1760000000000-11111111-2222-3333-4444-555555555555-guia-semana-1.pdf`
    );
    expect(isDirect).toBe(true);
    expect(new URL(href).searchParams.get("download")).toBe("guia-semana-1.pdf");
  });

  it("usa el nombre indicado cuando se pasa uno", () => {
    const { href } = buildDirectDownloadUrl(`${base}/publications/doc.pdf`, "Boletín octubre.pdf");
    expect(new URL(href).searchParams.get("download")).toBe("Boletín octubre.pdf");
  });

  it("no toca los enlaces externos (p. ej. Google Drive)", () => {
    const url = "https://drive.google.com/file/d/abc/view";
    expect(buildDirectDownloadUrl(url)).toEqual({ href: url, isDirect: false });
  });

  it("devuelve la URL tal cual si no es válida", () => {
    expect(buildDirectDownloadUrl("no es una url")).toEqual({ href: "no es una url", isDirect: false });
  });
});
