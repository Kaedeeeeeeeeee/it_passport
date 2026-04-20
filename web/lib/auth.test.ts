import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isPro } from "./auth";

describe("isPro", () => {
  const originalEnv = process.env.DEV_FORCE_PRO;

  beforeEach(() => {
    delete process.env.DEV_FORCE_PRO;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DEV_FORCE_PRO;
    else process.env.DEV_FORCE_PRO = originalEnv;
  });

  it("is true for active subscription", () => {
    expect(isPro("active")).toBe(true);
  });

  it("is true for trialing subscription", () => {
    expect(isPro("trialing")).toBe(true);
  });

  it("is false for free / canceled / past_due", () => {
    expect(isPro("free")).toBe(false);
    expect(isPro("canceled")).toBe(false);
    expect(isPro("past_due")).toBe(false);
  });

  it("is false for undefined status", () => {
    expect(isPro(undefined)).toBe(false);
  });

  it("DEV_FORCE_PRO=true overrides status checks", () => {
    process.env.DEV_FORCE_PRO = "true";
    expect(isPro("free")).toBe(true);
    expect(isPro("canceled")).toBe(true);
    expect(isPro(undefined)).toBe(true);
  });

  it("DEV_FORCE_PRO=anything-else is ignored", () => {
    process.env.DEV_FORCE_PRO = "1";
    expect(isPro("free")).toBe(false);
    process.env.DEV_FORCE_PRO = "yes";
    expect(isPro("free")).toBe(false);
  });
});
