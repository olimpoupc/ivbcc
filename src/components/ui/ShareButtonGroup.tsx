"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type ShareButtonGroupProps = {
  title: string;
  location: string;
  whatsappLabel?: string;
  facebookLabel?: string;
};

export default function ShareButtonGroup({
  title,
  location,
  whatsappLabel = "WhatsApp",
  facebookLabel = "Facebook",
}: ShareButtonGroupProps) {
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
    <div className="premium-surface rounded-[26px] p-5">
      <p className="kicker">Compartir</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-disabled={shareDisabled}
          onClick={(event) => {
            if (shareDisabled) event.preventDefault();
            else trackEvent("click_whatsapp", { location });
          }}
          className={`btn-primary ${shareDisabled ? "pointer-events-none opacity-60" : ""}`}
        >
          {whatsappLabel}
        </a>

        <a
          href={facebookHref}
          target="_blank"
          rel="noreferrer"
          aria-disabled={shareDisabled}
          onClick={(event) => {
            if (shareDisabled) event.preventDefault();
            else trackEvent("click_facebook", { location });
          }}
          className={`btn-secondary ${shareDisabled ? "pointer-events-none opacity-60" : ""}`}
        >
          {facebookLabel}
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          disabled={shareDisabled}
          className="btn-ghost disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </button>
      </div>
    </div>
  );
}
