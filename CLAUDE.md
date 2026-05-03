# IT Passport — Project notes for Claude

This file is the entry point when an agent (or a future you) opens the
repo. It sits next to `README.md` (which only documents the Python OCR
pipeline) and gives a top-down view of everything else: the web app,
Supabase, Vercel/Stripe, and the gotchas you only learn by tripping
over them.

## What this repo actually is

Three layers stacked on the same dataset:

1. **OCR/parse pipeline** (Python, `scripts/`) — IPA scanned PDFs → JSON
   question bank. Source of truth, regenerable, mostly write-once.
   Output goes to `dataset/` (gitignored) and is mirrored into
   `web/data/` + `web/public/figures/` for the web app.
2. **Web app** (`web/`) — Next.js 16 App Router + next-intl + Supabase
   + Stripe + Vercel Analytics. The user-facing IT Passport practice
   site at https://passnote.app (production custom domain).
   `it-passport-steel.vercel.app` is the auto-generated Vercel preview
   domain; both serve the same app, but all canonical tags / sitemap /
   `NEXT_PUBLIC_SITE_URL` point to passnote.app.
3. **Database & integrations** (`supabase/`, Vercel project config) —
   Postgres tables (profiles, attempts, sessions, ai_explanations) and
   their migrations.

Detailed pipeline docs live in `README.md`. This file focuses on
layers 2 + 3.

## Repo layout

```
scripts/                Python OCR/parse/audit pipeline (see README.md)
download/               Source PDFs (gitignored)
ocr_out/                OCR + parse intermediates (gitignored)
dataset/                Packed dataset for HF (gitignored, source of truth)
supabase/migrations/    Postgres schema migrations (apply with `supabase db push`)
web/                    Next.js 16 app (deployed to Vercel)
├── app/[locale]/...    All user-facing routes, locale-prefixed
├── app/(auth)/         OAuth/magic-link callback (NOT locale-prefixed)
├── app/api/...         API routes (NOT locale-prefixed)
├── components/         UI components (Sidebar, Markdown, LocaleSwitcher, etc.)
├── content/blog/{ja,zh,en}/  MDX blog posts
├── data/questions.json  Committed copy of dataset (mirrored from /dataset/)
├── public/figures/     Committed copy of dataset images
├── i18n/               next-intl routing + navigation helpers
├── lib/                Shared server/client logic
├── messages/{ja,zh,en}.json   Translations (~360 keys per locale)
├── proxy.ts            Next.js 16 proxy (was middleware.ts) — auth + locale
└── next.config.ts      Wraps next-intl plugin
```

## Web stack key concepts

### i18n (next-intl v4)
- Locales: `['ja', 'zh', 'en']`, default `ja`, `localePrefix: "as-needed"`
  → `/library` is the ja URL; `/zh/library` and `/en/library` for the
  others.
- Routing config: `web/i18n/routing.ts`. Server-side translator:
  `getTranslations({ locale, namespace })`. Client: `useTranslations`.
- Locale-aware navigation: `web/i18n/navigation.ts` exports `Link`,
  `usePathname`, `useRouter`, `redirect`. **Use these, not
  `next/link` / `next/navigation`** in any component that has internal
  links.
- User locale is persisted in two places: `NEXT_LOCALE` cookie and
  `profiles.preferred_language`. The `/api/locale` POST keeps them in
  sync; the OAuth callback prefers profile over cookie.

### Auth (Supabase)
- Magic link + Google OAuth → `/callback` → exchange → set session
  cookie + maybe override `NEXT_LOCALE`.
- `web/lib/auth.ts` exports `getProfile`, `requireAuth(origin)`,
  `requirePro(origin)`. Use `requireAuth` for any (shell)/private route
  that doesn't need Pro.
- The `proxy.ts` does Supabase session refresh on every request, then
  hands off to next-intl middleware for non-API/non-callback paths.

### Payments (Stripe, test mode)
- Stripe SDK at `web/lib/stripe.ts` (lazy, fails fast on missing
  `STRIPE_SECRET_KEY`).
