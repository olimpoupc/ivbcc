import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_STORAGE_BUCKET = "news-images";

export function getStoragePathFromPublicUrl(
  url?: string | null,
  bucket: string = DEFAULT_STORAGE_BUCKET
) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function removeStorageObjects(
  supabase: SupabaseClient,
  urls: Array<string | null | undefined>,
  bucket: string = DEFAULT_STORAGE_BUCKET
) {
  const paths = urls
    .map((url) => getStoragePathFromPublicUrl(url, bucket))
    .filter((path): path is string => Boolean(path));

  if (!paths.length) return { error: null };

  return supabase.storage.from(bucket).remove(paths);
}

const PUBLIC_OBJECT_MARKER = "/storage/v1/object/public/";
// buildSafeStoragePath (src/lib/security.ts) antepone "<timestamp>-<uuid>-".
const SAFE_PATH_PREFIX =
  /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

/**
 * URL de descarga directa para un archivo público de Supabase Storage: añade
 * `?download=<nombre>`, con lo que Storage responde con
 * `Content-Disposition: attachment` y el navegador descarga el archivo en vez
 * de abrirlo en otra pestaña. El atributo `download` de <a> no sirve aquí
 * porque el archivo está en otro dominio.
 *
 * Devuelve `isDirect: false` (y la URL sin cambios) para enlaces externos,
 * p. ej. Google Drive, que deben seguir abriéndose en una pestaña nueva.
 */
export function buildDirectDownloadUrl(
  url: string,
  fileName?: string
): { href: string; isDirect: boolean } {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes(PUBLIC_OBJECT_MARKER)) {
      return { href: url, isDirect: false };
    }

    const lastSegment = decodeURIComponent(parsed.pathname.split("/").pop() || "");
    const name = fileName?.trim() || lastSegment.replace(SAFE_PATH_PREFIX, "") || "archivo";
    parsed.searchParams.set("download", name);
    return { href: parsed.toString(), isDirect: true };
  } catch {
    return { href: url, isDirect: false };
  }
}
