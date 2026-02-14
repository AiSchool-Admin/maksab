"use client";

import { useState } from "react";

/**
 * CategoryIcon — World-class circular category icons.
 * Uses high-quality curated photos with gradient ring borders.
 * Falls back to beautiful emoji icons with gradient backgrounds.
 */

interface CategoryPhotoConfig {
  name: string;
  photo: string;
  gradient: string;      // Ring gradient
  bgGradient: string;    // Fallback background gradient
  emoji: string;         // Fallback emoji
}

const categoryPhotos: Record<string, CategoryPhotoConfig> = {
  cars: {
    name: "سيارات",
    photo: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-blue-400 via-sky-500 to-cyan-400",
    bgGradient: "from-blue-50 to-sky-100",
    emoji: "🚗",
  },
  "real-estate": {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-indigo-400 via-violet-500 to-purple-400",
    bgGradient: "from-indigo-50 to-violet-100",
    emoji: "🏠",
  },
  real_estate: {
    name: "عقارات",
    photo: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-indigo-400 via-violet-500 to-purple-400",
    bgGradient: "from-indigo-50 to-violet-100",
    emoji: "🏠",
  },
  phones: {
    name: "موبايلات",
    photo: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-gray-400 via-slate-500 to-zinc-400",
    bgGradient: "from-gray-50 to-slate-100",
    emoji: "📱",
  },
  fashion: {
    name: "موضة",
    photo: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-pink-400 via-rose-500 to-red-400",
    bgGradient: "from-pink-50 to-rose-100",
    emoji: "👗",
  },
  scrap: {
    name: "خردة",
    photo: "https://images.unsplash.com/photo-1558618047-3c8c76bb987d?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-amber-400 via-yellow-500 to-orange-400",
    bgGradient: "from-amber-50 to-yellow-100",
    emoji: "♻️",
  },
  gold: {
    name: "ذهب وفضة",
    photo: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
    bgGradient: "from-yellow-50 to-amber-100",
    emoji: "💰",
  },
  luxury: {
    name: "فاخرة",
    photo: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-purple-400 via-fuchsia-500 to-pink-400",
    bgGradient: "from-purple-50 to-fuchsia-100",
    emoji: "💎",
  },
  appliances: {
    name: "أجهزة",
    photo: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-slate-400 via-gray-500 to-blue-400",
    bgGradient: "from-slate-50 to-gray-100",
    emoji: "🏠",
  },
  furniture: {
    name: "أثاث",
    photo: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-emerald-400 via-green-500 to-teal-400",
    bgGradient: "from-emerald-50 to-green-100",
    emoji: "🪑",
  },
  hobbies: {
    name: "هوايات",
    photo: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-orange-400 via-red-500 to-rose-400",
    bgGradient: "from-orange-50 to-red-100",
    emoji: "🎮",
  },
  tools: {
    name: "عدد",
    photo: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-orange-400 via-amber-500 to-yellow-400",
    bgGradient: "from-orange-50 to-amber-100",
    emoji: "🔧",
  },
  services: {
    name: "خدمات",
    photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&h=300&fit=crop&crop=center&auto=format&q=85",
    gradient: "from-teal-400 via-cyan-500 to-blue-400",
    bgGradient: "from-teal-50 to-cyan-100",
    emoji: "🛠️",
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
  sm: { outer: "w-16 h-16", inner: "w-[56px] h-[56px]", ring: 3, px: 56 },
  md: { outer: "w-[72px] h-[72px]", inner: "w-16 h-16", ring: 3, px: 64 },
  lg: { outer: "w-20 h-20", inner: "w-[72px] h-[72px]", ring: 3, px: 72 },
  xl: { outer: "w-24 h-24", inner: "w-[88px] h-[88px]", ring: 3, px: 88 },
};

export default function CategoryIcon({
  slug,
  size = "md",
  className = "",
}: CategoryIconProps) {
  const s = sizeMap[size];
  const iconSlug = getIconSlug(slug);
  const cat = categoryPhotos[slug] || categoryPhotos[iconSlug];
  const gradient = cat?.gradient || "from-gray-300 to-gray-400";
  const bgGradient = cat?.bgGradient || "from-gray-50 to-gray-100";
  const emoji = cat?.emoji || "📦";
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={`${s.outer} rounded-full p-[3px] bg-gradient-to-br ${gradient} shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ${className}`}
    >
      <div className={`${s.inner} rounded-full overflow-hidden bg-white`}>
        {!imgFailed && cat?.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cat.photo}
            alt={cat.name || slug}
            width={s.px}
            height={s.px}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${bgGradient}`}>
            <span className="text-2xl">{emoji}</span>
          </div>
        )}
      </div>
    </div>
  );
}
