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
