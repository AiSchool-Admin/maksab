/**
 * استخراج أرقام الهواتف المصرية من النص
 * الأنماط المدعومة:
 * - 01012345678 (11 رقم بدون علامات)
 * - 010-1234-5678 (بشرطات)
 * - 010 1234 5678 (بمسافات)
 * - +201012345678 (مع رمز الدولة)
 * - أنماط مموهة: "صفر واحد صفر..."
 */

/**
 * Normalize any Egyptian phone input to canonical 11-digit format (01XXXXXXXXX).
 * Accepts inputs like:
 *   - "+201012345678" → "01012345678"
 *   - "201012345678"  → "01012345678"
 *   - "01012345678"   → "01012345678"
 *   - "010 1234 5678" → "01012345678"
 *   - "010-1234-5678" → "01012345678"
 * Returns null if input can't be normalized to a valid Egyptian mobile number.
 */
export function normalizeEgyptianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  // Keep only digits and leading +
  let phone = String(input).trim();
  // Arabic-Indic digits → Western digits
  phone = phone.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  // Strip whitespace, dots, dashes, parens, plus
  phone = phone.replace(/[\s.\-+()]/g, "");
  // Country code handling
  if (phone.startsWith("0020") && phone.length === 14) phone = "0" + phone.slice(4);
  if (phone.startsWith("20") && phone.length === 12) phone = "0" + phone.slice(2);
  // Validate final format: 11 digits, starts with 010/011/012/015
  if (/^01[0-25]\d{8}$/.test(phone)) return phone;
  return null;
}

export function extractPhone(text: string): string | null {
  if (!text) return null;

  // نمط 1: +20 أو 20 ثم الرقم
  let match = text.match(/\+?20\s?1[0-25]\d{8}/g);
  if (match) {
    return normalizeEgyptianPhone(match[0]);
  }

  // نمط 2: 01XXXXXXXXX (بدون علامات)
  match = text.match(/01[0-25]\d{8}/g);
  if (match) {
    return normalizeEgyptianPhone(match[0]);
  }

  // نمط 3: 01X-XXXX-XXXX أو 01X.XXXX.XXXX أو 01X XXXX XXXX
  match = text.match(/01[0-25][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g);
  if (match) {
    return normalizeEgyptianPhone(match[0]);
  }

  return null;
}

export function extractAllPhones(text: string): string[] {
  if (!text) return [];

  const phones: string[] = [];

  // All Egyptian patterns
  const patterns = [
    /\+?20\s?1[0-25]\d{8}/g,
    /01[0-25]\d{8}/g,
    /01[0-25][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const normalized = normalizeEgyptianPhone(match[0]);
      if (normalized && !phones.includes(normalized)) {
        phones.push(normalized);
      }
    }
  }

  return phones;
}