- Three routes: `/api/checkout` (POST → returns Checkout URL),
  `/api/portal` (POST → returns Billing Portal URL), and
  `/api/webhooks/stripe` (Stripe → updates `profiles.subscription_status`,
  `current_period_end`, `stripe_customer_id`).
- DB schema for subscription state lives in
  `supabase/migrations/20260420051643_profiles_and_attempts.sql`.

### AI explanations (Vercel AI Gateway + Gemini)
- `/api/explain` accepts `{ questionId, userAnswer, language }`,
  delegates to `lib/explain-prompt.ts` for per-locale system prompts
  (ja / zh / en), caches in `ai_explanations` keyed by
  `(question_id, model, language)`.
- Default model: `google/gemini-3-flash` via `AI_GATEWAY_API_KEY`. Set
  `AI_MODEL` env to override.

### SEO surface (public, no login)
- `app/sitemap.ts` and `app/robots.ts` — static SEO files.
- `app/[locale]/(public)/{exams,category,blog}/...` — public landing
  pages (28 exams × 3 locales × ~3 templates) with question previews
  but no answers. CTA: "Sign in for full + AI explanations".
- JSON-LD: `components/seo/JsonLd.tsx`, mounted in
  `app/[locale]/layout.tsx` (WebSite + Organization).

### Analytics
- `@vercel/analytics` + `@vercel/speed-insights` injected in the root
  `app/layout.tsx` (covers `/callback` which is outside `[locale]`).
- Custom events via `web/lib/analytics.ts` `track()` wrapper:
  `login_succeeded`, `practice_started`, `exam_finished`,
  `explanation_generated`.

## Local dev

```bash
# Prereqs: pnpm/npm, Node 20+, supabase CLI, stripe CLI
cd web
npm install
cp .env.local.example .env.local   # fill in Supabase + AI Gateway
npm run dev                          # http://localhost:3000

# DB schema changes
cd /Users/user/it_passport
supabase db push                     # applies migrations to linked remote

# Local Stripe webhook testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

`web/scripts/sync-dataset.sh` (run by `npm run predev` and `prebuild`)
copies `../dataset/` → `web/data/questions.json` + `web/public/figures/`.
On Vercel/CI it falls back to the committed copy under `web/data/`.

## Deploy

**Production deploys are wired to `git push origin main`.** Vercel
watches the GitHub repo and rebuilds automatically — there's no need
to run `vercel deploy` by hand. Pushing iOS-only changes also fires a
build; if you want to skip it, use `[skip ci]` (or just don't push
those commits with web changes).

```bash
git push origin main
# Vercel build kicks off automatically — watch progress at
#   https://vercel.com/zhangs-projects-a5619c97/it-passport
# Production domain is https://passnote.app (the *.vercel.app
# subdomain also serves the deploy but canonicalizes to passnote.app).
```

CLI deploy from the repo root does work as a fallback, **but** the
upload bundle includes the gitignored `dataset/` directory which
triggers `rsync` calls in `web/scripts/sync-dataset.sh` — Vercel build
containers don't have rsync, so the build exits 127. Auto-deploy
sidesteps this because it only sees what's in git, and the script
exits 0 cleanly when `../dataset/` is missing.

If you must deploy via CLI: either install `rsync` handling/fallback
in the script, or run the deploy from a tree that doesn't include
`dataset/` at the top level (e.g. a fresh clone).

## Operational gotchas (learn-the-hard-way notes)

These are the things that actually cost real time. Read before
debugging similar weirdness.

### `vercel env add` quoting
- `.env.local` files often have values wrapped in `"..."`. `grep | cut`
  carries the quotes through to `vercel env add`, so the var lands as
  the literal string `"https://..."` and Supabase URL parsing fails
  with `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`
- **Fix in pipeline**: pipe values through
  `sed 's/^"\(.*\)"$/\1/'` before passing to the CLI.

### `vercel env add --sensitive` + `--value` is broken in CLI 52
- `--sensitive` is the default for Production. Combined with `--value`
  it POSTs to the API but the value lands empty (CLI bug, not API).
- **Workaround**: pass `--no-sensitive --value=X --yes`. Vars get
  encrypted at rest anyway; sensitive only changes whether the dashboard
  UI hides them.

### `vercel env pull` returns `""` for sensitive vars
- This is by design (security: pull never reveals sensitive values).
- Don't use `pull` to verify a sensitive var was set correctly — it'll
  always look empty even when it's fine. Instead trigger a deploy and
  watch runtime logs.

### `proxy.ts` SKIP_INTL must include SEO files
- next-intl's middleware happily tries to locale-prefix `/sitemap.xml`
  and `/robots.txt`, which then 404. Both have to be in `SKIP_INTL` in
  `proxy.ts` along with `/api/` and `/callback`.

### Vercel preview env via CLI is broken on new projects
- For brand-new projects, `vercel env add NAME preview --value=X --yes`
  errors with `git_branch_required` even though the help says branch is
  optional. We skipped Preview env entirely; Production is what
  matters for shipping.

### Dataset isn't on Vercel by default
- `dataset/` (and its sync source `../dataset/`) is gitignored. We
  commit the copies under `web/data/` and `web/public/figures/` so
  Vercel deploys work. Local dev still re-syncs from `../dataset/`
  when the agent updates it.
- `web/scripts/sync-dataset.sh` exits 0 cleanly when `../dataset/` is
  missing and a committed copy exists.

### Vercel CLI scope after `cd`
- Once you `cd` away from `web/`, subsequent `vercel deploy` commands
  fail with `branch_not_found`-style errors unless you pass
  `--scope=zhangs-projects-a5619c97`. Either keep cwd in `web/` or
  always pass `--scope`.

## What's still manual / unfinished

- **GitHub → Vercel auto-deploy**: ✅ done. `git push origin main`
  triggers a production build automatically (configured in the Vercel
  Dashboard's Git integration). See the Deploy section above for the
  rsync gotcha if you ever fall back to CLI deploy.
- **Custom domain**: ✅ done. `passnote.app` is the production domain
  (`NEXT_PUBLIC_SITE_URL=https://passnote.app` on Vercel). The
  `*.vercel.app` subdomain still serves the same deploy but every page
  has `<link rel="canonical" href="https://passnote.app/...">`, so
  Google indexes only passnote.app. The Stripe webhook endpoint URL
  should target passnote.app as well.
