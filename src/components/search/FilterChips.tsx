"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { governorates, citiesByGovernorate } from "@/lib/data/governorates";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface ActiveFilters {
  category?: string;
  subcategory?: string;
  saleType?: "cash" | "auction" | "exchange";
  priceMin?: number;
  priceMax?: number;
  governorate?: string;
  city?: string;
  condition?: string;
}

interface FilterChipsProps {
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
}

/* ── Filter chip dropdown component ─────────────────────────────────── */

interface ChipDropdownProps {
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}

function ChipDropdown({ label, isActive, children }: ChipDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
          isActive
            ? "bg-brand-green text-white"
            : "bg-gray-light text-gray-text hover:bg-gray-200"
        }`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute top-full mt-1 start-0 bg-white rounded-xl shadow-lg border border-gray-light z-50 min-w-[200px] max-h-60 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Option button ──────────────────────────────────────────────────── */

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
        selected
          ? "bg-brand-green-light text-brand-green-dark font-medium"
          : "text-dark hover:bg-gray-light"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Price range presets ────────────────────────────────────────────── */

const priceRanges = [
  { label: "أقل من 10,000 جنيه", min: 0, max: 10000 },
  { label: "10,000 — 50,000 جنيه", min: 10000, max: 50000 },
  { label: "50,000 — 100,000 جنيه", min: 50000, max: 100000 },
  { label: "100,000 — 500,000 جنيه", min: 100000, max: 500000 },
  { label: "500,000 — 1,000,000 جنيه", min: 500000, max: 1000000 },
  { label: "أكثر من 1,000,000 جنيه", min: 1000000, max: undefined },
];

/* ── Main component ─────────────────────────────────────────────────── */

export default function FilterChips({ filters, onChange }: FilterChipsProps) {
  const activeCount = [
    filters.category,
    filters.saleType,
    filters.priceMin != null || filters.priceMax != null,
    filters.governorate,
    filters.city,
    filters.condition,
  ].filter(Boolean).length;

  const selectedCat = filters.category
    ? categoriesConfig.find((c) => c.slug === filters.category || c.id === filters.category)
    : null;

  // Get cities for selected governorate
  const availableCities = filters.governorate
    ? citiesByGovernorate[filters.governorate] || []
    : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {/* Clear all filters */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-error/10 text-error whitespace-nowrap flex-shrink-0"
          >
            <X size={12} />
            مسح الكل
          </button>
        )}

        {/* Category filter */}
        <ChipDropdown
          label={selectedCat ? `${selectedCat.icon} ${selectedCat.name}` : "القسم"}
          isActive={!!filters.category}
        >
          <OptionButton
            label="الكل"
            selected={!filters.category}
            onClick={() => onChange({ ...filters, category: undefined, subcategory: undefined, condition: undefined })}
          />
          {categoriesConfig.map((cat) => (
            <OptionButton
              key={cat.id}
              label={`${cat.icon} ${cat.name}`}
              selected={filters.category === cat.id || filters.category === cat.slug}
              onClick={() => onChange({ ...filters, category: cat.id, subcategory: undefined })}
            />
          ))}
        </ChipDropdown>

        {/* Sale type filter */}
        <ChipDropdown
          label={
            filters.saleType === "cash"
              ? "💰 للبيع"
              : filters.saleType === "auction"
                ? "🔥 مزاد"
                : filters.saleType === "exchange"
                  ? "🔄 للتبديل"
                  : "نوع البيع"
          }
          isActive={!!filters.saleType}
        >
          <OptionButton
            label="الكل"
            selected={!filters.saleType}
            onClick={() => onChange({ ...filters, saleType: undefined })}
          />
          <OptionButton
            label="💰 للبيع"
            selected={filters.saleType === "cash"}
            onClick={() => onChange({ ...filters, saleType: "cash" })}
          />
          <OptionButton
            label="🔥 مزاد"
            selected={filters.saleType === "auction"}
            onClick={() => onChange({ ...filters, saleType: "auction" })}
          />
          <OptionButton
            label="🔄 للتبديل"
            selected={filters.saleType === "exchange"}
            onClick={() => onChange({ ...filters, saleType: "exchange" })}
          />
        </ChipDropdown>

        {/* Price range filter */}
        <ChipDropdown
          label={
            filters.priceMin != null || filters.priceMax != null
              ? "💰 السعر ✓"
              : "السعر"
          }
          isActive={filters.priceMin != null || filters.priceMax != null}
        >
          <OptionButton
            label="الكل"
            selected={filters.priceMin == null && filters.priceMax == null}
            onClick={() =>
              onChange({ ...filters, priceMin: undefined, priceMax: undefined })
            }
          />
          {priceRanges.map((range) => (
            <OptionButton
              key={range.label}
              label={range.label}
              selected={
                filters.priceMin === range.min &&
                (range.max ? filters.priceMax === range.max : !filters.priceMax)
              }
              onClick={() =>
                onChange({
                  ...filters,
                  priceMin: range.min || undefined,
                  priceMax: range.max,
                })
              }
            />
          ))}
        </ChipDropdown>

        {/* Governorate filter */}
        <ChipDropdown
          label={filters.governorate || "المحافظة"}
          isActive={!!filters.governorate}
        >
          <OptionButton
            label="كل المحافظات"
            selected={!filters.governorate}
            onClick={() => onChange({ ...filters, governorate: undefined, city: undefined })}
          />
          {governorates.map((gov) => (
            <OptionButton
              key={gov}
              label={gov}
              selected={filters.governorate === gov}
              onClick={() => onChange({ ...filters, governorate: gov, city: undefined })}
            />
          ))}
        </ChipDropdown>

        {/* City filter — only visible when governorate is selected */}
        {filters.governorate && availableCities.length > 0 && (
          <ChipDropdown
            label={filters.city || "المدينة"}
            isActive={!!filters.city}
          >
            <OptionButton
              label={`كل ${filters.governorate}`}
              selected={!filters.city}
              onClick={() => onChange({ ...filters, city: undefined })}
            />
            {availableCities.map((city) => (
              <OptionButton
                key={city}
                label={city}
                selected={filters.city === city}
                onClick={() => onChange({ ...filters, city })}
              />
            ))}
          </ChipDropdown>
        )}

        {/* Condition filter */}
        <ChipDropdown
          label={
            filters.condition === "new"
              ? "جديد"
              : filters.condition === "used"
                ? "مستعمل"
                : "الحالة"
          }
          isActive={!!filters.condition}
        >
          <OptionButton
            label="الكل"
            selected={!filters.condition}
            onClick={() => onChange({ ...filters, condition: undefined })}
          />
          <OptionButton
            label="جديد"
            selected={filters.condition === "new"}
            onClick={() => onChange({ ...filters, condition: "new" })}
          />
          <OptionButton
            label="مستعمل"
            selected={filters.condition === "used"}
            onClick={() => onChange({ ...filters, condition: "used" })}
          />
        </ChipDropdown>
      </div>
    </div>
  );
}
