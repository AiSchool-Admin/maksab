"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Inbox, MessageCircle, Search, Filter, RefreshCw, Send,
  User, Clock, CheckCheck, AlertCircle, ArrowLeft,
  Phone, MessageSquare, Mail, ChevronLeft, ChevronRight
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Conversation {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  channel: string;
  direction: string;
  content: string | null;
  status: string;
  sentiment: string | null;
  requires_human_response: boolean;
  agent_id: string | null;
  created_at: string;
}

const CHANNEL_ICONS: Record<string, typeof Phone> = {
  whatsapp: MessageCircle,
  sms: MessageSquare,
  email: Mail,
  phone_call: Phone,
  in_app: Inbox,
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "واتساب",
  sms: "رسالة نصية",
  email: "بريد إلكتروني",
  phone_call: "مكالمة",
  in_app: "داخل التطبيق",
};

const DIRECTION_LABELS: Record<string, string> = {
  inbound: "وارد",
  outbound: "صادر",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "مرسلة",
  delivered: "تم التسليم",
  read: "مقروءة",
  replied: "تم الرد",
  failed: "فشلت",
  queued: "في الانتظار",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "text-blue-600",
  delivered: "text-green-600",
  read: "text-purple-600",
  replied: "text-[#1B7A3D]",
  failed: "text-red-600",
  queued: "text-amber-600",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "إيجابي",
  neutral: "محايد",
  negative: "سلبي",
  angry: "غاضب",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-700",
  neutral: "bg-gray-100 text-gray-700",
  negative: "bg-amber-100 text-amber-700",
  angry: "bg-red-100 text-red-700",
};

export default function CrmInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/crm/inbox?page=${page}&limit=${limit}&sort_by=created_at&sort_order=desc`;
      if (channelFilter) url += `&channel=${channelFilter}`;
      if (directionFilter) url += `&direction=${directionFilter}`;
      const res = await fetch(url, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, channelFilter, directionFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const totalPages = Math.ceil(total / limit);

  // Count stats
  const inboundCount = conversations.filter(c => c.direction === "inbound").length;
  const needsResponseCount = conversations.filter(c => c.requires_human_response).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Inbox size={20} className="text-[#1B7A3D]" />
          صندوق الوارد الموحد
        </h2>
        <button onClick={fetchConversations} className="flex items-center gap-1 px-3 py-2 border rounded-xl text-xs hover:bg-gray-50">
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Inbox size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">إجمالي المحادثات</span>
          </div>
          <p className="text-2xl font-bold">{total.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle size={16} className="text-green-600" />
            <span className="text-xs text-green-700">رسائل واردة</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{inboundCount}</p>
        </div>
        <div className={`rounded-xl p-4 border ${needsResponseCount > 0 ? 'bg-gradient-to-l from-amber-50 to-orange-50 border-amber-200' : 'bg-white'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className={needsResponseCount > 0 ? "text-amber-600" : "text-gray-400"} />
            <span className="text-xs text-gray-500">تحتاج رد</span>
          </div>
          <p className={`text-2xl font-bold ${needsResponseCount > 0 ? 'text-amber-700' : ''}`}>{needsResponseCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 mb-1">
            <Send size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500">رسائل صادرة</span>
          </div>
          <p className="text-2xl font-bold">{conversations.filter(c => c.direction === "outbound").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={channelFilter} onChange={e => { setChannelFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل القنوات</option>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={directionFilter} onChange={e => { setDirectionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل الاتجاهات</option>
          <option value="inbound">وارد</option>
          <option value="outbound">صادر</option>
        </select>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2.5 text-right">القناة</th>
                <th className="px-3 py-2.5 text-right">الاتجاه</th>
                <th className="px-3 py-2.5 text-right">المحتوى</th>
                <th className="px-3 py-2.5 text-right">الحالة</th>
                <th className="px-3 py-2.5 text-right">المشاعر</th>
                <th className="px-3 py-2.5 text-right">يحتاج رد</th>
                <th className="px-3 py-2.5 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Inbox size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-400 text-sm mb-1">لا توجد محادثات بعد</p>
                    <p className="text-gray-400 text-xs">المحادثات مع العملاء ستظهر هنا</p>
                  </td>
                </tr>
              ) : (
                conversations.map(c => {
                  const ChannelIcon = CHANNEL_ICONS[c.channel] || MessageCircle;
                  return (
                    <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedConversation(c)}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <ChannelIcon size={14} className="text-gray-500" />
                          <span className="text-xs">{CHANNEL_LABELS[c.channel] || c.channel}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs ${c.direction === 'inbound' ? 'text-blue-600' : 'text-gray-500'}`}>
                          {DIRECTION_LABELS[c.direction] || c.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs truncate max-w-[250px]">{c.content || "—"}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs ${STATUS_COLORS[c.status] || 'text-gray-500'}`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {c.sentiment ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${SENTIMENT_COLORS[c.sentiment] || 'bg-gray-100 text-gray-700'}`}>
                            {SENTIMENT_LABELS[c.sentiment] || c.sentiment}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c.requires_human_response ? (
                          <AlertCircle size={14} className="text-amber-500 mx-auto" />
                        ) : (
                          <CheckCheck size={14} className="text-green-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-gray-500">
              صفحة {page} من {totalPages} ({total} محادثة)
            </p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedConversation(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MessageCircle size={16} className="text-[#1B7A3D]" />
                تفاصيل المحادثة
              </h3>
              <button onClick={() => setSelectedConversation(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">القناة:</span>
                  <p className="font-medium">{CHANNEL_LABELS[selectedConversation.channel] || selectedConversation.channel}</p>
                </div>
                <div>
                  <span className="text-gray-500">الاتجاه:</span>
                  <p className="font-medium">{DIRECTION_LABELS[selectedConversation.direction]}</p>
                </div>
                <div>
                  <span className="text-gray-500">الحالة:</span>
                  <p className={`font-medium ${STATUS_COLORS[selectedConversation.status]}`}>
                    {STATUS_LABELS[selectedConversation.status] || selectedConversation.status}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">التاريخ:</span>
                  <p className="font-medium">
                    {new Date(selectedConversation.created_at).toLocaleDateString("ar-EG", {
                      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
              {selectedConversation.content && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-xs text-gray-500 block mb-1">المحتوى:</span>
                  <p className="text-sm whitespace-pre-wrap">{selectedConversation.content}</p>
                </div>
              )}
              {selectedConversation.sentiment && (
                <div>
                  <span className="text-xs text-gray-500">المشاعر: </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${SENTIMENT_COLORS[selectedConversation.sentiment]}`}>
                    {SENTIMENT_LABELS[selectedConversation.sentiment]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
