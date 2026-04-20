import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function Topbar({ title, subtitle, right }: Props) {
  return (
    <div className="flex items-end justify-between gap-6 px-6 sm:px-9 pt-7 pb-5 border-b border-line">
      <div>
        {subtitle ? <div className="t-label">{subtitle}</div> : null}
        <h1 className="t-serif mt-1 text-[22px] sm:text-[26px] font-semibold -tracking-[0.6px] text-ink">
          <span className="bg-[linear-gradient(transparent_62%,#f4e4a8_62%)] px-0.5 box-decoration-clone">
            {title}
          </span>
        </h1>
      </div>
      {right ? <div className="flex gap-2 items-center">{right}</div> : null}
    </div>
  );
}
