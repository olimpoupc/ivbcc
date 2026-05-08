"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import type { PublicSiteSettings } from "@/lib/site-settings";

export default function Navbar({
  siteSettings,
}: {
  siteSettings: PublicSiteSettings;
}) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const logoSrc = siteSettings.logo_url || "/images/logonegro.png";

  return (
    <nav>
      <div className="bg-[var(--ivbcc-navy)] px-6 py-2 text-sm text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Image src="/icons/telephone.png" alt="Teléfono" width={16} height={16} />
              <span>{siteSettings.phone}</span>
            </div>

            <div className="flex items-center gap-2">
              <Image src="/icons/ubicacion2.png" alt="Ubicación" width={16} height={16} />
              <span>{siteSettings.address}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={siteSettings.facebook_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_facebook", { location: "navbar" })}
            >
              <Image src="/icons/facebookinscripciones.png" alt="Facebook" width={18} height={18} />
            </a>

            <a
              href={siteSettings.instagram_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_instagram", { location: "navbar" })}
            >
              <Image src="/icons/ig.png" alt="Instagram" width={18} height={18} />
            </a>

            <a
              href={siteSettings.youtube_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_youtube", { location: "navbar" })}
            >
              <Image src="/icons/youtubeivb.png" alt="YouTube" width={18} height={18} />
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white px-6 py-4 text-black shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              {logoSrc.startsWith("/") ? (
                <Image
                  src={logoSrc}
                  alt={`Logo ${siteSettings.church_name}`}
                  width={190}
                  height={70}
                  priority
                />
              ) : (
                <Image
                  src={logoSrc}
                  alt={`Logo ${siteSettings.church_name}`}
                  width={190}
                  height={70}
                  priority
                  unoptimized
                  style={{ height: "auto" }}
                />
              )}
            </Link>
          </div>

          <ul className="flex flex-wrap items-center gap-4 text-sm font-medium lg:justify-center">
            <li><Link href="/">Inicio</Link></li>
            <li><Link href="/formacion">Formación</Link></li>
            <li><Link href="/noticias">Noticias</Link></li>
            <li><Link href="/eventos">Eventos</Link></li>
            <li><Link href="/en-vivo">En Vivo</Link></li>
            <li><Link href="/publicaciones">Publicaciones</Link></li>
            <li><Link href="/contacto">Contacto</Link></li>
            <li className="relative">
              <details className="group">
                <summary className="cursor-pointer list-none transition hover:text-[var(--ivbcc-gold)] [&::-webkit-details-marker]:hidden">
                  Más ▾
                </summary>
                <ul className="absolute left-0 z-20 mt-2 min-w-36 rounded-md border border-gray-100 bg-white p-2 text-sm text-black shadow-lg">
                  <li>
                    <Link
                      href="/nosotros"
                      className="block rounded px-3 py-2 transition hover:bg-gray-50 hover:text-[var(--ivbcc-gold)]"
                    >
                      Nosotros
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/iglesias"
                      className="block rounded px-3 py-2 transition hover:bg-gray-50 hover:text-[var(--ivbcc-gold)]"
                    >
                      Iglesias
                    </Link>
                  </li>
                </ul>
              </details>
            </li>
            {isLoggedIn ? (
              <li className="relative">
                <details className="group">
                  <summary className="cursor-pointer list-none transition hover:text-[var(--ivbcc-gold)] [&::-webkit-details-marker]:hidden">
                    Mi cuenta ▾
                  </summary>
                  <ul className="absolute left-0 z-20 mt-2 min-w-40 rounded-md border border-gray-100 bg-white p-2 text-sm text-black shadow-lg">
                    <li>
                      <Link
                        href="/perfil"
                        className="block rounded px-3 py-2 transition hover:bg-gray-50 hover:text-[var(--ivbcc-gold)]"
                      >
                        Perfil
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/mis-cursos"
                        className="block rounded px-3 py-2 transition hover:bg-gray-50 hover:text-[var(--ivbcc-gold)]"
                      >
                        Mis cursos
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full rounded px-3 py-2 text-left transition hover:bg-gray-50 hover:text-[var(--ivbcc-gold)]"
                      >
                        Cerrar sesión
                      </button>
                    </li>
                  </ul>
                </details>
              </li>
            ) : (
              <li><Link href="/login">Iniciar sesión</Link></li>
            )}
          </ul>

          <button
            aria-label="Buscar"
            className="self-start transition hover:text-[var(--ivbcc-gold)] lg:self-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
