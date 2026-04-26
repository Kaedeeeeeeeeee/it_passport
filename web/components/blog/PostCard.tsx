import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PostMeta } from "@/lib/blog";

const LOCALE_DATE_TAG: Record<Locale, string> = {
  ja: "ja-JP",
  zh: "zh-CN",
  en: "en-US",
};

function fmtDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DATE_TAG[locale], {
    dateStyle: "medium",
  }).format(new Date(iso));
}

type Props = {
  post: PostMeta;
  locale: Locale;
};

/** Server component — renders a clickable summary card for a blog post.
 *  Wraps the entire card in a locale-aware Link to /blog/<slug>. */
export function PostCard({ post, locale }: Props) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="card no-underline text-ink hover:bg-surface-2 transition-colors block"
    >
      <div className="t-mono text-[11.5px] text-ink-3 mb-2">
        {fmtDate(post.date, locale)}
      </div>
      <h2 className="t-serif text-[18px] sm:text-[20px] font-semibold -tracking-[0.3px] mb-2 leading-snug">
        {post.title}
      </h2>
      <p className="text-[13px] text-ink-2 leading-[1.75] mb-3">
        {post.description}
      </p>
      {post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10.5px] text-ink-3 border border-line rounded-sm px-1.5 py-px tracking-[0.04em]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
