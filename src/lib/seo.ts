import type { Metadata } from "next";
import { GOOGLE_SITE_VERIFICATION } from "@/lib/analytics";
import { defaultPublicSiteSettings } from "@/lib/site-settings";

const fallbackSiteUrl = "https://ivbcc.com";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl
).replace(/\/$/, "");

export const seoConfig = {
  siteName: defaultPublicSiteSettings.church_name,
  title: defaultPublicSiteSettings.church_name,
  titleTemplate: `%s | ${defaultPublicSiteSettings.church_name}`,
  description:
    "Iglesia Valle de Bendición Cruzada Cristiana en Valledupar. Noticias, eventos, formación, publicaciones y transmisiones para acompañar la vida espiritual de nuestra comunidad.",
  keywords: [
    "IVBCC",
    "Iglesia Valle de Bendición Cruzada Cristiana",
    "iglesia en Valledupar",
    "Cruzada Cristiana",
    "noticias cristianas",
    "eventos cristianos",
    "formación cristiana",
    "devocionales",
    "transmisiones en vivo",
  ],
  locale: "es_CO",
  logoPath: defaultPublicSiteSettings.logo_url,
  socialProfiles: [
    defaultPublicSiteSettings.facebook_url,
    defaultPublicSiteSettings.instagram_url,
    defaultPublicSiteSettings.youtube_url,
  ],
};

export const publicRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
} satisfies Metadata["robots"];

export const blockedRobotsPaths = [
  "/admin",
  "/admin/",
  "/admin/*",
  "/login",
  "/registro",
  "/recuperar-password",
  "/actualizar-password",
  "/perfil",
  "/mis-cursos",
];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function stripText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncateSeoText(value: string, maxLength = 160) {
  const text = stripText(value);

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength - 1).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  return `${lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated}…`;
}

export function resolveSeoImage(...images: Array<string | null | undefined>) {
  return images.find((image) => image?.trim()) || seoConfig.logoPath;
}

export function resolveSeoDescription(...values: Array<string | null | undefined>) {
  const description = values.find((value) => value?.trim());
  return description ? truncateSeoText(description) : seoConfig.description;
}

export function buildPageMetadata({
  title,
  description = seoConfig.description,
  path = "/",
  image = seoConfig.logoPath,
  type = "website",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
} = {}): Metadata {
  const pageTitle = title || seoConfig.title;
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: url,
    },
    robots: noIndex ? { index: false, follow: false } : publicRobots,
    openGraph: {
      title: pageTitle,
      description,
      url,
      siteName: seoConfig.siteName,
      locale: seoConfig.locale,
      type,
      images: [
        {
          url: imageUrl,
          alt: seoConfig.siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [imageUrl],
    },
  };
}

export function buildContentMetadata({
  title,
  description,
  path,
  image,
  type = "article",
  keywords,
}: {
  title?: string | null;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  keywords?: string[];
}): Metadata {
  const contentTitle = title?.trim() || seoConfig.title;
  const seoTitle = `${contentTitle} | IVBCC`;
  const seoDescription = description?.trim()
    ? truncateSeoText(description)
    : seoConfig.description;
  const imageUrl = absoluteUrl(resolveSeoImage(image));
  const canonicalUrl = absoluteUrl(path);

  return {
    title: contentTitle,
    description: seoDescription,
    keywords: keywords?.length ? [...seoConfig.keywords, ...keywords] : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      locale: seoConfig.locale,
      type,
      images: [
        {
          url: imageUrl,
          alt: contentTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [imageUrl],
    },
  };
}

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: seoConfig.title,
    template: seoConfig.titleTemplate,
  },
  description: seoConfig.description,
  keywords: seoConfig.keywords,
  applicationName: seoConfig.siteName,
  authors: [{ name: seoConfig.siteName, url: siteUrl }],
  creator: seoConfig.siteName,
  publisher: seoConfig.siteName,
  verification: GOOGLE_SITE_VERIFICATION
    ? {
        google: GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: seoConfig.logoPath,
    apple: seoConfig.logoPath,
  },
  robots: publicRobots,
  openGraph: {
    title: seoConfig.title,
    description: seoConfig.description,
    url: "/",
    siteName: seoConfig.siteName,
    locale: seoConfig.locale,
    type: "website",
    images: [
      {
        url: seoConfig.logoPath,
        alt: seoConfig.siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoConfig.title,
    description: seoConfig.description,
    images: [seoConfig.logoPath],
  },
};
