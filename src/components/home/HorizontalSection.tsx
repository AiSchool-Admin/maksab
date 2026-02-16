"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AdCard from "@/components/ad/AdCard";
import type { AdSummary } from "@/lib/ad-data";

interface HorizontalSectionProps {
  title: string;
  subtitle?: string;
  icon?: string;
  ads: AdSummary[];
  href?: string;
  onToggleFavorite?: (id: string) => void;
}

export default function HorizontalSection({
  title,
  subtitle,
  icon,
  ads,
  href,
  onToggleFavorite,
}: HorizontalSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (ads.length === 0) return null;

  return (
    <section className="pb-2">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div>
          <h2 className="text-sm font-bold text-dark flex items-center gap-1.5">
            {icon && <span>{icon}</span>}
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-gray-text mt-0.5">{subtitle}</p>
          )}
        </div>
        {href ? (
          <Link href={href} className="flex items-center gap-0.5 text-xs text-brand-green font-semibold btn-icon-sm">
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        ) : (
          <button className="flex items-center gap-0.5 text-xs text-brand-green font-semibold btn-icon-sm">
            عرض الكل
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Horizontal scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {ads.map((ad) => (
          <div key={ad.id} className="flex-shrink-0 w-[160px] snap-start">
            <AdCard {...ad} onToggleFavorite={onToggleFavorite} />
          </div>
        ))}

        {/* "See more" hint card */}
        <div className="flex-shrink-0 w-[100px] flex items-center justify-center snap-start">
          <div className="flex flex-col items-center gap-2 text-brand-green">
            <div className="w-10 h-10 rounded-full bg-brand-green-light flex items-center justify-center">
              <ChevronLeft size={20} />
            </div>
            <span className="text-xs font-semibold">عرض الكل</span>
          </div>
        </div>
      </div>
    </section>
  );
}
