"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, X, MapPin, ExternalLink, Home } from "lucide-react";
import Link from "next/link";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import { useComparisonStore } from "@/stores/comparison-store";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { formatPrice } from "@/lib/utils/format";

export default function ComparePage() {
  const router = useRouter();
  const { ads, removeAd, clearAll } = useComparisonStore();

  // If less than 2 ads, redirect back
  if (ads.length < 2) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => router.back()} className="p-1 text-gray-text">
              <ChevronRight size={24} />
            </button>
            <h1 className="text-lg font-bold text-dark">مقارنة الإعلانات</h1>
            <Link
              href="/"
              className="p-1.5 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors"
              aria-label="الرئيسية"
            >
              <Home size={18} />
            </Link>
          </div>
        </header>
        <div className="px-4 py-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-lg font-bold text-dark mb-2">مفيش إعلانات للمقارنة</p>
          <p className="text-sm text-gray-text mb-4">
            اختار إعلانين على الأقل من نفس القسم عشان تقارن بينهم
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-sm font-semibold text-brand-green"
          >
            تصفح الإعلانات
          </button>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  // Get category config for the compared ads
  const categoryId = ads[0].categoryId;
  const categoryConfig = categoriesConfig.find((c) => c.id === categoryId);
  const fields = categoryConfig?.fields || [];

  // Collect all field keys present in any of the compared ads
  const allFieldKeys = new Set<string>();
  for (const ad of ads) {
    if (ad.categoryFields) {
      for (const key of Object.keys(ad.categoryFields)) {
        allFieldKeys.add(key);
      }
    }
  }

  // Get field label from config
  const getFieldLabel = (fieldId: string): string => {
    const field = fields.find((f) => f.id === fieldId);
    return field?.label || fieldId;
  };

  // Get field display value
  const getFieldValue = (ad: typeof ads[0], fieldId: string): string => {
    const rawValue = ad.categoryFields?.[fieldId];
    if (rawValue === undefined || rawValue === null) return "—";

    const field = fields.find((f) => f.id === fieldId);

    // Boolean toggle
    if (field?.type === "toggle") {
      return rawValue ? "نعم" : "لا";
    }

    // Select - find label
    if (field?.type === "select" && field.options) {
      const option = field.options.find((o) => o.value === String(rawValue));
      if (option) return option.label;
    }

    // Number with unit
    if (field?.type === "number" && field.unit) {
      return `${Number(rawValue).toLocaleString("en-US")} ${field.unit}`;
    }

    return String(rawValue);
  };

  // Compare values — highlight differences
  const areValuesSame = (fieldId: string): boolean => {
    const values = ads.map((ad) => ad.categoryFields?.[fieldId]);
    return values.every((v) => v === values[0]);
  };

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-light">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-1 text-gray-text hover:text-dark"
          >
            <ChevronRight size={24} />
          </button>
          <h1 className="text-lg font-bold text-dark flex-1">
            مقارنة {categoryConfig?.name || "إعلانات"}
          </h1>
          <Link
            href="/"
            className="p-1.5 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors"
            aria-label="الرئيسية"
          >
            <Home size={18} />
          </Link>
          <button
            onClick={() => {
              clearAll();
              router.back();
            }}
            className="text-xs text-error font-semibold"
          >
            مسح الكل
          </button>
        </div>
      </header>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          {/* Ad images and titles */}
          <thead>
            <tr>
              <th className="sticky start-0 bg-white z-10 p-2 w-28 min-w-[112px]" />
              {ads.map((ad) => (
                <th key={ad.id} className="p-2 min-w-[160px]">
                  <div className="relative">
                    <button
                      onClick={() => removeAd(ad.id)}
                      className="absolute -top-1 -start-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center z-10"
                    >
                      <X size={12} />
                    </button>
                    {ad.image ? (
                      <img
                        src={ad.image}
                        alt={ad.title}
                        className="w-full aspect-[4/3] object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-gray-light rounded-xl flex items-center justify-center text-3xl">
                        📷
                      </div>
                    )}
                    <Link
                      href={`/ad/${ad.id}`}
                      className="block mt-2 text-sm font-bold text-dark text-center line-clamp-2 hover:text-brand-green transition-colors"
                    >
                      {ad.title}
                      <ExternalLink size={10} className="inline ms-1" />
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Price row */}
            <CompareRow label="السعر" highlight>
              {ads.map((ad) => (
                <td key={ad.id} className="p-3 text-center">
                  <p className="text-lg font-bold text-brand-green">
                    {ad.price ? formatPrice(ad.price) : "—"}
                  </p>
                  <p className="text-[11px] text-gray-text">
                    {ad.saleType === "cash"
                      ? "💵 نقدي"
                      : ad.saleType === "auction"
                        ? "🔨 مزاد"
                        : "🔄 تبديل"}
                  </p>
                </td>
              ))}
            </CompareRow>

            {/* Location row */}
            <CompareRow label="الموقع">
              {ads.map((ad) => (
                <td key={ad.id} className="p-3 text-center">
                  <span className="flex items-center justify-center gap-1 text-sm text-dark">
                    <MapPin size={12} className="text-brand-green" />
                    {ad.governorate || "—"}
                    {ad.city ? ` — ${ad.city}` : ""}
                  </span>
                </td>
              ))}
            </CompareRow>

            {/* Category-specific fields */}
            {Array.from(allFieldKeys).map((fieldId) => {
              const same = areValuesSame(fieldId);
              return (
                <CompareRow
                  key={fieldId}
                  label={getFieldLabel(fieldId)}
                  highlight={!same}
                >
                  {ads.map((ad) => {
                    const value = getFieldValue(ad, fieldId);
                    return (
                      <td
                        key={ad.id}
                        className={`p-3 text-center text-sm ${
                          !same ? "font-bold text-dark" : "text-gray-text"
                        }`}
                      >
                        {value}
                      </td>
                    );
                  })}
                </CompareRow>
              );
            })}
          </tbody>
        </table>
      </div>

      <BottomNavWithBadge />
    </main>
  );
}

function CompareRow({
  label,
  highlight = false,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr className={highlight ? "bg-brand-gold-light/30" : "even:bg-gray-light/50"}>
      <td className="sticky start-0 bg-white z-10 p-3 text-sm font-semibold text-dark border-e border-gray-light whitespace-nowrap">
        {label}
      </td>
      {children}
    </tr>
  );
}
