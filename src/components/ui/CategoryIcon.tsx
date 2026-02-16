"use client";

/**
 * CategoryIcon — High-quality PNG category images.
 * Images are generated via scripts/generate-category-images.mjs
 * and stored in public/images/categories/.
 */

import Image from "next/image";

interface CategoryImageConfig {
  name: string;
  src: string;
}

const categoryImages: Record<string, CategoryImageConfig> = {
  cars: { name: "سيارات", src: "/images/categories/cars.png" },
  "real-estate": { name: "عقارات", src: "/images/categories/real-estate.png" },
  real_estate: { name: "عقارات", src: "/images/categories/real-estate.png" },
  phones: { name: "موبايلات", src: "/images/categories/phones.png" },
  fashion: { name: "موضة", src: "/images/categories/fashion.png" },
  scrap: { name: "خردة", src: "/images/categories/scrap.png" },
  gold: { name: "ذهب وفضة", src: "/images/categories/gold.png" },
  luxury: { name: "فاخرة", src: "/images/categories/luxury.png" },
  appliances: { name: "أجهزة", src: "/images/categories/appliances.png" },
  furniture: { name: "أثاث", src: "/images/categories/furniture.png" },
  hobbies: { name: "هوايات", src: "/images/categories/hobbies.png" },
  tools: { name: "عدد", src: "/images/categories/tools.png" },
  services: { name: "خدمات", src: "/images/categories/services.png" },
};

const sizeMap = {
  sm: { container: "w-14 h-14", px: 56 },
  md: { container: "w-[66px] h-[66px]", px: 66 },
  lg: { container: "w-20 h-20", px: 80 },
  xl: { container: "w-24 h-24", px: 96 },
};

interface CategoryIconProps {
  slug: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function CategoryIcon({
  slug,
  size = "md",
  className = "",
}: CategoryIconProps) {
  const s = sizeMap[size];
  const normalizedSlug = slug === "real_estate" ? "real-estate" : slug;
  const cat = categoryImages[slug] || categoryImages[normalizedSlug];
  const src = cat?.src || "/images/categories/cars.png";
  const name = cat?.name || slug;

  return (
    <div
      className={`${s.container} rounded-2xl overflow-hidden flex-shrink-0
        hover:scale-110 active:scale-95 transition-all duration-300
        shadow-md hover:shadow-lg ${className}`}
    >
      <Image
        src={src}
        alt={name}
        width={s.px}
        height={s.px}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
