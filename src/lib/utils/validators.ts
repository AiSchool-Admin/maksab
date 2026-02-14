import { z } from "zod/v4";

/**
 * Normalize Egyptian phone input:
 * - "1XXXXXXXXX"  (10 digits, no leading 0) → "01XXXXXXXXX"
 * - "01XXXXXXXXX" (11 digits, with leading 0) → "01XXXXXXXXX"
 * - "+201XXXXXXXXX" or "201XXXXXXXXX" → "01XXXXXXXXX"
 * - "00201XXXXXXXXX" → "01XXXXXXXXX"
 */
export function normalizeEgyptianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // +20XXXXXXXXXX or 20XXXXXXXXXX (12 digits)
  if (digits.startsWith("20") && digits.length === 12) return digits.slice(1);
  // 0020XXXXXXXXXX (14 digits)
  if (digits.startsWith("0020") && digits.length === 14) return digits.slice(3);
  // 1XXXXXXXXX — 10 digits without leading 0 (since +20 is already shown)
  if (/^1[0125]\d{8}$/.test(digits)) return `0${digits}`;
  // Already 01XXXXXXXXX
  return digits;
}

/**
 * Egyptian phone number validation
 * Accepts both formats:
 * - With leading zero: 01XXXXXXXXX (11 digits)
 * - Without leading zero: 1XXXXXXXXX (10 digits) — auto-prefixed
 * Must match operator prefixes: 10, 11, 12, or 15
 */
export const egyptianPhoneSchema = z
  .string()
  .transform(normalizeEgyptianPhone)
  .refine(
    (val) => /^01[0125]\d{8}$/.test(val),
    "رقم الموبايل لازم يبدأ بـ 10 أو 11 أو 12 أو 15 ويكون صح"
  );

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email("الإيميل مش صحيح");

/**
 * Password validation (for admin)
 */
export const passwordSchema = z
  .string()
  .min(6, "كلمة السر لازم تكون 6 حروف على الأقل");

/**
 * OTP validation - 6 digits
 */
export const otpSchema = z
  .string()
  .length(6, "كود التأكيد لازم يكون 6 أرقام")
  .regex(/^\d{6}$/, "كود التأكيد لازم يكون أرقام بس");

/**
 * Price validation
 */
export const priceSchema = z
  .number()
  .min(1, "السعر لازم يكون أكتر من 0")
  .max(100_000_000, "السعر كبير أوي");
