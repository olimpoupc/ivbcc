export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "";

export type AnalyticsEventName =
  | "click_whatsapp"
  | "click_facebook"
  | "click_instagram"
  | "click_youtube"
  | "open_live_stream"
  | "play_video"
  | "download_resource"
  | "event_registration"
  | "login"
  | "register";

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event",
      targetId: string,
      config?: AnalyticsEventParams
    ) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(
  eventName: AnalyticsEventName,
  eventParams: AnalyticsEventParams = {}
) {
  if (typeof window === "undefined" || !window.gtag || !GA_ID) return;

  window.gtag("event", eventName, {
    event_category: "engagement",
    ...eventParams,
  });
}
