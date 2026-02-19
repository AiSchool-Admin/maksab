/**
 * Default placeholder images for each category.
 * Used when a merchant adds products without photos via rapid entry.
 * These are SVG data URLs with category-appropriate icons.
 */

const PLACEHOLDER_COLORS: Record<string, { bg: string; fg: string }> = {
  cars: { bg: "#E8F5E9", fg: "#1B7A3D" },
  real_estate: { bg: "#E3F2FD", fg: "#1565C0" },
  phones: { bg: "#F3E5F5", fg: "#7B1FA2" },
  fashion: { bg: "#FCE4EC", fg: "#C62828" },
  scrap: { bg: "#EFEBE9", fg: "#4E342E" },
  gold: { bg: "#FFF8E1", fg: "#F57F17" },
  luxury: { bg: "#FFF3E0", fg: "#E65100" },
  appliances: { bg: "#E0F2F1", fg: "#00695C" },
  furniture: { bg: "#FBE9E7", fg: "#BF360C" },
  hobbies: { bg: "#EDE7F6", fg: "#4527A0" },
  tools: { bg: "#ECEFF1", fg: "#37474F" },
  services: { bg: "#E8EAF6", fg: "#283593" },
  computers: { bg: "#E0E7EE", fg: "#34495E" },
  kids_babies: { bg: "#F3E5F5", fg: "#9B59B6" },
  electronics: { bg: "#E3F2FD", fg: "#2980B9" },
  beauty: { bg: "#FCE4EC", fg: "#E74C3C" },
};

const PLACEHOLDER_ICONS: Record<string, string> = {
  cars: "🚗",
  real_estate: "🏠",
  phones: "📱",
  fashion: "👗",
  scrap: "♻️",
  gold: "💰",
  luxury: "💎",
  appliances: "🏠",
  furniture: "🪑",
  hobbies: "🎮",
  tools: "🔧",
  services: "🛠️",
  computers: "💻",
  kids_babies: "👶",
  electronics: "📺",
  beauty: "💄",
};

/**
 * Generate a placeholder image SVG data URL for a given category.
 * Returns a colored square with the category emoji.
 */
export function getCategoryPlaceholderImage(categoryId: string): string {
  const colors = PLACEHOLDER_COLORS[categoryId] || { bg: "#F3F4F6", fg: "#6B7280" };
  const icon = PLACEHOLDER_ICONS[categoryId] || "📦";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${colors.bg}" rx="20"/>
    <text x="200" y="180" text-anchor="middle" font-size="120">${icon}</text>
    <text x="200" y="280" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="${colors.fg}" font-weight="bold">بدون صورة</text>
    <text x="200" y="320" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="${colors.fg}" opacity="0.6">الصورة قريباً</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get the emoji icon for a category (for inline use).
 */
export function getCategoryIcon(categoryId: string): string {
  return PLACEHOLDER_ICONS[categoryId] || "📦";
}
