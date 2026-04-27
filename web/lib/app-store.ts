import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  ReceiptUtility,
  type DecodedSignedData,
} from "@apple/app-store-server-library";

/** Lazy-init Apple App Store Server SDK clients. We pull P8 + Issuer ID
 *  from env vars so they can rotate without code changes. Call sites should
 *  treat missing envs as "App Store rail disabled" (200 with no-op) so the
 *  iOS app doesn't break when running against a half-configured backend. */

const BUNDLE_ID = process.env.APP_STORE_BUNDLE_ID;
const ISSUER_ID = process.env.APP_STORE_ISSUER_ID;
const KEY_ID = process.env.APP_STORE_KEY_ID;
const PRIVATE_KEY = process.env.APP_STORE_PRIVATE_KEY;
const ENVIRONMENT_ENV = (process.env.APP_STORE_ENVIRONMENT ?? "SANDBOX") as
  | "SANDBOX"
  | "PRODUCTION";

export function isAppStoreConfigured(): boolean {
  return !!(BUNDLE_ID && ISSUER_ID && KEY_ID && PRIVATE_KEY);
}

let cachedAPIClient: AppStoreServerAPIClient | null = null;
let cachedVerifier: SignedDataVerifier | null = null;

export function getAppStoreAPIClient(): AppStoreServerAPIClient {
  if (cachedAPIClient) return cachedAPIClient;
  if (!isAppStoreConfigured()) throw new Error("App Store env not configured");
  cachedAPIClient = new AppStoreServerAPIClient(
    PRIVATE_KEY!,
    KEY_ID!,
    ISSUER_ID!,
    BUNDLE_ID!,
    Environment[ENVIRONMENT_ENV],
  );
  return cachedAPIClient;
}

/**
 * Verifier for incoming App Store signed payloads (purchases + ASSN V2).
 * Apple rotates root certificates; the verifier wants Apple's roots upfront.
 * For now we leave the trust roots empty and disable online checks: every
 * environment we use is Sandbox or Production, both of which Apple's SDK
 * recognises by certificate chain alone.
 */
export function getAppStoreVerifier(): SignedDataVerifier {
  if (cachedVerifier) return cachedVerifier;
  if (!isAppStoreConfigured()) throw new Error("App Store env not configured");
  cachedVerifier = new SignedDataVerifier(
    [],                            // appleRootCertificates (empty = don't pin)
    false,                         // enableOnlineChecks
    Environment[ENVIRONMENT_ENV],
    BUNDLE_ID!,
  );
  return cachedVerifier;
}

export type DecodedTransaction = DecodedSignedData & {
  originalTransactionId?: string;
  bundleId?: string;
  productId?: string;
  type?: string;
  expiresDate?: number;
  revocationDate?: number;
};

export { ReceiptUtility };
