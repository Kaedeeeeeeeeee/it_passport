import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home"
  | "book"
  | "play"
  | "exam"
  | "bookmark"
  | "chart"
  | "settings"
  | "search"
  | "flag"
  | "clock"
  | "check"
  | "x"
  | "arrow"
  | "fire"
  | "dot"
  | "globe";

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V10z" />,
  book: (
    <>
      <path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4V4z" />
      <path d="M20 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8V4z" />
    </>
  ),
  play: <path d="M6 4l14 8-14 8V4z" />,
  exam: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3z" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  flag: <path d="M5 21V4M5 4h12l-2 4 2 4H5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  fire: <path d="M12 2s4 4 4 8a4 4 0 01-8 0c0-1 1-2 1-2-3 2-5 5-5 8a8 8 0 0016 0c0-6-4-10-8-14z" />,
  dot: <circle cx="12" cy="12" r="4" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 3 2.5 15 0 18" />
      <path d="M12 3c-2.5 3-2.5 15 0 18" />
    </>
  ),
};

type Props = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
