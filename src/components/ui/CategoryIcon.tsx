"use client";

/**
 * CategoryIcon — Beautiful gradient circle with emoji.
 * No external images — fast, reliable, always works offline.
 */

interface CategoryGradientConfig {
  name: string;
  emoji: string;
  gradient: string;       // Ring gradient
  bgGradient: string;     // Inner background
  emojiSize: string;      // Emoji size class
}

const categoryStyles: Record<string, CategoryGradientConfig> = {
  cars: {
    name: "سيارات",
    emoji: "🚗",
    gradient: "from-blue-400 via-sky-500 to-cyan-400",
    bgGradient: "from-blue-50 to-sky-100",
    emojiSize: "text-2xl",
  },
  "real-estate": {
    name: "عقارات",
    emoji: "🏠",
    gradient: "from-indigo-400 via-violet-500 to-purple-400",
    bgGradient: "from-indigo-50 to-violet-100",
    emojiSize: "text-2xl",
  },
  real_estate: {
    name: "عقارات",
    emoji: "🏠",
    gradient: "from-indigo-400 via-violet-500 to-purple-400",
    bgGradient: "from-indigo-50 to-violet-100",
    emojiSize: "text-2xl",
  },
  phones: {
    name: "موبايلات",
    emoji: "📱",
    gradient: "from-gray-400 via-slate-500 to-zinc-500",
    bgGradient: "from-gray-50 to-slate-100",
    emojiSize: "text-2xl",
  },
  fashion: {
    name: "موضة",
    emoji: "👗",
    gradient: "from-pink-400 via-rose-500 to-red-400",
    bgGradient: "from-pink-50 to-rose-100",
    emojiSize: "text-2xl",
  },
  scrap: {
    name: "خردة",
    emoji: "♻️",
    gradient: "from-amber-400 via-yellow-500 to-orange-400",
    bgGradient: "from-amber-50 to-yellow-100",
    emojiSize: "text-2xl",
  },
  gold: {
    name: "ذهب وفضة",
    emoji: "💰",
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
    bgGradient: "from-yellow-50 to-amber-100",
    emojiSize: "text-2xl",
  },
  luxury: {
    name: "فاخرة",
    emoji: "💎",
    gradient: "from-purple-400 via-fuchsia-500 to-pink-400",
    bgGradient: "from-purple-50 to-fuchsia-100",
    emojiSize: "text-2xl",
  },
  appliances: {
    name: "أجهزة",
    emoji: "🔌",
    gradient: "from-slate-400 via-gray-500 to-blue-400",
    bgGradient: "from-slate-50 to-gray-100",
    emojiSize: "text-2xl",
  },
  furniture: {
    name: "أثاث",
    emoji: "🪑",
    gradient: "from-emerald-400 via-green-500 to-teal-400",
    bgGradient: "from-emerald-50 to-green-100",
    emojiSize: "text-2xl",
  },
  hobbies: {
    name: "هوايات",
    emoji: "🎮",
    gradient: "from-orange-400 via-red-500 to-rose-400",
    bgGradient: "from-orange-50 to-red-100",
    emojiSize: "text-2xl",
  },
  tools: {
    name: "عدد",
    emoji: "🔧",
    gradient: "from-orange-400 via-amber-500 to-yellow-400",
    bgGradient: "from-orange-50 to-amber-100",
    emojiSize: "text-2xl",
  },
  services: {
    name: "خدمات",
    emoji: "🛠️",
    gradient: "from-teal-400 via-cyan-500 to-blue-400",
    bgGradient: "from-teal-50 to-cyan-100",
    emojiSize: "text-2xl",
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
  sm: { outer: "w-14 h-14", inner: "w-12 h-12", emoji: "text-xl" },
  md: { outer: "w-[68px] h-[68px]", inner: "w-[60px] h-[60px]", emoji: "text-2xl" },
  lg: { outer: "w-20 h-20", inner: "w-[72px] h-[72px]", emoji: "text-3xl" },
  xl: { outer: "w-24 h-24", inner: "w-[88px] h-[88px]", emoji: "text-4xl" },
};

export default function CategoryIcon({
  slug,
  size = "md",
  className = "",
}: CategoryIconProps) {
  const s = sizeMap[size];
  const iconSlug = getIconSlug(slug);
  const cat = categoryStyles[slug] || categoryStyles[iconSlug];
  const gradient = cat?.gradient || "from-gray-300 to-gray-400";
  const bgGradient = cat?.bgGradient || "from-gray-50 to-gray-100";
  const emoji = cat?.emoji || "📦";

  return (
    <div
      className={`${s.outer} rounded-full p-[3px] bg-gradient-to-br ${gradient} shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 ${className}`}
    >
      <div
        className={`${s.inner} rounded-full flex items-center justify-center bg-gradient-to-br ${bgGradient}`}
      >
        <span className={s.emoji} role="img" aria-label={cat?.name || slug}>
          {emoji}
        </span>
      </div>
    </div>
  );
}
