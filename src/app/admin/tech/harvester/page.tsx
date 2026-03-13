"use client";

import Link from "next/link";
import {
  Cpu,
  ExternalLink,
  Wheat,
  Globe,
  FileText,
  Phone,
  AlertCircle,
  Clock,
} from "lucide-react";

/* ── Mock Data ────────────────────────────────────────────────── */

const harvesterStats = {
  totalScopes: 25,
  activeScopes: 15,
  listingsToday: 2700,
  phonesExtracted: 1080,
  errors: 0,
  lastRun: "منذ 12 دقيقة",
};

/* ── Component ────────────────────────────────────────────────── */

export default function TechHarvesterPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Cpu size={24} className="text-[#1B7A3D]" />
          محرك الحصاد
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          ملخص وإدارة محرك حصاد الإعلانات
        </p>
      </div>

      {/* ── Stats Summary ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="w-10 h-10 bg-blue-50 rounded-xl mx-auto mb-2 flex items-center justify-center">
            <Globe size={20} className="text-blue-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">إجمالي النطاقات</p>
          <p className="text-2xl font-bold text-dark">{harvesterStats.totalScopes}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="w-10 h-10 bg-green-50 rounded-xl mx-auto mb-2 flex items-center justify-center">
            <Wheat size={20} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">نطاقات نشطة</p>
          <p className="text-2xl font-bold text-[#1B7A3D]">{harvesterStats.activeScopes}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="w-10 h-10 bg-purple-50 rounded-xl mx-auto mb-2 flex items-center justify-center">
            <FileText size={20} className="text-purple-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">إعلانات اليوم</p>
          <p className="text-2xl font-bold text-dark">{harvesterStats.listingsToday.toLocaleString("en-US")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="w-10 h-10 bg-amber-50 rounded-xl mx-auto mb-2 flex items-center justify-center">
            <Phone size={20} className="text-amber-600" />
          </div>
          <p className="text-xs text-gray-text mb-1">أرقام مستخرجة</p>
          <p className="text-2xl font-bold text-[#D4A843]">{harvesterStats.phonesExtracted.toLocaleString("en-US")}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="w-10 h-10 bg-red-50 rounded-xl mx-auto mb-2 flex items-center justify-center">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <p className="text-xs text-gray-text mb-1">أخطاء</p>
          <p className="text-2xl font-bold text-dark">{harvesterStats.errors}</p>
        </div>
      </div>

      {/* ── Last Run ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Clock size={16} className="text-gray-400" />
          آخر تشغيل: <span className="font-bold text-dark">{harvesterStats.lastRun}</span>
        </div>

        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-sm text-green-700 font-medium mb-1">✅ المحرك يعمل بشكل طبيعي</p>
          <p className="text-xs text-green-600">جميع النطاقات النشطة تعمل بدون أخطاء</p>
        </div>
      </div>

      {/* ── Link to Full Harvester ──────────────────────────────── */}
      <Link
        href="/admin/crm/harvester"
        className="flex items-center justify-center gap-2 w-full bg-[#1B7A3D] text-white px-6 py-3.5 rounded-2xl text-sm font-medium hover:bg-[#145C2E] transition-colors"
      >
        <ExternalLink size={16} />
        افتح محرك الحصاد الكامل
      </Link>
    </div>
  );
}
