"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Real product photos from Unsplash (free, no attribution required).
 * Each category has a vibrant background color and a real photo.
 * Falls back to local SVG if the external image fails to load.
 */
const categoryImages: Record<
  string,
  { name: string; photo: string; bg: string }
> = {
  cars: {
    name: "سيارات",
    photo: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-blue-100",
  },
  "real-estate": {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-indigo-100",
  },
  real_estate: {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-indigo-100",
  },
  phones: {
    name: "موبايلات",
    photo: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-cyan-100",
  },
  fashion: {
    name: "موضة",
    photo: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-pink-100",
  },
  scrap: {
    name: "خردة",
    photo: "https://images.unsplash.com/photo-1558618047-3c8c76bb987d?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-amber-100",
  },
  gold: {
    name: "ذهب",
    photo: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-yellow-100",
  },
  luxury: {
    name: "فاخرة",
    photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-purple-100",
  },
  appliances: {
    name: "أجهزة",
    photo: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-slate-100",
  },
  furniture: {
    name: "أثاث",
    photo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-emerald-100",
  },
  hobbies: {
    name: "هوايات",
    photo: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-rose-100",
  },
  tools: {
    name: "عدد",
    photo: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-orange-100",
  },
  services: {
    name: "خدمات",
    photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop&auto=format&q=80",
    bg: "bg-teal-100",
  },
};

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
  sm: { container: "w-16 h-16", px: 64 },
  md: { container: "w-20 h-20", px: 80 },
  lg: { container: "w-24 h-24", px: 96 },
};

export default function CategoryIcon({
  slug,
  size = "md",
  className = "",
}: CategoryIconProps) {
  const cat = categoryImages[slug];
  const s = sizeMap[size];
  const iconSlug = getIconSlug(slug);
  const [useFallback, setUseFallback] = useState(false);
  const bgColor = cat?.bg || "bg-gray-100";

  return (
    <div
      className={`${s.container} flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden ${bgColor} p-2 ${className}`}
    >
      {!useFallback && cat?.photo ? (
        <Image
          src={cat.photo}
          alt={cat?.name || slug}
          width={s.px}
          height={s.px}
          className="object-cover w-full h-full rounded-full"
          onError={() => setUseFallback(true)}
          unoptimized
        />
      ) : (
        <Image
          src={`/icons/categories/${iconSlug}.svg`}
          alt={cat?.name || slug}
          width={s.px}
          height={s.px}
          className="object-contain"
          loading="lazy"
        />
      )}
    </div>
  );
}
