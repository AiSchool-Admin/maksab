/**
 * اختبارات خريطة المواقع
 */
import { mapLocation } from "@/lib/crm/harvester/parsers/location-mapper";

describe("mapLocation", () => {
  // ═══ محافظات بالعربي ═══

  it("يتعرف على القاهرة", () => {
    const result = mapLocation("القاهرة", "dubizzle");
    expect(result.governorate).toBe("cairo");
  });

  it("يتعرف على الإسكندرية", () => {
    const result = mapLocation("الإسكندرية", "dubizzle");
    expect(result.governorate).toBe("alexandria");
  });

  it("يتعرف على اسكندرية (بدون ألف لام)", () => {
    const result = mapLocation("اسكندرية", "dubizzle");
    expect(result.governorate).toBe("alexandria");
  });

  it("يتعرف على الجيزة", () => {
    const result = mapLocation("الجيزة", "dubizzle");
    expect(result.governorate).toBe("giza");
  });

  it("يتعرف على الشرقية", () => {
    const result = mapLocation("الشرقية", "dubizzle");
    expect(result.governorate).toBe("sharqia");
  });

  it("يتعرف على بورسعيد", () => {
    const result = mapLocation("بورسعيد", "dubizzle");
    expect(result.governorate).toBe("port_said");
  });

  it("يتعرف على الأقصر", () => {
    const result = mapLocation("الأقصر", "dubizzle");
    expect(result.governorate).toBe("luxor");
  });

  // ═══ محافظات بالإنجليزي ═══

  it("يتعرف على cairo", () => {
    const result = mapLocation("cairo", "dubizzle");
    expect(result.governorate).toBe("cairo");
  });

  it("يتعرف على alexandria", () => {
    const result = mapLocation("alexandria", "dubizzle");
    expect(result.governorate).toBe("alexandria");
  });

  // ═══ مدن ═══

  it("يتعرف على مدينة نصر وربطها بالقاهرة", () => {
    const result = mapLocation("مدينة نصر", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("nasr_city");
  });

  it("يتعرف على المعادي", () => {
    const result = mapLocation("المعادي", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("maadi");
  });

  it("يتعرف على مصر الجديدة", () => {
    const result = mapLocation("مصر الجديدة", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("heliopolis");
  });

  it("يتعرف على القاهرة الجديدة / التجمع", () => {
    const result = mapLocation("التجمع", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("new_cairo");
  });

  it("يتعرف على سموحة (إسكندرية)", () => {
    const result = mapLocation("سموحة", "dubizzle");
    expect(result.governorate).toBe("alexandria");
    expect(result.city).toBe("smoha");
  });

  it("يتعرف على العجمي (إسكندرية)", () => {
    const result = mapLocation("العجمي", "dubizzle");
    expect(result.governorate).toBe("alexandria");
    expect(result.city).toBe("agami");
  });

  // ═══ مواقع مركبة ═══

  it("يتعرف على موقع مركب بفاصلة: مدينة, محافظة", () => {
    const result = mapLocation("مدينة نصر, القاهرة", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("nasr_city");
  });

  it("يتعرف على موقع مركب بشرطة", () => {
    const result = mapLocation("المعادي - القاهرة", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("maadi");
  });

  // ═══ حالات حدية ═══

  it("يرجع null لنص فارغ", () => {
    const result = mapLocation("", "dubizzle");
    expect(result.governorate).toBeNull();
    expect(result.city).toBeNull();
    expect(result.area).toBeNull();
  });

  it("يرجع النص الأصلي كـ area لموقع غير معروف", () => {
    const result = mapLocation("مكان غير معروف", "dubizzle");
    expect(result.governorate).toBeNull();
    expect(result.city).toBeNull();
    expect(result.area).toBe("مكان غير معروف");
  });

  // ═══ مدن بالإنجليزي ═══

  it("يتعرف على nasr city بالإنجليزي", () => {
    const result = mapLocation("nasr city", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("nasr_city");
  });

  it("يتعرف على maadi بالإنجليزي", () => {
    const result = mapLocation("maadi", "dubizzle");
    expect(result.governorate).toBe("cairo");
    expect(result.city).toBe("maadi");
  });

  it("يتعرف على smoha بالإنجليزي", () => {
    const result = mapLocation("smoha", "dubizzle");
    expect(result.governorate).toBe("alexandria");
    expect(result.city).toBe("smoha");
  });
});
