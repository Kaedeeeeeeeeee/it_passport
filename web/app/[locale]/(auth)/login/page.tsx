import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "@/i18n/navigation";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

// /login is a transient gateway, not search-result content. Keep it out
// of Google's index — otherwise variants like /zh/login?next=... show
// up as duplicate-without-canonical entries in Search Console.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const t = await getTranslations("login");
  return (
    <div className="card w-full max-w-md">
      <Link
        href="/"
        className="t-label text-ink-3 no-underline hover:text-accent"
      >
        {t("back")}
      </Link>
      <h1 className="t-serif text-2xl font-semibold mt-3 mb-1 text-accent-ink">
        {t("heading")}
      </h1>
      <p className="text-[13px] text-ink-2 mb-5">{t("subheading")}</p>
      {error ? (
        <p className="text-[12px] text-wrong mb-4 border border-wrong/30 bg-wrong/5 rounded-sm px-3 py-2">
          {decodeURIComponent(error)}
        </p>
      ) : null}
      <LoginForm nextPath={next ?? "/home"} />
      <p className="mt-6 text-[11px] text-ink-3 leading-relaxed">
        {t("footerNote")}
      </p>
    </div>
  );
}
