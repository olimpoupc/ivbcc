import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import type { PublicSiteSettings } from "@/lib/site-settings";

export default function Footer({
  siteSettings,
}: {
  siteSettings: PublicSiteSettings;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-[var(--ivbcc-navy)] text-white">
      <div className="site-shell-wide grid gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
        <div className="max-w-md">
          <p className="kicker">IVBCC</p>
          <h2 className="font-display mt-4 text-3xl font-extrabold leading-tight">
            {siteSettings.church_name}
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/68">
            {siteSettings.footer_text}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white/62">
            Enlaces
          </h3>
          <div className="mt-4 grid gap-3 text-sm text-white/72">
            <Link href="/" className="transition hover:text-[var(--ivbcc-gold-2)]">Inicio</Link>
            <Link href="/noticias" className="transition hover:text-[var(--ivbcc-gold-2)]">Noticias</Link>
            <Link href="/eventos" className="transition hover:text-[var(--ivbcc-gold-2)]">Eventos</Link>
            <Link href="/formacion" className="transition hover:text-[var(--ivbcc-gold-2)]">Formación</Link>
            <Link href="/en-vivo" className="transition hover:text-[var(--ivbcc-gold-2)]">En Vivo</Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white/62">
            Comunidad
          </h3>
          <div className="mt-4 grid gap-3 text-sm text-white/72">
            <Link href="/nosotros" className="transition hover:text-[var(--ivbcc-gold-2)]">Nosotros</Link>
            <Link href="/publicaciones" className="transition hover:text-[var(--ivbcc-gold-2)]">Publicaciones</Link>
            <Link href="/iglesias" className="transition hover:text-[var(--ivbcc-gold-2)]">Iglesias</Link>
            <Link href="/contacto" className="transition hover:text-[var(--ivbcc-gold-2)]">Contacto</Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white/62">
            Contacto
          </h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-white/72">
            <p>
              {siteSettings.address}
            </p>
            <p>{siteSettings.phone}</p>
            <p>{siteSettings.primary_email}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
              <TrackedLink
                href={siteSettings.facebook_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_facebook"
                eventParams={{ location: "footer" }}
                className="btn-ghost border-white/15 bg-white/8 text-white hover:bg-white/12"
              >
                Facebook
              </TrackedLink>
              <TrackedLink
                href={siteSettings.instagram_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_instagram"
                eventParams={{ location: "footer" }}
                className="btn-ghost border-white/15 bg-white/8 text-white hover:bg-white/12"
              >
                Instagram
              </TrackedLink>
              <TrackedLink
                href={siteSettings.youtube_url}
                target="_blank"
                rel="noreferrer"
                eventName="click_youtube"
                eventParams={{ location: "footer" }}
                className="btn-primary"
              >
                YouTube
              </TrackedLink>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="site-shell-wide flex flex-col gap-3 py-5 text-xs text-white/56 md:flex-row md:items-center md:justify-between">
          <p>Valledupar, Colombia © {year}</p>
          <p>Diseñado para comunicar fe, formación y comunidad.</p>
        </div>
      </div>
    </footer>
  );
}
