"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { useAdmin } from "../layout";
import type { GovernorateBreakdown } from "@/lib/admin/admin-service";

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}

export default function AdminLocationsPage() {
  const admin = useAdmin();
  const [governorates, setGovernorates] = useState<GovernorateBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;

    async function load() {
      setIsLoading(true);
      const res = await fetch("/api/admin/stats?type=governorates", {
        headers: { "x-admin-id": admin!.id },
      });
      if (res.ok) setGovernorates(await res.json());
      setIsLoading(false);
    }

    load();
  }, [admin]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 h-16 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  const total = governorates.reduce((s, g) => s + g.count, 0);
  const maxCount = Math.max(...governorates.map((g) => g.count), 1);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-dark">التوزيع الجغرافي</h2>
        <p className="text-xs text-gray-text">توزيع الإعلانات على المحافظات — {formatNum(total)} إعلان</p>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {governorates.slice(0, 3).map((gov, i) => {
          const pct = total > 0 ? ((gov.count / total) * 100).toFixed(1) : "0";
          const colors = ["bg-brand-green", "bg-blue-500", "bg-purple-500"];
          return (
            <div key={gov.governorate} className={`${colors[i]} rounded-xl p-4 text-white`}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} />
                <span className="text-xs font-medium opacity-80">المركز {i + 1}</span>
              </div>
              <p className="text-xl font-bold">{gov.governorate}</p>
              <p className="text-sm opacity-80">{formatNum(gov.count)} إعلان ({pct}%)</p>
              <p className="text-xs opacity-60 mt-1">{gov.activeCount} نشط</p>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
          <div className="flex items-center text-xs font-medium text-gray-text">
            <span className="w-8">#</span>
            <span className="flex-1">المحافظة</span>
            <span className="w-20 text-center">إعلانات</span>
            <span className="w-16 text-center">نشط</span>
            <span className="w-16 text-center">النسبة</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {governorates.map((gov, i) => {
            const pct = total > 0 ? ((gov.count / total) * 100).toFixed(1) : "0";
            const barPct = (gov.count / maxCount) * 100;
            return (
              <div key={gov.governorate} className="px-4 py-3 relative">
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 right-0 bg-brand-green/5 transition-all duration-500"
                  style={{ width: `${barPct}%` }}
                />
                <div className="relative flex items-center text-sm">
                  <span className="w-8 text-xs text-gray-text">{i + 1}</span>
                  <span className="flex-1 font-medium text-dark flex items-center gap-1.5">
                    <MapPin size={12} className="text-brand-green flex-shrink-0" />
                    {gov.governorate}
                  </span>
                  <span className="w-20 text-center font-bold text-dark">{formatNum(gov.count)}</span>
                  <span className="w-16 text-center text-xs text-gray-text">{gov.activeCount}</span>
                  <span className="w-16 text-center text-xs text-gray-text">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
