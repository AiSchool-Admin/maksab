"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Bot,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Filter,
  RefreshCw,
  ExternalLink,
  Search,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  channel: "whatsapp" | "chat" | "email";
  customer_type: "whale" | "trader" | "individual";
  status: "escalation" | "ai_active" | "human_active" | "waiting" | "resolved";
  last_message: string;
  time_ago: string;
  unread_count: number;
  ai_handled: boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "واتساب",
  chat: "شات",
  email: "بريد",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-700",
  chat: "bg-blue-100 text-blue-700",
  email: "bg-purple-100 text-purple-700",
};

const CUSTOMER_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  whale: { label: "حوت", emoji: "🐋" },
  trader: { label: "تاجر", emoji: "🏪" },
  individual: { label: "فرد", emoji: "👤" },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  escalation: { label: "تصعيد", dot: "bg-red-500", bg: "bg-red-50 text-red-700" },
  ai_active: { label: "🤖 AI", dot: "bg-yellow-400", bg: "bg-yellow-50 text-yellow-700" },
  human_active: { label: "👤 بشري", dot: "bg-blue-500", bg: "bg-blue-50 text-blue-700" },
  waiting: { label: "انتظار", dot: "bg-orange-400", bg: "bg-orange-50 text-orange-700" },
  resolved: { label: "✅ حُلّ", dot: "bg-green-500", bg: "bg-green-50 text-green-700" },
};

type FilterTab = "all" | "ai" | "human" | "escalation";

export default function CSConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const stats = {
    active: conversations.filter((c) => c.status !== "resolved").length,
    ai: conversations.filter((c) => c.status === "ai_active").length,
    human: conversations.filter((c) => c.status === "human_active").length,
    waiting: conversations.filter((c) => c.status === "waiting").length,
    resolved: conversations.filter((c) => c.status === "resolved").length,
  };

  const filteredConversations = conversations.filter((c) => {
    if (activeTab === "ai" && c.status !== "ai_active") return false;
    if (activeTab === "human" && c.status !== "human_active") return false;
    if (activeTab === "escalation" && c.status !== "escalation") return false;
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.customer_name.includes(q) ||
        c.customer_phone.includes(q) ||
        c.last_message.includes(q)
      );
    }
    return true;
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cs/conversations", {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations) setConversations(data.conversations);
      }
    } catch {
      // Network error — keep empty
    }
    setLoading(false);
  };

  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المحادثات</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة محادثات خدمة العملاء</p>
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

      {/* Stats Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#1B7A3D]" />
            <span className="font-bold text-gray-900">نشطة:</span>
            <span className="text-lg font-bold text-[#1B7A3D]">{stats.active}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-yellow-500" />
            <span className="text-gray-600">🤖 AI:</span>
            <span className="font-bold text-yellow-600">{stats.ai}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <User size={16} className="text-blue-500" />
            <span className="text-gray-600">👤 بشري:</span>
            <span className="font-bold text-blue-600">{stats.human}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-500" />
            <span className="text-gray-600">⏳ انتظار:</span>
            <span className="font-bold text-orange-600">{stats.waiting}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-gray-600">✅ حُلّت:</span>
            <span className="font-bold text-green-600">{stats.resolved}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الموبايل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
          />
        </div>

        {/* Channel Filter */}
        <div className="relative">
          <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none appearance-none"
          >
            <option value="all">القناة ▼</option>
            <option value="whatsapp">واتساب</option>
            <option value="chat">شات</option>
            <option value="email">بريد</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            { key: "all", label: "الكل", icon: MessageSquare },
            { key: "ai", label: "🤖 AI فقط", icon: Bot },
            { key: "human", label: "👤 بشري", icon: User },
            { key: "escalation", label: "⚠️ تصعيدات", icon: AlertTriangle },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-[#1B7A3D] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="space-y-3">
        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">{conversations.length === 0 ? "لا توجد محادثات بعد" : "مفيش محادثات تطابق الفلتر"}</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const statusCfg = STATUS_CONFIG[conv.status];
            const typeCfg = CUSTOMER_TYPE_LABELS[conv.customer_type];

            return (
              <div
                key={conv.id}
                className={`bg-white rounded-2xl border p-4 hover:shadow-md transition-shadow ${
                  conv.status === "escalation"
                    ? "border-red-200 bg-red-50/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Dot */}
                  <div className="pt-1.5">
                    <div className={`w-3 h-3 rounded-full ${statusCfg.dot} ${
                      conv.status === "escalation" ? "animate-pulse" : ""
                    }`} />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Customer Name */}
                      <span className="font-bold text-gray-900">{conv.customer_name}</span>

                      {/* Phone */}
                      <span className="text-xs text-gray-400" dir="ltr">
                        {conv.customer_phone}
                      </span>

                      {/* Channel Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          CHANNEL_COLORS[conv.channel]
                        }`}
                      >
                        {CHANNEL_LABELS[conv.channel]}
                      </span>

                      {/* Customer Type Badge */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                        {typeCfg.emoji} {typeCfg.label}
                      </span>

                      {/* Unread Badge */}
                      {conv.unread_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Last Message */}
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {conv.last_message}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{conv.time_ago}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/admin/cs/conversations/${conv.id}`}
                    className="flex items-center gap-1 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors shrink-0"
                  >
                    <ExternalLink size={14} />
                    فتح
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
