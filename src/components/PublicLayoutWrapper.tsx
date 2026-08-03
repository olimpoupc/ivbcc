"use client";

import { Suspense, use } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import GoogleAnalytics from "./analytics/GoogleAnalytics";
import HelpCenterWidget from "./help-center/HelpCenterWidget";
import type { PublicSiteSettings } from "@/lib/site-settings";

export default function PublicLayoutWrapper({
  children,
  siteSettings,
}: {
  children: React.ReactNode;
  siteSettings: Promise<PublicSiteSettings>;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const resolvedSiteSettings = use(siteSettings);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>
      <Navbar siteSettings={resolvedSiteSettings} />
      {children}
      <Footer siteSettings={resolvedSiteSettings} />
      <HelpCenterWidget siteSettings={resolvedSiteSettings} />
    </>
  );
}
