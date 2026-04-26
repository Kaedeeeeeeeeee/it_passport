"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function PricingCheckoutButton({ label }: { label?: string }) {
  const t = useTranslations("pricing");
  const common = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "monthly" }),
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? common("generating") : (label ?? t("ctaSubscribe"))}
      </button>
      {error ? (
        <p className="text-[11.5px] text-wrong">{error.slice(0, 200)}</p>
      ) : null}
    </div>
  );
}
