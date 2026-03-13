"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, Ban, Shield, Flag } from "lucide-react";

type ReportStatus = "pending" | "resolved" | "all";

interface Report {
  id: string;
  adTitle: string;
  adId: string;
  reporterName: string;
  reporterPhone: string;
  reason: string;
  date: string;
  status: "pending" | "warning_sent" | "ad_deleted" | "dismissed" | "user_banned";
  details: string;
}

const mockReports: Report[] = [
  { id: "1", adTitle: "آيفون 15 برو — سعر 500 جنيه", adId: "ad_1", reporterName: "أحمد محمد", reporterPhone: "01012345678", reason: "احتيال", date: "منذ ساعتين", status: "pending", details: "سعر غير منطقي — آيفون 15 بـ 500 جنيه" },
  { id: "2", adTitle: "شقة 200م² المعادي — 50,000 جنيه", adId: "ad_2", reporterName: "سارة أحمد", reporterPhone: "01198765432", reason: "سعر خيالي", date: "منذ 5 ساعات", status: "pending", details: "شقة 200 متر في المعادي بـ 50 ألف — مستحيل" },
  { id: "3", adTitle: "سيارة BMW 2024 — للبيع", adId: "ad_3", reporterName: "محمد علي", reporterPhone: "01234567890", reason: "صور مسروقة", date: "منذ يوم", status: "warning_sent", details: "الصور مأخوذة من موقع كارز" },
  { id: "4", adTitle: "موبايلات بالجملة — اتصل", adId: "ad_4", reporterName: "كريم حسن", reporterPhone: "01556789012", reason: "تكرار", date: "منذ يومين", status: "ad_deleted", details: "نفس الإعلان متكرر 5 مرات" },
  { id: "5", adTitle: "ذهب عيار 24 — أرخص سعر", adId: "ad_5", reporterName: "ليلى محمود", reporterPhone: "01078901234", reason: "محتوى مخالف", date: "منذ 3 أيام", status: "dismissed", details: "الإعلان طبيعي بعد المراجعة" },
];

const reasonColors: Record<string, string> = {
  "احتيال": "bg-red-50 text-red-700",
  "سعر خيالي": "bg-orange-50 text-orange-700",
  "صور مسروقة": "bg-purple-50 text-purple-700",
  "تكرار": "bg-blue-50 text-blue-700",
  "محتوى مخالف": "bg-yellow-50 text-yellow-700",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "معلّقة", color: "bg-yellow-50 text-yellow-700" },
  warning_sent: { label: "تم التحذير", color: "bg-orange-50 text-orange-700" },
  ad_deleted: { label: "تم الحذف", color: "bg-red-50 text-red-700" },
  dismissed: { label: "تم الرفض", color: "bg-gray-100 text-gray-600" },
  user_banned: { label: "تم الحظر", color: "bg-red-100 text-red-800" },
};

export default function OpsReportsPage() {
  const [filter, setFilter] = useState<ReportStatus>("all");

  const filtered = filter === "all" ? mockReports : mockReports.filter((r) => filter === "pending" ? r.status === "pending" : r.status !== "pending");

  const pendingCount = mockReports.filter((r) => r.status === "pending").length;
  const resolvedCount = mockReports.filter((r) => r.status !== "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-dark">البلاغات</h2>
        <p className="text-sm text-gray-text">إدارة بلاغات المستخدمين على الإعلانات</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <Flag size={20} className="text-gray-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-dark">{mockReports.length}</p>
          <p className="text-xs text-gray-text">إجمالي البلاغات</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <AlertTriangle size={20} className="text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-text">معلّقة</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <CheckCircle size={20} className="text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
          <p className="text-xs text-gray-text">تم الحل</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {([["all", "الكل"], ["pending", "معلّقة"], ["resolved", "تم الحل"]] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === val ? "bg-[#1B7A3D] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filtered.map((report) => (
          <div key={report.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-bold text-dark text-sm">{report.adTitle}</h4>
                <p className="text-xs text-gray-text mt-1">بلاغ من: {report.reporterName} — {report.date}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${reasonColors[report.reason] || "bg-gray-100 text-gray-600"}`}>
                  {report.reason}
                </span>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusLabels[report.status].color}`}>
                  {statusLabels[report.status].label}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-3">{report.details}</p>

            {report.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <CheckCircle size={14} />
                  رفض البلاغ
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                  <AlertTriangle size={14} />
                  تحذير البائع
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                  <XCircle size={14} />
                  حذف الإعلان
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors">
                  <Ban size={14} />
                  حظر البائع
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
