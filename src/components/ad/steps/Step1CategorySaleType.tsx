"use client";

import { categoriesConfig } from "@/lib/categories/categories-config";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { SaleType } from "@/types";

interface Step1Props {
  categoryId: string;
  subcategoryId: string;
  saleType: string;
  onCategoryChange: (id: string) => void;
  onSubcategoryChange: (id: string) => void;
  onSaleTypeChange: (type: SaleType) => void;
}

const saleTypes: { value: SaleType; label: string; icon: string; badge?: string }[] = [
  { value: "cash", label: "بيع نقدي", icon: "💵" },
  { value: "auction", label: "مزاد", icon: "🔨" },
  { value: "live_auction", label: "مزاد مباشر (بث حي)", icon: "📡", badge: "رسوم إضافية" },
  { value: "exchange", label: "تبديل", icon: "🔄" },
];

export default function Step1CategorySaleType({
  categoryId,
  subcategoryId,
  saleType,
  onCategoryChange,
  onSubcategoryChange,
  onSaleTypeChange,
}: Step1Props) {
  const selectedCategory = categoriesConfig.find((c) => c.id === categoryId);

  return (
    <div className="space-y-6">
      {/* Category grid */}
      <div>
        <h3 className="text-sm font-bold text-dark mb-3">اختار القسم</h3>
        <div className="grid grid-cols-3 gap-3">
          {categoriesConfig.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                categoryId === cat.id
                  ? "border-brand-green bg-brand-green-light"
                  : "border-transparent bg-gray-light hover:bg-gray-200"
              }`}
            >
              <CategoryIcon slug={cat.slug} size="sm" />
              <span className="text-xs font-semibold text-dark leading-tight text-center">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Subcategory */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-dark mb-3">
            القسم الفرعي
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSubcategoryChange(sub.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  subcategoryId === sub.id
                    ? "bg-brand-green text-white"
                    : "bg-gray-light text-dark hover:bg-gray-200"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sale type */}
      {categoryId && (
        <div>
          <h3 className="text-sm font-bold text-dark mb-3">نوع البيع</h3>
          <div className="space-y-2">
            {saleTypes.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => onSaleTypeChange(st.value)}
                className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all ${
                  saleType === st.value
                    ? "border-brand-green bg-brand-green-light"
                    : "border-transparent bg-gray-light hover:bg-gray-200"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    saleType === st.value
                      ? "border-brand-green"
                      : "border-gray-300"
                  }`}
                >
                  {saleType === st.value && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                  )}
                </span>
                <span className="text-lg">{st.icon}</span>
                <span className="font-semibold text-dark">{st.label}</span>
                {st.badge && (
                  <span className="ms-auto text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    {st.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
