import "./globals.css";
import PublicLayoutWrapper from "@/components/PublicLayoutWrapper";
import { baseMetadata } from "@/lib/seo";
import { getPublicSiteSettings } from "@/lib/site-settings";

export const metadata = baseMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteSettingsPromise = getPublicSiteSettings();

  return (
    <html lang="es">
      <body>
        <PublicLayoutWrapper siteSettings={siteSettingsPromise}>
          {children}
        </PublicLayoutWrapper>
      </body>
    </html>
  );
}
