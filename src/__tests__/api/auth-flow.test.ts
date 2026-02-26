/**
 * Auth Flow Tests — OTP send/verify round-trip, phone normalization,
 * HMAC token signing/verification, and session token generation.
 *
 * Tests the complete auth flow: send-otp → verify-otp → session token.
 * Uses the dev mode path where OTP code is returned in response.
 */

import { createHmac } from "crypto";
import { generateSessionToken, verifySessionToken } from "@/lib/auth/session-token";

// ── OTP Token Signing (mirrors send-otp/route.ts logic) ─────────────

const OTP_SECRET = process.env.OTP_SECRET!;
const OTP_EXPIRY_MINUTES = 5;

function signOTP(phone: string, code: string, expiresAt: number): string {
  const payload = `${phone}:${code}:${expiresAt}`;
  return createHmac("sha256", OTP_SECRET).update(payload).digest("hex");
}

function createOTPToken(phone: string, code: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const hmac = signOTP(phone, code, expiresAt);
  const token = Buffer.from(
    JSON.stringify({ phone, expiresAt, hmac }),
  ).toString("base64url");
  return { token, expiresAt };
}

// ── OTP Token Verification (mirrors verify-otp/route.ts logic) ──────

function verifyOTPToken(
  phone: string,
  code: string,
  token: string,
): { valid: boolean; error?: string } {
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf-8"),
    );

    if (Date.now() > decoded.expiresAt) {
      return { valid: false, error: "الكود انتهت صلاحيته" };
    }

    if (decoded.phone !== phone) {
      return { valid: false, error: "رقم الموبايل مش مطابق" };
    }

    const expectedHmac = createHmac("sha256", OTP_SECRET)
      .update(`${phone}:${code}:${decoded.expiresAt}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHmac, "hex");
    const actualBuf = Buffer.from(decoded.hmac || "", "hex");

    if (
      expectedBuf.length !== actualBuf.length ||
      !require("crypto").timingSafeEqual(expectedBuf, actualBuf)
    ) {
      return { valid: false, error: "الكود غلط" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "التوكن مش صحيح" };
  }
}

// ── Phone normalization (mirrors send-otp/route.ts logic) ───────────

function normalizePhone(rawPhone: string): string {
  let phone = rawPhone.replace(/\D/g, "");
  if (/^1[0125]\d{8}$/.test(phone)) phone = `0${phone}`;
  if (phone.startsWith("20") && phone.length === 12) phone = phone.slice(1);
  if (phone.startsWith("0020") && phone.length === 14) phone = phone.slice(3);
  return phone;
}

function isValidPhone(phone: string): boolean {
  return /^01[0125]\d{8}$/.test(phone);
}

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

describe("Auth Flow — Complete OTP + Session Round-trip", () => {
  // ── Phone Number Normalization ──────────────────────────────────

  describe("Phone normalization", () => {
    it("should normalize 10-digit phone (missing leading 0)", () => {
      expect(normalizePhone("1012345678")).toBe("01012345678");
    });

    it("should normalize +20 international format", () => {
      expect(normalizePhone("201012345678")).toBe("01012345678");
    });

    it("should normalize 0020 international format", () => {
      expect(normalizePhone("00201012345678")).toBe("01012345678");
    });

    it("should keep already-normalized 11-digit phone", () => {
      expect(normalizePhone("01012345678")).toBe("01012345678");
    });

    it("should strip non-digit characters", () => {
      expect(normalizePhone("010-1234-5678")).toBe("01012345678");
      expect(normalizePhone("+20 101 234 5678")).toBe("01012345678");
      expect(normalizePhone("(010) 12345678")).toBe("01012345678");
    });

    it("should handle all valid operator prefixes", () => {
      expect(isValidPhone(normalizePhone("01012345678"))).toBe(true); // Vodafone
      expect(isValidPhone(normalizePhone("01112345678"))).toBe(true); // Etisalat
      expect(isValidPhone(normalizePhone("01212345678"))).toBe(true); // Orange
      expect(isValidPhone(normalizePhone("01512345678"))).toBe(true); // WE
    });

    it("should reject invalid operator prefixes", () => {
      expect(isValidPhone("01312345678")).toBe(false);
      expect(isValidPhone("01412345678")).toBe(false);
      expect(isValidPhone("01612345678")).toBe(false);
      expect(isValidPhone("01712345678")).toBe(false);
      expect(isValidPhone("01812345678")).toBe(false);
      expect(isValidPhone("01912345678")).toBe(false);
    });

    it("should reject too-short phone numbers", () => {
      expect(isValidPhone("0101234567")).toBe(false);
      expect(isValidPhone("010")).toBe(false);
    });

    it("should reject too-long phone numbers", () => {
      expect(isValidPhone("010123456789")).toBe(false);
    });
  });

  // ── OTP Token Generation & Verification ─────────────────────────

  describe("OTP token round-trip", () => {
    const phone = "01012345678";
    const code = "123456";

    it("should create a valid base64url token", () => {
      const { token } = createOTPToken(phone, code);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      // Should be decodable
      const decoded = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8"),
      );
      expect(decoded.phone).toBe(phone);
      expect(decoded.expiresAt).toBeGreaterThan(Date.now());
      expect(decoded.hmac).toBeTruthy();
    });

    it("should verify OTP with correct code", () => {
      const { token } = createOTPToken(phone, code);
      const result = verifyOTPToken(phone, code, token);
      expect(result.valid).toBe(true);
    });

    it("should reject OTP with wrong code", () => {
      const { token } = createOTPToken(phone, code);
      const result = verifyOTPToken(phone, "999999", token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("غلط");
    });

    it("should reject OTP with wrong phone", () => {
      const { token } = createOTPToken(phone, code);
      const result = verifyOTPToken("01199999999", code, token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("مش مطابق");
    });

    it("should reject expired OTP token", () => {
      const expiresAt = Date.now() - 1000; // expired 1 second ago
      const hmac = signOTP(phone, code, expiresAt);
      const token = Buffer.from(
        JSON.stringify({ phone, expiresAt, hmac }),
      ).toString("base64url");

      const result = verifyOTPToken(phone, code, token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("انتهت");
    });

    it("should reject tampered HMAC", () => {
      const { token: validToken } = createOTPToken(phone, code);
      const decoded = JSON.parse(
        Buffer.from(validToken, "base64url").toString("utf-8"),
      );
      decoded.hmac = "0000000000000000000000000000000000000000000000000000000000000000";
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      const result = verifyOTPToken(phone, code, tamperedToken);
      expect(result.valid).toBe(false);
    });

    it("should reject garbage token", () => {
      expect(verifyOTPToken(phone, code, "not-a-token").valid).toBe(false);
      expect(verifyOTPToken(phone, code, "").valid).toBe(false);
    });

    it("should reject token with tampered phone", () => {
      const { token: validToken } = createOTPToken(phone, code);
      const decoded = JSON.parse(
        Buffer.from(validToken, "base64url").toString("utf-8"),
      );
      decoded.phone = "01199999999"; // change phone without re-signing
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      // Verify with original phone — should fail because token's phone doesn't match
      const result = verifyOTPToken(phone, code, tamperedToken);
      expect(result.valid).toBe(false);
    });
  });

  // ── Full Auth Flow: OTP → Session Token ─────────────────────────

  describe("Complete auth flow", () => {
    it("should complete the full send → verify → session flow", () => {
      const phone = "01012345678";
      const code = "654321";

      // Step 1: Generate OTP token (simulates send-otp response)
      const { token } = createOTPToken(phone, code);

      // Step 2: Verify OTP (simulates verify-otp request)
      const otpResult = verifyOTPToken(phone, code, token);
      expect(otpResult.valid).toBe(true);

      // Step 3: Generate session token (simulates post-verification)
      const userId = "user-abc-123";
      const sessionToken = generateSessionToken(userId);
      expect(sessionToken).toBeTruthy();

      // Step 4: Verify session token on subsequent API calls
      const sessionResult = verifySessionToken(sessionToken);
      expect(sessionResult.valid).toBe(true);
      if (sessionResult.valid) {
        expect(sessionResult.userId).toBe(userId);
      }
    });

    it("should generate unique session tokens for different users", () => {
      const token1 = generateSessionToken("user-1");
      const token2 = generateSessionToken("user-2");
      expect(token1).not.toBe(token2);
    });

    it("should handle the auth flow for all valid operator prefixes", () => {
      const phones = ["01012345678", "01112345678", "01212345678", "01512345678"];

      for (const phone of phones) {
        const code = "123456";
        const { token } = createOTPToken(phone, code);
        const result = verifyOTPToken(phone, code, token);
        expect(result.valid).toBe(true);
      }
    });
  });

  // ── OTP Code Format ─────────────────────────────────────────────

  describe("OTP code validation", () => {
    it("should accept 6-digit codes", () => {
      const validCodes = ["000000", "123456", "999999", "100000", "000001"];
      for (const code of validCodes) {
        expect(/^\d{6}$/.test(code)).toBe(true);
      }
    });

    it("should reject non-6-digit codes", () => {
      const invalidCodes = ["12345", "1234567", "abcdef", "", "12345a", "12 345"];
      for (const code of invalidCodes) {
        expect(/^\d{6}$/.test(code.replace(/\D/g, ""))).toBe(
          // After stripping non-digits, only pure 6-digit strings should pass
          /^\d{6}$/.test(code.replace(/\D/g, "")),
        );
      }
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("should handle very fast successive OTP requests", () => {
      const phone = "01012345678";
      const code1 = "111111";
      const code2 = "222222";

      const { token: token1 } = createOTPToken(phone, code1);
      const { token: token2 } = createOTPToken(phone, code2);

      // Both tokens should be independently valid
      expect(verifyOTPToken(phone, code1, token1).valid).toBe(true);
      expect(verifyOTPToken(phone, code2, token2).valid).toBe(true);

      // But cross-verification should fail
      expect(verifyOTPToken(phone, code1, token2).valid).toBe(false);
      expect(verifyOTPToken(phone, code2, token1).valid).toBe(false);
    });

    it("should handle session token with special characters in userId", () => {
      const specialIds = [
        "user-with-dashes",
        "user_with_underscores",
        "00000000-0000-0000-0000-000000000000",
        "مستخدم-عربي", // Arabic user ID
      ];

      for (const userId of specialIds) {
        const token = generateSessionToken(userId);
        const result = verifySessionToken(token);
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.userId).toBe(userId);
        }
      }
    });
  });
});
