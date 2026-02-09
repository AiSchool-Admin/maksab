"use client";

interface SortOptionsProps {
  value: string;
  onChange: (sort: string) => void;
}

const sortOptions = [
  { value: "relevance", label: "الأنسب" },
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "الأقل سعراً" },
  { value: "price_desc", label: "الأعلى سعراً" },
  { value: "nearest", label: "📍 الأقرب" },
];

export default function SortOptions({ value, onChange }: SortOptionsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-text flex-shrink-0">ترتيب:</span>
      <div className="flex gap-1.5">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-brand-green text-white"
                : "bg-gray-light text-gray-text hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
