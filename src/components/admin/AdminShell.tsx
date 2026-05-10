"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminIcon, type AdminIconName } from "./AdminIcons";

type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminIconName;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

type AdminShellProps = {
  children: React.ReactNode;
  pathname: string;
  adminName: string;
  adminRole?: string;
};

const navSections: AdminNavSection[] = [
  {
    label: "Centro de control",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/configuracion", label: "Configuración", icon: "settings" },
    ],
  },
  {
    label: "Contenido",
    items: [
      { href: "/admin/noticias", label: "Noticias", icon: "news" },
      { href: "/admin/eventos", label: "Eventos", icon: "calendar" },
      { href: "/admin/publicaciones", label: "Publicaciones", icon: "file" },
      { href: "/admin/en-vivo", label: "En Vivo", icon: "stream" },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { href: "/admin/formacion", label: "Formación", icon: "book" },
      { href: "/admin/certificados", label: "Certificados", icon: "certificate" },
      { href: "/admin/inscripciones", label: "Inscripciones", icon: "users" },
      { href: "/admin/contacto", label: "Contacto", icon: "message" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { href: "/admin/donaciones", label: "Donaciones", icon: "donation" },
      { href: "/admin/chatbot", label: "Chatbot", icon: "bot" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatCurrentDate() {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  }).format(new Date());
}

function getCurrentNavItem(pathname: string) {
  return navSections
    .flatMap((section) => section.items)
    .find((item) => isActivePath(pathname, item.href));
}

export default function AdminShell({
  children,
  pathname,
  adminName,
  adminRole = "Administrador",
}: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const currentItem = useMemo(() => getCurrentNavItem(pathname), [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }

  return (
    <section className="premium-page min-h-screen text-[var(--ivbcc-ink)]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(201,162,74,0.12),transparent_30rem),linear-gradient(180deg,#fffdfa_0%,var(--ivbcc-paper)_46%,#ffffff_100%)]" />

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        <div
          className={`h-full border-r border-white/10 bg-[var(--ivbcc-navy)] text-white shadow-[0_22px_70px_rgba(7,22,45,0.18)] transition-[width] duration-200 ${
            isCollapsed ? "w-24" : "w-80"
          }`}
        >
          <AdminSidebar
            pathname={pathname}
            isCollapsed={isCollapsed}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          />
          <div className="relative h-full w-[min(88vw,22rem)] bg-[var(--ivbcc-navy)] text-white shadow-2xl">
            <button
              type="button"
              aria-label="Cerrar navegación"
              onClick={() => setIsMobileOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
            >
              <AdminIcon name="close" className="h-4 w-4" />
            </button>
            <AdminSidebar
              pathname={pathname}
              isCollapsed={false}
              onNavigate={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          isCollapsed ? "lg:pl-24" : "lg:pl-80"
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-[rgba(232,226,214,0.7)] bg-white/80 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Abrir navegación"
                onClick={() => setIsMobileOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ivbcc-line)] bg-white text-[var(--ivbcc-navy)] shadow-sm transition hover:bg-[var(--ivbcc-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ivbcc-gold)] lg:hidden"
              >
                <AdminIcon name="menu" />
              </button>
              <button
                type="button"
                aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
                onClick={() => setIsCollapsed((value) => !value)}
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-[var(--ivbcc-line)] bg-white text-[var(--ivbcc-navy)] shadow-sm transition hover:bg-[var(--ivbcc-paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ivbcc-gold)] lg:flex"
              >
                <AdminIcon
                  name="chevron"
                  className={`h-4 w-4 transition ${isCollapsed ? "" : "rotate-180"}`}
                />
              </button>

              <div className="min-w-0">
                <p className="kicker">
                  {currentItem?.label || "Panel"}
                </p>
                <p className="muted-copy mt-1 truncate text-sm">
                  {formatCurrentDate()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost hidden min-h-11 rounded-full sm:inline-flex"
              >
                <AdminIcon name="external" className="h-4 w-4" />
                Ver sitio
              </Link>

              <div className="premium-surface hidden items-center gap-3 rounded-full px-3 py-2 xl:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ivbcc-navy)] text-sm font-black text-[var(--ivbcc-gold-2)]">
                  {adminName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="max-w-36 truncate text-sm font-extrabold text-[var(--ivbcc-ink)]">
                    {adminName}
                  </p>
                  <p className="text-xs font-semibold text-[var(--ivbcc-muted)]">
                    {adminRole}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="min-h-11 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <div className="admin-premium px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </section>
  );
}

function AdminSidebar({
  pathname,
  isCollapsed,
  onNavigate,
}: {
  pathname: string;
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <aside className="flex h-full flex-col overflow-y-auto p-4">
      <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/8 p-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
          <Image
            src="/images/logonegro.png"
            alt="IVBCC"
            width={42}
            height={42}
            className="h-full w-full object-contain"
          />
        </div>
        {!isCollapsed ? (
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold tracking-tight">
              IVBCC Admin
            </p>
            <p className="truncate text-xs font-semibold text-white/60">
              Iglesia Valle de Bendición
            </p>
          </div>
        ) : null}
      </div>

      <nav className="mt-5 flex flex-1 flex-col gap-5">
        {navSections.map((section) => (
          <div key={section.label}>
            {!isCollapsed ? (
              <p className="mb-2 px-3 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-white/55">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={`group flex min-h-12 items-center gap-3 rounded-full px-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ivbcc-gold)] ${
                      isActive
                        ? "bg-white text-[var(--ivbcc-navy)] shadow-lg"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isActive
                          ? "bg-[var(--ivbcc-gold)] text-[var(--ivbcc-navy)]"
                          : "bg-white/10 text-white/70 group-hover:text-white"
                      }`}
                    >
                      <AdminIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    {!isCollapsed ? <span>{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!isCollapsed ? (
        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/8 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--ivbcc-gold-2)]">
            Panel Administrativo
          </p>
          <p className="mt-2 text-sm leading-6 text-white/66">
            Gestión del sistema web
          </p>
        </div>
      ) : null}
    </aside>
  );
}
