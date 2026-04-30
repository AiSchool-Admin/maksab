"use client";

/**
 * /admin/crm/escalations — Conversations Ahmed couldn't handle.
 *
 * Each row shows the recent conversation thread so a human can read
 * what happened, reply via WhatsApp manually, and either:
 *   - mark resolved (seller goes back to normal "contacted" status)
 *   - reopen (Ahmed takes the next message again)
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

interface ConversationHistoryEntry {
  role: "user" | "assistant";
  content: string;
  ts?: string;
}

interface Escalation {
  id: string;
  seller_id: string | null;
  phone: string;
  customer_name: string | null;
  category: string | null;
  governorate: string | null;
  seller_type: string | null;
  listings_count: number | null;
  stage: string;
  status: string;
  ai_conversation_history: ConversationHistoryEntry[] | null;
  ai_last_intent: string | null;
  escalation_reason: string | null;
  last_message_at: string | null;
  messages_received: number | null;
  messages_sent: number | null;
  updated_at: string;
  created_at: string;
}

export default function EscalationsPage() {
  const [items, setItems] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/crm/escalations", { headers });
      if (res.ok) {
        const json = await res.json();
        setItems(json.escalations || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (
    id: string,
    action: "resolved" | "reopened"
  ) => {
    setBusyId(id);
    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/crm/escalations", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ conversation_id: id, action }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const json = await res.json();
        alert(json.error || "فشل في التحديث");
      }
    } catch (err) {
      console.error(err);
    }
    setBusyId(null);
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const intl = cleaned.startsWith("20") ? cleaned : `2${cleaned}`;
    window.open(`https://wa.me/${intl}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm"
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                📥 محتاج رد إنسان
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                المحادثات اللي أحمد لم يتمكن من التعامل معاها
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="تحديث"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading && items.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            ⏳ جاري التحميل...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg text-gray-700 font-medium mb-2">
              مفيش محادثات محتاجة رد بشري
            </p>
            <p className="text-sm text-gray-500">أحمد بيـحتوي كل المحادثات حالياً ✨</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">
                  {items.length} محادثة محتاجة تدخّل بشري
                </p>
                <p className="text-xs mt-0.5 text-amber-700">
                  أحمد توقف عن الرد. اقرأ المحادثة، رد يدوياً عبر WhatsApp،
                  ثم علّم "تم الحل".
                </p>
              </div>
            </div>

            {items.map((conv) => {
              const history = conv.ai_conversation_history || [];
              const recent = history.slice(-6);
              return (
                <div
                  key={conv.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Header */}
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">
                          {conv.customer_name || "—"}
                        </span>
                        {conv.seller_type === "whale" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                            🐋 حوت
                          </span>
                        )}
                        {conv.seller_type === "business" && (
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                            💪 شركة
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-mono">{conv.phone}</span>
                        {conv.listings_count ? (
                          <>
                            <span>·</span>
                            <span>{conv.listings_count} إعلان</span>
                          </>
                        ) : null}
                        {conv.governorate && (
                          <>
                            <span>·</span>
                            <span>{conv.governorate}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {conv.escalation_reason || "تصعيد"}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {formatRelative(conv.updated_at)}
                      </div>
                    </div>
                  </div>

                  {/* Conversation thread */}
                  <div className="px-5 py-4 space-y-2 bg-white">
                    {recent.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        لا توجد رسائل محفوظة
                      </p>
                    ) : (
                      recent.map((m, i) => (
                        <div
                          key={i}
                          className={`flex ${
                            m.role === "user"
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                              m.role === "user"
                                ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                                : "bg-emerald-50 text-emerald-900 rounded-tr-sm border border-emerald-100"
                            }`}
                          >
                            {m.role === "assistant" && (
                              <div className="text-[10px] text-emerald-700 font-medium mb-0.5">
                                أحمد
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">
                              {m.content}
                            </div>
                            {m.ts && (
                              <div className="text-[10px] opacity-50 mt-1">
                                {formatRelative(m.ts)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openWhatsApp(conv.phone)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                      افتح WhatsApp
                    </button>
                    <button
                      onClick={() => updateStatus(conv.id, "resolved")}
                      disabled={busyId === conv.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B7A3D] text-white rounded-lg text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      تم الحل
                    </button>
                    <button
                      onClick={() => updateStatus(conv.id, "reopened")}
                      disabled={busyId === conv.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      أعد لأحمد
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `منذ ${diffMin} د`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `منذ ${diffH} س`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `منذ ${diffD} يوم`;
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
