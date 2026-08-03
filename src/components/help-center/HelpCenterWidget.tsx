"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PublicSiteSettings } from "@/lib/site-settings";

type HelpCenterItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  button_text: string | null;
  button_url: string | null;
  order_index: number;
};

type FeedbackState = "idle" | "loading" | "ready" | "error";
type View = "categories" | "items" | "detail";

type Props = {
  siteSettings: PublicSiteSettings;
};

const categoryOrder = [
  "schedules",
  "location",
  "ministries",
  "donate",
  "events",
  "formation",
  "live",
  "prayer",
  "contact",
  "whatsapp",
  "general",
] as const;

const categoryMeta: Record<string, { label: string; description: string }> = {
  schedules: { label: "Horarios", description: "Días y horas de nuestros servicios" },
  location: { label: "Ubicación", description: "Cómo llegar a la iglesia" },
  ministries: { label: "Ministerios", description: "Grupos y áreas de servicio" },
  donate: { label: "Cómo donar", description: "Formas de apoyar la obra" },
  events: { label: "Eventos", description: "Actividades próximas" },
  formation: { label: "Formación", description: "Cursos y discipulado" },
  live: { label: "En Vivo", description: "Transmisiones de servicios" },
  prayer: { label: "Oración", description: "Peticiones de oración" },
  contact: { label: "Contacto", description: "Otras formas de escribirnos" },
  whatsapp: { label: "WhatsApp", description: "Escríbenos directo" },
  general: { label: "General", description: "Otras preguntas frecuentes" },
};

function buildWhatsappUrl(value: string, text: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const phone = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function HelpCenterWidget({ siteSettings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<HelpCenterItem[]>([]);
  const [status, setStatus] = useState<FeedbackState>("idle");
  const [view, setView] = useState<View>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HelpCenterItem | null>(null);

  const whatsappUrl = useMemo(
    () =>
      buildWhatsappUrl(
        siteSettings.whatsapp || siteSettings.phone,
        "Hola, bendiciones. Quisiera hablar con alguien de IVBCC."
      ),
    [siteSettings.phone, siteSettings.whatsapp]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setStatus("loading");

      const { data, error } = await supabase
        .from("help_center_items")
        .select("id,title,message,category,button_text,button_url,order_index")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setStatus("error");
        return;
      }

      setItems((data || []) as HelpCenterItem[]);
      setStatus("ready");
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return categoryOrder.filter((category) => present.has(category));
  }, [items]);

  const itemsInSelectedCategory = useMemo(
    () => items.filter((item) => item.category === selectedCategory),
    [items, selectedCategory]
  );

  function closePanel() {
    setIsOpen(false);
    setView("categories");
    setSelectedCategory(null);
    setSelectedItem(null);
  }

  function openCategory(category: string) {
    setSelectedCategory(category);
    setSelectedItem(null);
    setView("items");
  }

  function openItem(item: HelpCenterItem) {
    setSelectedItem(item);
    setView("detail");
  }

  function backToCategories() {
    setSelectedCategory(null);
    setSelectedItem(null);
    setView("categories");
  }

  function backToItems() {
    setSelectedItem(null);
    setView("items");
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <section
          aria-label="Centro de Ayuda IVBCC"
          className="max-h-[calc(100vh-7rem)] w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-[26px] border border-[#e8e2d6] bg-white shadow-2xl"
        >
          <div className="dark-panel rounded-none border-0 px-5 py-4 text-white shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-base font-extrabold">
                  Centro de Ayuda IVBCC
                </p>
                <p className="mt-1 text-xs leading-5 text-white/68">
                  Encuentra rápido lo que necesitas
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Cerrar centro de ayuda"
                className="rounded-full px-2 py-1 text-lg leading-none transition hover:bg-white/10"
              >
                ×
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-5">
            {status === "loading" && (
              <p className="text-sm text-gray-500">Cargando opciones...</p>
            )}

            {status === "error" && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                No pudimos cargar el contenido en este momento.
              </div>
            )}

            {status === "ready" && view === "categories" && (
              <>
                <div className="rounded-2xl bg-[#f6f1e8] p-4 text-sm leading-6 text-slate-700">
                  Hola, elige un tema para ver información rápida.
                </div>

                {categories.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => openCategory(category)}
                        className="rounded-2xl border border-[#e8e2d6] bg-white p-4 text-left shadow-sm transition hover:border-[var(--ivbcc-gold)] hover:bg-[#fbfaf7]"
                      >
                        <span className="block text-sm font-bold text-gray-950">
                          {categoryMeta[category]?.label || category}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-gray-500">
                          {categoryMeta[category]?.description || ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-gray-700">
                    Por ahora no hay contenido disponible. Escríbenos por
                    WhatsApp y te ayudamos directamente.
                  </p>
                )}
              </>
            )}

            {status === "ready" && view === "items" && selectedCategory && (
              <>
                <button
                  type="button"
                  onClick={backToCategories}
                  className="text-xs font-bold text-[var(--ivbcc-navy)] hover:underline"
                >
                  ← Categorías
                </button>
                <h2 className="mt-2 text-base font-bold text-gray-950">
                  {categoryMeta[selectedCategory]?.label || selectedCategory}
                </h2>

                <div className="mt-3 grid gap-3">
                  {itemsInSelectedCategory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openItem(item)}
                      className="rounded-2xl border border-[#e8e2d6] bg-white p-4 text-left shadow-sm transition hover:border-[var(--ivbcc-gold)] hover:bg-[#fbfaf7]"
                    >
                      <span className="text-sm font-bold text-gray-950">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {status === "ready" && view === "detail" && selectedItem && (
              <>
                <button
                  type="button"
                  onClick={backToItems}
                  className="text-xs font-bold text-[var(--ivbcc-navy)] hover:underline"
                >
                  ← {categoryMeta[selectedItem.category]?.label || selectedItem.category}
                </button>

                <div className="mt-3 rounded-2xl border border-[#e8e2d6] p-4">
                  <h2 className="text-base font-bold text-gray-950">
                    {selectedItem.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-700">
                    {selectedItem.message}
                  </p>
                </div>

                {selectedItem.button_text && selectedItem.button_url && (
                  <a
                    href={selectedItem.button_url}
                    target={
                      selectedItem.button_url.startsWith("http")
                        ? "_blank"
                        : undefined
                    }
                    rel={
                      selectedItem.button_url.startsWith("http")
                        ? "noreferrer"
                        : undefined
                    }
                    className="btn-primary mt-4"
                  >
                    {selectedItem.button_text}
                  </a>
                )}
              </>
            )}

            {whatsappUrl && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-full bg-emerald-600 px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-emerald-700"
                >
                  Hablar con alguien por WhatsApp
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Cerrar centro de ayuda" : "Abrir centro de ayuda"}
        className="btn-primary shadow-xl"
      >
        <span aria-hidden="true">?</span>
        Ayuda
      </button>
    </div>
  );
}
