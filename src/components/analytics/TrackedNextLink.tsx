"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";

type TrackedNextLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    eventName: AnalyticsEventName;
    eventParams?: Record<string, string | number | boolean | null | undefined>;
    children: ReactNode;
  };

export default function TrackedNextLink({
  eventName,
  eventParams,
  onClick,
  children,
  ...props
}: TrackedNextLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventParams);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
