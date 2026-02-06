/**
 * Format price with comma separator and "جنيه" suffix
 * Example: 350000 → "350,000 جنيه"
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString("en-US")} جنيه`;
}

/**
 * Format relative time in Egyptian Arabic
 * Example: 3 hours ago → "منذ 3 ساعات"
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} ${diffMins === 1 ? "دقيقة" : "دقائق"}`;
  if (diffHours < 24) return `منذ ${diffHours} ${diffHours === 1 ? "ساعة" : "ساعات"}`;
  if (diffDays < 7) return `منذ ${diffDays} ${diffDays === 1 ? "يوم" : "أيام"}`;

  return then.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format Egyptian phone number: 01X-XXXX-XXXX
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 11) return phone;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
}

/**
 * Format number with commas
 * Example: 45000 → "45,000"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}
