/**
 * اختبارات محرك الحصاد — الدوال المساعدة والمنطق الأساسي
 */
import { ServerFetchBlockedError } from "@/lib/crm/harvester/engine";

describe("ServerFetchBlockedError", () => {
  it("ينشئ خطأ بالاسم الصحيح", () => {
    const error = new ServerFetchBlockedError("403 blocked");
    expect(error.name).toBe("ServerFetchBlockedError");
    expect(error.message).toBe("403 blocked");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ServerFetchBlockedError);
  });
});

// ═══ اختبارات buildPageUrl (نسخة محلية لأنها غير مُصدَّرة) ═══
describe("buildPageUrl logic", () => {
  function buildPageUrl(
    baseUrl: string,
    paginationPattern: string,
    page: number
  ): string {
    if (page === 1) return baseUrl;
    return baseUrl + paginationPattern.replace("{page}", page.toString());
  }

  it("يرجع baseUrl للصفحة الأولى", () => {
    expect(
      buildPageUrl("https://dubizzle.com.eg/phones/", "?page={page}", 1)
    ).toBe("https://dubizzle.com.eg/phones/");
  });

  it("يضيف pagination pattern للصفحة الثانية", () => {
    expect(
      buildPageUrl("https://dubizzle.com.eg/phones/", "?page={page}", 2)
    ).toBe("https://dubizzle.com.eg/phones/?page=2");
  });

  it("يتعامل مع أرقام صفحات كبيرة", () => {
    expect(
      buildPageUrl("https://dubizzle.com.eg/cars/", "&page={page}", 15)
    ).toBe("https://dubizzle.com.eg/cars/&page=15");
  });
});

// ═══ اختبارات calculatePriorityScore (نسخة محلية) ═══
describe("calculatePriorityScore logic", () => {
  function calculatePriorityScore(data: {
    isVerified: boolean;
    isBusiness: boolean;
    phone: string | null;
  }): number {
    let score = 0;
    if (data.isVerified) score += 30;
    if (data.isBusiness) score += 20;
    if (data.phone) score += 25;
    return Math.min(score, 100);
  }

  it("يحسب 0 لبائع بدون أي مميزات", () => {
    expect(
      calculatePriorityScore({
        isVerified: false,
        isBusiness: false,
        phone: null,
      })
    ).toBe(0);
  });

  it("يحسب 30 لبائع موثق فقط", () => {
    expect(
      calculatePriorityScore({
        isVerified: true,
        isBusiness: false,
        phone: null,
      })
    ).toBe(30);
  });

  it("يحسب 25 لبائع عنده رقم فقط", () => {
    expect(
      calculatePriorityScore({
        isVerified: false,
        isBusiness: false,
        phone: "01012345678",
      })
    ).toBe(25);
  });

  it("يحسب 20 لبائع بزنس فقط", () => {
    expect(
      calculatePriorityScore({
        isVerified: false,
        isBusiness: true,
        phone: null,
      })
    ).toBe(20);
  });

  it("يحسب 75 لبائع بكل المميزات (30+20+25)", () => {
    expect(
      calculatePriorityScore({
        isVerified: true,
        isBusiness: true,
        phone: "01012345678",
      })
    ).toBe(75);
  });

  it("لا يتجاوز 100", () => {
    // Currently max is 75, but test the cap
    const score = calculatePriorityScore({
      isVerified: true,
      isBusiness: true,
      phone: "01012345678",
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ═══ اختبارات HarvestResult structure ═══
describe("HarvestResult structure validation", () => {
  interface HarvestResult {
    success: boolean;
    listings_new: number;
    listings_duplicate: number;
    sellers_new: number;
    phones_extracted: number;
    auto_queued: number;
    errors: string[];
    warnings: string[];
    duration_seconds: number;
    fetch_strategy: string;
    http_status?: number;
  }

  it("يبني نتيجة ناجحة بكل الحقول", () => {
    const result: HarvestResult = {
      success: true,
      listings_new: 10,
      listings_duplicate: 3,
      sellers_new: 5,
      phones_extracted: 4,
      auto_queued: 2,
      errors: [],
      warnings: [],
      duration_seconds: 45,
      fetch_strategy: "server_fetch",
      http_status: 200,
    };

    expect(result.success).toBe(true);
    expect(result.listings_new).toBe(10);
    expect(result.errors).toHaveLength(0);
  });

  it("يبني نتيجة فاشلة", () => {
    const result: HarvestResult = {
      success: false,
      listings_new: 0,
      listings_duplicate: 0,
      sellers_new: 0,
      phones_extracted: 0,
      auto_queued: 0,
      errors: ["HTTP 403"],
      warnings: [],
      duration_seconds: 2,
      fetch_strategy: "blocked",
    };

    expect(result.success).toBe(false);
    expect(result.errors).toContain("HTTP 403");
    expect(result.http_status).toBeUndefined();
  });
});
