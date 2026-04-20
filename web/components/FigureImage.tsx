import Image from "next/image";
import type { Figure } from "@/lib/types";

export function FigureImage({
  figure,
  className,
  maxWidth = 520,
}: {
  figure: Figure;
  className?: string;
  maxWidth?: number;
}) {
  return (
    <figure
      className={
        "my-3 rounded-[var(--radius)] border border-line bg-surface-2 p-2 " +
        (className ?? "")
      }
    >
      <div
        className="relative mx-auto"
        style={{ maxWidth, aspectRatio: "16 / 10" }}
      >
        <Image
          src={"/" + figure.path}
          alt={figure.description ?? ""}
          fill
          sizes={`(max-width: 640px) 100vw, ${maxWidth}px`}
          className="object-contain"
          unoptimized
        />
      </div>
      {figure.description ? (
        <figcaption className="t-label mt-2 text-center !text-[10px] normal-case tracking-[0.02em] text-ink-3">
          {figure.description}
        </figcaption>
      ) : null}
    </figure>
  );
}
