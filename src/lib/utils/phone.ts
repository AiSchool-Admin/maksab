/**
 * Shared Egyptian phone number normalization and validation.
 *
 * Ensures all API routes normalize phone numbers the same way
 * to prevent duplicate accounts or inconsistent lookups.
 *
 * Valid Egyptian mobile: 01[0125]XXXXXXXX (exactly 11 digits)
 */

const EGYPTIAN_MOBILE_REGEX = /^01[0125]\d{8}$/;

/**
 * Normalize an Egyptian phone number to the canonical format: 01XXXXXXXXX
 *
 * Handles common input formats:
 *  - "1012345678"    → "01012345678"   (missing leading 0)
 *  - "201012345678"  → "01012345678"   (country code without +)
 *  - "00201012345678" → "01012345678"  (international prefix)
 *  - "+201012345678" → "01012345678"   (+ prefix)
 *  - "01012345678"   → "01012345678"   (already canonical)
 */
export function normalizePhone(raw: string): string {
  // Strip all non-digit characters
  let phone = raw.replace(/\D/g, "");

  // Remove international prefix: 00201... → 01...
  if (phone.startsWith("0020") && phone.length === 14) {
    phone = phone.slice(3);
  }
  // Remove country code: 201... → 01...
  else if (phone.startsWith("20") && phone.length === 12) {
    phone = `0${phone.slice(2)}`;
  }
  // Add leading zero: 1012345678 → 01012345678
  else if (/^1[0125]\d{8}$/.test(phone)) {
    phone = `0${phone}`;
  }

  return phone;
}

/**
 * Validate that a phone number is a valid Egyptian mobile number.
 * Must be called AFTER normalizePhone().
 */
export function isValidEgyptianPhone(phone: string): boolean {
  return EGYPTIAN_MOBILE_REGEX.test(phone);
}

/**
 * Normalize + validate in one call. Returns normalized phone or null if invalid.
 */
export function parseEgyptianPhone(raw: string): string | null {
  const normalized = normalizePhone(raw);
  return isValidEgyptianPhone(normalized) ? normalized : null;
}
