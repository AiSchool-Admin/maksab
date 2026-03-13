"use client";

import Link from "next/link";
import {
  Megaphone,
  Eye,
  MousePointerClick,
  UserPlus,
  DollarSign,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function MarketingDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Megaphone size={24} className="text-[#1B7A3D]" />
            لوحة التسويق
          </h2>
          <p className="text-xs text-gray-500 mt-1">أداء القنوات التسويقية</p>
        </div>
        <Link
          href="/admin/marketing/content/new"
          className="flex items-center gap-2 bg-[#1B7A3D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors"
        >
          <Sparkles size={16} />
          إنشاء محتوى بـ AI
        </Link>
      </div>

      {/* Summary KPIs — zeros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <Eye size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-dark">0</p>
          <p className="text-xs text-gray-500">إجمالي الوصول</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <MousePointerClick size={20} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-dark">0</p>
          <p className="text-xs text-gray-500">إجمالي النقرات</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <UserPlus size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-dark">0</p>
          <p className="text-xs text-gray-500">تسجيلات جديدة</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-dark">— ج.م</p>
          <p className="text-xs text-gray-500">متوسط تكلفة / تسجيل</p>
        </div>
      </div>

      {/* Channel Performance — empty */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-dark">أداء القنوات التسويقية</h3>
          <p className="text-xs text-gray-500 mt-0.5">لا توجد بيانات بعد</p>
        </div>
        <div className="p-12 text-center">
          <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا توجد بيانات تسويقية بعد</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر البيانات بعد ربط القنوات التسويقية</p>
        </div>
      </div>

      {/* Scheduled Content — empty */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-dark flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              المحتوى المجدول
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">0 عنصر محتوى</p>
          </div>
          <Link
            href="/admin/marketing/content/new"
            className="flex items-center gap-1.5 text-[#1B7A3D] text-xs font-medium hover:text-[#145C2E] transition-colors"
          >
            <Sparkles size={14} />
            إنشاء محتوى جديد بـ AI
          </Link>
        </div>
        <div className="p-8 text-center">
          <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا يوجد محتوى مجدول</p>
        </div>
      </div>
    </div>
  );
}
