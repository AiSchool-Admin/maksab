"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Pencil,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  platform: "facebook" | "instagram" | "blog" | "twitter";
  scheduledDate: string;
  status: "published" | "scheduled" | "draft";
  engagement?: string;
}

const platformConfig: Record<string, { icon: string; label: string; color: string }> = {
  facebook: { icon: "📘", label: "فيسبوك", color: "bg-blue-50 text-blue-700" },
  instagram: { icon: "📸", label: "إنستا", color: "bg-pink-50 text-pink-700" },
  blog: { icon: "🔍", label: "مقال SEO", color: "bg-orange-50 text-orange-700" },
  twitter: { icon: "🐦", label: "تويتر", color: "bg-sky-50 text-sky-700" },
};

const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  published: { label: "نُشر", icon: "✅", color: "bg-green-50 text-green-700" },
  scheduled: { label: "مجدول", icon: "⏳", color: "bg-yellow-50 text-yellow-700" },
  draft: { label: "مسودة", icon: "📝", color: "bg-gray-100 text-gray-600" },
};

const contentItems: ContentItem[] = [
  {
    id: "1",
    title: "بيع موبايلك القديم في ثواني على مكسب",
    platform: "facebook",
    scheduledDate: "اليوم 2:00 م",
    status: "published",
    engagement: "1,200 تفاعل",
  },
  {
    id: "2",
    title: "قصة نجاح: محمد باع عربيته في يومين على مكسب!",
    platform: "instagram",
    scheduledDate: "بكرة 10:00 ص",
    status: "scheduled",
  },
  {
    id: "3",
    title: "5 نصايح لتصوير إعلان يبيع بسرعة",
    platform: "facebook",
    scheduledDate: "بعد بكرة 4:00 م",
    status: "scheduled",
  },
  {
    id: "4",
    title: "عروض الذهب اليوم على مكسب — عيار 21 بأقل سعر",
    platform: "instagram",
    scheduledDate: "—",
    status: "draft",
  },
  {
    id: "5",
    title: "مقال SEO: أفضل أماكن بيع السيارات المستعملة في مصر 2026",
    platform: "blog",
    scheduledDate: "15 مارس",
    status: "draft",
  },
  {
    id: "6",
    title: "مكسب وصل! سوق بيع وشراء جديد في مصر",
    platform: "twitter",
    scheduledDate: "أمس 6:00 م",
    status: "published",
    engagement: "340 تفاعل",
  },
  {
    id: "7",
    title: "إزاي تحدد سعر موبايلك المستعمل صح؟",
    platform: "facebook",
    scheduledDate: "16 مارس 12:00 م",
    status: "scheduled",
  },
  {
    id: "8",
    title: "شقق للإيجار في القاهرة — دليل شامل",
    platform: "blog",
    scheduledDate: "—",
    status: "draft",
  },
];

type FilterTab = "all" | "facebook" | "instagram" | "drafts";

export default function ContentListPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredItems = contentItems.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "facebook") return item.platform === "facebook";
    if (activeTab === "instagram") return item.platform === "instagram";
    if (activeTab === "drafts") return item.status === "draft";
    return true;
  });

  const tabs: { id: FilterTab; label: string; icon?: string }[] = [
    { id: "all", label: "الكل" },
    { id: "facebook", label: "فيسبوك", icon: "📘" },
    { id: "instagram", label: "إنستا", icon: "📸" },
    { id: "drafts", label: "مسودات", icon: "📝" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <Pencil size={24} className="text-[#1B7A3D]" />
            إدارة المحتوى
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {contentItems.length} عنصر محتوى — {contentItems.filter((i) => i.status === "published").length} منشور، {contentItems.filter((i) => i.status === "scheduled").length} مجدول، {contentItems.filter((i) => i.status === "draft").length} مسودة
          </p>
        </div>
        <Link
          href="/admin/marketing/content/new"
          className="flex items-center gap-2 bg-[#1B7A3D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors"
        >
          <Plus size={16} />
          محتوى جديد
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-[#1B7A3D] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Pencil size={32} className="mx-auto mb-3" />
              <p className="text-sm font-medium">مفيش محتوى في الفلتر ده</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const plat = platformConfig[item.platform];
              const st = statusConfig[item.status];
              return (
                <div
                  key={item.id}
                  className="px-4 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Platform icon */}
                  <span className="text-2xl flex-shrink-0">{plat.icon}</span>

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {item.scheduledDate}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${plat.color}`}>
                        {plat.label}
                      </span>
                      {item.engagement && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Eye size={12} />
                          {item.engagement}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${st.color}`}>
                    {st.icon} {st.label}
                  </span>

                  {/* Menu */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                      className="p-1.5 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen === item.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[140px]">
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                            <Pencil size={14} />
                            تعديل
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                            <Eye size={14} />
                            معاينة
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50">
                            <Trash2 size={14} />
                            حذف
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
