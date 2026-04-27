/**
 * Maksab Canonical Schema
 *
 * Single source of truth for property specs, amenities, and seller types
 * across ALL harvested platforms. Each platform's raw output is normalized
 * into these fields at ingestion time.
 *
 * Field naming convention:
 *   - `id` is ENGLISH (for code, filters, DB queries)
 *   - `label_ar` is ARABIC (for UI)
 *
 * When adding a new platform, map its raw keys → these canonical IDs in
 * src/lib/marketplace/normalize.ts — do NOT bloat this file.
 */

// ═══════════════════════════════════════════════════════════
//  Seller Type
// ═══════════════════════════════════════════════════════════

export type SellerType = "owner" | "company";

export const SELLER_TYPE_LABELS: Record<SellerType, { label: string; icon: string; color: string }> = {
  owner: { label: "مالك", icon: "🏠", color: "emerald" },
  company: { label: "شركة", icon: "🏢", color: "amber" },
};

// ═══════════════════════════════════════════════════════════
//  Property Specifications
// ═══════════════════════════════════════════════════════════

export type PropertySpecField = {
  id: string;
  label_ar: string;
  icon: string;
  type: "string" | "number" | "enum" | "boolean";
  enum_values?: Record<string, string>; // canonical ID → Arabic label
  unit?: string;
};

export const PROPERTY_SPECS: PropertySpecField[] = [
  {
    id: "property_type",
    label_ar: "نوع العقار",
    icon: "🏠",
    type: "enum",
    enum_values: {
      apartment: "شقة",
      villa: "فيلا",
      duplex: "دوبلكس",
      penthouse: "بنتهاوس",
      studio: "استوديو",
      chalet: "شاليه",
      townhouse: "تاون هاوس",
      twin_house: "توين هاوس",
      shop: "محل",
      office: "مكتب",
      clinic: "عيادة",
      land: "أرض",
      whole_building: "عمارة كاملة",
      compound_unit: "وحدة في كمبوند",
    },
  },
  {
    id: "purpose",
    label_ar: "الغرض",
    icon: "🎯",
    type: "enum",
    enum_values: { sale: "للبيع", rent: "للإيجار" },
  },
  {
    id: "area_sqm",
    label_ar: "المساحة",
    icon: "📐",
    type: "number",
    unit: "م²",
  },
  {
    id: "bedrooms",
    label_ar: "عدد الغرف",
    icon: "🛏️",
    type: "number",
  },
  {
    id: "bathrooms",
    label_ar: "عدد الحمامات",
    icon: "🚿",
    type: "number",
  },
  {
    id: "floor_number",
    label_ar: "الدور",
    icon: "🏢",
    type: "string", // can be number or "ground"/"basement"/etc.
  },
  {
    id: "year_built",
    label_ar: "سنة البناء",
    icon: "📅",
    type: "number",
  },
  {
    id: "delivery_year",
    label_ar: "سنة الاستلام",
    icon: "🗓️",
    type: "string", // can be year or "ready"/"under_construction"
  },
  {
    id: "view",
    label_ar: "الإطلالة",
    icon: "🌅",
    type: "enum",
    enum_values: {
      sea: "بحر",
      garden: "حديقة",
      street: "شارع",
      city: "مدينة",
      pool: "حمام سباحة",
      main_street: "شارع رئيسي",
      side_street: "شارع جانبي",
      other: "أخرى",
    },
  },
  {
    id: "condition",
    label_ar: "الحالة",
    icon: "✨",
    type: "enum",
    enum_values: {
      new: "جديد",
      used: "مستعمل",
      under_construction: "قيد الإنشاء",
      renovated: "تم تجديده",
      excellent: "ممتازة",
    },
  },
  {
    id: "finishing",
    label_ar: "التشطيب",
    icon: "🎨",
    type: "enum",
    enum_values: {
      extra_super_lux: "إكسترا سوبر لوكس",
      super_lux: "سوبر لوكس",
      lux: "لوكس",
      semi_finished: "نص تشطيب",
      bare: "على المحارة",
      core_and_shell: "على الطوب",
      ready_to_live: "جاهز للسكن",
    },
  },
  {
    id: "furnishing",
    label_ar: "الفرش",
    icon: "🛋️",
    type: "enum",
    enum_values: {
      furnished: "مفروش",
      unfurnished: "بدون فرش",
      partial: "فرش جزئي",
    },
  },
  {
    id: "payment_method",
    label_ar: "طريقة الدفع",
    icon: "💳",
    type: "enum",
    enum_values: {
      cash: "كاش",
      installments: "تقسيط",
      cash_or_installments: "كاش أو تقسيط",
      mortgage_eligible: "قابل للتمويل العقاري",
    },
  },
  {
    id: "down_payment_egp",
    label_ar: "المقدم",
    icon: "💰",
    type: "number",
    unit: "جنيه",
  },
  {
    id: "is_negotiable",
    label_ar: "قابل للتفاوض",
    icon: "🤝",
    type: "boolean",
  },
];

