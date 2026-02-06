"use client";

import { getCategoryById } from "@/lib/categories/categories-config";

interface CategoryFiltersProps {
  categoryId: string;
  activeFilters: Record<string, string>;
  onChange: (fieldId: string, value: string | undefined) => void;
}

/**
 * Dynamic category-specific filter chips.
 * Shows the filterable select fields for the selected category.
 */
export default function CategoryFilters({
  categoryId,
  activeFilters,
  onChange,
}: CategoryFiltersProps) {
  const config = getCategoryById(categoryId);
  if (!config) return null;

  // Only show select fields with options (not text, number, toggle, etc.)
  const filterableFields = config.fields.filter(
    (f) => f.type === "select" && f.options && f.options.length > 0,
  );

  if (filterableFields.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-gray-text">
        فلاتر {config.name}
      </h4>
      <div className="flex flex-wrap gap-2">
        {filterableFields.map((field) => {
          const activeValue = activeFilters[field.id];
          const activeOption = activeValue
            ? field.options?.find((o) => o.value === activeValue)
            : null;

          return (
            <div key={field.id} className="relative group">
              <select
                value={activeValue || ""}
                onChange={(e) =>
                  onChange(field.id, e.target.value || undefined)
                }
                className={`appearance-none px-3 py-2 rounded-lg text-xs font-medium pe-7 cursor-pointer transition-colors ${
                  activeValue
                    ? "bg-brand-green text-white"
                    : "bg-gray-light text-gray-text hover:bg-gray-200"
                }`}
              >
                <option value="">{field.label}</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute inset-y-0 end-2 flex items-center pointer-events-none">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  className={activeValue ? "text-white" : "text-gray-text"}
                >
                  <path
                    d="M2 3.5L5 6.5L8 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {/* Active label badge */}
              {activeOption && (
                <button
                  type="button"
                  onClick={() => onChange(field.id, undefined)}
                  className="absolute -top-1.5 -end-1.5 w-4 h-4 bg-error text-white rounded-full flex items-center justify-center text-[8px] leading-none"
                  aria-label="إزالة"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
