"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type Props = {
  title: string;
};

export default function ShareLiveStreamButtons({ title }: Props) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(title);
  const shareDisabled = !currentUrl;
  const whatsappHref = currentUrl
    ? `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
    : "#";
  const facebookHref = currentUrl
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    : "#";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentUrl(window.location.href);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleCopyLink() {
    if (!currentUrl) return;

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ivbcc-gold)]">
        Compartir
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-disabled={shareDisabled}
          onClick={(event) => {
            if (shareDisabled) event.preventDefault();
            else trackEvent("click_whatsapp", { location: "share_live_stream" });
          }}
          className={`inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 ${
            shareDisabled ? "pointer-events-none opacity-60" : ""
          }`}
        >
          WhatsApp
        </a>

        <a
          href={facebookHref}
          target="_blank"
          rel="noreferrer"
          aria-disabled={shareDisabled}
          onClick={(event) => {
            if (shareDisabled) event.preventDefault();
            else trackEvent("click_facebook", { location: "share_live_stream" });
          }}
          className={`inline-flex rounded-lg bg-[var(--ivbcc-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${
            shareDisabled ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Facebook
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          disabled={shareDisabled}
          className="inline-flex rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </button>
      </div>
    </div>
  );
}
