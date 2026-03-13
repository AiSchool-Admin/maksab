"use client";

import Link from "next/link";
import { ExternalLink, Globe, Wheat, FileText, Phone } from "lucide-react";

export default function SalesScopesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark">إدارة النطاقات</h1>
        <p className="text-sm text-gray-text mt-1">
          إدارة نطاقات الحصاد ومصادر البيانات
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <Wheat size={20} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mb-1">نطاقات نشطة</p>
          <p className="text-2xl font-bold text-dark">15</p>
          <p className="text-[11px] text-gray-400 mt-1">من أصل 25 نطاق</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <FileText size={20} className="text-purple-600" />
          </div>
          <p className="text-xs text-gray-500 mb-1">إعلانات محصودة اليوم</p>
          <p className="text-2xl font-bold text-dark">2,700</p>
          <p className="text-[11px] text-gray-400 mt-1">+12% عن أمس</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <Phone size={20} className="text-amber-600" />
          </div>
          <p className="text-xs text-gray-500 mb-1">أرقام مستخرجة اليوم</p>
          <p className="text-2xl font-bold text-[#D4A843]">1,080</p>
          <p className="text-[11px] text-gray-400 mt-1">40% نسبة الاستخراج</p>
        </div>
      </div>

      {/* Redirect Card */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <div className="w-16 h-16 bg-[#1B7A3D]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Globe size={32} className="text-[#1B7A3D]" />
        </div>
        <h2 className="text-lg font-bold text-dark mb-2">
          صفحة النطاقات انتقلت لقسم الحصاد
        </h2>
        <p className="text-sm text-gray-text mb-6 max-w-md mx-auto">
          تم نقل إدارة النطاقات لقسم CRM — الحصاد لتنظيم أفضل. اضغط على الزر
          للانتقال للصفحة الجديدة.
        </p>
        <Link
          href="/admin/crm/harvester/scopes"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B7A3D] hover:bg-[#145C2E] text-white rounded-xl text-sm font-bold transition-colors"
        >
          <ExternalLink size={16} />
          افتح إدارة النطاقات الكاملة
        </Link>
      </div>
    </div>
  );
}
