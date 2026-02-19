"use client";

/**
 * CategoryIcon — Real photography category images.
 * High-quality photographs stored in public/images/categories/.
 */

import Image from "next/image";

interface CategoryImageConfig {
  name: string;
  src: string;
}

const categoryImages: Record<string, CategoryImageConfig> = {
  cars: { name: "سيارات", src: "/images/categories/cars.jpg" },
  "real-estate": { name: "عقارات", src: "/images/categories/real-estate.jpg" },
  real_estate: { name: "عقارات", src: "/images/categories/real-estate.jpg" },
  phones: { name: "موبايلات", src: "/images/categories/phones.jpg" },
  fashion: { name: "موضة", src: "/images/categories/fashion.jpg" },
  scrap: { name: "خردة", src: "/images/categories/scrap.jpg" },
  gold: { name: "ذهب وفضة", src: "/images/categories/gold.jpg" },
  luxury: { name: "فاخرة", src: "/images/categories/luxury.jpg" },
  appliances: { name: "أجهزة", src: "/images/categories/appliances.jpg" },
  furniture: { name: "أثاث", src: "/images/categories/furniture.jpg" },
  hobbies: { name: "هوايات", src: "/images/categories/hobbies.jpg" },
  tools: { name: "عدد", src: "/images/categories/tools.jpg" },
  services: { name: "خدمات", src: "/images/categories/services.jpg" },
  computers: { name: "كمبيوتر", src: "/images/categories/computers.jpg" },
  "kids-babies": { name: "أطفال", src: "/images/categories/kids-babies.jpg" },
  kids_babies: { name: "أطفال", src: "/images/categories/kids-babies.jpg" },
  electronics: { name: "إلكترونيات", src: "/images/categories/electronics.jpg" },
  beauty: { name: "جمال وصحة", src: "/images/categories/beauty.jpg" },
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
  const src = cat?.src || "/images/categories/cars.jpg";
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
