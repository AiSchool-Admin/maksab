/**
 * Tests for session token generation and verification.
 * These are CRITICAL — if these fail, authentication is broken.
 */

import { generateSessionToken, verifySessionToken } from "@/lib/auth/session-token";

describe("Session Token", () => {
  describe("generateSessionToken", () => {
    it("should generate a non-empty base64url string", () => {
      const token = generateSessionToken("user-123");
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(10);
    });

    it("should generate different tokens for different users", () => {
      const token1 = generateSessionToken("user-1");
      const token2 = generateSessionToken("user-2");
      expect(token1).not.toBe(token2);
    });

    it("should generate different tokens at different times", () => {
      const token1 = generateSessionToken("user-1");
      // Advance time slightly
      jest.spyOn(Date, "now").mockReturnValueOnce(Date.now() + 1000);
      const token2 = generateSessionToken("user-1");
      expect(token1).not.toBe(token2);
    });

    it("should encode user_id in the token payload", () => {
      const token = generateSessionToken("test-user-id");
      const decoded = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8"),
      );
      expect(decoded.user_id).toBe("test-user-id");
      expect(decoded.issued_at).toBeDefined();
      expect(decoded.hmac).toBeDefined();
    });
  });

  describe("verifySessionToken", () => {
    it("should verify a valid token and return userId", () => {
      const token = generateSessionToken("user-abc");
      const result = verifySessionToken(token);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.userId).toBe("user-abc");
      }
    });

    it("should reject a tampered token (modified user_id)", () => {
      const token = generateSessionToken("user-abc");
      const decoded = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8"),
      );
      decoded.user_id = "hacker-id";
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString(
        "base64url",
      );

      const result = verifySessionToken(tamperedToken);
      expect(result.valid).toBe(false);
    });

    it("should reject a tampered token (modified hmac)", () => {
      const token = generateSessionToken("user-abc");
      const decoded = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8"),
      );
      decoded.hmac = "fake-hmac-value";
      const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString(
        "base64url",
      );

      const result = verifySessionToken(tamperedToken);
      expect(result.valid).toBe(false);
    });

    it("should reject an expired token (30+ days old)", () => {
      const token = generateSessionToken("user-abc");
      const decoded = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8"),
      );
      // Set issued_at to 31 days ago
      decoded.issued_at = Date.now() - 31 * 24 * 60 * 60 * 1000;

      // Re-sign with correct HMAC for the old timestamp
      const { createHmac } = require("crypto");
      const payload = `${decoded.user_id}:${decoded.issued_at}`;
      decoded.hmac = createHmac("sha256", process.env.OTP_SECRET!)
        .update(payload)
        .digest("hex");

      const expiredToken = Buffer.from(JSON.stringify(decoded)).toString(
        "base64url",
      );

      const result = verifySessionToken(expiredToken);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("انتهت");
      }
    });

    it("should reject garbage input", () => {
      expect(verifySessionToken("not-a-token").valid).toBe(false);
      expect(verifySessionToken("").valid).toBe(false);
      expect(verifySessionToken("abc123").valid).toBe(false);
    });

    it("should reject a token with missing fields", () => {
      const incomplete = Buffer.from(
        JSON.stringify({ user_id: "test" }),
      ).toString("base64url");
      const result = verifySessionToken(incomplete);
      expect(result.valid).toBe(false);
    });

    it("should accept a token that is 29 days old (within limit)", () => {
      const token = generateSessionToken("user-abc");
      const decoded = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8"),
      );
      // Set issued_at to 29 days ago
      decoded.issued_at = Date.now() - 29 * 24 * 60 * 60 * 1000;

      const { createHmac } = require("crypto");
      const payload = `${decoded.user_id}:${decoded.issued_at}`;
      decoded.hmac = createHmac("sha256", process.env.OTP_SECRET!)
        .update(payload)
        .digest("hex");

      const validToken = Buffer.from(JSON.stringify(decoded)).toString(
        "base64url",
      );

      const result = verifySessionToken(validToken);
      expect(result.valid).toBe(true);
    });
  });
});
