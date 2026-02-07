import { z } from "zod/v4";

/**
 * Egyptian phone number validation
 * Must start with 010, 011, 012, or 015 and be exactly 11 digits
 */
export const egyptianPhoneSchema = z
  .string()
  .regex(/^01[0125]\d{8}$/, "رقم الموبايل لازم يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقم");

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
