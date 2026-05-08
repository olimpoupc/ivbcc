"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PublicSiteSettings } from "@/lib/site-settings";

type ChatbotItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  button_text: string | null;
  button_url: string | null;
  order_index: number;
};

type FeedbackState = "idle" | "loading" | "ready" | "error";

type Props = {
  siteSettings: PublicSiteSettings;
};

const categoryLabels: Record<string, string> = {
  general: "General",
  schedules: "Horarios",
  events: "Eventos",
  formation: "Formación",
  live: "En Vivo",
  location: "Ubicación",
  contact: "Contacto",
  prayer: "Oración",
  whatsapp: "WhatsApp",
};

function buildWhatsappUrl(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const phone = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${phone}`;
}

export default function ChatbotWidget({ siteSettings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ChatbotItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ChatbotItem | null>(null);
  const [status, setStatus] = useState<FeedbackState>("idle");

  const whatsappUrl = useMemo(
    () => buildWhatsappUrl(siteSettings.whatsapp || siteSettings.phone),
    [siteSettings.phone, siteSettings.whatsapp]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setStatus("loading");

      const { data, error } = await supabase
        .from("chatbot_items")
        .select("id,title,message,category,button_text,button_url,order_index")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setStatus("error");
        return;
      }

      setItems((data || []) as ChatbotItem[]);
      setStatus("ready");
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  function closePanel() {
    setIsOpen(false);
    setSelectedItem(null);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <section
          aria-label="Asistente virtual IVBCC"
          className="max-h-[calc(100vh-7rem)] w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="bg-[var(--ivbcc-navy)] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Asistente IVBCC</p>
                <p className="mt-1 text-xs text-white/75">
                  Respuestas rápidas para orientarte
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Cerrar chatbot"
                className="rounded-full px-2 py-1 text-lg leading-none transition hover:bg-white/10"
              >
                ×
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-5">
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-gray-700">
              Hola 👋 Soy el asistente virtual de IVBCC. ¿En qué podemos
              ayudarte?
            </div>

            {status === "loading" && (
              <p className="mt-4 text-sm text-gray-500">Cargando opciones...</p>
            )}

            {status === "error" && (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                No pudimos cargar las respuestas en este momento.
              </div>
            )}

            {status === "ready" && !selectedItem && items.length > 0 && (
              <div className="mt-4 grid gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[var(--ivbcc-gold)] hover:bg-slate-50"
                  >
                    <span className="text-sm font-bold text-gray-950">
                      {item.title}
                    </span>
                    <span className="mt-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {categoryLabels[item.category] || "General"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {status === "ready" && !selectedItem && items.length === 0 && (
              <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4">
                <p className="text-sm leading-6 text-gray-700">
                  Por ahora no hay respuestas disponibles. Puedes contactarnos
                  por WhatsApp.
                </p>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Escribir por WhatsApp
                  </a>
                )}
              </div>
            )}

            {selectedItem && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-gray-950">
                      {selectedItem.title}
                    </h2>
                    <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {categoryLabels[selectedItem.category] || "General"}
                    </span>
                  </div>
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
                    className="inline-flex rounded-lg bg-[var(--ivbcc-gold)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    {selectedItem.button_text}
                  </a>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Volver a opciones
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Cerrar ayuda" : "Abrir ayuda"}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--ivbcc-gold)] px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:opacity-95"
      >
        <span aria-hidden="true">💬</span>
        Ayuda
      </button>
    </div>
  );
}
