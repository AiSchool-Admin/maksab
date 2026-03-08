"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Inbox, MessageCircle, Send, User, Clock, CheckCheck, AlertCircle,
  Phone, MessageSquare, Mail, ChevronLeft, ChevronRight, RefreshCw,
  Plus, X, Search
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Conversation {
  id: string;
  customer_id: string;
  channel: string;
  direction: string;
  content: string | null;
  status: string;
  sentiment: string | null;
  requires_human_response: boolean;
  agent_id: string | null;
  created_at: string;
  crm_customers?: {
    full_name: string;
    phone: string;
    whatsapp: string | null;
  };
}

interface CustomerSearchResult {
  id: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  preferred_channel: string;
  do_not_contact: boolean;
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
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/crm/inbox?page=${page}&limit=${limit}&sort_by=created_at&sort_order=desc`;
      if (channelFilter) url += `&channel=${channelFilter}`;
      if (directionFilter) url += `&direction=${directionFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await fetch(url, { headers: getAdminHeaders() });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, channelFilter, directionFilter, statusFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const totalPages = Math.ceil(total / limit);
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
        <div className="flex gap-2">
          <button onClick={fetchConversations} className="flex items-center gap-1 px-3 py-2 border rounded-xl text-xs hover:bg-gray-50">
            <RefreshCw size={14} />
            تحديث
          </button>
          <button
            onClick={() => setShowComposeModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors"
          >
            <Plus size={16} />
            رسالة جديدة
          </button>
        </div>
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
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-xl text-xs bg-white">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2.5 text-right">العميل</th>
                <th className="px-3 py-2.5 text-right">القناة</th>
                <th className="px-3 py-2.5 text-right">الاتجاه</th>
                <th className="px-3 py-2.5 text-right">المحتوى</th>
                <th className="px-3 py-2.5 text-right">الحالة</th>
                <th className="px-3 py-2.5 text-right">المشاعر</th>
                <th className="px-3 py-2.5 text-right">يحتاج رد</th>
                <th className="px-3 py-2.5 text-right">التاريخ</th>
                <th className="px-3 py-2.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Inbox size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-400 text-sm mb-1">لا توجد محادثات بعد</p>
                    <p className="text-gray-400 text-xs mb-3">المحادثات مع العملاء ستظهر هنا</p>
                    <button
                      onClick={() => setShowComposeModal(true)}
                      className="px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-xs font-medium hover:bg-[#145C2E]"
                    >
                      <Plus size={14} className="inline ml-1" />
                      أرسل أول رسالة
                    </button>
                  </td>
                </tr>
              ) : (
                conversations.map(c => {
                  const ChannelIcon = CHANNEL_ICONS[c.channel] || MessageCircle;
                  const customerName = c.crm_customers?.full_name || "—";
                  return (
                    <tr key={c.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedConversation(c)}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <User size={12} className="text-gray-500" />
                          </div>
                          <span className="text-xs font-medium">{customerName}</span>
                        </div>
                      </td>
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
                        <p className="text-xs truncate max-w-[200px]">{c.content || "—"}</p>
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
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowComposeModal(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[#E8F5E9] text-[#1B7A3D] transition-colors"
                          title="رد سريع"
                        >
                          <Send size={14} />
                        </button>
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
        <ConversationDetailModal
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
          onReply={() => {
            setSelectedConversation(null);
            setShowComposeModal(true);
          }}
        />
      )}

      {/* Compose Message Modal */}
      {showComposeModal && (
        <ComposeMessageModal
          onClose={() => setShowComposeModal(false)}
          onSent={() => {
            setShowComposeModal(false);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
}

function ConversationDetailModal({
  conversation,
  onClose,
  onReply,
}: {
  conversation: Conversation;
  onClose: () => void;
  onReply: () => void;
}) {
  const [threadMessages, setThreadMessages] = useState<Conversation[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  useEffect(() => {
    if (!conversation.customer_id) return;
    setLoadingThread(true);
    fetch(`/api/admin/crm/inbox?customer_id=${conversation.customer_id}&limit=20&sort_by=created_at&sort_order=asc`, {
      headers: getAdminHeaders(),
    })
      .then(r => r.json())
      .then(data => setThreadMessages(data.conversations || []))
      .catch(() => {})
      .finally(() => setLoadingThread(false));
  }, [conversation.customer_id]);

  const customerName = conversation.crm_customers?.full_name || "عميل";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <MessageCircle size={16} className="text-[#1B7A3D]" />
            محادثة مع {customerName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>

        {/* Thread Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingThread ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-[#1B7A3D] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400 mt-2">جاري تحميل المحادثة...</p>
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">لا توجد رسائل سابقة</p>
            </div>
          ) : (
            threadMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.direction === 'outbound'
                      ? 'bg-[#1B7A3D] text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content || "—"}</p>
                  <div className={`flex items-center gap-1.5 mt-1 ${msg.direction === 'outbound' ? 'text-green-200' : 'text-gray-400'}`}>
                    <span className="text-[10px]">
                      {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[10px]">{CHANNEL_LABELS[msg.channel] || msg.channel}</span>
                    {msg.direction === 'outbound' && (
                      <CheckCheck size={12} className={msg.status === 'read' ? 'text-blue-300' : ''} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Button */}
        <div className="p-3 border-t shrink-0">
          <button
            onClick={onReply}
            className="w-full py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] flex items-center justify-center gap-2"
          >
            <Send size={16} />
            رد على العميل
          </button>
        </div>
      </div>
    </div>
  );
}

function ComposeMessageModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [step, setStep] = useState<"search" | "compose">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [channel, setChannel] = useState("whatsapp");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/crm/customers?search=${encodeURIComponent(query)}&limit=10`, {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.customers || []);
      }
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCustomers]);

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setChannel(customer.preferred_channel || "whatsapp");
    setStep("compose");
  };

  const handleSend = async () => {
    if (!selectedCustomer || !content.trim()) {
      setError("اكتب محتوى الرسالة");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/crm/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          channel,
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حصل مشكلة في الإرسال");
        setSending(false);
        return;
      }

      setSuccess("تم إرسال الرسالة بنجاح ✓");
      setTimeout(() => onSent(), 1000);
    } catch {
      setError("حصل مشكلة في الاتصال");
    }
    setSending(false);
  };

  // Quick message templates
  const quickTemplates = [
    { label: "ترحيب", text: `مرحباً ${selectedCustomer?.full_name || ""}! 👋\nأهلاً بيك في مكسب. إزاي نقدر نساعدك النهاردة؟` },
    { label: "متابعة", text: `مرحباً ${selectedCustomer?.full_name || ""}!\nعايزين نطمن عليك — محتاج مساعدة في حاجة؟` },
    { label: "عرض خاص", text: `مرحباً ${selectedCustomer?.full_name || ""}! 🎉\nعندنا عرض خاص ليك على مكسب. تحب تعرف التفاصيل؟` },
    { label: "تفعيل", text: `مرحباً ${selectedCustomer?.full_name || ""}!\nلاحظنا إنك لسه ما نشرتش إعلانك الأول. محتاج مساعدة؟ فريقنا جاهز يساعدك 💚` },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Send size={16} className="text-[#1B7A3D]" />
            {step === "search" ? "اختار العميل" : "إرسال رسالة"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {step === "search" ? (
          /* Step 1: Search & Select Customer */
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الموبايل..."
                className="w-full border rounded-xl px-3 py-2.5 pr-10 text-sm"
                autoFocus
              />
            </div>

            {searching && (
              <div className="text-center py-4">
                <div className="w-5 h-5 border-2 border-[#1B7A3D] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <p className="text-center text-xs text-gray-400 py-4">لا يوجد نتائج</p>
            )}

            {searchResults.map(customer => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                disabled={customer.do_not_contact}
                className={`w-full text-right p-3 rounded-xl border hover:bg-gray-50 transition-colors ${
                  customer.do_not_contact ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#1B7A3D] text-sm font-bold">
                    {customer.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{customer.full_name}</p>
                    <p className="text-xs text-gray-500" dir="ltr">{customer.phone}</p>
                  </div>
                  {customer.do_not_contact && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">لا تتواصل</span>
                  )}
                </div>
              </button>
            ))}

            {searchQuery.length < 2 && (
              <p className="text-center text-xs text-gray-400 py-4">اكتب اسم أو رقم العميل للبحث</p>
            )}
          </div>
        ) : (
          /* Step 2: Compose Message */
          <div className="p-4 space-y-4">
            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#1B7A3D] text-sm font-bold">
                  {selectedCustomer.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{selectedCustomer.full_name}</p>
                  <p className="text-xs text-gray-500" dir="ltr">{selectedCustomer.phone}</p>
                </div>
                <button onClick={() => { setStep("search"); setSelectedCustomer(null); }}
                  className="text-xs text-[#1B7A3D] hover:underline">تغيير</button>
              </div>
            )}

            {/* Channel Selection */}
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">القناة</label>
              <div className="flex gap-2">
                {Object.entries(CHANNEL_LABELS).map(([key, label]) => {
                  const Icon = CHANNEL_ICONS[key] || MessageCircle;
                  return (
                    <button
                      key={key}
                      onClick={() => setChannel(key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-colors ${
                        channel === key
                          ? 'bg-[#1B7A3D] text-white border-[#1B7A3D]'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">رسائل جاهزة</label>
              <div className="flex gap-2 flex-wrap">
                {quickTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setContent(tpl.text)}
                    className="px-3 py-1.5 bg-[#E8F5E9] text-[#1B7A3D] rounded-full text-[11px] font-medium hover:bg-[#d0ecd3] transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Content */}
            <div>
              <label className="text-xs text-gray-600 block mb-1.5">محتوى الرسالة</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none"
                rows={5}
                autoFocus
              />
              <p className="text-[10px] text-gray-400 mt-1">{content.length} حرف</p>
            </div>

            {/* Error / Success */}
            {error && <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg">{error}</div>}
            {success && <div className="bg-green-50 text-green-600 text-xs p-2.5 rounded-lg">{success}</div>}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setStep("search"); setSelectedCustomer(null); setContent(""); }}
                className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50"
              >
                رجوع
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !content.trim()}
                className="flex-1 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    إرسال
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
