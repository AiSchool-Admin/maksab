"use client";

/**
 * CategoryIcon — Vibrant, animated SVG icons for each category.
 * Uses local SVGs (200x200) with built-in animations.
 * No more external Unsplash images — local SVGs are faster + more reliable.
 */

/** Category metadata: Arabic name used for alt text */
const categoryNames: Record<string, string> = {
  cars: "سيارات",
  "real-estate": "عقارات",
  real_estate: "عقارات",
  phones: "موبايلات",
  fashion: "موضة",
  scrap: "خردة",
  gold: "ذهب",
  luxury: "فاخرة",
  appliances: "أجهزة",
  furniture: "أثاث",
  hobbies: "هوايات",
  tools: "عدد",
  services: "خدمات",
};

function getIconSlug(slug: string): string {
  if (slug === "real_estate") return "real-estate";
  return slug;
}

interface CategoryIconProps {
  slug: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-[72px] h-[72px]", px: 72 },
  md: { container: "w-[88px] h-[88px]", px: 88 },
  lg: { container: "w-[100px] h-[100px]", px: 100 },
  xl: { container: "w-[120px] h-[120px]", px: 120 },
};

export default function CategoryIcon({
  slug,
  size = "md",
  className = "",
}: CategoryIconProps) {
  const s = sizeMap[size];
  const iconSlug = getIconSlug(slug);
  const name = categoryNames[slug] || slug;

  return (
    <div
      className={`${s.container} flex-shrink-0 rounded-2xl overflow-hidden transition-transform duration-200 hover:scale-105 ${className}`}
    >
      {/* Use <img> instead of next/image so SVG animations render properly */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/icons/categories/${iconSlug}.svg`}
        alt={name}
        width={s.px}
        height={s.px}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
