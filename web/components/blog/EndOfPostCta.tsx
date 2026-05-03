import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** End-of-blog-post conversion card. Renders after every blog post body to
 *  give the reader a clear next step instead of leaving them in a footer
 *  of legal links. Visually distinct via a 2px accent border so the eye
 *  catches it after the muted blog typography. */
export async function EndOfPostCta() {
  const t = await getTranslations("blog");
  return (
    <aside
      className="mt-12 card"
      style={{ borderColor: "var(--accent)", borderWidth: 2 }}
    >
      <div className="t-label mb-3" style={{ color: "var(--accent-ink)" }}>
        {t("ctaEyebrow")}
      </div>
      <h2 className="t-serif text-[20px] sm:text-[22px] font-semibold -tracking-[0.3px] mb-3 text-ink">
        {t("ctaTitle")}
      </h2>
      <p className="text-[14px] text-ink-2 leading-[1.85] mb-5">
        {t("ctaBody")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/login" className="btn btn-primary no-underline">
          {t("ctaPrimary")} →
        </Link>
        <Link
          href="/exams"
          className="text-[13px] text-ink-3 underline-offset-2 hover:text-accent hover:underline"
        >
          {t("ctaSecondary")}
        </Link>
      </div>
    </aside>
  );
}
