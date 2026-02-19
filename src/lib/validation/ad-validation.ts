/**
 * Server-side validation for ad creation data.
 * Validates required fields, sale type specifics, and category_fields structure.
 */

const VALID_SALE_TYPES = ["cash", "auction", "exchange", "live_auction"];
const VALID_CATEGORIES = [
  "cars", "real_estate", "phones", "fashion", "scrap",
  "gold", "gold_silver", "luxury", "appliances", "home_appliances", "furniture",
  "hobbies", "tools", "services",
  "computers", "kids_babies", "electronics", "beauty",
];

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_IMAGES = 10;
const MAX_CATEGORY_FIELDS = 30;
const MAX_FIELD_VALUE_LENGTH = 500;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAdData(adData: Record<string, unknown>): ValidationResult {
  // Required fields
  if (!adData.category_id || typeof adData.category_id !== "string") {
    return { valid: false, error: "القسم مطلوب" };
  }

  if (!adData.sale_type || typeof adData.sale_type !== "string") {
    return { valid: false, error: "نوع البيع مطلوب" };
  }

  if (!VALID_SALE_TYPES.includes(adData.sale_type as string)) {
    return { valid: false, error: "نوع البيع مش صحيح" };
  }

  if (!adData.title || typeof adData.title !== "string") {
    return { valid: false, error: "العنوان مطلوب" };
  }

  if ((adData.title as string).length > MAX_TITLE_LENGTH) {
    return { valid: false, error: `العنوان طويل جداً (الحد ${MAX_TITLE_LENGTH} حرف)` };
  }

  if (adData.description && typeof adData.description === "string" && (adData.description as string).length > MAX_DESCRIPTION_LENGTH) {
    return { valid: false, error: `الوصف طويل جداً (الحد ${MAX_DESCRIPTION_LENGTH} حرف)` };
  }

  // Validate category_id is a known category
  if (!VALID_CATEGORIES.includes(adData.category_id as string)) {
    return { valid: false, error: "القسم مش موجود" };
  }

  // Validate sale-type-specific fields
  const saleType = adData.sale_type as string;

  if (saleType === "cash") {
    if (adData.price !== null && adData.price !== undefined) {
      const price = Number(adData.price);
      if (isNaN(price) || price < 0 || price > 999999999) {
        return { valid: false, error: "السعر مش صحيح" };
      }
    }
  }

  if (saleType === "auction") {
    if (adData.auction_start_price !== null && adData.auction_start_price !== undefined) {
      const startPrice = Number(adData.auction_start_price);
      if (isNaN(startPrice) || startPrice < 1) {
        return { valid: false, error: "سعر بداية المزاد لازم يكون أكبر من 0" };
      }
    }
    if (adData.auction_duration_hours !== null && adData.auction_duration_hours !== undefined) {
      if (![24, 48, 72].includes(Number(adData.auction_duration_hours))) {
        return { valid: false, error: "مدة المزاد لازم تكون 24 أو 48 أو 72 ساعة" };
      }
    }
  }

  // Validate images array
  if (adData.images && Array.isArray(adData.images)) {
    if ((adData.images as unknown[]).length > MAX_IMAGES) {
      return { valid: false, error: `الحد الأقصى ${MAX_IMAGES} صور` };
    }
    for (const img of adData.images as unknown[]) {
      if (typeof img !== "string") {
        return { valid: false, error: "بيانات الصور مش صحيحة" };
      }
    }
  }

  // Validate category_fields JSONB
  if (adData.category_fields !== null && adData.category_fields !== undefined) {
    if (typeof adData.category_fields !== "object" || Array.isArray(adData.category_fields)) {
      return { valid: false, error: "بيانات الحقول مش صحيحة" };
    }

    const fields = adData.category_fields as Record<string, unknown>;
    const fieldKeys = Object.keys(fields);

    // Prevent excessively large JSONB
    if (fieldKeys.length > MAX_CATEGORY_FIELDS) {
      return { valid: false, error: "عدد الحقول كتير" };
    }

    // Validate each field value
    for (const key of fieldKeys) {
      const value = fields[key];

      // Only allow primitive types and arrays of primitives
      if (value === null || value === undefined) continue;

      if (typeof value === "string") {
        if (value.length > MAX_FIELD_VALUE_LENGTH) {
          return { valid: false, error: `قيمة الحقل "${key}" طويلة جداً` };
        }
        // Reject potential injection patterns
        if (/<script/i.test(value) || /javascript:/i.test(value)) {
          return { valid: false, error: "بيانات الحقول تحتوي على محتوى غير مسموح" };
        }
      } else if (typeof value === "number") {
        if (!isFinite(value)) {
          return { valid: false, error: `قيمة الحقل "${key}" مش صحيحة` };
        }
      } else if (typeof value === "boolean") {
        // booleans are fine
      } else if (Array.isArray(value)) {
        // Allow arrays of primitives only
        for (const item of value) {
          if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
            return { valid: false, error: `بيانات الحقل "${key}" مش صحيحة` };
          }
        }
      } else {
        // Reject nested objects
        return { valid: false, error: `نوع بيانات الحقل "${key}" مش مدعوم` };
      }
    }
  }

  return { valid: true };
}