- **消費税 / Stripe Tax**: deferred. Currently 免税事業者 (個人事業主,
  < ¥10M annual revenue) so we don't actually collect or remit
  consumption tax. Legal page deliberately omits "税込". When revenue
  approaches the ¥10M threshold: register as 課税事業者, enable Stripe
  Tax in dashboard, archive the current price + recreate with
  `tax_behavior: "inclusive"`, add `automatic_tax: { enabled: true }`
  + `customer_update.address` to checkout/route.ts, and restore
  「税込」 wording on /legal + /terms.
- **Vercel Preview env**: no env vars set for Preview deployments
  (CLI bug). Add them via Vercel Dashboard if/when you start using PR
  previews.
- **Supabase Development env vars**: same story — only Production has
  the full set on Vercel. Add via dashboard if you want
  `vercel dev` to work end-to-end.
- **Sentry / error monitoring**: SDK is installed (`@sentry/nextjs`)
  with `instrumentation.ts` + `instrumentation-client.ts` + a
  `global-error.tsx` boundary. SDK is dormant when
  `NEXT_PUBLIC_SENTRY_DSN` env is unset. To activate: create project
  at sentry.io → set `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`,
  `SENTRY_ORG`, `SENTRY_PROJECT` on Vercel → redeploy. Source maps
  upload happens at build time via the auth token.
- **Blog content**: only one demo post per locale. No real schedule.
- **Onboarding flow**: nothing. First-time users land on `/home` cold.

## Useful one-liners

```bash
# Pull production env locally for debugging
vercel env pull /tmp/.env.prod --environment=production --yes

# Tail production runtime logs (JSON, full error text)
vercel logs <deployment-url> --no-follow --since=30m --json

# Apply a new Supabase migration
cd /Users/user/it_passport && supabase db push --linked

# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Find a value in messages without grepping
jq '.exam.title' web/messages/{ja,zh,en}.json
```
