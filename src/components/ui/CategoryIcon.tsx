"use client";

import { useState } from "react";

/**
 * CategoryIcon — Real product photos for each category.
 * Uses high-quality Unsplash photos on clean backgrounds.
 * Falls back to local animated SVG if photo fails to load.
 */

const categoryPhotos: Record<
  string,
  { name: string; photo: string; bg: string }
> = {
  cars: {
    name: "سيارات",
    photo: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-sky-50",
  },
  "real-estate": {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-indigo-50",
  },
  real_estate: {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-indigo-50",
  },
  phones: {
    name: "موبايلات",
    photo: "https://images.unsplash.com/photo-1603921326210-6edd2d60ca68?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-gray-50",
  },
  fashion: {
    name: "موضة",
    photo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-rose-50",
  },
  scrap: {
    name: "خردة",
    photo: "https://images.unsplash.com/photo-1558618047-3c8c76bb987d?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-amber-50",
  },
  gold: {
    name: "ذهب",
    photo: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-yellow-50",
  },
  luxury: {
    name: "فاخرة",
    photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-purple-50",
  },
  appliances: {
    name: "أجهزة",
    photo: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-slate-50",
  },
  furniture: {
    name: "أثاث",
    photo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-emerald-50",
  },
  hobbies: {
    name: "هوايات",
    photo: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-orange-50",
  },
  tools: {
    name: "عدد",
    photo: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-orange-50",
  },
  services: {
    name: "خدمات",
    photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop&crop=center&auto=format&q=90",
    bg: "bg-teal-50",
  },
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
  const cat = categoryPhotos[slug];
  const name = cat?.name || slug;
  const bgColor = cat?.bg || "bg-gray-100";
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={`${s.container} flex-shrink-0 rounded-2xl overflow-hidden ${bgColor} transition-transform duration-200 hover:scale-105 shadow-sm ${className}`}
    >
      {!imgFailed && cat?.photo ? (
        /* Real product photo */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={cat.photo}
          alt={name}
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        /* Fallback: animated SVG */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/icons/categories/${iconSlug}.svg`}
          alt={name}
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
}
