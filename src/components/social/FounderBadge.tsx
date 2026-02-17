"use client";

/**
 * Founder Badge — "مؤسس مكسب" badge for early supporters.
 *
 * Shows the founder number and a special golden badge.
 * Sizes: sm (inline), md (profile section), lg (profile header)
 */

interface FounderBadgeProps {
  founderNumber: number;
  size?: "sm" | "md" | "lg";
}

export default function FounderBadge({
  founderNumber,
  size = "sm",
}: FounderBadgeProps) {
  if (size === "sm") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
        title={`مؤسس مكسب #${founderNumber}`}
      >
        <span>🏛️</span>
        <span>مؤسس #{founderNumber}</span>
      </span>
    );
  }

  if (size === "md") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
        <span className="text-sm">🏛️</span>
        <span>مؤسس مكسب #{founderNumber}</span>
      </span>
    );
  }

  // lg: full card style
  return (
    <div className="bg-gradient-to-l from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 border-2 border-amber-300 flex items-center justify-center text-2xl shadow-sm">
          🏛️
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-800">مؤسس مكسب</p>
          <p className="text-xs text-amber-600">
            المؤسس رقم #{founderNumber} من أوائل 500 مؤسس
          </p>
        </div>
        <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5">
          <p className="text-lg font-bold text-amber-800 tabular-nums">
            #{founderNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
