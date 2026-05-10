import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SitemapRecord = {
  slug: string;
  updated_at?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  event_date?: string | null;
  scheduled_at?: string | null;
};

function getLastModified(record: SitemapRecord) {
  return new Date(
    record.updated_at ||
      record.published_at ||
      record.event_date ||
      record.scheduled_at ||
      record.created_at ||
      Date.now()
  );
}

function staticEntry(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
) {
  return {
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

function dynamicEntry(
  basePath: string,
  record: SitemapRecord,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
) {
  return {
    url: absoluteUrl(`${basePath}/${record.slug}`),
    lastModified: getLastModified(record),
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabaseServerClient();

  const [
    { data: news },
    { data: events },
    { data: publications },
    { data: courses },
    { data: liveStreams },
  ] = await Promise.all([
    supabase
      .from("news")
      .select("slug,updated_at,published_at,created_at")
      .eq("status", "published"),
    supabase
      .from("events")
      .select("slug,updated_at,event_date,created_at")
      .eq("status", "published"),
    supabase
      .from("publications")
      .select("slug,updated_at,published_at,created_at")
      .eq("status", "published"),
    supabase
      .from("courses")
      .select("slug,updated_at,created_at")
      .eq("status", "published"),
    supabase
      .from("live_streams")
      .select("slug,updated_at,scheduled_at,created_at")
      .eq("status", "published"),
  ]);

  return [
    staticEntry("/", 1, "daily"),
    staticEntry("/nosotros", 0.7, "monthly"),
    staticEntry("/contacto", 0.7, "monthly"),
    staticEntry("/donaciones", 0.75, "monthly"),
    staticEntry("/noticias", 0.85, "daily"),
    staticEntry("/eventos", 0.85, "daily"),
    staticEntry("/publicaciones", 0.85, "weekly"),
    staticEntry("/formacion", 0.8, "weekly"),
    staticEntry("/en-vivo", 0.8, "daily"),
    staticEntry("/iglesias", 0.6, "monthly"),
    ...(news || []).map((record) =>
      dynamicEntry("/noticias", record, 0.75, "weekly")
    ),
    ...(events || []).map((record) =>
      dynamicEntry("/eventos", record, 0.75, "weekly")
    ),
    ...(publications || []).map((record) =>
      dynamicEntry("/publicaciones", record, 0.7, "weekly")
    ),
    ...(courses || []).map((record) =>
      dynamicEntry("/formacion", record, 0.7, "monthly")
    ),
    ...(liveStreams || []).map((record) =>
      dynamicEntry("/en-vivo", record, 0.65, "weekly")
    ),
  ];
}
