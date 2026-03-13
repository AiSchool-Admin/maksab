"use client";

import {
  DollarSign,
  CreditCard,
  Users,
  BarChart3,
} from "lucide-react";

export default function FinanceDashboardPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Month Summary Cards — all zeros ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-brand-green" />
            </div>
          </div>
          <p className="text-xs text-gray-text mb-1">الإيرادات</p>
          <p className="text-2xl font-bold text-dark">0 <span className="text-sm font-normal text-gray-text">ج.م</span></p>
          <p className="text-[11px] text-gray-text mt-1">لم يتم تفعيل نظام الدفع بعد</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} className="text-red-500" />
            </div>
          </div>
          <p className="text-xs text-gray-text mb-1">المصروفات</p>
          <p className="text-2xl font-bold text-dark">0 <span className="text-sm font-normal text-gray-text">ج.م</span></p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-gray-text mb-1">صافي الربح</p>
          <p className="text-2xl font-bold text-dark">0 <span className="text-sm font-normal text-gray-text">ج.م</span></p>
        </div>
      </div>

      {/* ── Revenue Sources — empty ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-dark mb-4">مصادر الإيرادات</h3>
        <div className="py-8 text-center">
          <DollarSign size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا توجد إيرادات بعد</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر البيانات بعد تفعيل نظام الدفع</p>
        </div>
      </div>

      {/* ── Active Subscriptions — zeros ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-dark mb-4">ملخص الاشتراكات النشطة</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { name: "Free", count: 0, color: "bg-gray-400", textColor: "text-gray-600", price: "مجاني" },
            { name: "Silver", count: 0, color: "bg-gray-300", textColor: "text-gray-700", price: "99 ج.م/شهر" },
            { name: "Gold", count: 0, color: "bg-brand-gold", textColor: "text-amber-700", price: "199 ج.م/شهر" },
            { name: "Diamond", count: 0, color: "bg-blue-400", textColor: "text-blue-700", price: "499 ج.م/شهر" },
          ].map((tier) => (
            <div key={tier.name} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className={`w-8 h-8 ${tier.color} rounded-lg mx-auto mb-2 flex items-center justify-center`}>
                <CreditCard size={16} className="text-white" />
              </div>
              <p className={`text-xs font-bold ${tier.textColor}`}>{tier.name}</p>
              <p className="text-lg font-bold text-dark">{tier.count}</p>
              <p className="text-[10px] text-gray-text">{tier.price}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">MRR</p>
            <p className="text-lg font-bold text-brand-green">0 ج.م</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">معدل التجديد</p>
            <p className="text-lg font-bold text-blue-600">—</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-text mb-1">إجمالي المشتركين</p>
            <p className="text-lg font-bold text-amber-600">
              <Users size={16} className="inline ml-1" />
              0
            </p>
          </div>
        </div>
      </div>

      {/* ── Chart — empty ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-dark mb-4">الإيرادات vs المصروفات</h3>
        <div className="h-72 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">ستظهر البيانات بعد بدء التشغيل</p>
          </div>
        </div>
      </div>
    </div>
  );
}
