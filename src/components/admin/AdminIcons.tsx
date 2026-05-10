export type AdminIconName =
  | "activity"
  | "analytics"
  | "arrow"
  | "book"
  | "bot"
  | "calendar"
  | "certificate"
  | "check"
  | "chevron"
  | "close"
  | "dashboard"
  | "donation"
  | "external"
  | "file"
  | "globe"
  | "home"
  | "menu"
  | "message"
  | "news"
  | "plus"
  | "search"
  | "settings"
  | "spark"
  | "stream"
  | "users";

export function AdminIcon({
  name,
  className = "h-5 w-5",
}: {
  name: AdminIconName;
  className?: string;
}) {
  const commonProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  const paths: Record<AdminIconName, React.ReactNode> = {
    activity: (
      <>
        <path d="M4 13h4l2-7 4 13 2-6h4" />
      </>
    ),
    analytics: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-3" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    book: (
      <>
        <path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4-4V4Z" />
        <path d="M5 4v12" />
        <path d="M9 8h5" />
      </>
    ),
    bot: (
      <>
        <path d="M7 8h10a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-3l-3 3v-3H7a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3Z" />
        <path d="M9 12h.01" />
        <path d="M15 12h.01" />
        <path d="M12 4v4" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3v4" />
        <path d="M17 3v4" />
        <path d="M4 8h16" />
        <path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
      </>
    ),
    certificate: (
      <>
        <path d="M6 4h12v10H6z" />
        <path d="M9 8h6" />
        <path d="m10 14-2 6 4-2 4 2-2-6" />
      </>
    ),
    check: (
      <>
        <path d="m5 13 4 4L19 7" />
      </>
    ),
    chevron: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    dashboard: (
      <>
        <path d="M4 13h7V4H4z" />
        <path d="M13 20h7V4h-7z" />
        <path d="M4 20h7v-5H4z" />
      </>
    ),
    donation: (
      <>
        <path d="M12 21s-7-4.4-9-9a4.5 4.5 0 0 1 7-5.1A4.5 4.5 0 0 1 17 6.9c4 2.5 2.8 8.2-5 14.1Z" />
        <path d="M12 9v6" />
        <path d="M9.5 11.5h5" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6" />
        <path d="m10 14 10-10" />
        <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v6h5" />
        <path d="M10 13h6" />
        <path d="M10 17h4" />
      </>
    ),
    globe: (
      <>
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.8 2.5 15.2 0 18" />
        <path d="M12 3c-2.5 2.8-2.5 15.2 0 18" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    message: (
      <>
        <path d="M4 5h16v11H7l-3 3V5Z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
      </>
    ),
    news: (
      <>
        <path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5Z" />
        <path d="M8 9h6" />
        <path d="M8 13h6" />
        <path d="M18 8h2v9a2 2 0 0 1-2 2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.08a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.1H3a2 2 0 1 1 0-4h.08a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-2l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1.1-1.65V3a2 2 0 1 1 4 0v.08a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.65 1.1H21a2 2 0 1 1 0 4h-.08a1.8 1.8 0 0 0-1.52 1Z" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3Z" />
      </>
    ),
    stream: (
      <>
        <path d="M8 7h8v10H8z" />
        <path d="m16 10 4-2v8l-4-2" />
        <path d="M5 9a5 5 0 0 0 0 6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };

  return <svg {...commonProps}>{paths[name]}</svg>;
}
