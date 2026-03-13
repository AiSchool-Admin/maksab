"use client";

import {
  Search,
  Eye,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";

export default function SeoPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Search size={24} className="text-[#1B7A3D]" />
          أداء SEO
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          أداء صفحات الموقع في محركات البحث
        </p>
      </div>

      {/* ── Summary KPIs — zeros ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <Eye size={20} className="text-blue-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">إجمالي الظهور</p>
          <p className="text-2xl font-bold text-dark">0</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <MousePointerClick size={20} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">إجمالي النقرات</p>
          <p className="text-2xl font-bold text-dark">0</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-purple-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">متوسط الترتيب</p>
          <p className="text-2xl font-bold text-dark">—</p>
        </div>
      </div>

      {/* ── Pages Performance — empty ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-dark">أداء الصفحات</h3>
          <p className="text-xs text-gray-500 mt-0.5">لا توجد بيانات بعد</p>
        </div>

        <div className="p-12 text-center">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا توجد بيانات SEO بعد</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر البيانات بعد ربط Google Search Console</p>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
          يتطلب ربط Google Search Console لعرض البيانات
        </div>
      </div>
    </div>
  );
}
