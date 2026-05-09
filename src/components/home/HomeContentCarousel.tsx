"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import EmptyImagePlaceholder from "@/components/EmptyImagePlaceholder";

export type HomeContentCarouselItem = {
  id: string;
  type: "Noticia" | "Evento" | "Publicación";
  title: string;
  summary: string;
  imageUrl: string | null;
  dateLabel: string;
  href: string;
};

type Props = {
  items: HomeContentCarouselItem[];
};

export default function HomeContentCarousel({ items }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallbackId = setTimeout(() => setIsInViewport(true), 0);
      return () => clearTimeout(fallbackId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.35,
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (items.length <= 1 || isPaused || !isInViewport) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [isInViewport, isPaused, items.length]);

  if (!items.length) return null;

  function goToPrevious() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? items.length - 1 : currentIndex - 1
    );
  }

  function goToNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % items.length);
  }

  return (
    <section ref={sectionRef} className="site-shell-wide py-12">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker">Actualidad IVBCC</p>
          <h2 className="section-title mt-2 text-4xl md:text-5xl">
            Lo último en IVBCC
          </h2>
        </div>

        {items.length > 1 ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Ver contenido anterior"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ivbcc-line)] bg-white font-display text-2xl font-bold text-[var(--ivbcc-navy)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--ivbcc-gold)]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Ver contenido siguiente"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ivbcc-line)] bg-white font-display text-2xl font-bold text-[var(--ivbcc-navy)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--ivbcc-gold)]"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="overflow-hidden rounded-[30px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div key={item.id} className="min-w-full">
              <Link
                href={item.href}
                className="editorial-card grid min-h-[520px] overflow-hidden rounded-[30px] lg:grid-cols-[1.08fr_0.92fr]"
              >
                <div className="media-frame min-h-[280px] rounded-none lg:min-h-[520px]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 720px, 100vw"
                      priority={index === 0}
                      className="object-cover"
                    />
                  ) : (
                    <EmptyImagePlaceholder
                      label={`IVBCC ${item.type}`}
                      subtitle="Contenido reciente para nuestra comunidad."
                      className="h-full"
                      variant="detail"
                    />
                  )}
                </div>

                <div className="flex flex-col justify-center bg-white p-7 md:p-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="badge">{item.type}</span>
                    <span className="text-sm font-semibold text-slate-500">
                      {item.dateLabel}
                    </span>
                  </div>

                  <h3 className="section-title mt-5 text-3xl md:text-5xl">
                    {item.title}
                  </h3>
                  <p className="muted-copy mt-5 line-clamp-4">
                    {item.summary || "Contenido disponible para la comunidad IVBCC."}
                  </p>
                  <span className="btn-secondary mt-8 w-fit">
                    Ver detalle
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 ? (
        <div className="mt-5 flex justify-center gap-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver item ${index + 1} del carrusel`}
              className={`h-2.5 rounded-full transition-all ${
                activeIndex === index
                  ? "w-8 bg-[var(--ivbcc-gold)]"
                  : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
