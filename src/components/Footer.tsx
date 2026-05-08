import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import type { PublicSiteSettings } from "@/lib/site-settings";

export default function Footer({
  siteSettings,
}: {
  siteSettings: PublicSiteSettings;
}) {
  return (
    <footer className="mt-16 bg-[var(--ivbcc-navy)] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
        <div>
          <h2 className="text-lg font-bold">IVBCC</h2>
          <p className="mt-2 text-sm text-gray-200">
            {siteSettings.church_name}
          </p>
          <p className="mt-4 text-sm text-gray-300">
            {siteSettings.address}
          </p>
          <p className="mt-1 text-sm text-gray-300">{siteSettings.phone}</p>
          <p className="mt-1 text-sm text-gray-300">{siteSettings.primary_email}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Enlaces
          </h3>
          <div className="mt-3 space-y-2 text-sm text-gray-300">
            <div><Link href="/">Inicio</Link></div>
            <div><Link href="/formacion">Formación</Link></div>
            <div><Link href="/noticias">Noticias</Link></div>
            <div><Link href="/eventos">Eventos</Link></div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Síguenos
          </h3>
          <div className="mt-3 space-y-2 text-sm text-gray-300">
            <div>
              <TrackedLink
                href={siteSettings.facebook_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_facebook"
                eventParams={{ location: "footer" }}
              >
                Facebook
              </TrackedLink>
            </div>
            <div>
              <TrackedLink
                href={siteSettings.instagram_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_instagram"
                eventParams={{ location: "footer" }}
              >
                Instagram
              </TrackedLink>
            </div>
            <div>
              <TrackedLink
                href={siteSettings.youtube_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_youtube"
                eventParams={{ location: "footer" }}
              >
                YouTube
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-white/15 pt-4 text-center text-xs text-gray-300">
        <p>
          {siteSettings.footer_text}
        </p>
        <p className="mt-2">
          Valledupar, Colombia © 2026
        </p>
      </div>
    </footer>
  );
}
