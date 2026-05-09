import "./globals.css";
import PublicLayoutWrapper from "@/components/PublicLayoutWrapper";
import { baseMetadata } from "@/lib/seo";
import { getPublicSiteSettings } from "@/lib/site-settings";
import { Inter, Outfit } from "next/font/google";

export const metadata = baseMetadata;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteSettingsPromise = getPublicSiteSettings();

  return (
    <html lang="es">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <PublicLayoutWrapper siteSettings={siteSettingsPromise}>
          {children}
        </PublicLayoutWrapper>
      </body>
    </html>
  );
}
