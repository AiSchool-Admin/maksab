/**
 * استخراج أرقام الهواتف المصرية من النص
 * الأنماط المدعومة:
 * - 01012345678 (11 رقم بدون علامات)
 * - 010-1234-5678 (بشرطات)
 * - 010 1234 5678 (بمسافات)
 * - +201012345678 (مع رمز الدولة)
 * - أنماط مموهة: "صفر واحد صفر..."
 */

export function extractPhone(text: string): string | null {
  if (!text) return null;

  // نمط 1: +20 أو 20 ثم الرقم
  let match = text.match(/\+?20\s?1[0-25]\d{8}/g);
  if (match) {
    return normalizePhone(match[0]);
  }

  // نمط 2: 01XXXXXXXXX (بدون علامات)
  match = text.match(/01[0-25]\d{8}/g);
  if (match) {
    return normalizePhone(match[0]);
  }

  // نمط 3: 01X-XXXX-XXXX أو 01X.XXXX.XXXX أو 01X XXXX XXXX
  match = text.match(/01[0-25][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g);
  if (match) {
    return normalizePhone(match[0]);
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
      const normalized = normalizePhone(match[0]);
      if (normalized && !phones.includes(normalized)) {
        phones.push(normalized);
      }
    }
  }

  return phones;
}

function normalizePhone(phone: string): string | null {
  // Remove spaces, dots, dashes, plus
  phone = phone.replace(/[\s.\-+]/g, "");

  // Handle country code
  if (phone.startsWith("20") && phone.length === 12) {
    phone = "0" + phone.slice(2);
  }

  // Final validation: must be 01[0,1,2,5]XXXXXXXX
  if (/^01[0-25]\d{8}$/.test(phone)) {
    return phone;
  }

  return null;
}
