/**
 * Tests for ad data validation.
 * Validates required fields, sale types, category fields, and injection prevention.
 */

import { validateAdData } from "@/lib/validation/ad-validation";

describe("Ad Validation", () => {
  const validAd = {
    category_id: "cars",
    sale_type: "cash",
    title: "تويوتا كورولا 2020",
    description: "سيارة ممتازة",
    price: 350000,
  };

  describe("Required fields", () => {
    it("should accept a valid ad", () => {
      expect(validateAdData(validAd).valid).toBe(true);
    });

    it("should reject missing category_id", () => {
      const { category_id, ...ad } = validAd;
      const result = validateAdData(ad);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("القسم");
    });

    it("should reject missing sale_type", () => {
      const { sale_type, ...ad } = validAd;
      const result = validateAdData(ad);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("نوع البيع");
    });

    it("should reject invalid sale_type", () => {
      const result = validateAdData({ ...validAd, sale_type: "invalid" });
      expect(result.valid).toBe(false);
    });

    it("should reject missing title", () => {
      const { title, ...ad } = validAd;
      const result = validateAdData(ad);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("العنوان");
    });

    it("should reject unknown category_id", () => {
      const result = validateAdData({ ...validAd, category_id: "weapons" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("القسم");
    });
  });

  describe("Title and description limits", () => {
    it("should reject title exceeding 200 characters", () => {
      const result = validateAdData({
        ...validAd,
        title: "أ".repeat(201),
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("طويل");
    });

    it("should accept title at exactly 200 characters", () => {
      const result = validateAdData({
        ...validAd,
        title: "أ".repeat(200),
      });
      expect(result.valid).toBe(true);
    });

    it("should reject description exceeding 5000 characters", () => {
      const result = validateAdData({
        ...validAd,
        description: "أ".repeat(5001),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("Sale type specific validation", () => {
    it("should accept valid cash ad with price", () => {
      const result = validateAdData({ ...validAd, price: 100000 });
      expect(result.valid).toBe(true);
    });

    it("should reject negative price", () => {
      const result = validateAdData({ ...validAd, price: -1 });
      expect(result.valid).toBe(false);
    });

    it("should reject price exceeding limit", () => {
      const result = validateAdData({ ...validAd, price: 9999999999 });
      expect(result.valid).toBe(false);
    });

    it("should accept valid auction ad", () => {
      const result = validateAdData({
        ...validAd,
        sale_type: "auction",
        auction_start_price: 10000,
        auction_duration_hours: 24,
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid auction duration", () => {
      const result = validateAdData({
        ...validAd,
        sale_type: "auction",
        auction_duration_hours: 36,
      });
      expect(result.valid).toBe(false);
    });

    it("should reject auction start price of 0", () => {
      const result = validateAdData({
        ...validAd,
        sale_type: "auction",
        auction_start_price: 0,
      });
      expect(result.valid).toBe(false);
    });

    it("should accept exchange type", () => {
      const result = validateAdData({
        ...validAd,
        sale_type: "exchange",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("Images validation", () => {
    it("should accept valid images array", () => {
      const result = validateAdData({
        ...validAd,
        images: ["https://img1.jpg", "https://img2.jpg"],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject more than 10 images", () => {
      const result = validateAdData({
        ...validAd,
        images: Array.from({ length: 11 }, (_, i) => `img${i}.jpg`),
      });
      expect(result.valid).toBe(false);
    });

    it("should reject non-string image entries", () => {
      const result = validateAdData({
        ...validAd,
        images: [123, "valid.jpg"],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("Category fields validation", () => {
    it("should accept valid category fields", () => {
      const result = validateAdData({
        ...validAd,
        category_fields: {
          brand: "تويوتا",
          model: "كورولا",
          year: 2020,
          mileage: 45000,
          licensed: true,
        },
      });
      expect(result.valid).toBe(true);
    });

    it("should reject too many fields (>30)", () => {
      const fields: Record<string, string> = {};
      for (let i = 0; i < 31; i++) fields[`field${i}`] = "value";
      const result = validateAdData({
        ...validAd,
        category_fields: fields,
      });
      expect(result.valid).toBe(false);
    });

    it("should reject nested objects in category fields", () => {
      const result = validateAdData({
        ...validAd,
        category_fields: {
          brand: "تويوتا",
          nested: { evil: "data" },
        },
      });
      expect(result.valid).toBe(false);
    });

    it("should reject script tags in field values (XSS)", () => {
      const result = validateAdData({
        ...validAd,
        category_fields: {
          brand: '<script>alert("xss")</script>',
        },
      });
      expect(result.valid).toBe(false);
    });

    it("should reject javascript: protocol in field values", () => {
      const result = validateAdData({
        ...validAd,
        category_fields: {
          brand: "javascript:alert(1)",
        },
      });
      expect(result.valid).toBe(false);
    });

    it("should reject field values exceeding 500 characters", () => {
      const result = validateAdData({
        ...validAd,
        category_fields: {
          brand: "أ".repeat(501),
        },
      });
      expect(result.valid).toBe(false);
    });

    it("should accept arrays of primitives", () => {
      const result = validateAdData({
        ...validAd,
        category_fields: {
          colors: ["أحمر", "أزرق", "أخضر"],
          sizes: [38, 39, 40],
        },
      });
      expect(result.valid).toBe(true);
    });

    it("should reject Infinity in number fields", () => {
      const result = validateAdData({
        ...validAd,
        category_fields: {
          price: Infinity,
        },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("All valid categories", () => {
    const validCategories = [
      "cars", "real_estate", "phones", "fashion", "scrap",
      "gold_silver", "luxury", "home_appliances", "furniture",
      "hobbies", "tools", "services",
    ];

    it.each(validCategories)("should accept category: %s", (cat) => {
      const result = validateAdData({ ...validAd, category_id: cat });
      expect(result.valid).toBe(true);
    });
  });
});
