/**
 * Marketplace Normalizer
 *
 * Translates each platform's raw spec/amenity output into Maksab's canonical
 * schema (src/lib/marketplace/schema.ts). Runs at ingestion time (in
 * receive-bookmarklet) so every listing in the DB has the SAME field names
 * regardless of origin.
 *
 * Add a new platform:
 *   1. Add its raw keys to the per-concept maps below (PROPERTY_TYPE_MAP,
 *      FINISHING_MAP, etc.) — one line per known variant.
 *   2. The generic normalizeSpecs/normalizeAmenities functions will pick up
 *      the rest automatically.
 */

import { AMENITY_IDS, type SellerType } from "./schema";

// ═══════════════════════════════════════════════════════════
//  Seller Type — 2 buckets only (owner / company)
// ═══════════════════════════════════════════════════════════

/** Map any raw seller-type value (Arabic or English) → canonical owner|company */
export function normalizeSellerType(raw: string | null | undefined): SellerType | null {
  if (!raw) return null;
  const v = String(raw).toLowerCase().trim();
  if (!v) return null;
  // Owner patterns
  if (/مالك|من\s*المالك|owner|individual|فرد|private/i.test(v)) return "owner";
  // Company patterns — broker / agent / developer / company / office all → "company"
  if (/سمسار|وسيط|مطور|شركة|مكتب|broker|agent|developer|company|office|realtor/i.test(v)) {
    return "company";
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  Property type — enum normalization
// ═══════════════════════════════════════════════════════════

const PROPERTY_TYPE_MAP: Record<string, string> = {
  // Apartment (singular + plural + "X for sale")
  شقة: "apartment", شقه: "apartment", apartment: "apartment", apartments: "apartment", flat: "apartment",
  شقق: "apartment", "شقق للبيع": "apartment", "شقق للإيجار": "apartment", "شقة للبيع": "apartment", "شقة للإيجار": "apartment",
  // Villa
  فيلا: "villa", villa: "villa", villas: "villa",
  فلل: "villa", "فلل للبيع": "villa", "فلل للإيجار": "villa", "فيلا للبيع": "villa",
  // Duplex
  دوبلكس: "duplex", duplex: "duplex",
  // Penthouse
  بنتهاوس: "penthouse", penthouse: "penthouse",
  // Studio
  استوديو: "studio", studio: "studio",
  // Chalet
  شاليه: "chalet", chalet: "chalet",
  شاليهات: "chalet", "شاليه بحديقة للبيع": "chalet", "شاليهات للبيع": "chalet",
  // Townhouse / Twin house
  "تاون هاوس": "townhouse", townhouse: "townhouse",
  "توين هاوس": "twin_house", "twin house": "twin_house",
  // Commercial
  محل: "shop", shop: "shop", محلات: "shop",
  "محل دوبلكس للبيع": "shop", "محلات للبيع": "shop",
  مكتب: "office", office: "office", مكاتب: "office",
  "مكاتب للبيع": "office", "مقر إداري للبيع": "office", "إداري للبيع": "office", "مقر إداري": "office",
  عيادة: "clinic", clinic: "clinic",
  عيادات: "clinic", "عيادات للبيع": "clinic",
  مصنع: "factory", "مصنع للبيع": "factory",
  مخزن: "warehouse", مخازن: "warehouse", "مخازن للبيع": "warehouse",
  // Land
  أرض: "land", اراضي: "land", أراضي: "land", land: "land", plot: "land",
  "أرض تجارية للبيع": "land", "أراضي للبيع": "land", "أرض مباني سكنية للبيع": "land",
  // Whole building
  "عمارة كاملة": "whole_building", "whole building": "whole_building", building: "whole_building",
  عمارات: "whole_building", "عمارات للبيع": "whole_building",
  // Roof
  روف: "roof", "روف للبيع": "roof",
  // Commercial unit (general)
  تجاري: "commercial", "تجاري للبيع": "commercial",
};

// ═══════════════════════════════════════════════════════════
//  Finishing
// ═══════════════════════════════════════════════════════════

const FINISHING_MAP: Record<string, string> = {
  "إكسترا سوبر لوكس": "extra_super_lux",
  "اكسترا سوبر لوكس": "extra_super_lux",
  "سوبر لوكس": "super_lux",
  "super lux": "super_lux",
  لوكس: "lux",
  lux: "lux",
  "نص تشطيب": "semi_finished",
  "نصف تشطيب": "semi_finished",
  "semi finished": "semi_finished",
  "على المحارة": "bare",
  "علي المحارة": "bare",
  bare: "bare",
  "على الطوب": "core_and_shell",
  "core and shell": "core_and_shell",
  "جاهز للسكن": "ready_to_live",
  "تشطيب كامل": "ready_to_live",
  "تشطيب بالكامل": "ready_to_live",
};

// ═══════════════════════════════════════════════════════════
//  Furnishing
// ═══════════════════════════════════════════════════════════

const FURNISHING_MAP: Record<string, string> = {
  مفروش: "furnished", مفروشة: "furnished", furnished: "furnished", "yes": "furnished", نعم: "furnished",
  "بدون فرش": "unfurnished", "غير مفروش": "unfurnished", unfurnished: "unfurnished", "no": "unfurnished", لا: "unfurnished",
  "فرش جزئي": "partial", "مفروش جزئياً": "partial", "partially furnished": "partial", partial: "partial",
};

// ═══════════════════════════════════════════════════════════
//  Payment method
// ═══════════════════════════════════════════════════════════

const PAYMENT_MAP: Record<string, string> = {
  كاش: "cash", نقدي: "cash", cash: "cash",
  تقسيط: "installments", installments: "installments",
  "كاش أو تقسيط": "cash_or_installments",
  "قابل للتمويل العقاري": "mortgage_eligible",
  mortgage: "mortgage_eligible",
};

// ═══════════════════════════════════════════════════════════
//  View / Facing
// ═══════════════════════════════════════════════════════════

const VIEW_MAP: Record<string, string> = {
  بحر: "sea", "إطلالة بحر": "sea", "إطلالة بحرية": "sea", sea: "sea",
  حديقة: "garden", "إطلالة حديقة": "garden", garden: "garden",
  شارع: "street", street: "street",
  "شارع رئيسي": "main_street",
  "شارع جانبي": "side_street",
  مدينة: "city", "إطلالة المدينة": "city", city: "city",
  "حمام سباحة": "pool", pool: "pool",
};

// ═══════════════════════════════════════════════════════════
//  Condition
// ═══════════════════════════════════════════════════════════

const CONDITION_MAP: Record<string, string> = {
  جديد: "new", "أول سكن": "new", new: "new",
  مستعمل: "used", used: "used",
  "قيد الإنشاء": "under_construction", "under construction": "under_construction",
  "تم تجديده": "renovated", renovated: "renovated",
  ممتازة: "excellent", excellent: "excellent",
};

// ═══════════════════════════════════════════════════════════
//  Raw-key → canonical-key map for property specs
//  This covers every Arabic and English spelling we've seen across platforms
// ═══════════════════════════════════════════════════════════

const SPEC_KEY_ALIASES: Record<string, string> = {
  // property_type
  "نوع العقار": "property_type", "النوع": "property_type", "type": "property_type", "propertyType": "property_type",
  "property_type": "property_type",

  // purpose
  "الغرض": "purpose", "غرض العقار": "purpose", "purpose": "purpose",

  // area
  "المساحة": "area_sqm", "مساحة البناء": "area_sqm", "مساحة الأرض": "area_sqm",
  "المساحة (م²)": "area_sqm", "المساحة (م2)": "area_sqm",
  "area": "area_sqm", "area_sqm": "area_sqm", "space": "area_sqm", "size": "area_sqm",
  "land_area_sqm": "land_area_sqm",

  // bedrooms
  "عدد الغرف": "bedrooms", "غرف نوم": "bedrooms", "الغرف": "bedrooms",
  "rooms": "bedrooms", "bedrooms": "bedrooms",

  // bathrooms
  "عدد الحمامات": "bathrooms", "الحمامات": "bathrooms", "bathrooms": "bathrooms",

  // floor
  "رقم الدور": "floor_number", "الدور": "floor_number", "الطابق": "floor_number",
  "floor": "floor_number", "floor_number": "floor_number",

  // year_built (also accept built_year — common bookmarklet output)
  "تاريخ البناء": "year_built", "سنة البناء": "year_built", "year_built": "year_built",
  "built_year": "year_built", "سنة الإنشاء": "year_built", "تاريخ الإنشاء": "year_built",
  "العمر": "year_built", // age in years — receive endpoint converts numeric age to year

  // delivery_year
  "تاريخ التسليم": "delivery_year", "سنة الاستلام": "delivery_year",
  "شروط التسليم": "delivery_year", // often contains the date
  "delivery_year": "delivery_year",

  // view
  "الإطلالة": "view", "نوع الواجهة": "view", "view": "view", "facing": "view",

  // condition
  "حالة العقار": "condition", "الحالة": "condition", "condition": "condition",
  "ملكية": "condition", // "أول سكن" = new

  // finishing
  "نوع التشطيب": "finishing", "التشطيب": "finishing", "finishing": "finishing",

  // furnishing
  "الفرش": "furnishing", "مفروش": "furnishing", "furnishing": "furnishing", "furnished": "furnishing",

  // payment
  "طريقة الدفع": "payment_method", "payment_method": "payment_method", "payment": "payment_method",

  // down payment
  "المقدم": "down_payment_egp", "down_payment": "down_payment_egp", "down_payment_egp": "down_payment_egp",

  // noise keys — ignored
  "رقم الإعلان": "_ignore",
  "تاريخ الإعلان": "_ignore",
  "القسم": "_ignore", // category section — redundant with our maksab_category
  "السعر": "_ignore", // stored separately in listings.price
  "سعر المتر": "_ignore", // computed
  "طبيعة المعلن": "_ignore", // → seller_type, handled separately
  "الإعلانات النشطة": "_meta_active_ads",
  "عضو منذ": "_meta_member_since",
};

function normalizeValueForField(field: string, raw: string): string {
  const trimmed = String(raw).trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();

  switch (field) {
    case "property_type": return PROPERTY_TYPE_MAP[trimmed] || PROPERTY_TYPE_MAP[lower] || trimmed;
    case "finishing":     return FINISHING_MAP[trimmed]     || FINISHING_MAP[lower]     || trimmed;
    case "furnishing":    return FURNISHING_MAP[trimmed]    || FURNISHING_MAP[lower]    || trimmed;
    case "payment_method":return PAYMENT_MAP[trimmed]       || PAYMENT_MAP[lower]       || trimmed;
    case "view":          return VIEW_MAP[trimmed]          || VIEW_MAP[lower]          || trimmed;
    case "condition":     return CONDITION_MAP[trimmed]     || CONDITION_MAP[lower]     || trimmed;
    case "purpose":
      if (/sale|بيع/i.test(lower)) return "sale";
      if (/rent|إيجار|ايجار/i.test(lower)) return "rent";
      return trimmed;
    case "area_sqm":
    case "bedrooms":
    case "bathrooms":
    case "year_built":
    case "down_payment_egp": {
      const m = trimmed.match(/\d[\d,]*/);
      return m ? m[0].replace(/,/g, "") : trimmed;
    }
    case "is_negotiable":
      return /نعم|yes|true|قابل/i.test(lower) ? "true" : "false";
    default:
      return trimmed;
  }
}

// ═══════════════════════════════════════════════════════════
//  AMENITIES — raw label → canonical ID
//  Every raw Arabic string we've seen across platforms maps to one ID.
// ═══════════════════════════════════════════════════════════

const AMENITY_ALIASES: Record<string, string> = {
  // Security
  "حراسة": "security_guard", "أمن": "security_guard", "حراسة/أمن": "security_guard",
  "حراسة وأمن": "security_guard", "أمن وحراسة 24 ساعة": "security_guard", "أمن وحراسة": "security_guard",
  "كاميرات مراقبة": "cctv", "مراقبة": "cctv",
  "بوابة": "gated_entrance", "بوابة آمنة": "gated_entrance",
  "إنذار حريق": "fire_alarm", "انذار حريق": "fire_alarm",
  "باب مصفح": "armored_door",
  "خدمة بواب": "doorman",
  "إنتركم": "intercom", "انتركم": "intercom",

  // Building
  "مصعد": "elevator", "أسانسير": "elevator", "أساسير": "elevator", "اسانسير": "elevator",
  "موقف سيارات": "parking", "موقف": "parking",
  "موقف سيارات مغطى": "covered_parking", "موقف مغطى": "covered_parking",
  "جراج": "garage", "جراج/موقف سيارات": "garage", "مرآب": "garage",
  "دش مركزي": "satellite_dish",
  "حمام سباحة": "swimming_pool", "مسبح": "swimming_pool",
  "نادي رياضي": "gym", "نادي صحي": "gym", "جيم": "gym",
  "ملعب": "playground", "مناطق أطفال": "playground", "منطقة لعب": "playground",
  "حديقة": "garden",
  "ممشى": "walkway",
  "مركز تجاري": "commercial_center", "مول تجاري": "commercial_center",
  "كافيهات/مطاعم": "cafes_restaurants", "كافيهات": "cafes_restaurants", "مطاعم": "cafes_restaurants",

  // Interior
  "تدفئة وتكييف مركزي": "central_ac", "تكييف مركزي": "central_ac",
  "تكييف": "ac", "مكيف": "ac",
  "تدفئة": "heating",
  "غاز طبيعي": "natural_gas", "غاز طبيعى": "natural_gas", "عداد غاز": "natural_gas",
  "سخان ماء": "water_heater",
  "عداد كهرباء": "electricity_meter",
  "عداد مياه": "water_meter",
  "إنترنت": "internet", "انترنت": "internet",
  "هاتف": "landline", "تليفون أرضي": "landline", "تليفون أرضى": "landline", "خط تليفون": "landline",
  "زجاج شبابيك مزدوج": "double_glazed_windows",
  "مدفأة": "fireplace",

  // Storage
  "خزائن ملابس": "built_in_wardrobes",
  "خزائن مطبخ": "kitchen_cabinets",
  "غرفة ملابس": "walk_in_closet",
  "غرفة خدم": "servant_room", "غرفة الخادمة": "servant_room",

  // Appliances
  "أجهزة المطبخ": "kitchen_appliances", "مطبخ مجهز": "kitchen_appliances",
  "موقد غاز": "gas_stove", "موقد غاز/بلت إن": "gas_stove", "بلت إن": "gas_stove",
  "ثلاجة": "refrigerator",
  "مايكروويف": "microwave",
  "غسالة ملابس": "washing_machine", "غسالة": "washing_machine",
  "تلفزيون": "tv",

  // Views
  "بلكونة": "balcony", "شرفة": "balcony",
  "تراس": "terrace",
  "حديقة خاصة": "private_garden",
  "إطلالة بحر": "sea_view", "إطلالة بحرية": "sea_view", "بحر": "sea_view",
  "إطلالة حديقة": "garden_view", "إطلالة على الحديقة": "garden_view",
  "إطلالة المدينة": "city_view", "المدينة": "city_view",
  "شارع رئيسي": "main_street_view",

  // Pets
  "يسمح بالحيوانات الأليفة": "pets_allowed",

  // Nearby
  "مسجد": "mosque",
  "كنيسة": "church",
  "مستشفى": "hospital",
  "صيدلية": "pharmacy",
  "بنك": "bank",
  "سوبر ماركت": "supermarket",
  "مدرسة": "school",
  "جامعة": "university",
  "الشاطئ": "beach",
  "مترو": "metro",
  "الطريق السريع": "highway",
  "طريق سريع": "highway",

  // ── AqarMap enum codes (UPPERCASE_SNAKE_CASE) ──
  // The AqarMap XML API exposes amenities as enum constants like
  // "BALCONY", "ELEVATOR" instead of Arabic labels. Map each one to
  // the canonical ID used elsewhere.
  BALCONY: "balcony",
  TERRACE: "terrace",
  PRIVATE_GARDEN: "private_garden",
  SECURITY: "security_guard",
  CCTV: "cctv",
  ELEVATOR: "elevator",
  COVERED_PARKING: "covered_parking",
  PARKING: "parking",
  GARAGE: "garage",
  AIR_CONDITIONING: "ac",
  CENTRAL_AC: "central_ac",
  HEATING: "heating",
  WATER_HEATER: "water_heater",
  ELECTRICITY_METER: "electricity_meter",
  WATER_METER: "water_meter",
  NATURAL_GAS_METER: "natural_gas",
  LANDLINE_PHONE: "landline",
  INTERNET: "internet",
  KITCHEN_APPLIANCES: "kitchen_appliances",
  GAS_STOVE: "gas_stove",
  REFRIGERATOR: "refrigerator",
  WASHING_MACHINE: "washing_machine",
  TV: "tv",
  BUILT_IN_WARDROBES: "built_in_wardrobes",
  KITCHEN_CABINETS: "kitchen_cabinets",
  WALK_IN_CLOSET: "walk_in_closet",
  MAID_ROOM: "servant_room",
  PETS_ALLOWED: "pets_allowed",
  KIDS_PLAY_AREA: "playground",
  SWIMMING_POOL: "swimming_pool",
  GYM: "gym",
  GARDEN: "garden",
  SEA_VIEW: "sea_view",
  GARDEN_VIEW: "garden_view",
  CITY_VIEW: "city_view",
  MOSQUE: "mosque",
  SUPERMARKET: "supermarket",
  PHARMACY: "pharmacy",
  HOSPITAL: "hospital",
  SCHOOL: "school",
  BANK: "bank",
};

// ═══════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════

export type NormalizedSpecs = {
  /** Canonical property-spec fields */
  specs: Record<string, string | number | boolean>;
  /** Canonical amenity IDs */
  amenities: string[];
  /** Additional seller/listing meta (active ads count, member-since year) */
  meta: Record<string, string>;
};

/**
 * Normalize raw platform specs + amenities into Maksab's canonical shape.
 * Safe to call with any platform's output; unknown keys are dropped.
 */
export function normalizeListingData(
  rawSpecs: Record<string, unknown> | null | undefined,
  rawAmenities: string[] | null | undefined
): NormalizedSpecs {
  const specs: Record<string, string | number | boolean> = {};
  const meta: Record<string, string> = {};

  // Specs
  if (rawSpecs && typeof rawSpecs === "object") {
    for (const [rawKey, rawValue] of Object.entries(rawSpecs)) {
      if (rawKey === "_amenities") continue; // handled separately
      const canonical = SPEC_KEY_ALIASES[rawKey];
      if (!canonical) continue; // unknown key → drop
      if (canonical === "_ignore") continue;
      if (canonical.startsWith("_meta_")) {
        meta[canonical.replace(/^_meta_/, "")] = String(rawValue);
        continue;
      }
      const stringValue = String(rawValue ?? "").trim();
      if (!stringValue) continue;
      const normalized = normalizeValueForField(canonical, stringValue);
      // Coerce to number for numeric fields
      if (["area_sqm", "bedrooms", "bathrooms", "year_built", "down_payment_egp"].includes(canonical)) {
        const num = parseInt(normalized, 10);
        if (!isNaN(num) && num > 0) specs[canonical] = num;
      } else if (canonical === "is_negotiable") {
        specs[canonical] = normalized === "true";
      } else {
        specs[canonical] = normalized;
      }
    }
  }

  // Amenities — translate each raw label to canonical ID; drop unknowns
  const amenitySet = new Set<string>();
  if (Array.isArray(rawAmenities)) {
    for (const raw of rawAmenities) {
      const id = AMENITY_ALIASES[String(raw).trim()];
      if (id && AMENITY_IDS.includes(id)) amenitySet.add(id);
    }
  }

  return { specs, amenities: Array.from(amenitySet), meta };
}
