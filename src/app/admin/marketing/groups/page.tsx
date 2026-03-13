"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  SkipForward,
  Users,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

interface FacebookGroup {
  id: string;
  name: string;
  members: string;
  postsToday: number;
  engagementRate: string;
  status: "pending" | "posted" | "skipped";
}

const initialGroups: FacebookGroup[] = [
  { id: "1", name: "بيع وشراء القاهرة", members: "450K", postsToday: 3, engagementRate: "4.2%", status: "posted" },
  { id: "2", name: "سوق السيارات المستعملة مصر", members: "320K", postsToday: 2, engagementRate: "3.8%", status: "posted" },
  { id: "3", name: "موبايلات وإلكترونيات مصر", members: "280K", postsToday: 1, engagementRate: "5.1%", status: "posted" },
  { id: "4", name: "عقارات مصر — بيع وإيجار", members: "200K", postsToday: 2, engagementRate: "3.5%", status: "posted" },
  { id: "5", name: "بيع وشراء الجيزة", members: "180K", postsToday: 0, engagementRate: "4.0%", status: "posted" },
  { id: "6", name: "سوق الذهب والمجوهرات", members: "150K", postsToday: 1, engagementRate: "6.2%", status: "pending" },
  { id: "7", name: "أثاث مستعمل — القاهرة والجيزة", members: "120K", postsToday: 0, engagementRate: "3.9%", status: "pending" },
  { id: "8", name: "ملابس ماركات أصلية مصر", members: "95K", postsToday: 0, engagementRate: "4.5%", status: "pending" },
  { id: "9", name: "بيع وشراء الإسكندرية", members: "210K", postsToday: 1, engagementRate: "3.7%", status: "skipped" },
  { id: "10", name: "خدمات وحرفيين مصر", members: "85K", postsToday: 0, engagementRate: "2.8%", status: "pending" },
];

const samplePost = `🔥 مكسب — سوق بيع وشراء جديد في مصر!

بيع أي حاجة عندك في أقل من دقيقة:
📱 موبايلات | 🚗 سيارات | 🏠 عقارات | 💰 ذهب | 👗 موضة

✅ مجاني 100%
✅ آلاف المشترين
✅ بيع ومزاد وتبديل

جرّب دلوقتي 👇
🔗 maksab.app

#مكسب #بيع_وشراء #مصر`;

export default function GroupsPage() {
  const [groups, setGroups] = useState(initialGroups);
  const [copied, setCopied] = useState(false);

  const postedCount = groups.filter((g) => g.status === "posted").length;
  const totalCount = groups.length;
  const skippedCount = groups.filter((g) => g.status === "skipped").length;

  const handleCopyPost = async () => {
    try {
      await navigator.clipboard.writeText(samplePost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const markPosted = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: "posted" as const } : g))
    );
  };

  const markSkipped = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: "skipped" as const } : g))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
          📘 إدارة جروبات فيسبوك
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          نشر المحتوى في الجروبات المستهدفة يدوياً
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[#1B7A3D]" />
            <span className="text-sm font-bold text-dark">
              نُشر في {postedCount} من {totalCount} جروبات
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {skippedCount > 0 && `${skippedCount} تم تخطيهم`}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-[#1B7A3D] rounded-full h-3 transition-all duration-500"
            style={{ width: `${(postedCount / totalCount) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#1B7A3D] rounded-full" /> نُشر ({postedCount})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full" /> معلّق ({groups.filter((g) => g.status === "pending").length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-gray-300 rounded-full" /> تم تخطيه ({skippedCount})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post to copy */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm sticky top-20">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-dark">البوست الحالي</h3>
              <button
                onClick={handleCopyPost}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied
                    ? "bg-green-50 text-green-700"
                    : "bg-[#1B7A3D] text-white hover:bg-[#145C2E]"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "تم النسخ!" : "نسخ البوست"}
              </button>
            </div>
            <div className="p-4">
              <div className="whitespace-pre-wrap text-sm text-dark leading-relaxed bg-gray-50 rounded-xl p-4">
                {samplePost}
              </div>
            </div>
          </div>
        </div>

        {/* Groups list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-dark">الجروبات ({totalCount})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`px-4 py-3.5 flex items-center gap-3 transition-colors ${
                    group.status === "posted"
                      ? "bg-green-50/30"
                      : group.status === "skipped"
                      ? "bg-gray-50/50 opacity-60"
                      : "hover:bg-gray-50/50"
                  }`}
                >
                  {/* Group info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{group.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {group.members} عضو
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {group.postsToday} بوست اليوم
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        تفاعل {group.engagementRate}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {group.status === "posted" ? (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full font-medium">
                      <Check size={14} />
                      تم النشر
                    </span>
                  ) : group.status === "skipped" ? (
                    <span className="text-xs text-gray-400 px-3 py-1.5">تم التخطي</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyPost}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <Copy size={12} />
                        نسخ بوست
                      </button>
                      <button
                        onClick={() => markPosted(group.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1B7A3D] text-white hover:bg-[#145C2E] transition-colors"
                      >
                        <Check size={12} />
                        تم النشر
                      </button>
                      <button
                        onClick={() => markSkipped(group.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <SkipForward size={12} />
                        تخطي
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
