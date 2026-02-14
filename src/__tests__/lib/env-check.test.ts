/**
 * Tests for environment variable validation.
 */

import { validateEnv } from "@/lib/env-check";

describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should pass when all required env vars are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.OTP_SECRET = "test-otp-secret";
    process.env.ADMIN_SETUP_SECRET = "test-admin-secret";

    const result = validateEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("should fail when OTP_SECRET is missing", () => {
    delete process.env.OTP_SECRET;

    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("OTP_SECRET");
  });

  it("should fail when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("should detect placeholder values as missing", () => {
    process.env.OTP_SECRET = "your_otp_secret_here";

    const result = validateEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("OTP_SECRET");
  });

  it("should report optional vars as warnings, not errors", () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    const result = validateEnv();
    // These are optional, so they should be warnings, not missing
    expect(result.missing).not.toContain("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    expect(result.missing).not.toContain("NEXT_PUBLIC_SENTRY_DSN");
    expect(result.warnings).toContain("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  });
});
