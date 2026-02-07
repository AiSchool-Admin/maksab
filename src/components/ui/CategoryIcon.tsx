"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Real product photos from Unsplash (free, no attribution required).
 * Each URL uses Unsplash's Imgix CDN for optimal cropping & quality.
 * Falls back to local SVG if the external image fails to load.
 */
const categoryImages: Record<string, { name: string; photo: string }> = {
  cars: {
    name: "سيارات",
    photo: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop&auto=format&q=80",
  },
  "real-estate": {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop&auto=format&q=80",
  },
  real_estate: {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop&auto=format&q=80",
  },
  phones: {
    name: "موبايلات",
    photo: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop&auto=format&q=80",
  },
  fashion: {
    name: "موضة",
    photo: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop&auto=format&q=80",
  },
  scrap: {
    name: "خردة",
    photo: "https://images.unsplash.com/photo-1558618047-3c8c76bb987d?w=200&h=200&fit=crop&auto=format&q=80",
  },
  gold: {
    name: "ذهب",
    photo: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop&auto=format&q=80",
  },
  luxury: {
    name: "فاخرة",
    photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop&auto=format&q=80",
  },
  appliances: {
    name: "أجهزة",
    photo: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=200&h=200&fit=crop&auto=format&q=80",
  },
  furniture: {
    name: "أثاث",
    photo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop&auto=format&q=80",
  },
  hobbies: {
    name: "هوايات",
    photo: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=200&h=200&fit=crop&auto=format&q=80",
  },
  tools: {
    name: "عدد",
    photo: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=200&h=200&fit=crop&auto=format&q=80",
  },
  services: {
    name: "خدمات",
    photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop&auto=format&q=80",
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
  sm: { container: "w-10 h-10", px: 40 },
  md: { container: "w-14 h-14", px: 56 },
  lg: { container: "w-20 h-20", px: 80 },
};

export default function CategoryIcon({ slug, size = "md", className = "" }: CategoryIconProps) {
  const cat = categoryImages[slug];
  const s = sizeMap[size];
  const iconSlug = getIconSlug(slug);
  const [useFallback, setUseFallback] = useState(false);

  return (
    <div className={`${s.container} flex items-center justify-center flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 ${className}`}>
      {!useFallback && cat?.photo ? (
        <Image
          src={cat.photo}
          alt={cat?.name || slug}
          width={s.px}
          height={s.px}
          className="object-cover w-full h-full"
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
