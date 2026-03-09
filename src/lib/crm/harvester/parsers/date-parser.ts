/**
 * تحويل التواريخ النسبية من دوبيزل والمنصات المنافسة
 * "منذ 5 دقائق" → Date object
 * "منذ ساعتين" → Date object
 * "أمس" → Date object
 */

export function parseRelativeDate(
  text: string,
  referenceDate: Date = new Date()
): Date | null {
  if (!text) return null;

  const t = text.trim();

  // "الآن" / "just now"
  if (t.match(/الآن|just now|لسه/i)) {
    return new Date(referenceDate);
  }

  // Extract number
  const numMatch = t.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1]) : 1;

  // دقيقة / دقائق / minutes
  if (t.match(/دقيق|minute/i)) {
    const d = new Date(referenceDate);
    d.setMinutes(d.getMinutes() - num);
    return d;
  }

  // ساعة / ساعات / hours
  if (t.match(/ساع|hour/i)) {
    const d = new Date(referenceDate);
    d.setHours(d.getHours() - num);
    return d;
  }

  // يوم / أيام / days / أمس / yesterday
  if (t.match(/أمس|امبارح|yesterday/i)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 1);
    return d;
  }

  if (t.match(/يوم|أيام|day/i)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - num);
    return d;
  }

  // أسبوع / أسابيع / weeks
  if (t.match(/أسبوع|أسابيع|week/i)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - num * 7);
    return d;
  }

  // شهر / أشهر / months
  if (t.match(/شهر|أشهر|month/i)) {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() - num);
    return d;
  }

  // سنة / سنوات / years
  if (t.match(/سن[ةو]|year/i)) {
    const d = new Date(referenceDate);
    d.setFullYear(d.getFullYear() - num);
    return d;
  }

  return null;
}
