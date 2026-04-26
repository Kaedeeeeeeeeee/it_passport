import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { FigureImage } from "@/components/FigureImage";
import type { Figure } from "@/lib/types";

function resolveFigure(src: string, figures: Figure[]): Figure | undefined {
  const normalized = src.replace(/^\.\.\/figures\//, "figures/");
  const filename = normalized.split("/").pop() ?? "";
  if (!filename) return undefined;
  return figures.find((f) => f.path.endsWith(filename));
}

function buildComponents(
  figures: Figure[],
  figureMaxWidth?: number,
): Components {
  return {
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    img: ({ src }) => {
      const fig = resolveFigure(typeof src === "string" ? src : "", figures);
      return fig ? (
        <FigureImage figure={fig} maxWidth={figureMaxWidth} />
      ) : null;
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-[var(--radius)] border border-line">
        <table className="w-full border-collapse text-[13.5px] leading-[1.6]">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-surface-2 text-ink-2">{children}</thead>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-line last:border-b-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="border-r border-line px-3 py-2 text-left font-semibold last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-r border-line px-3 py-2 align-top last:border-r-0">
        {children}
      </td>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>
    ),
    code: ({ className, children }) => {
      const isBlock = /language-/.test(className ?? "");
      if (isBlock) {
        return (
          <code className={"t-mono text-[13px] " + (className ?? "")}>
            {children}
          </code>
        );
      }
      return (
        <code className="t-mono rounded bg-surface-2 px-1 py-0.5 text-[0.92em]">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-[var(--radius)] bg-surface-2 p-3">
        {children}
      </pre>
    ),
  };
}

/** Some OCR'd questions (especially choices) have markdown tables squashed
 *  onto a single line — the header row and `---` separator row joined by
 *  `| |` with no newline. Restore the line break so GFM parses the table. */
function normalizeMarkdown(text: string): string {
  return text.replace(/\|\s*\|\s*---/g, "|\n| ---");
}

type Props = {
  children: string;
  figures?: Figure[];
  /** Max width passed through to inline figures referenced by `![](...)` */
  figureMaxWidth?: number;
};

/** Shared markdown renderer with GFM tables, soft breaks, and KaTeX math.
 *  Used by practice & result pages for question bodies and 中問 contexts. */
export function Markdown({
  children,
  figures = [],
  figureMaxWidth,
}: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={buildComponents(figures, figureMaxWidth)}
    >
      {normalizeMarkdown(children)}
    </ReactMarkdown>
  );
}
