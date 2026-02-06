/**
 * Format price with comma separator and "جنيه" suffix
 * Example: 350000 → "350,000 جنيه"
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString("en-US")} جنيه`;
}

/**
 * Format relative time in Egyptian Arabic (proper dual/plural forms)
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return "الآن";
  if (diffMins < 60) {
    if (diffMins === 1) return "منذ دقيقة";
    if (diffMins === 2) return "منذ دقيقتين";
    if (diffMins <= 10) return `منذ ${diffMins} دقائق`;
    return `منذ ${diffMins} دقيقة`;
  }
  if (diffHours < 24) {
    if (diffHours === 1) return "منذ ساعة";
    if (diffHours === 2) return "منذ ساعتين";
    if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
    return `منذ ${diffHours} ساعة`;
  }
  if (diffDays < 30) {
    if (diffDays === 1) return "منذ يوم";
    if (diffDays === 2) return "منذ يومين";
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوم`;
  }

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

/**
 * Format countdown timer from remaining milliseconds
 * Example: 3661000 → "01:01:01"
 */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00:00";

  const hours = Math.floor(remainingMs / 3600000);
  const mins = Math.floor((remainingMs % 3600000) / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);

  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
