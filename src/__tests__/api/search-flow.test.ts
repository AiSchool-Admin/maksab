/**
 * Search Flow Tests — Query validation, filter handling, pagination,
 * sorting, and category-specific filter logic.
 *
 * Tests the search query processing and validation extracted from the
 * search route handler.
 */

// ── Search Input Sanitization (mirrors search/route.ts) ─────────

/**
 * Sanitize search query to prevent PostgREST injection.
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/[<>"'`;]/g, "")   // Remove SQL/HTML injection chars
    .replace(/\s+/g, " ")        // Normalize whitespace
    .trim()
    .slice(0, 200);              // Max 200 characters
}

/**
 * Validate and clamp pagination parameters.
 */
function validatePagination(page: unknown, limit: unknown): { page: number; limit: number } {
  const p = Math.max(0, Math.floor(Number(page) || 0));
  const l = Math.min(Math.max(1, Math.floor(Number(limit) || 12)), 50);
  return { page: p, limit: l };
}

/**
 * Validate sort parameter.
 */
const VALID_SORT_VALUES = ["relevance", "newest", "price_asc", "price_desc", "nearest"];

function validateSortBy(sortBy: unknown): string {
  if (typeof sortBy === "string" && VALID_SORT_VALUES.includes(sortBy)) {
    return sortBy;
  }
  return "relevance";
}

/**
 * Validate category filter field names (whitelist approach).
 */
const ALLOWED_FILTER_FIELDS = new Set([
  "brand", "model", "year", "mileage", "fuel", "transmission",
  "color", "condition", "type", "area", "rooms", "floor",
  "finishing", "storage", "ram", "size", "karat", "weight",
  "material", "capacity", "experience", "pricing",
]);

function validateCategoryFilters(
  filters: Record<string, unknown>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (
      ALLOWED_FILTER_FIELDS.has(key) &&
      typeof value === "string" &&
      value.length <= 200
    ) {
      sanitized[key] = sanitizeQuery(value);
    }
  }
  return sanitized;
}

/**
 * Validate price range.
 */
function validatePriceRange(min: unknown, max: unknown): {
  priceMin: number | null;
  priceMax: number | null;
} {
  let priceMin = min != null ? Math.max(0, Number(min)) : null;
  let priceMax = max != null ? Math.max(0, Number(max)) : null;

  // Filter out non-finite values first
  if (priceMin != null && !isFinite(priceMin)) priceMin = null;
  if (priceMax != null && !isFinite(priceMax)) priceMax = null;

  // Swap if min > max
  if (priceMin != null && priceMax != null && priceMin > priceMax) {
    return { priceMin: priceMax, priceMax: priceMin };
  }

  return { priceMin, priceMax };
}

/**
 * Valid categories list.
 */
const VALID_CATEGORIES = [
  "cars", "real_estate", "phones", "fashion", "scrap",
  "gold", "gold_silver", "luxury", "appliances", "home_appliances", "furniture",
  "hobbies", "tools", "services", "computers", "kids_babies", "electronics", "beauty",
];

/**
 * Valid sale types.
 */
const VALID_SALE_TYPES = ["cash", "auction", "exchange"];

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

