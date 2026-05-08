"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type VideoPreviewModalProps = {
  title: string;
  embedUrl: string;
  triggerLabel: string;
  triggerClassName: string;
  triggerAriaLabel?: string;
};

export default function VideoPreviewModal({
  title,
  embedUrl,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
}: VideoPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        aria-label={triggerAriaLabel}
        onClick={() => {
          trackEvent("play_video", {
            title,
            location: "publication_preview_modal",
          });
          setIsOpen(true);
        }}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 md:px-5">
              <h2 className="line-clamp-1 text-base font-bold text-gray-950 md:text-lg">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:bg-slate-100"
                aria-label="Cerrar video"
              >
                ×
              </button>
            </div>
            <div className="bg-slate-950">
              <div className="relative aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title={title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
