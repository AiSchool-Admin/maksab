"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Bot,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  RefreshCw,
  ExternalLink,
  Search,
  Headphones,
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";
import { supabase } from "@/lib/supabase/client";
import type {
  CSConversation,
  CSConversationStatus,
  CSCategory,
} from "@/types/cs";
import {
  CS_STATUS_CONFIG,
  CS_PRIORITY_CONFIG,
  CS_CATEGORY_CONFIG,
} from "@/types/cs";

type FilterTab = "all" | "open" | "ai_handling" | "waiting_agent" | "agent_handling" | "resolved";

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default function CSConversationsPage() {
  const [conversations, setConversations] = useState<CSConversation[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(
        `/api/admin/cs/conversations?${params.toString()}`,
        { headers: getAdminHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Network error
    }
    setLoading(false);
  }, [activeTab, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime subscription for conversation updates
  useEffect(() => {
    const channel = supabase
      .channel("cs_conversations_list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cs_conversations" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const stats = {
    total: conversations.length,
    open: conversations.filter((c) => c.status === "open").length,
    ai: conversations.filter((c) => c.status === "ai_handling").length,
    waiting: conversations.filter((c) => c.status === "waiting_agent").length,
    agent: conversations.filter((c) => c.status === "agent_handling").length,
    resolved: conversations.filter((c) => c.status === "resolved" || c.status === "closed").length,
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: stats.total },
    { key: "open", label: "جديدة", count: stats.open },
    { key: "ai_handling", label: "سارة AI", count: stats.ai },
    { key: "waiting_agent", label: "منتظرة موظف", count: stats.waiting },
    { key: "agent_handling", label: "موظف بيرد", count: stats.agent },
    { key: "resolved", label: "محلولة", count: stats.resolved },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Headphones size={24} className="text-[#1B7A3D]" />
            محادثات خدمة العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة محادثات الشات الداخلي مع المستخدمين
          </p>
        </div>
        <button
          onClick={fetchConversations}
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
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">جديدة:</span>
            <span className="font-bold text-red-600">{stats.open}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-yellow-500" />
            <span className="text-gray-600">سارة AI:</span>
            <span className="font-bold text-yellow-600">{stats.ai}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-500" />
            <span className="text-gray-600">منتظرة:</span>
            <span className="font-bold text-orange-600">{stats.waiting}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <User size={16} className="text-blue-500" />
            <span className="text-gray-600">موظف:</span>
            <span className="font-bold text-blue-600">{stats.agent}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-gray-600">محلولة:</span>
            <span className="font-bold text-green-600">{stats.resolved}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الموبايل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
          />
        </div>
        <div className="relative">
          <Filter
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none appearance-none"
          >
            <option value="all">كل الفئات</option>
            <option value="general">عام</option>
            <option value="registration">تسجيل</option>
            <option value="listing">إعلانات</option>
            <option value="payment">دفع</option>
            <option value="complaint">شكوى</option>
            <option value="technical">تقني</option>
            <option value="fraud">احتيال</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
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
            {tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="space-y-3">
        {loading && conversations.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-3 h-3 rounded-full bg-gray-200 mt-1.5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">لا توجد محادثات بعد</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const statusCfg = CS_STATUS_CONFIG[conv.status];
            const priorityCfg = CS_PRIORITY_CONFIG[conv.priority];
            const categoryCfg = CS_CATEGORY_CONFIG[conv.category as CSCategory];

            return (
              <Link
                key={conv.id}
                href={`/admin/cs/conversations/${conv.id}`}
                className={`block bg-white rounded-2xl border p-4 hover:shadow-md transition-all ${
                  conv.status === "waiting_agent"
                    ? "border-orange-200 bg-orange-50/30"
                    : conv.priority === "urgent"
                    ? "border-red-200 bg-red-50/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Dot */}
                  <div className="pt-1.5">
                    <div
                      className={`w-3 h-3 rounded-full ${statusCfg.dot} ${
                        conv.status === "waiting_agent" || conv.priority === "urgent"
                          ? "animate-pulse"
                          : ""
                      }`}
                    />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900">
                        {conv.user_name || "مستخدم"}
                      </span>
                      {conv.user_phone && (
                        <span className="text-xs text-gray-400" dir="ltr">
                          {conv.user_phone}
                        </span>
                      )}
                      {/* Category Badge */}
                      {categoryCfg && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                          {categoryCfg.icon} {categoryCfg.label}
                        </span>
                      )}
                      {/* Priority Badge */}
                      {conv.priority !== "normal" && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityCfg.color}`}
                        >
                          {priorityCfg.label}
                        </span>
                      )}
                      {/* AI Badge */}
                      {conv.ai_handled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600">
                          🤖 AI
                        </span>
                      )}
                    </div>

                    {/* Last Message */}
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {conv.last_message_preview || "لا توجد رسائل بعد"}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatTimeAgo(conv.updated_at)}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg}`}
                      >
                        {statusCfg.label}
                      </span>
                      {conv.assigned_agent_name && (
                        <span className="text-gray-500">
                          👤 {conv.assigned_agent_name}
                        </span>
                      )}
                      <span className="text-gray-400">
                        💬 {conv.messages_count}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-1 px-4 py-2 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors shrink-0">
                    <ExternalLink size={14} />
                    فتح
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
