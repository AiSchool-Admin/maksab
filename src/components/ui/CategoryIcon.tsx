"use client";

import {
  Car,
  Home,
  Smartphone,
  Shirt,
  Recycle,
  Gem,
  Crown,
  Refrigerator,
  Armchair,
  Gamepad2,
  Wrench,
  Briefcase,
} from "lucide-react";

const iconMap: Record<string, {
  Icon: typeof Car;
  bg: string;
  color: string;
}> = {
  cars: { Icon: Car, bg: "bg-blue-100", color: "text-blue-600" },
  "real-estate": { Icon: Home, bg: "bg-emerald-100", color: "text-emerald-600" },
  real_estate: { Icon: Home, bg: "bg-emerald-100", color: "text-emerald-600" },
  phones: { Icon: Smartphone, bg: "bg-violet-100", color: "text-violet-600" },
  fashion: { Icon: Shirt, bg: "bg-pink-100", color: "text-pink-600" },
  scrap: { Icon: Recycle, bg: "bg-lime-100", color: "text-lime-600" },
  gold: { Icon: Gem, bg: "bg-amber-100", color: "text-amber-600" },
  luxury: { Icon: Crown, bg: "bg-purple-100", color: "text-purple-600" },
  appliances: { Icon: Refrigerator, bg: "bg-cyan-100", color: "text-cyan-600" },
  furniture: { Icon: Armchair, bg: "bg-orange-100", color: "text-orange-600" },
  hobbies: { Icon: Gamepad2, bg: "bg-rose-100", color: "text-rose-600" },
  tools: { Icon: Wrench, bg: "bg-slate-200", color: "text-slate-600" },
  services: { Icon: Briefcase, bg: "bg-teal-100", color: "text-teal-600" },
};

interface CategoryIconProps {
  slug: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-8 h-8 rounded-lg", icon: 16 },
  md: { container: "w-12 h-12 rounded-xl", icon: 24 },
  lg: { container: "w-16 h-16 rounded-2xl", icon: 32 },
};

export default function CategoryIcon({ slug, size = "md", className = "" }: CategoryIconProps) {
  const config = iconMap[slug];
  if (!config) return <div className={`${sizeMap[size].container} bg-gray-100`} />;

  const { Icon, bg, color } = config;
  const s = sizeMap[size];

  return (
    <div className={`${s.container} ${bg} flex items-center justify-center ${className}`}>
      <Icon size={s.icon} className={color} strokeWidth={1.8} />
    </div>
  );
}

export { iconMap };
