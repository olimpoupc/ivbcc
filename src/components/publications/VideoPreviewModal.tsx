"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "@/lib/analytics";
import YouTubeEmbed from "@/components/media/YouTubeEmbed";

type VideoPreviewModalProps = {
  title: string;
  embedUrl: string;
  triggerLabel: string;
  triggerClassName: string;
  triggerAriaLabel?: string;
};

const VIDEO_PREVIEW_OPEN_EVENT = "ivbcc:publication-video-preview-open";

export default function VideoPreviewModal({
  title,
  embedUrl,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
}: VideoPreviewModalProps) {
  const instanceId = useId();
  const previousBodyOverflow = useRef<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setVideoUrl(null);
    setIsOpen(false);
  }, []);

  const openModal = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(VIDEO_PREVIEW_OPEN_EVENT, { detail: { instanceId } })
    );

    setVideoUrl(embedUrl);
    setIsOpen(true);
  }, [embedUrl, instanceId]);

  useEffect(() => {
    const handleOtherVideoOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ instanceId?: string }>;

      if (customEvent.detail?.instanceId !== instanceId) {
        closeModal();
      }
    };

    window.addEventListener(VIDEO_PREVIEW_OPEN_EVENT, handleOtherVideoOpen);

    return () => {
      window.removeEventListener(VIDEO_PREVIEW_OPEN_EVENT, handleOtherVideoOpen);
    };
  }, [closeModal, instanceId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    previousBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow.current || "";
      previousBodyOverflow.current = null;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, isOpen]);

  const modal = isOpen && videoUrl ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/82 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={closeModal}
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
            onClick={closeModal}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:bg-slate-100"
            aria-label="Cerrar video"
          >
            ×
          </button>
        </div>
        <div className="bg-slate-950">
          <YouTubeEmbed
            src={videoUrl}
            title={title}
            allowPictureInPicture={false}
          />
        </div>
      </div>
    </div>
  ) : null;

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
          openModal();
        }}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {modal && typeof document !== "undefined"
        ? createPortal(modal, document.body)
        : null}
    </>
  );
}
