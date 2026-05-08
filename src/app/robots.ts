import type { MetadataRoute } from "next";
import { blockedRobotsPaths, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: blockedRobotsPaths,
    },
    host: siteUrl,
  };
}
