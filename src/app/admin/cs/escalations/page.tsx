"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  CheckCircle2,
  Phone,
  Clock,
  RefreshCw,
  ArrowUpRight,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Escalation {
  id: string;
  conversation_id: string;
  customer_name: string;
  customer_phone: string;
  customer_type: "whale" | "trader" | "individual";
  priority: "urgent" | "medium";
  reason: string;
  time_ago: string;
  status: "pending" | "resolved";
  resolved_at?: string;
  admin_response?: string | null;
}

const PRIORITY_CONFIG: Record<string, { label: string; emoji: string; border: string; bg: string }> = {
  urgent: {
    label: "عاجل",
    emoji: "\u{1F534}",
    border: "border-red-200",
    bg: "bg-red-50/50",
  },
  medium: {
    label: "متوسط",
    emoji: "\u{1F7E1}",
    border: "border-yellow-200",
    bg: "bg-yellow-50/30",
  },
};

const CUSTOMER_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  whale: { label: "حوت", emoji: "\u{1F40B}" },
  trader: { label: "تاجر", emoji: "\u{1F3EA}" },
  individual: { label: "فرد", emoji: "\u{1F464}" },
};

type FilterTab = "all" | "pending" | "resolved";

export default function CSEscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<{ id: string; customerName: string; reason: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const stats = {
    total: escalations.length,
    pending: escalations.filter((e) => e.status === "pending").length,
    resolved: escalations.filter((e) => e.status === "resolved").length,
  };

  const filteredEscalations = escalations.filter((e) => {
    if (activeTab === "pending") return e.status === "pending";
    if (activeTab === "resolved") return e.status === "resolved";
    return true;
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cs/escalations", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.escalations) setEscalations(data.escalations);
      }
    } catch {
      // Network error — keep empty
    }
    setLoading(false);
  };

  const handleResolve = async (id: string) => {
    try {
      await fetch("/api/admin/cs/escalations", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", escalation_id: id }),
      });
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: "resolved" as const, resolved_at: "الآن" }
            : e
        )
      );
    } catch {
      // silent
    }
  };

  const handleReply = async () => {
    if (!replyModal || !replyText.trim()) return;
    setSending(true);
    try {
      await fetch("/api/admin/cs/escalations", {
        method: "POST",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          escalation_id: replyModal.id,
          response: replyText.trim(),
        }),
      });
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === replyModal.id
            ? { ...e, status: "resolved" as const, resolved_at: "الآن", admin_response: replyText.trim() }
            : e
        )
      );
      setReplyModal(null);
      setReplyText("");
    } catch {
      // silent
    }
    setSending(false);
  };

  useEffect(() => {
    handleRefresh();
    // Auto-refresh every 30 seconds
    const interval = setInterval(handleRefresh, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpRight size={24} className="text-red-500" />
            التصعيدات
          </h1>
          <p className="text-sm text-gray-500 mt-1">الحالات اللي سارة حوّلتها وتحتاج تدخل ممدوح</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">إجمالي التصعيدات</div>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{stats.pending}</div>
          <div className="text-xs text-gray-500 mt-1">تحتاج رد</div>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
          <div className="text-xs text-gray-500 mt-1">تم الرد</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "all", label: "الكل" },
            { key: "pending", label: `تحتاج رد (${stats.pending})` },
            { key: "resolved", label: "تم الرد" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#1B7A3D] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Escalation Cards */}
      <div className="space-y-3">
        {filteredEscalations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-300 mb-3" />
            <p className="text-gray-500 text-sm">
              {activeTab === "pending" ? "مفيش تصعيدات تحتاج رد حالياً" : "مفيش تصعيدات حالياً"}
            </p>
          </div>
        ) : (
          filteredEscalations.map((esc) => {
            const priorityCfg = PRIORITY_CONFIG[esc.priority];
            const typeCfg = CUSTOMER_TYPE_LABELS[esc.customer_type];

            return (
              <div
                key={esc.id}
                className={`bg-white rounded-2xl border p-4 hover:shadow-md transition-shadow ${
                  esc.status === "pending"
                    ? `${priorityCfg.border} ${priorityCfg.bg}`
                    : "border-gray-200 opacity-75"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Priority Indicator */}
                  <div className="pt-1 text-xl">{priorityCfg.emoji}</div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900">{esc.customer_name}</span>
                      {esc.customer_phone && (
                        <span className="text-xs text-gray-400" dir="ltr">
                          {esc.customer_phone}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                        {typeCfg.emoji} {typeCfg.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          esc.priority === "urgent"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {priorityCfg.label}
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-sm text-gray-700 mb-2">{esc.reason}</p>

                    {/* Admin Response (if exists) */}
                    {esc.admin_response && (
                      <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-2">
                        <p className="text-[10px] text-green-600 font-bold mb-1">رد ممدوح:</p>
                        <p className="text-sm text-green-800">{esc.admin_response}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {esc.time_ago}
                      </span>
                      {esc.status === "resolved" && esc.resolved_at && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={12} />
                          تم الرد {esc.resolved_at}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {esc.conversation_id && (
                      <Link
                        href={`/admin/cs/conversations/${esc.conversation_id}`}
                        className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        <Eye size={14} />
                        المحادثة
                      </Link>
                    )}

                    {esc.status === "pending" && (
                      <>
                        <button
                          onClick={() => {
                            setReplyModal({ id: esc.id, customerName: esc.customer_name, reason: esc.reason });
                            setReplyText("");
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-[#1B7A3D] text-white rounded-xl text-xs font-medium hover:bg-[#145C2E] transition-colors"
                        >
                          <MessageSquare size={14} />
                          رد على العميل
                        </button>
                        <button
                          onClick={() => handleResolve(esc.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-medium hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          تم الحل
                        </button>
                        <a
                          href={`tel:${esc.customer_phone}`}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Phone size={14} />
                          اتصل
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReplyModal(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">رد على {replyModal.customerName}</h3>
              <button onClick={() => setReplyModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-[10px] text-gray-500 mb-1">المشكلة:</p>
              <p className="text-sm text-gray-700">{replyModal.reason}</p>
            </div>

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/20 resize-none"
              placeholder="اكتب ردك هنا... (هيوصل للعميل في المحادثة)"
              autoFocus
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-bold hover:bg-[#145C2E] transition-colors disabled:opacity-50"
              >
                <Send size={16} />
                {sending ? "بيتبعت..." : "أرسل الرد"}
              </button>
              <button
                onClick={() => setReplyModal(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
