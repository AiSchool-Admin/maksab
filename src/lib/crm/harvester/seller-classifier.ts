/**
 * Seller type classification — فرد / سمسار / وكيل
 * Based on seller name keywords + listing count
 */

const CAR_AGENCY_KEYWORDS = [
  "وكالة", "معرض", "automotive", "motors", "auto",
  "group", "trading", "للسيارات", "cars", "company",
];

const PROPERTY_AGENCY_KEYWORDS = [
  "للعقارات", "عقارات", "للتطوير", "تطوير عقاري",
  "real estate", "realty", "properties", "للاستثمار",
  "مجموعة", "شركة", "للتسويق العقاري", "إدارة أملاك",
];

const ALL_AGENCY_KEYWORDS = [...CAR_AGENCY_KEYWORDS, ...PROPERTY_AGENCY_KEYWORDS];

export type SellerType = "فرد" | "سمسار" | "وكيل";

/**
 * Detect seller type from name + listing count
 * Returns: "فرد" (individual, 0-1 listings)
 *          "سمسار" (broker, 2-10 listings)
 *          "وكيل" (agency, 10+ listings or agency name)
 */
export function detectSellerType(
  name: string | null | undefined,
  listingCount: number,
  isBusiness?: boolean,
): SellerType {
  // Check name keywords first
  if (name) {
    const lower = name.toLowerCase();
    if (ALL_AGENCY_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))) {
      return "وكيل";
    }
  }

  // Check is_business flag from platform
  if (isBusiness) return "وكيل";

  // Classify by listing count
  if (listingCount > 10) return "وكيل";
  if (listingCount >= 2) return "سمسار";
  return "فرد";
}

/**
 * Get seller type label in Arabic
 */
export function getSellerTypeLabel(type: SellerType): string {
  switch (type) {
    case "وكيل": return "وكيل";
    case "سمسار": return "سمسار";
    case "فرد": return "فرد";
    default: return "فرد";
  }
}

/**
 * Get seller type badge style
 */
export function getSellerTypeBadge(type: SellerType): { emoji: string; label: string; color: string } {
  switch (type) {
    case "وكيل": return { emoji: "🏢", label: "وكيل", color: "bg-amber-50 text-amber-700" };
    case "سمسار": return { emoji: "🏷️", label: "سمسار", color: "bg-orange-50 text-orange-600" };
    case "فرد": return { emoji: "👤", label: "فرد", color: "bg-blue-50 text-blue-600" };
    default: return { emoji: "👤", label: "فرد", color: "bg-blue-50 text-blue-600" };
  }
}
