import { describe, expect, it } from "vitest";
import { getStoragePathFromPublicUrl } from "./storage";

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
