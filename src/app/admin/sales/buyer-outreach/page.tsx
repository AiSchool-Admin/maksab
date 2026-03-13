"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  RefreshCw,
  Copy,
  Check,
  SkipForward,
  Eye,
  EyeOff,
  MessageSquare,
  Target,
  Send,
  Users,
  ShoppingCart,
} from "lucide-react";

interface BuyerContact {
  id: string;
  buyer_name: string | null;
  buyer_phone: string;
  buyer_tier: string;
  buyer_score: number;
  product_wanted: string | null;
  category: string | null;
  governorate: string | null;
  matches_count: number;
  matched_listings: any[];
  pipeline_status: string;
}

function buildMessage(buyer: BuyerContact): string {
  const name = buyer.buyer_name || "";
  const product = buyer.product_wanted || "المنتج اللي بتدور عليه";
  const count = buyer.matches_count || 0;

  // Build matches list
  const listings = (buyer.matched_listings || []).slice(0, 3);
  const listingsText = listings
    .map((l: any, i: number) => `${i + 1}. ${l.title || "إعلان"} — ${l.price ? l.price.toLocaleString() + " ج.م" : ""}`)
    .join("\n");

  return `السلام عليكم${name ? " " + name : ""} 👋

شفنا إنك بتدوّر على ${product}.

لقينا ${count} إعلان مطابق على مكسب:

${listingsText || "🔍 شوف كل الإعلانات المطابقة"}

+ على مكسب عندك:
🔔 تنبيه لما ينزل اللي بتدوّر عليه
🔨 مزادات — اشتري بأقل سعر
🔄 تبادل — بدّل اللي عندك

سجّل مجاناً: https://maksab.com`;
}

export default function BuyerOutreachPage() {
  const [buyers, setBuyers] = useState<BuyerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales/buyer-harvest?tier=hot_buyer&limit=50", {
        headers: getAdminHeaders(),
      });
      const data = await res.json();

      // Filter to only buyers with phones and matches
      const contacts = (data.buyers || []).filter(
        (b: BuyerContact) => b.buyer_phone && b.matches_count > 0 && b.pipeline_status !== "contacted"
      );
      setBuyers(contacts);

      const statuses: Record<string, string> = {};
      contacts.forEach((c: BuyerContact) => {
        statuses[c.id] = "pending";
      });
      setLocalStatuses(statuses);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleMessage = (id: string) => {
    setExpandedMessages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyMessage = async (id: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const openWhatsApp = (phone: string, message: string) => {
    const url = `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const markStatus = async (id: string, status: "sent" | "skipped") => {
    setLocalStatuses((prev) => ({ ...prev, [id]: status }));

    if (status === "sent") {
      try {
        await fetch("/api/admin/sales/buyer-harvest", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAdminHeaders() },
          body: JSON.stringify({
            id,
            pipeline_status: "contacted",
            contacted_at: new Date().toISOString(),
          }),
        });
      } catch {
        // best effort
      }
    }
  };

  const pendingBuyers = buyers.filter((b) => localStatuses[b.id] === "pending");
  const processedBuyers = buyers.filter((b) => localStatuses[b.id] !== "pending");
  const sentCount = Object.values(localStatuses).filter((s) => s === "sent").length;
  const skippedCount = Object.values(localStatuses).filter((s) => s === "skipped").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-60 mb-4" />
          <div className="h-4 bg-gray-100 rounded w-full mb-2" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">التواصل — مشترين</h1>
          <p className="text-sm text-gray-text mt-1">
            تواصل مع المشترين المحتملين وأرسلهم إعلانات مطابقة
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Target size={18} className="text-[#D4A843]" />
          <h2 className="text-base font-bold text-dark">تقدم التواصل</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Send size={14} className="text-[#1B7A3D]" />
            <span className="text-gray-text">أُرسل</span>
            <span className="font-bold text-[#1B7A3D]">{sentCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SkipForward size={14} className="text-gray-400" />
            <span className="text-gray-text">تخطّى</span>
            <span className="font-bold text-gray-500">{skippedCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={14} className="text-blue-500" />
            <span className="text-gray-text">متبقي</span>
            <span className="font-bold text-blue-600">{pendingBuyers.length}</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${buyers.length ? Math.min(((sentCount + skippedCount) / buyers.length) * 100, 100) : 0}%`,
              background: `linear-gradient(90deg, #D4A843 0%, #1B7A3D 100%)`,
            }}
          />
        </div>
      </div>

      {/* Pending Contacts */}
      {pendingBuyers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-dark flex items-center gap-2">
            <MessageSquare size={18} className="text-[#D4A843]" />
            في الانتظار ({pendingBuyers.length})
          </h2>
          {pendingBuyers.map((buyer) => {
            const message = buildMessage(buyer);
            return (
              <div key={buyer.id} className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🛒</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-dark">
                        {buyer.buyer_name || "مشتري"}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        buyer.buyer_tier === "hot_buyer" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {buyer.buyer_score} نقطة
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-text">
                      <span dir="ltr">{buyer.buyer_phone}</span>
                      <span>🛍️ {buyer.product_wanted || "—"}</span>
                      {buyer.governorate && <span>📍 {buyer.governorate}</span>}
                      <span className="text-[#1B7A3D] font-bold">🔄 {buyer.matches_count} مطابق</span>
                    </div>
                  </div>
                </div>

                {/* Message Toggle */}
                <div className="mt-3">
                  <button
                    onClick={() => toggleMessage(buyer.id)}
                    className="flex items-center gap-1.5 text-xs text-[#D4A843] hover:text-[#C09935] font-medium transition-colors"
                  >
                    {expandedMessages[buyer.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    {expandedMessages[buyer.id] ? "إخفاء الرسالة" : "عرض الرسالة"}
                  </button>
                  {expandedMessages[buyer.id] && (
                    <div className="mt-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <pre className="text-sm text-dark whitespace-pre-wrap font-[Cairo] leading-relaxed">
                        {message}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => copyMessage(buyer.id, message)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-medium text-gray-700 transition-colors"
                  >
                    {copiedId === buyer.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    {copiedId === buyer.id ? "تم النسخ!" : "📋 نسخ"}
                  </button>
                  <button
                    onClick={() => openWhatsApp(buyer.buyer_phone, message)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-xl text-xs font-medium text-white transition-colors"
                  >
                    📱 واتساب
                  </button>
                  <button
                    onClick={() => markStatus(buyer.id, "sent")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#1B7A3D] hover:bg-[#145C2E] rounded-xl text-xs font-medium text-white transition-colors"
                  >
                    <Check size={14} />
                    ✅ تم
                  </button>
                  <button
                    onClick={() => markStatus(buyer.id, "skipped")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-500 transition-colors"
                  >
                    <SkipForward size={14} />
                    ⏭️ تخطي
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Processed */}
      {processedBuyers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-dark text-gray-400">
            تم التعامل معهم ({processedBuyers.length})
          </h2>
          {processedBuyers.map((buyer) => (
            <div key={buyer.id} className="bg-white rounded-2xl p-4 border border-gray-100 opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-dark truncate">
                      {buyer.buyer_name || "مشتري"}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      localStatuses[buyer.id] === "sent" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {localStatuses[buyer.id] === "sent" ? "✅ تم الإرسال" : "⏭️ تم التخطي"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-text" dir="ltr">{buyer.buyer_phone}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All done */}
      {pendingBuyers.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-lg font-bold text-dark mb-1">خلصت كل المشترين!</h3>
          <p className="text-sm text-gray-text">اضغط تحديث لتحميل دفعة جديدة</p>
        </div>
      )}
    </div>
  );
}