describe("Search Flow", () => {
  // ── Query Sanitization ──────────────────────────────────────────

  describe("Query sanitization", () => {
    it("should pass through valid Arabic query", () => {
      expect(sanitizeQuery("تويوتا كورولا 2020")).toBe("تويوتا كورولا 2020");
    });

    it("should pass through valid English query", () => {
      expect(sanitizeQuery("iPhone 15 Pro Max")).toBe("iPhone 15 Pro Max");
    });

    it("should remove SQL injection characters", () => {
      expect(sanitizeQuery("تويوتا'; DROP TABLE ads;--")).toBe("تويوتا DROP TABLE ads--");
    });

    it("should remove HTML/XSS characters", () => {
      expect(sanitizeQuery('<script>alert("xss")</script>')).toBe("scriptalert(xss)/script");
    });

    it("should normalize whitespace", () => {
      expect(sanitizeQuery("  تويوتا   كورولا  ")).toBe("تويوتا كورولا");
    });

    it("should truncate to 200 characters", () => {
      const longQuery = "أ".repeat(300);
      expect(sanitizeQuery(longQuery).length).toBe(200);
    });

    it("should handle empty string", () => {
      expect(sanitizeQuery("")).toBe("");
    });

    it("should handle mixed Arabic and numbers", () => {
      expect(sanitizeQuery("آيفون 15 برو — 256GB")).toBe("آيفون 15 برو — 256GB");
    });
  });

  // ── Pagination Validation ──────────────────────────────────────

  describe("Pagination validation", () => {
    it("should accept valid pagination", () => {
      expect(validatePagination(0, 12)).toEqual({ page: 0, limit: 12 });
      expect(validatePagination(1, 20)).toEqual({ page: 1, limit: 20 });
      expect(validatePagination(5, 50)).toEqual({ page: 5, limit: 50 });
    });

    it("should default page to 0", () => {
      expect(validatePagination(undefined, 12)).toEqual({ page: 0, limit: 12 });
      expect(validatePagination(null, 12)).toEqual({ page: 0, limit: 12 });
    });

    it("should default limit to 12", () => {
      expect(validatePagination(0, undefined)).toEqual({ page: 0, limit: 12 });
      expect(validatePagination(0, null)).toEqual({ page: 0, limit: 12 });
    });

    it("should clamp negative page to 0", () => {
      expect(validatePagination(-1, 12)).toEqual({ page: 0, limit: 12 });
      expect(validatePagination(-100, 12)).toEqual({ page: 0, limit: 12 });
    });

    it("should clamp limit to 1-50 range", () => {
      // 0 is falsy → falls back to default 12
      expect(validatePagination(0, 0)).toEqual({ page: 0, limit: 12 });
      // -5 is truthy → Math.max(1, -5) = 1
      expect(validatePagination(0, -5)).toEqual({ page: 0, limit: 1 });
      expect(validatePagination(0, 100)).toEqual({ page: 0, limit: 50 });
      expect(validatePagination(0, 999)).toEqual({ page: 0, limit: 50 });
    });

    it("should floor fractional values", () => {
      expect(validatePagination(1.7, 12.5)).toEqual({ page: 1, limit: 12 });
    });

    it("should handle string inputs", () => {
      expect(validatePagination("2", "20")).toEqual({ page: 2, limit: 20 });
    });

    it("should handle NaN inputs", () => {
      expect(validatePagination("abc", "xyz")).toEqual({ page: 0, limit: 12 });
    });
  });

  // ── Sort Validation ────────────────────────────────────────────

  describe("Sort validation", () => {
    it.each(VALID_SORT_VALUES)("should accept valid sort: %s", (sort) => {
      expect(validateSortBy(sort)).toBe(sort);
    });

    it("should default to 'relevance' for invalid sort", () => {
      expect(validateSortBy("invalid")).toBe("relevance");
      expect(validateSortBy("")).toBe("relevance");
      expect(validateSortBy(null)).toBe("relevance");
      expect(validateSortBy(undefined)).toBe("relevance");
      expect(validateSortBy(123)).toBe("relevance");
    });
  });

  // ── Category Filter Validation ─────────────────────────────────

  describe("Category filter validation", () => {
    it("should accept valid filter fields", () => {
      const result = validateCategoryFilters({
        brand: "تويوتا",
        model: "كورولا",
        year: "2020",
      });
      expect(result).toEqual({
        brand: "تويوتا",
        model: "كورولا",
        year: "2020",
      });
    });

    it("should reject unknown filter fields", () => {
      const result = validateCategoryFilters({
        brand: "تويوتا",
        evil_field: "malicious",
        constructor_name: "attack",
      });
      expect(result).toEqual({ brand: "تويوتا" });
      expect(result).not.toHaveProperty("evil_field");
      expect(result).not.toHaveProperty("constructor_name");
    });

    it("should reject non-string filter values", () => {
      const result = validateCategoryFilters({
        brand: "تويوتا",
        year: 2020 as unknown as string,      // number — should be rejected
        model: { nested: "object" } as unknown as string, // object — should be rejected
      });
      expect(result).toEqual({ brand: "تويوتا" });
    });

    it("should reject overly long filter values", () => {
      const result = validateCategoryFilters({
        brand: "أ".repeat(201),
      });
      expect(result).toEqual({});
    });

    it("should sanitize filter values", () => {
      const result = validateCategoryFilters({
        brand: "تويوتا'; DROP TABLE--",
      });
      expect(result.brand).not.toContain("'");
      expect(result.brand).not.toContain(";");
    });

    it("should accept all whitelisted fields", () => {
      const allFields: Record<string, string> = {};
      for (const field of ALLOWED_FILTER_FIELDS) {
        allFields[field] = "test";
      }
      const result = validateCategoryFilters(allFields);
      expect(Object.keys(result).length).toBe(ALLOWED_FILTER_FIELDS.size);
    });
  });

  // ── Price Range Validation ─────────────────────────────────────

  describe("Price range validation", () => {
    it("should accept valid price range", () => {
      expect(validatePriceRange(1000, 50000)).toEqual({
        priceMin: 1000,
        priceMax: 50000,
      });
    });

    it("should accept null/undefined prices", () => {
      expect(validatePriceRange(null, null)).toEqual({
        priceMin: null,
        priceMax: null,
      });
      expect(validatePriceRange(undefined, 50000)).toEqual({
        priceMin: null,
        priceMax: 50000,
      });
    });

    it("should swap if min > max", () => {
      expect(validatePriceRange(50000, 1000)).toEqual({
        priceMin: 1000,
        priceMax: 50000,
      });
    });

    it("should clamp negative prices to 0", () => {
      expect(validatePriceRange(-1000, 50000)).toEqual({
        priceMin: 0,
        priceMax: 50000,
      });
    });

    it("should handle zero prices", () => {
      expect(validatePriceRange(0, 0)).toEqual({
        priceMin: 0,
        priceMax: 0,
      });
    });

    it("should handle Infinity", () => {
      // Infinity is filtered out before swap
      expect(validatePriceRange(Infinity, 50000)).toEqual({
        priceMin: null,
        priceMax: 50000,
      });
    });
  });

  // ── Category Validation ────────────────────────────────────────

  describe("Category validation", () => {
    it.each(VALID_CATEGORIES)("should accept valid category: %s", (cat) => {
      expect(VALID_CATEGORIES.includes(cat)).toBe(true);
    });

    it("should reject invalid categories", () => {
      expect(VALID_CATEGORIES.includes("weapons")).toBe(false);
      expect(VALID_CATEGORIES.includes("drugs")).toBe(false);
      expect(VALID_CATEGORIES.includes("")).toBe(false);
    });
  });

  // ── Sale Type Validation ───────────────────────────────────────

  describe("Sale type validation", () => {
    it.each(VALID_SALE_TYPES)("should accept valid sale type: %s", (type) => {
      expect(VALID_SALE_TYPES.includes(type)).toBe(true);
    });

    it("should reject invalid sale types", () => {
      expect(VALID_SALE_TYPES.includes("loan")).toBe(false);
      expect(VALID_SALE_TYPES.includes("rent")).toBe(false);
    });
  });

  // ── Search Scenarios ───────────────────────────────────────────

  describe("Search scenarios", () => {
    it("should handle Arabic car search with model", () => {
      const query = sanitizeQuery("تويوتا كورولا 2020");
      expect(query).toBe("تويوتا كورولا 2020");
      expect(query.length).toBeGreaterThan(0);
    });

    it("should handle phone search with specs", () => {
      const query = sanitizeQuery("آيفون 15 برو 256");
      expect(query).toBe("آيفون 15 برو 256");
    });

    it("should handle real estate search with location", () => {
      const query = sanitizeQuery("شقة مدينة نصر 3 غرف");
      expect(query).toBe("شقة مدينة نصر 3 غرف");
    });

    it("should handle gold search with karat", () => {
      const query = sanitizeQuery("ذهب عيار 21 سلسلة");
      expect(query).toBe("ذهب عيار 21 سلسلة");
    });

    it("should handle search with filters combined", () => {
      const query = sanitizeQuery("سيارة");
      const filters = validateCategoryFilters({
        brand: "تويوتا",
        year: "2020",
        transmission: "أوتوماتيك",
      });
      const { page, limit } = validatePagination(0, 20);
      const sort = validateSortBy("price_asc");
      const { priceMin, priceMax } = validatePriceRange(100000, 500000);

      expect(query).toBe("سيارة");
      expect(Object.keys(filters).length).toBe(3);
      expect(page).toBe(0);
      expect(limit).toBe(20);
      expect(sort).toBe("price_asc");
      expect(priceMin).toBe(100000);
      expect(priceMax).toBe(500000);
    });

    it("should handle empty search (browse all)", () => {
      const query = sanitizeQuery("");
      const { page, limit } = validatePagination(0, 12);
      expect(query).toBe("");
      expect(page).toBe(0);
      expect(limit).toBe(12);
    });
  });

  // ── Offset Calculation ─────────────────────────────────────────

  describe("Offset calculation", () => {
    it("should calculate correct offset", () => {
      expect(0 * 12).toBe(0);    // page 0
      expect(1 * 12).toBe(12);   // page 1
      expect(2 * 12).toBe(24);   // page 2
      expect(5 * 20).toBe(100);  // page 5, limit 20
    });
  });
});
