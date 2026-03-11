/**
 * اختبارات تحويل التواريخ النسبية
 */
import { parseRelativeDate } from "@/lib/crm/harvester/parsers/date-parser";

describe("parseRelativeDate", () => {
  const ref = new Date("2025-06-15T12:00:00Z");

  // ═══ "الآن" ═══

  it('يفسر "الآن"', () => {
    const result = parseRelativeDate("الآن", ref);
    expect(result).toEqual(ref);
  });

  it('يفسر "just now"', () => {
    const result = parseRelativeDate("just now", ref);
    expect(result).toEqual(ref);
  });

  it('يفسر "لسه"', () => {
    const result = parseRelativeDate("لسه", ref);
    expect(result).toEqual(ref);
  });

  // ═══ دقائق ═══

  it('يفسر "منذ 5 دقائق"', () => {
    const result = parseRelativeDate("منذ 5 دقائق", ref);
    expect(result!.getTime()).toBe(ref.getTime() - 5 * 60 * 1000);
  });

  it('يفسر "منذ دقيقة"', () => {
    const result = parseRelativeDate("منذ دقيقة", ref);
    expect(result!.getTime()).toBe(ref.getTime() - 1 * 60 * 1000);
  });

  it('يفسر "3 minutes ago"', () => {
    const result = parseRelativeDate("3 minutes ago", ref);
    expect(result!.getTime()).toBe(ref.getTime() - 3 * 60 * 1000);
  });

  // ═══ ساعات ═══

  it('يفسر "منذ 3 ساعات"', () => {
    const result = parseRelativeDate("منذ 3 ساعات", ref);
    expect(result!.getTime()).toBe(ref.getTime() - 3 * 60 * 60 * 1000);
  });

  it('يفسر "منذ ساعة"', () => {
    const result = parseRelativeDate("منذ ساعة", ref);
    expect(result!.getTime()).toBe(ref.getTime() - 1 * 60 * 60 * 1000);
  });

  it('يفسر "2 hours ago"', () => {
    const result = parseRelativeDate("2 hours ago", ref);
    expect(result!.getTime()).toBe(ref.getTime() - 2 * 60 * 60 * 1000);
  });

  // ═══ أيام ═══

  it('يفسر "أمس"', () => {
    const result = parseRelativeDate("أمس", ref);
    const expected = new Date(ref);
    expected.setDate(expected.getDate() - 1);
    expect(result!.getDate()).toBe(expected.getDate());
  });

  it('يفسر "امبارح"', () => {
    const result = parseRelativeDate("امبارح", ref);
    const expected = new Date(ref);
    expected.setDate(expected.getDate() - 1);
    expect(result!.getDate()).toBe(expected.getDate());
  });

  it('يفسر "yesterday"', () => {
    const result = parseRelativeDate("yesterday", ref);
    const expected = new Date(ref);
    expected.setDate(expected.getDate() - 1);
    expect(result!.getDate()).toBe(expected.getDate());
  });

  it('يفسر "منذ 3 أيام"', () => {
    const result = parseRelativeDate("منذ 3 أيام", ref);
    const expected = new Date(ref);
    expected.setDate(expected.getDate() - 3);
    expect(result!.getDate()).toBe(expected.getDate());
  });

  it('يفسر "5 days ago"', () => {
    const result = parseRelativeDate("5 days ago", ref);
    const expected = new Date(ref);
    expected.setDate(expected.getDate() - 5);
    expect(result!.getDate()).toBe(expected.getDate());
  });

  // ═══ أسابيع ═══

  it('يفسر "منذ أسبوع"', () => {
    const result = parseRelativeDate("منذ أسبوع", ref);
    const expected = new Date(ref);
    expected.setDate(expected.getDate() - 7);
    expect(result!.getDate()).toBe(expected.getDate());
  });

  it('يفسر "منذ 2 أسابيع"', () => {
    const result = parseRelativeDate("منذ 2 أسابيع", ref);
    const expected = new Date(ref);
    expected.setDate(expected.getDate() - 14);
    expect(result!.getDate()).toBe(expected.getDate());
  });

  // ═══ شهور ═══

  it('يفسر "منذ شهر"', () => {
    const result = parseRelativeDate("منذ شهر", ref);
    const expected = new Date(ref);
    expected.setMonth(expected.getMonth() - 1);
    expect(result!.getMonth()).toBe(expected.getMonth());
  });

  it('يفسر "منذ 3 أشهر"', () => {
    const result = parseRelativeDate("منذ 3 أشهر", ref);
    const expected = new Date(ref);
    expected.setMonth(expected.getMonth() - 3);
    expect(result!.getMonth()).toBe(expected.getMonth());
  });

  // ═══ سنوات ═══

  it('يفسر "منذ سنة"', () => {
    const result = parseRelativeDate("منذ سنة", ref);
    const expected = new Date(ref);
    expected.setFullYear(expected.getFullYear() - 1);
    expect(result!.getFullYear()).toBe(expected.getFullYear());
  });

  it('يفسر "منذ 2 سنوات"', () => {
    const result = parseRelativeDate("منذ 2 سنوات", ref);
    const expected = new Date(ref);
    expected.setFullYear(expected.getFullYear() - 2);
    expect(result!.getFullYear()).toBe(expected.getFullYear());
  });

  // ═══ حالات فارغة ═══

  it("يرجع null لنص فارغ", () => {
    expect(parseRelativeDate("", ref)).toBeNull();
  });

  it("يرجع null لنص غير مفهوم", () => {
    expect(parseRelativeDate("بكره إن شاء الله", ref)).toBeNull();
  });

  // ═══ التاريخ المرجعي الافتراضي ═══

  it("يستخدم الوقت الحالي كافتراضي لو مفيش تاريخ مرجعي", () => {
    const before = Date.now();
    const result = parseRelativeDate("الآن");
    const after = Date.now();
    expect(result!.getTime()).toBeGreaterThanOrEqual(before);
    expect(result!.getTime()).toBeLessThanOrEqual(after);
  });
});
