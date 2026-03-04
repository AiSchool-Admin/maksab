"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { categoriesConfig, getCategoryById } from "@/lib/categories/categories-config";
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
  /** Category-specific JSONB field filters (brand, rooms, etc.) */
  categoryFilters?: Record<string, string>;
  onCategoryFilterChange?: (fieldId: string, value: string | undefined) => void;
}

/* ── Filter chip dropdown component (uses Portal to escape overflow) ── */

interface ChipDropdownProps {
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}

function ChipDropdown({ label, isActive, children }: ChipDropdownProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate dropdown position from button
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleScroll() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside as EventListener);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside as EventListener);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, updatePosition]);

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
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
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed bg-white rounded-xl shadow-lg border border-gray-light z-[9999] min-w-[200px] max-h-60 overflow-y-auto"
            style={{
              top: position.top,
              right: position.right,
            }}
          >
            {children}
          </div>,
          document.body,
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

export default function FilterChips({
  filters,
  onChange,
  categoryFilters = {},
  onCategoryFilterChange,
}: FilterChipsProps) {
  const activeCategoryFilterCount = Object.keys(categoryFilters).length;
  const activeCount = [
    filters.category,
    filters.saleType,
    filters.priceMin != null || filters.priceMax != null,
    filters.governorate,
    filters.city,
    filters.condition,
  ].filter(Boolean).length + activeCategoryFilterCount;

  const selectedCat = filters.category
    ? categoriesConfig.find((c) => c.slug === filters.category || c.id === filters.category)
    : null;

  // Get cities for selected governorate
  const availableCities = filters.governorate
    ? citiesByGovernorate[filters.governorate] || []
    : [];

  // Get category-specific filterable fields
  const catConfig = filters.category ? getCategoryById(filters.category) : null;
  const filterableFields = catConfig
    ? catConfig.fields.filter(
        (f) => f.type === "select" && f.options && f.options.length > 0,
      )
    : [];

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
      {/* Clear all filters */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => {
            onChange({});
            // Clear category-specific filters too
            if (onCategoryFilterChange) {
              Object.keys(categoryFilters).forEach((key) =>
                onCategoryFilterChange(key, undefined),
              );
            }
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-error/10 text-error whitespace-nowrap flex-shrink-0"
        >
          <X size={12} />
          مسح ({activeCount})
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

      {/* Subcategory filter — only when category is selected and has subcategories */}
      {selectedCat && selectedCat.subcategories.length > 0 && (
        <ChipDropdown
          label={
            filters.subcategory
              ? selectedCat.subcategories.find((s) => s.id === filters.subcategory)?.name || "القسم الفرعي"
              : "القسم الفرعي"
          }
          isActive={!!filters.subcategory}
        >
          <OptionButton
            label={`كل ${selectedCat.name}`}
            selected={!filters.subcategory}
            onClick={() => onChange({ ...filters, subcategory: undefined })}
          />
          {selectedCat.subcategories.map((sub) => (
            <OptionButton
              key={sub.id}
              label={sub.name}
              selected={filters.subcategory === sub.id}
              onClick={() => onChange({ ...filters, subcategory: sub.id })}
            />
          ))}
        </ChipDropdown>
      )}

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
            ? "السعر ✓"
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

      {/* ── Category-specific filters (inline, same row) ── */}
      {onCategoryFilterChange && filterableFields.map((field) => {
        const activeValue = categoryFilters[field.id];
        const activeOption = activeValue
          ? field.options?.find((o) => o.value === activeValue)
          : null;

        return (
          <ChipDropdown
            key={field.id}
            label={activeOption ? activeOption.label : field.label}
            isActive={!!activeValue}
          >
            <OptionButton
              label={`كل ${field.label}`}
              selected={!activeValue}
              onClick={() => onCategoryFilterChange(field.id, undefined)}
            />
            {field.options?.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={activeValue === opt.value}
                onClick={() => onCategoryFilterChange(field.id, opt.value)}
              />
            ))}
          </ChipDropdown>
        );
      })}
    </div>
  );
}
