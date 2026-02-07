"use client";

import Image from "next/image";

const categoryMeta: Record<string, { name: string }> = {
  cars: { name: "سيارات" },
  "real-estate": { name: "عقارات" },
  real_estate: { name: "عقارات" },
  phones: { name: "موبايلات" },
  fashion: { name: "موضة" },
  scrap: { name: "خردة" },
  gold: { name: "ذهب" },
  luxury: { name: "فاخرة" },
  appliances: { name: "أجهزة" },
  furniture: { name: "أثاث" },
  hobbies: { name: "هوايات" },
  tools: { name: "عدد" },
  services: { name: "خدمات" },
};

// Map slugs that differ between URL and file names
function getIconSlug(slug: string): string {
  if (slug === "real_estate") return "real-estate";
  return slug;
}

interface CategoryIconProps {
  slug: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-10 h-10", px: 40 },
  md: { container: "w-14 h-14", px: 56 },
  lg: { container: "w-20 h-20", px: 80 },
};

export default function CategoryIcon({ slug, size = "md", className = "" }: CategoryIconProps) {
  const meta = categoryMeta[slug];
  const s = sizeMap[size];
  const iconSlug = getIconSlug(slug);

  return (
    <div className={`${s.container} flex items-center justify-center flex-shrink-0 ${className}`}>
      <Image
        src={`/icons/categories/${iconSlug}.svg`}
        alt={meta?.name || slug}
        width={s.px}
        height={s.px}
        className="object-contain"
        loading="lazy"
      />
    </div>
  );
}
