"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "../layout";
import { getCategoryById } from "@/lib/categories/categories-config";
import type {
  CategoryBreakdown,
  GovernorateBreakdown,
  SaleTypeBreakdown,
} from "@/lib/admin/admin-service";

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

function formatPrice(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M جنيه";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K جنيه";
  return n.toLocaleString("en-US") + " جنيه";
}

const saleTypeNames: Record<string, { label: string; icon: string; color: string }> = {
  cash: { label: "للبيع", icon: "💰", color: "bg-green-500" },
  auction: { label: "مزاد", icon: "🔥", color: "bg-purple-500" },
  exchange: { label: "للتبديل", icon: "🔄", color: "bg-blue-500" },
};

function BarRow({ label, value, maxValue, color, subtitle }: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  subtitle?: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 lg:w-32 flex-shrink-0 text-xs font-medium text-dark truncate">{label}</div>
      <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
        <div
          className={`h-full rounded-lg ${color} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-dark/80">
          {formatNum(value)}
          {subtitle ? ` — ${subtitle}` : ""}
        </span>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const admin = useAdmin();
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [governorates, setGovernorates] = useState<GovernorateBreakdown[]>([]);
  const [saleTypes, setSaleTypes] = useState<SaleTypeBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;

    async function load() {
      setIsLoading(true);
      const headers = { "x-admin-id": admin!.id };

      const [catRes, govRes, stRes] = await Promise.all([
        fetch("/api/admin/stats?type=categories", { headers }),
        fetch("/api/admin/stats?type=governorates", { headers }),
        fetch("/api/admin/stats?type=sale_types", { headers }),
      ]);

      if (catRes.ok) setCategories(await catRes.json());
      if (govRes.ok) setGovernorates(await govRes.json());
      if (stRes.ok) setSaleTypes(await stRes.json());
      setIsLoading(false);
    }

    load();
  }, [admin]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 h-48 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  const maxCat = Math.max(...categories.map((c) => c.count), 1);
  const maxGov = Math.max(...governorates.map((g) => g.count), 1);
  const totalAds = categories.reduce((s, c) => s + c.count, 0);
  const totalSoldValue = categories.reduce((s, c) => s + c.totalValue, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-dark">التحليلات</h2>
        <p className="text-xs text-gray-text">تحليل الإعلانات حسب الفئة والموقع ونوع البيع</p>
      </div>

      {/* Sale Types */}
      <div className="bg-white rounded-xl p-4 lg:p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-dark mb-4">حسب نوع البيع</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {saleTypes.map((st) => {
            const meta = saleTypeNames[st.saleType] || { label: st.saleType, icon: "📦", color: "bg-gray-500" };
            const pct = totalAds > 0 ? ((st.count / totalAds) * 100).toFixed(0) : "0";
            return (
              <div key={st.saleType} className="bg-gray-50 rounded-xl p-4 text-center">
                <span className="text-3xl">{meta.icon}</span>
                <p className="text-sm font-bold text-dark mt-2">{meta.label}</p>
                <p className="text-2xl font-bold text-dark mt-1">{formatNum(st.count)}</p>
                <p className="text-[10px] text-gray-text">{pct}% من الإجمالي</p>
                {st.totalValue > 0 && (
                  <p className="text-[10px] text-brand-green font-medium mt-1">{formatPrice(st.totalValue)} مبيعات</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl p-4 lg:p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-dark mb-4">حسب الفئة</h3>
        <div className="space-y-2">
          {categories.map((cat) => {
            const config = getCategoryById(cat.categoryId);
            const label = config ? `${config.icon} ${config.name}` : cat.categoryId;
            const subtitle = cat.soldCount > 0 ? `${cat.soldCount} مباع — ${formatPrice(cat.totalValue)}` : undefined;
            return (
              <BarRow
                key={cat.categoryId}
                label={label}
                value={cat.count}
                maxValue={maxCat}
                color="bg-brand-green/70"
                subtitle={subtitle}
              />
            );
          })}
          {categories.length === 0 && (
            <p className="text-sm text-gray-text text-center py-4">لا يوجد بيانات</p>
          )}
        </div>
      </div>

      {/* Governorates */}
      <div className="bg-white rounded-xl p-4 lg:p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-dark mb-4">حسب المحافظة</h3>
        <div className="space-y-2">
          {governorates.slice(0, 15).map((gov) => (
            <BarRow
              key={gov.governorate}
              label={gov.governorate}
              value={gov.count}
              maxValue={maxGov}
              color="bg-blue-400/70"
              subtitle={`${gov.activeCount} نشط`}
            />
          ))}
          {governorates.length === 0 && (
            <p className="text-sm text-gray-text text-center py-4">لا يوجد بيانات</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-text">
          إجمالي {formatNum(totalAds)} إعلان — قيمة المبيعات {formatPrice(totalSoldValue)}
        </p>
      </div>
    </div>
  );
}
