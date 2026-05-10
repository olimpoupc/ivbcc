"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import type { PublicSiteSettings } from "@/lib/site-settings";

const primaryLinks = [
  { href: "/", label: "Inicio" },
  { href: "/noticias", label: "Noticias" },
  { href: "/eventos", label: "Eventos" },
  { href: "/formacion", label: "Formación" },
  { href: "/publicaciones", label: "Publicaciones" },
  { href: "/contacto", label: "Contacto" },
];

type ActiveDropdown = "more" | "account" | null;

function buildTelHref(phone: string) {
  const trimmedPhone = phone.trim();
  const digits = trimmedPhone.replace(/\D/g, "");

  if (!digits) return "";
  if (trimmedPhone.startsWith("+")) return `tel:+${digits}`;
  if (digits.startsWith("57")) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+57${digits}`;

  return `tel:+${digits}`;
}

function buildMapsHref(googleMapsUrl: string, address: string) {
  const trimmedMapsUrl = googleMapsUrl.trim();
  const trimmedAddress = address.trim();

  if (trimmedMapsUrl) return trimmedMapsUrl;
  if (!trimmedAddress) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    trimmedAddress
  )}`;
}

export default function Navbar({
  siteSettings,
}: {
  siteSettings: PublicSiteSettings;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const accountDropdownRef = useRef<HTMLDivElement | null>(null);
  const moreDropdownRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      setIsLoggedIn(Boolean(user));
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setActiveDropdown(null), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;

      const clickedInsideAccount =
        accountDropdownRef.current?.contains(target) || false;
      const clickedInsideMore =
        moreDropdownRef.current?.contains(target) || false;

      if (!clickedInsideAccount && !clickedInsideMore) {
        setActiveDropdown(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveDropdown(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    setActiveDropdown(null);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function toggleDropdown(dropdown: Exclude<ActiveDropdown, null>) {
    setActiveDropdown((currentDropdown) =>
      currentDropdown === dropdown ? null : dropdown
    );
  }

  function closeDropdowns() {
    setActiveDropdown(null);
  }

  const logoSrc = siteSettings.logo_url || "/images/logonegro.png";
  const telHref = buildTelHref(siteSettings.phone);
  const mapsHref = buildMapsHref(
    siteSettings.google_maps_url,
    siteSettings.address
  );

  return (
    <nav className="sticky top-0 z-40 nav-glass">
      <div className="border-b border-[#e8e2d6]/70 bg-[var(--ivbcc-navy)] text-white">
        <div className="site-shell-wide flex min-h-9 flex-col gap-2 py-2 text-xs lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/76">
            <span className="font-semibold text-[var(--ivbcc-gold-2)]">
              {siteSettings.slogan || "Iglesia Valle de Bendición"}
            </span>
            {telHref ? (
              <a
                href={telHref}
                className="font-semibold transition hover:text-[var(--ivbcc-gold-2)]"
              >
                {siteSettings.phone}
              </a>
            ) : null}
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-block max-w-[17rem] truncate font-semibold transition hover:text-[var(--ivbcc-gold-2)] sm:max-w-none"
              >
                {siteSettings.address}
              </a>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              {siteSettings.facebook_url ? (
                <a
                  href={siteSettings.facebook_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackEvent("click_facebook", { location: "navbar" })
                  }
                  className="transition hover:opacity-70"
                >
                  <Image
                    src="/icons/facebookinscripciones.png"
                    alt="Facebook"
                    width={18}
                    height={18}
                  />
                </a>
              ) : null}

              {siteSettings.instagram_url ? (
                <a
                  href={siteSettings.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackEvent("click_instagram", { location: "navbar" })
                  }
                  className="transition hover:opacity-70"
                >
                  <Image src="/icons/ig.png" alt="Instagram" width={18} height={18} />
                </a>
              ) : null}

              {siteSettings.youtube_url ? (
                <a
                  href={siteSettings.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackEvent("click_youtube", { location: "navbar" })
                  }
                  className="transition hover:opacity-70"
                >
                  <Image
                    src="/icons/youtubeivb.png"
                    alt="YouTube"
                    width={18}
                    height={18}
                  />
                </a>
              ) : null}
            </div>

            <span className="hidden h-4 w-px bg-white/22 sm:block" />

            {isLoggedIn ? (
              <div ref={accountDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("account")}
                  aria-expanded={activeDropdown === "account"}
                  aria-controls="navbar-account-menu"
                  className="cursor-pointer rounded-full px-3 py-1.5 font-semibold text-white/86 transition hover:bg-white/10 hover:text-white"
                >
                  Mi cuenta
                </button>
                {activeDropdown === "account" ? (
                <ul
                  id="navbar-account-menu"
                  className="absolute right-0 z-[70] mt-2 min-w-44 rounded-2xl border border-[#e8e2d6] bg-white p-2 text-sm text-[var(--ivbcc-ink)] shadow-xl"
                >
                  <li>
                    <Link
                      href="/perfil"
                      onClick={closeDropdowns}
                      className="block rounded-xl px-3 py-2 transition hover:bg-[#f3eee4]"
                    >
                      Perfil
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/mis-cursos"
                      onClick={closeDropdowns}
                      className="block rounded-xl px-3 py-2 transition hover:bg-[#f3eee4]"
                    >
                      Mis cursos
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-[#f3eee4]"
                    >
                      Cerrar sesión
                    </button>
                  </li>
                </ul>
                ) : null}
              </div>
            ) : (
              <Link
                href="/login"
                onClick={closeDropdowns}
                className="rounded-full px-3 py-1.5 font-semibold text-white/86 transition hover:bg-white/10 hover:text-white"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="site-shell-wide py-3 text-[var(--ivbcc-ink)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center">
              {logoSrc.startsWith("/") ? (
                <Image
                  src={logoSrc}
                  alt={`Logo ${siteSettings.church_name}`}
                  width={174}
                  height={64}
                  priority
                  className="h-auto max-h-14 w-auto"
                />
              ) : (
                <Image
                  src={logoSrc}
                  alt={`Logo ${siteSettings.church_name}`}
                  width={174}
                  height={64}
                  priority
                  unoptimized
                  className="h-auto max-h-14 w-auto"
                />
              )}
            </Link>
          </div>

          <ul className="flex flex-wrap items-center gap-1 text-sm lg:flex-1 lg:justify-center">
            {primaryLinks.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeDropdowns}
                    className={`inline-flex rounded-full px-3 py-2 font-semibold transition ${
                      isActive
                        ? "bg-[var(--ivbcc-navy)] text-white"
                        : "text-slate-700 hover:bg-[#f3eee4] hover:text-[var(--ivbcc-navy)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li ref={moreDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown("more")}
                aria-expanded={activeDropdown === "more"}
                aria-controls="navbar-more-menu"
                className="cursor-pointer rounded-full px-3 py-2 font-semibold text-slate-700 transition hover:bg-[#f3eee4] hover:text-[var(--ivbcc-navy)]"
              >
                  Más
              </button>
              {activeDropdown === "more" ? (
                <ul
                  id="navbar-more-menu"
                  className="absolute left-0 z-[70] mt-3 min-w-40 rounded-2xl border border-[#e8e2d6] bg-white p-2 text-sm text-[var(--ivbcc-ink)] shadow-xl"
                >
                  <li>
                    <Link
                      href="/nosotros"
                      onClick={closeDropdowns}
                      className="block rounded-xl px-3 py-2 transition hover:bg-[#f3eee4]"
                    >
                      Nosotros
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/iglesias"
                      onClick={closeDropdowns}
                      className="block rounded-xl px-3 py-2 transition hover:bg-[#f3eee4]"
                    >
                      Iglesias
                    </Link>
                  </li>
                </ul>
              ) : null}
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <Link
              href="/donaciones"
              onClick={closeDropdowns}
              className="rounded-full bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:opacity-90"
            >
              $ Donar
            </Link>
            <Link
              href="/en-vivo"
              onClick={() => {
                closeDropdowns();
                trackEvent("open_live_stream", { location: "navbar" });
              }}
              className="btn-primary"
            >
              Transmisiones
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
