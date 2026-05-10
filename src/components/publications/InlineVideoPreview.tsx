"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import YouTubeEmbed from "@/components/media/YouTubeEmbed";

const INLINE_VIDEO_OPEN_EVENT = "ivbcc:publication-inline-video-open";

type InlineVideoPreviewProps = {
  playerId: string;
  title: string;
  embedUrl: string;
  triggerLabel: string;
  triggerClassName: string;
  triggerAriaLabel?: string;
  children: ReactNode;
};

type InlineVideoOpenButtonProps = {
  playerId: string;
  title: string;
  triggerLabel: string;
  triggerClassName: string;
  triggerAriaLabel?: string;
};

function dispatchInlineVideoOpen(playerId: string) {
  window.dispatchEvent(
    new CustomEvent(INLINE_VIDEO_OPEN_EVENT, { detail: { playerId } })
  );
}

export function InlineVideoOpenButton({
  playerId,
  title,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
}: InlineVideoOpenButtonProps) {
  return (
    <button
      type="button"
      aria-label={triggerAriaLabel}
      onClick={() => {
        trackEvent("play_video", {
          title,
          location: "publication_inline_video_button",
        });
        dispatchInlineVideoOpen(playerId);
      }}
      className={triggerClassName}
    >
      {triggerLabel}
    </button>
  );
}

export default function InlineVideoPreview({
  playerId,
  title,
  embedUrl,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
  children,
}: InlineVideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const closeVideo = useCallback(() => {
    setVideoUrl(null);
  }, []);

  const openVideo = useCallback(() => {
    trackEvent("play_video", {
      title,
      location: "publication_inline_video_media",
    });
    dispatchInlineVideoOpen(playerId);
  }, [playerId, title]);

  useEffect(() => {
    const handleInlineVideoOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ playerId?: string }>;

      setVideoUrl(customEvent.detail?.playerId === playerId ? embedUrl : null);
    };

    window.addEventListener(INLINE_VIDEO_OPEN_EVENT, handleInlineVideoOpen);

    return () => {
      window.removeEventListener(INLINE_VIDEO_OPEN_EVENT, handleInlineVideoOpen);
    };
  }, [embedUrl, playerId]);

  return (
    <div className="absolute inset-0 bg-slate-950">
      {videoUrl ? (
        <>
          <YouTubeEmbed
            src={videoUrl}
            title={title}
            className="absolute inset-0 h-full"
            allowPictureInPicture={false}
          />
          <button
            type="button"
            onClick={closeVideo}
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-md transition hover:bg-slate-100"
            aria-label="Cerrar video"
          >
            ×
          </button>
        </>
      ) : (
        <>
          {children}
          <button
            type="button"
            aria-label={triggerAriaLabel}
            onClick={openVideo}
            className={triggerClassName}
          >
            {triggerLabel}
          </button>
        </>
      )}
    </div>
  );
}