/** Display order on detail page — most important first. */
export const PROPERTY_SPECS_ORDER: string[] = [
  "property_type",
  "purpose",
  "area_sqm",
  "bedrooms",
  "bathrooms",
  "floor_number",
  "finishing",
  "furnishing",
  "view",
  "condition",
  "year_built",
  "delivery_year",
  "payment_method",
  "down_payment_egp",
  "is_negotiable",
];

/** Quick lookup: id → spec field */
export const PROPERTY_SPEC_BY_ID: Record<string, PropertySpecField> = Object.fromEntries(
  PROPERTY_SPECS.map((s) => [s.id, s])
);

// ═══════════════════════════════════════════════════════════
//  Amenities — categorized
// ═══════════════════════════════════════════════════════════

export type AmenityCategory =
  | "security"
  | "building"
  | "interior"
  | "storage"
  | "appliances"
  | "views"
  | "nearby";

export type Amenity = {
  id: string;
  label_ar: string;
  icon: string;
  category: AmenityCategory;
};

export const AMENITY_CATEGORY_LABELS: Record<AmenityCategory, { label: string; icon: string }> = {
  security: { label: "الأمان والحراسة", icon: "🔒" },
  building: { label: "المبنى والخدمات", icon: "🏗️" },
  interior: { label: "المرافق الداخلية", icon: "❄️" },
  storage: { label: "التخزين والغرف", icon: "🗄️" },
  appliances: { label: "أجهزة المطبخ", icon: "🍳" },
  views: { label: "الإطلالة والخارجي", icon: "🌅" },
  nearby: { label: "قريب من", icon: "📍" },
};

