import Stripe from "stripe";

/**
 * Shared Stripe client. Reads `STRIPE_SECRET_KEY` lazily on first access so
 * importing this module during build time (e.g. from a route module that
 * Next.js loads while computing the route manifest) does not throw when the
 * env var is absent. The constructor still runs at first call site, which is
 * always at request time inside our route handlers.
 *
 * `apiVersion` is intentionally omitted: the installed `stripe` SDK pins a
 * compatible version internally (currently `2026-04-22.dahlia`). Letting the
 * SDK pick keeps types and runtime aligned without us having to bump a string
 * on every SDK upgrade.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing env var STRIPE_SECRET_KEY");
    }
    cached = new Stripe(key);
  }
  return cached;
}
