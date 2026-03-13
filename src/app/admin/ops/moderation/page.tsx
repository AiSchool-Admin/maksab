"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Check,
  X,
  Pencil,
  MessageSquare,
  AlertTriangle,
  Shield,
  ImageIcon,
  DollarSign,
  Type,
  Sparkles,
} from "lucide-react";

interface PendingAd {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  price: string;
  seller: string;
  flagReason: string;
  flagType: "price" | "content" | "image" | "spam";
  createdAt: string;
}

const pendingAds: PendingAd[] = [
  {
    id: "1",
    title: "آيفون 15 برو ماكس 256GB",
    category: "موبايلات",
    categoryIcon: "📱",
    price: "500 جنيه",
    seller: "أحمد محمود",
    flagReason: "السعر أقل بكتير من المتوسط — احتمال خطأ أو احتيال",
    flagType: "price",
    createdAt: "منذ 15 دقيقة",
  },
  {
    id: "2",
    title: "شقة 200م سوبر لوكس",
    category: "عقارات",
    categoryIcon: "🏠",
    price: "50,000 جنيه",
    seller: "محمد علي",
    flagReason: "السعر غير منطقي لعقار بالمواصفات دي",
    flagType: "price",
  createdAt: "منذ ساعة",
  },
  {
    id: "3",
    title: "aaaa bbbb cccc",
    category: "سيارات",
    categoryIcon: "🚗",
    price: "100,000 جنيه",
    seller: "عمرو سعيد",
    flagReason: "العنوان مش واضح — ممكن يكون spam",
    flagType: "content",
    createdAt: "منذ ساعتين",
  },
  {
    id: "4",
    title: "غسالة توشيبا فوق أوتوماتيك",
    category: "أجهزة منزلية",
    categoryIcon: "🏠",
    price: "3,500 جنيه",
    seller: "سارة أحمد",
    flagReason: "الإعلان مفيش صورة — جودة منخفضة",
    flagType: "image",
    createdAt: "منذ 3 ساعات",
  },
  {
    id: "5",
    title: "اتصل بينا للعروض الحصرية!!!",
    category: "خدمات",
    categoryIcon: "🛠️",
    price: "—",
    seller: "حساب جديد",
    flagReason: "محتوى يشبه spam — لغة تسويقية مبالغة",
    flagType: "spam",
    createdAt: "منذ 4 ساعات",
  },
];

const flagTypeConfig: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  price: { icon: DollarSign, color: "text-orange-500 bg-orange-50" },
  content: { icon: Type, color: "text-blue-500 bg-blue-50" },
  image: { icon: ImageIcon, color: "text-purple-500 bg-purple-50" },
  spam: { icon: AlertTriangle, color: "text-red-500 bg-red-50" },
};

export default function ModerationPage() {
  const [ads, setAds] = useState(pendingAds);
  const [aiApproved] = useState(145);
  const [aiRejected] = useState(3);

  const handleApprove = (id: string) => {
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReject = (id: string) => {
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
          <ClipboardCheck size={24} className="text-[#1B7A3D]" />
          مراجعة الإعلانات
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          الإعلانات اللي محتاجة مراجعة بشرية بعد فلترة الـ AI
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Check size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{aiApproved}</p>
          <p className="text-xs text-gray-500">✅ AI وافق</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center mx-auto mb-2">
            <AlertTriangle size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{ads.length}</p>
          <p className="text-xs text-gray-500">⚠️ بحاجة مراجعة</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-2">
            <X size={20} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{aiRejected}</p>
          <p className="text-xs text-gray-500">❌ مرفوض</p>
        </div>
      </div>

      {/* Pending Ads */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-dark">
          إعلانات بحاجة مراجعة ({ads.length})
        </h3>

        {ads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
            <Shield size={40} className="mx-auto mb-3 text-green-400" />
            <p className="text-sm font-bold text-dark">مفيش إعلانات محتاجة مراجعة</p>
            <p className="text-xs text-gray-500 mt-1">الـ AI بيراجع الإعلانات تلقائياً</p>
          </div>
        ) : (
          ads.map((ad) => {
            const flagConf = flagTypeConfig[ad.flagType];
            const FlagIcon = flagConf.icon;
            return (
              <div
                key={ad.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Image placeholder */}
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                    {ad.categoryIcon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-dark">{ad.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{ad.categoryIcon} {ad.category}</span>
                          <span>💰 {ad.price}</span>
                          <span>👤 {ad.seller}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{ad.createdAt}</span>
                    </div>

                    {/* Flag reason */}
                    <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-lg ${flagConf.color.split(" ")[1]}`}>
                      <FlagIcon size={14} className={flagConf.color.split(" ")[0]} />
                      <span className="text-xs font-medium text-dark">{ad.flagReason}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(ad.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1B7A3D] text-white hover:bg-[#145C2E] transition-colors"
                      >
                        <Check size={14} />
                        موافقة
                      </button>
                      <button
                        onClick={() => handleReject(ad.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                        رفض
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        <Pencil size={14} />
                        تعديل
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        <MessageSquare size={14} />
                        طلب تعديل من البائع
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Rules Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-dark flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-[#D4A843]" />
          قواعد الـ AI للمراجعة التلقائية
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 rounded-xl">
            <span className="text-lg flex-shrink-0">✅</span>
            <div>
              <p className="text-sm font-medium text-dark">موافقة تلقائية</p>
              <p className="text-xs text-gray-600 mt-0.5">
                صورة واحدة على الأقل + عنوان أكثر من 10 حروف + سعر منطقي للقسم ← الإعلان يتنشر فوراً
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 bg-yellow-50 rounded-xl">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-medium text-dark">مراجعة بشرية</p>
              <p className="text-xs text-gray-600 mt-0.5">
                سعر غير منطقي (أقل من 20% أو أعلى من 500% من متوسط القسم) ← يحتاج موافقة يدوية
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 rounded-xl">
            <span className="text-lg flex-shrink-0">❌</span>
            <div>
              <p className="text-sm font-medium text-dark">رفض تلقائي</p>
              <p className="text-xs text-gray-600 mt-0.5">
                spam واضح (عنوان مكرر أكثر من 3 مرات، أرقام تليفون في العنوان، كلمات محظورة) ← يترفض تلقائياً
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