export const AMENITIES: Amenity[] = [
  // Security
  { id: "security_guard", label_ar: "حراسة وأمن", icon: "🛡️", category: "security" },
  { id: "cctv", label_ar: "كاميرات مراقبة", icon: "📹", category: "security" },
  { id: "gated_entrance", label_ar: "بوابة آمنة", icon: "🚪", category: "security" },
  { id: "fire_alarm", label_ar: "إنذار حريق", icon: "🔥", category: "security" },
  { id: "armored_door", label_ar: "باب مصفح", icon: "🚪", category: "security" },
  { id: "doorman", label_ar: "خدمة بواب", icon: "🧑‍💼", category: "security" },
  { id: "intercom", label_ar: "إنتركم", icon: "📞", category: "security" },

  // Building
  { id: "elevator", label_ar: "مصعد", icon: "🛗", category: "building" },
  { id: "parking", label_ar: "موقف سيارات", icon: "🅿️", category: "building" },
  { id: "covered_parking", label_ar: "موقف مغطى", icon: "🏠", category: "building" },
  { id: "garage", label_ar: "جراج", icon: "🏗️", category: "building" },
  { id: "satellite_dish", label_ar: "دش مركزي", icon: "📡", category: "building" },
  { id: "swimming_pool", label_ar: "حمام سباحة", icon: "🏊", category: "building" },
  { id: "gym", label_ar: "نادي رياضي", icon: "💪", category: "building" },
  { id: "playground", label_ar: "مناطق أطفال", icon: "🎢", category: "building" },
  { id: "garden", label_ar: "حديقة", icon: "🌳", category: "building" },
  { id: "walkway", label_ar: "ممشى", icon: "🚶", category: "building" },
  { id: "commercial_center", label_ar: "مركز تجاري", icon: "🏬", category: "building" },
  { id: "cafes_restaurants", label_ar: "كافيهات/مطاعم", icon: "☕", category: "building" },

  // Interior
  { id: "central_ac", label_ar: "تدفئة وتكييف مركزي", icon: "❄️", category: "interior" },
  { id: "ac", label_ar: "تكييف", icon: "❄️", category: "interior" },
  { id: "heating", label_ar: "تدفئة", icon: "🔥", category: "interior" },
  { id: "natural_gas", label_ar: "غاز طبيعي", icon: "⛽", category: "interior" },
  { id: "water_heater", label_ar: "سخان ماء", icon: "🚿", category: "interior" },
  { id: "electricity_meter", label_ar: "عداد كهرباء", icon: "⚡", category: "interior" },
  { id: "water_meter", label_ar: "عداد مياه", icon: "💧", category: "interior" },
  { id: "pets_allowed", label_ar: "يسمح بالحيوانات الأليفة", icon: "🐾", category: "interior" },
  { id: "internet", label_ar: "إنترنت", icon: "📶", category: "interior" },
  { id: "landline", label_ar: "تليفون أرضي", icon: "☎️", category: "interior" },
  { id: "double_glazed_windows", label_ar: "زجاج شبابيك مزدوج", icon: "🪟", category: "interior" },
  { id: "fireplace", label_ar: "مدفأة", icon: "🔥", category: "interior" },

  // Storage
  { id: "built_in_wardrobes", label_ar: "خزائن ملابس", icon: "👔", category: "storage" },
  { id: "kitchen_cabinets", label_ar: "خزائن مطبخ", icon: "🗄️", category: "storage" },
  { id: "walk_in_closet", label_ar: "غرفة ملابس", icon: "👗", category: "storage" },
  { id: "servant_room", label_ar: "غرفة خدم", icon: "🛏️", category: "storage" },

  // Appliances
  { id: "kitchen_appliances", label_ar: "أجهزة المطبخ", icon: "🍳", category: "appliances" },
  { id: "gas_stove", label_ar: "موقد غاز/بلت إن", icon: "🔥", category: "appliances" },
  { id: "refrigerator", label_ar: "ثلاجة", icon: "🧊", category: "appliances" },
  { id: "microwave", label_ar: "مايكروويف", icon: "📡", category: "appliances" },
  { id: "washing_machine", label_ar: "غسالة ملابس", icon: "🧺", category: "appliances" },
  { id: "tv", label_ar: "تلفزيون", icon: "📺", category: "appliances" },

  // Views / Outdoor
  { id: "balcony", label_ar: "بلكونة", icon: "🏛️", category: "views" },
  { id: "terrace", label_ar: "تراس", icon: "🌞", category: "views" },
  { id: "private_garden", label_ar: "حديقة خاصة", icon: "🌿", category: "views" },
  { id: "sea_view", label_ar: "إطلالة بحرية", icon: "🌊", category: "views" },
  { id: "garden_view", label_ar: "إطلالة حديقة", icon: "🌳", category: "views" },
  { id: "city_view", label_ar: "إطلالة المدينة", icon: "🏙️", category: "views" },
  { id: "main_street_view", label_ar: "شارع رئيسي", icon: "🛣️", category: "views" },
  { id: "pool_view", label_ar: "إطلالة حمام السباحة", icon: "🏊", category: "views" },

  // Nearby
  { id: "mosque", label_ar: "مسجد", icon: "🕌", category: "nearby" },
  { id: "church", label_ar: "كنيسة", icon: "⛪", category: "nearby" },
  { id: "hospital", label_ar: "مستشفى", icon: "🏥", category: "nearby" },
  { id: "pharmacy", label_ar: "صيدلية", icon: "💊", category: "nearby" },
  { id: "bank", label_ar: "بنك", icon: "🏦", category: "nearby" },
  { id: "supermarket", label_ar: "سوبر ماركت", icon: "🛒", category: "nearby" },
  { id: "school", label_ar: "مدرسة", icon: "🏫", category: "nearby" },
  { id: "university", label_ar: "جامعة", icon: "🎓", category: "nearby" },
  { id: "beach", label_ar: "الشاطئ", icon: "🏖️", category: "nearby" },
  { id: "metro", label_ar: "مترو", icon: "🚇", category: "nearby" },
  { id: "highway", label_ar: "الطريق السريع", icon: "🛣️", category: "nearby" },
];

/** Quick lookup: id → amenity */
export const AMENITY_BY_ID: Record<string, Amenity> = Object.fromEntries(
  AMENITIES.map((a) => [a.id, a])
);

/** All amenity IDs */
export const AMENITY_IDS = AMENITIES.map((a) => a.id);

/** Group amenities by category — for UI rendering */
export function amenitiesByCategory(ids: string[]): Record<AmenityCategory, Amenity[]> {
  const result: Record<AmenityCategory, Amenity[]> = {
    security: [], building: [], interior: [], storage: [],
    appliances: [], views: [], nearby: [],
  };
  for (const id of ids) {
    const amenity = AMENITY_BY_ID[id];
    if (amenity) result[amenity.category].push(amenity);
  }
  return result;
}
