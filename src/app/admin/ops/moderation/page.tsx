"use client";

import { useState, useEffect } from "react";
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
  RefreshCw,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface ModerationItem {
  id: string;
  listing_id: string;
  fraud_score: number;
  confidence: number;
  reasons: string[];
  decision: string;
  created_at: string;
  human_decision: string | null;
}

interface ModerationStats {
  total: number;
  approved: number;
  rejected: number;
  review: number;
}

const flagTypeFromReasons = (reasons: string[]): "price" | "content" | "image" | "spam" => {
  const joined = (reasons || []).join(" ").toLowerCase();
  if (joined.includes("سعر") || joined.includes("price")) return "price";
  if (joined.includes("spam") || joined.includes("مكرر")) return "spam";
  if (joined.includes("صورة") || joined.includes("image")) return "image";
  return "content";
};

const flagTypeConfig: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  price: { icon: DollarSign, color: "text-orange-500 bg-orange-50" },
  content: { icon: Type, color: "text-blue-500 bg-blue-50" },
  image: { icon: ImageIcon, color: "text-purple-500 bg-purple-50" },
  spam: { icon: AlertTriangle, color: "text-red-500 bg-red-50" },
};

export default function ModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ModerationStats>({ total: 0, approved: 0, rejected: 0, review: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ops/moderation", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.pending || []);
        setStats(data.stats || { total: 0, approved: 0, rejected: 0, review: 0 });
      }
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (moderationId: string, action: "approved" | "rejected") => {
    setProcessing((prev) => new Set([...prev, moderationId]));
    try {
      const res = await fetch("/api/admin/ops/moderation", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ moderation_id: moderationId, action }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== moderationId));
        if (action === "approved") {
          setStats((s) => ({ ...s, approved: s.approved + 1, review: Math.max(0, s.review - 1) }));
        } else {
          setStats((s) => ({ ...s, rejected: s.rejected + 1, review: Math.max(0, s.review - 1) }));
        }
      }
    } catch {
      // silent
    }
    setProcessing((prev) => {
      const next = new Set(prev);
      next.delete(moderationId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <ClipboardCheck size={24} className="text-[#1B7A3D]" />
            قائمة انتظار ممدوح
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            إعلانات بـ fraud_score 40-79 — تحتاج قرار بشري
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-2">
            <ClipboardCheck size={20} className="text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-dark">{stats.total}</p>
          <p className="text-xs text-gray-500">إجمالي اليوم</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Check size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-xs text-gray-500">AI + بشري وافق</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center mx-auto mb-2">
            <AlertTriangle size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{items.length}</p>
          <p className="text-xs text-gray-500">في الانتظار</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-2">
            <X size={20} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          <p className="text-xs text-gray-500">مرفوض</p>
        </div>
      </div>

      {/* Pending Ads */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-dark">
          إعلانات بحاجة قرار ({items.length})
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
            <Shield size={40} className="mx-auto mb-3 text-green-400" />
            <p className="text-sm font-bold text-dark">مفيش إعلانات في الانتظار</p>
            <p className="text-xs text-gray-500 mt-1">كل الإعلانات اتعالجت</p>
          </div>
        ) : (
          items.map((item) => {
            const flagType = flagTypeFromReasons(item.reasons);
            const flagConf = flagTypeConfig[flagType];
            const FlagIcon = flagConf.icon;
            const isProcessing = processing.has(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${isProcessing ? "opacity-50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Fraud Score Badge */}
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                    item.fraud_score >= 70 ? "bg-red-50" : item.fraud_score >= 55 ? "bg-yellow-50" : "bg-orange-50"
                  }`}>
                    <span className={`text-lg font-bold ${
                      item.fraud_score >= 70 ? "text-red-600" : item.fraud_score >= 55 ? "text-yellow-600" : "text-orange-600"
                    }`}>
                      {item.fraud_score}
                    </span>
                    <span className="text-[8px] text-gray-500">fraud</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-dark">
                          إعلان #{item.listing_id?.slice(0, 8) || item.id.slice(0, 8)}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>ثقة: {Math.round((item.confidence || 0) * 100)}%</span>
                          <span>{item.created_at ? new Date(item.created_at).toLocaleString("ar-EG") : ""}</span>
                        </div>
                      </div>
                    </div>

                    {/* Flag reasons */}
                    <div className="space-y-1 mt-3">
                      {(item.reasons || []).map((reason, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${flagConf.color.split(" ")[1]}`}>
                          <FlagIcon size={14} className={flagConf.color.split(" ")[0]} />
                          <span className="text-xs font-medium text-dark">{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions — one-click approve/reject */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAction(item.id, "approved")}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1B7A3D] text-white hover:bg-[#145C2E] transition-colors disabled:opacity-50"
                      >
                        <Check size={16} />
                        وافق
                      </button>
                      <button
                        onClick={() => handleAction(item.id, "rejected")}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <X size={16} />
                        ارفض
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
          قواعد التوزيع
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 rounded-xl">
            <span className="text-lg flex-shrink-0">✅</span>
            <div>
              <p className="text-sm font-medium text-dark">fraud_score 0-39 — موافقة تلقائية</p>
              <p className="text-xs text-gray-600 mt-0.5">مازن يوافق فوراً بدون تدخل بشري</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 bg-yellow-50 rounded-xl">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-medium text-dark">fraud_score 40-79 — قائمة انتظار ممدوح</p>
              <p className="text-xs text-gray-600 mt-0.5">يحتاج قرار بشري — وافق أو ارفض بضغطة واحدة</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 rounded-xl">
            <span className="text-lg flex-shrink-0">❌</span>
            <div>
              <p className="text-sm font-medium text-dark">fraud_score 80+ — رفض تلقائي</p>
              <p className="text-xs text-gray-600 mt-0.5">مازن يرفض فوراً — spam أو احتيال واضح</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
