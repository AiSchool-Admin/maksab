"use client";

import {
  SmilePlus,
  Clock,
  CheckCircle2,
  Bot,
  Star,
  BarChart3,
} from "lucide-react";

export default function CSReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SmilePlus size={24} className="text-[#D4A843]" />
            تقارير خدمة العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-1">أداء فريق خدمة العملاء و AI</p>
        </div>
      </div>

      {/* KPI Cards — showing dashes (no data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "وقت الاستجابة", value: "—", icon: Clock, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
          { label: "نسبة الحل", value: "—", icon: CheckCircle2, iconColor: "text-green-600", iconBg: "bg-green-50" },
          { label: "نسبة AI التلقائي", value: "—", icon: Bot, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
          { label: "رضا العملاء", value: "—", icon: Star, iconColor: "text-yellow-600", iconBg: "bg-yellow-50" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <Icon size={20} className={kpi.iconColor} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1 mb-2">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Summary Row — zeros */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">إجمالي المحادثات:</span>
            <span className="font-bold text-gray-900 mr-2">0</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <span className="text-gray-500">تعامل AI:</span>
            <span className="font-bold text-purple-600 mr-2">0</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <span className="text-gray-500">تعامل بشري:</span>
            <span className="font-bold text-blue-600 mr-2">0</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <span className="text-gray-500">متوسط الرضا:</span>
            <span className="font-bold text-yellow-600 mr-2">—</span>
          </div>
        </div>
      </div>

      {/* Empty State for Daily Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={18} className="text-gray-400" />
            التفصيل اليومي
          </h3>
        </div>
        <div className="p-12 text-center">
          <BarChart3 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا توجد بيانات بعد</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر التقارير بعد بدء استقبال المحادثات</p>
        </div>
      </div>

      {/* Empty State for Satisfaction Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
          <SmilePlus size={18} className="text-[#D4A843]" />
          اتجاه رضا العملاء
        </h3>
        <div className="py-8 text-center">
          <Star size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا توجد بيانات رضا بعد</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر البيانات بعد بدء تقييم المحادثات</p>
        </div>
      </div>
    </div>
  );
}
