"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  Star,
  Clock,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { getAdminHeaders, useAdmin } from "@/app/admin/layout";
import { supabase } from "@/lib/supabase/client";
import type {
  CSConversation,
  CSMessage,
  CSTemplate,
  CSConversationStatus,
} from "@/types/cs";
import { CS_STATUS_CONFIG, CS_PRIORITY_CONFIG, CS_CATEGORY_CONFIG } from "@/types/cs";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

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

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const admin = useAdmin();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<CSConversation | null>(null);
  const [messages, setMessages] = useState<CSMessage[]>([]);
  const [templates, setTemplates] = useState<CSTemplate[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch conversation + messages
  const fetchData = useCallback(async () => {
    try {
      const headers = getAdminHeaders();

      const [convRes, msgsRes, tmplRes] = await Promise.all([
        fetch(`/api/admin/cs/conversations?status=all`, { headers }),
        fetch(
          `/api/admin/cs/messages?conversation_id=${conversationId}`,
          { headers }
        ),
        fetch(`/api/admin/cs/templates`, { headers }),
      ]);

      if (convRes.ok) {
        const data = await convRes.json();
        const conv = (data.conversations || []).find(
          (c: CSConversation) => c.id === conversationId
        );
        if (conv) setConversation(conv);
      }
      if (msgsRes.ok) {
        const data = await msgsRes.json();
        setMessages(data.messages || []);
      }
      if (tmplRes.ok) {
        const data = await tmplRes.json();
        setTemplates(
          (data.templates || []).filter((t: CSTemplate) => t.is_active)
        );
      }
    } catch {
      // Network error
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`cs_messages_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cs_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as CSMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    // Also listen to conversation updates
    const convChannel = supabase
      .channel(`cs_conv_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cs_conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          setConversation(payload.new as CSConversation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(convChannel);
    };
  }, [conversationId]);

  // Close template dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        templateRef.current &&
        !templateRef.current.contains(e.target as Node)
      ) {
        setShowTemplates(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/admin/cs/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: replyText,
          sender_type: "agent",
          sender_name: admin?.name || "خدمة العملاء",
        }),
      });

      if (res.ok) {
        setReplyText("");

        // Update status to agent_handling if not already
        if (
          conversation &&
          conversation.status !== "agent_handling" &&
          conversation.status !== "resolved"
        ) {
          await fetch("/api/admin/cs/conversations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAdminHeaders(),
            },
            body: JSON.stringify({
              action: "update_status",
              conversation_id: conversationId,
              status: "agent_handling",
              assigned_agent_id: admin?.id,
              assigned_agent_name: admin?.name,
            }),
          });
        }
      }
    } catch {
      // Network error
    }
    setSending(false);
  };

  const handleUseTemplate = (template: CSTemplate) => {
    let text = template.message_text;
    // Replace placeholders
    text = text.replace(/\{\{agent_name\}\}/g, admin?.name || "خدمة العملاء");
    text = text.replace(
      /\{\{category\}\}/g,
      CS_CATEGORY_CONFIG[conversation?.category as keyof typeof CS_CATEGORY_CONFIG]?.label || ""
    );
    setReplyText(text);
    setShowTemplates(false);
  };

  const handleUpdateStatus = async (newStatus: CSConversationStatus) => {
    try {
      await fetch("/api/admin/cs/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          action: "update_status",
          conversation_id: conversationId,
          status: newStatus,
          assigned_agent_id: admin?.id,
          assigned_agent_name: admin?.name,
        }),
      });
      setShowStatusMenu(false);
    } catch {
      // Network error
    }
  };

  const handleResolve = async () => {
    // Send closing message
    await fetch("/api/admin/cs/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminHeaders(),
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message:
          "تم حل المشكلة! 😊💚 لو عندك أي سؤال تاني — إحنا هنا.\n\nممكن تقيّم الخدمة؟ ⭐⭐⭐⭐⭐",
        sender_type: "system",
        sender_name: "النظام",
      }),
    });

    await handleUpdateStatus("resolved");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">المحادثة غير موجودة</p>
        <Link
          href="/admin/cs/conversations"
          className="text-[#1B7A3D] text-sm mt-2 inline-block"
        >
          رجوع للمحادثات
        </Link>
      </div>
    );
  }

  const statusCfg = CS_STATUS_CONFIG[conversation.status];
  const categoryCfg =
    CS_CATEGORY_CONFIG[conversation.category as keyof typeof CS_CATEGORY_CONFIG];

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/cs/conversations"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowRight size={16} />
          رجوع للمحادثات
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1B7A3D] rounded-full flex items-center justify-center text-white font-bold">
                  {(conversation.user_name || "م")[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-gray-900">
                      {conversation.user_name || "مستخدم"}
                    </h2>
                    {conversation.user_phone && (
                      <span className="text-xs text-gray-400" dir="ltr">
                        {conversation.user_phone}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg}`}
                    >
                      {statusCfg.label}
                    </span>
                    {categoryCfg && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                        {categoryCfg.icon} {categoryCfg.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>بدأت {formatTimeAgo(conversation.created_at)}</span>
                    <span>💬 {conversation.messages_count} رسالة</span>
                    {conversation.assigned_agent_name && (
                      <span>👤 {conversation.assigned_agent_name}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px] bg-[#FAFAFA]">
            {messages.map((msg) => {
              const isUser = msg.sender_type === "user";
              const isAI = msg.sender_type === "ai";
              const isSystem = msg.sender_type === "system";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-gray-100 text-gray-500 text-xs px-4 py-2 rounded-full">
                      {msg.message}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                >
                  <div className="max-w-[75%]">
                    {/* Sender label */}
                    <div
                      className={`text-[10px] mb-1 flex items-center gap-1 ${
                        isUser
                          ? "text-gray-400"
                          : "text-gray-400 justify-end"
                      }`}
                    >
                      {isAI && <Bot size={10} className="text-purple-500" />}
                      {!isUser && !isAI && (
                        <User size={10} className="text-blue-500" />
                      )}
                      <span>{msg.sender_name || "—"}</span>
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "bg-white border border-gray-200 text-gray-900 rounded-tr-md"
                          : isAI
                          ? "bg-purple-50 border border-purple-100 text-gray-900 rounded-tl-md"
                          : "bg-[#1B7A3D] text-white rounded-tl-md"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.message}</p>
                    </div>

                    {/* Time */}
                    <div
                      className={`text-[10px] mt-1 ${
                        isUser ? "text-gray-400" : "text-gray-400 text-left"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                      {!isUser && msg.is_read && (
                        <span className="mr-1 text-green-500">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Template Picker + Reply Input */}
          <div className="border-t border-gray-200">
            {/* Action Buttons */}
            <div className="px-4 pt-3 flex flex-wrap gap-2">
              {/* Template Button */}
              <div className="relative" ref={templateRef}>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-cyan-50 text-cyan-700 rounded-xl text-xs font-medium hover:bg-cyan-100 transition-colors"
                >
                  <ClipboardList size={14} />
                  قالب
                  <ChevronDown size={12} />
                </button>

                {/* Template Dropdown */}
                {showTemplates && templates.length > 0 && (
                  <div className="absolute bottom-full mb-2 right-0 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-100">
                      <h4 className="font-bold text-sm text-gray-900">
                        اختار قالب
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {templates.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => handleUseTemplate(tmpl)}
                          className="w-full text-right p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {tmpl.name_ar}
                            </span>
                            {tmpl.shortcut && (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {tmpl.shortcut}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {tmpl.message_text}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status/Action Buttons */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw size={14} />
                  تحويل
                  <ChevronDown size={12} />
                </button>

                {showStatusMenu && (
                  <div className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="py-1">
                      {(
                        [
                          "open",
                          "ai_handling",
                          "waiting_agent",
                          "agent_handling",
                        ] as CSConversationStatus[]
                      ).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateStatus(s)}
                          className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${CS_STATUS_CONFIG[s].dot}`}
                          />
                          {CS_STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleResolve}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-medium hover:bg-green-100 transition-colors"
              >
                <CheckCircle2 size={14} />
                حل
              </button>

              <button
                onClick={() => handleUpdateStatus("waiting_agent")}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors"
              >
                <AlertTriangle size={14} />
                تصعيد
              </button>
            </div>

            {/* Reply Input */}
            <div className="p-4">
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder="اكتب رد..."
                  rows={2}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none resize-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="px-4 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-end"
                >
                  <Send size={16} />
                  إرسال
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — Conversation Info */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Conversation Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              معلومات المحادثة
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">الحالة</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg}`}
                >
                  {statusCfg.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">الفئة</span>
                <span className="font-medium text-gray-900">
                  {categoryCfg?.icon} {categoryCfg?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">الأولوية</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    CS_PRIORITY_CONFIG[conversation.priority].color
                  }`}
                >
                  {CS_PRIORITY_CONFIG[conversation.priority].label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">عدد الرسائل</span>
                <span className="font-bold text-gray-900">
                  {conversation.messages_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">AI ردت</span>
                <span className="font-medium text-gray-900">
                  {conversation.ai_handled ? "نعم" : "لا"} (
                  {conversation.ai_message_count})
                </span>
              </div>
              {conversation.assigned_agent_name && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">الموظف</span>
                  <span className="font-medium text-gray-900">
                    {conversation.assigned_agent_name}
                  </span>
                </div>
              )}
              {conversation.csat_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">التقييم</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={12}
                        className={
                          i <= conversation.csat_rating!
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              الجدول الزمني
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Clock size={12} className="text-gray-400" />
                <span className="text-gray-600">أُنشئت</span>
                <span className="mr-auto text-gray-400">
                  {formatTimeAgo(conversation.created_at)}
                </span>
              </div>
              {conversation.first_response_at && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <MessageSquare size={12} className="text-blue-400" />
                  <span className="text-gray-600">أول رد</span>
                  <span className="mr-auto text-gray-400">
                    {formatTimeAgo(conversation.first_response_at)}
                  </span>
                </div>
              )}
              {conversation.resolved_at && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span className="text-gray-600">تم الحل</span>
                  <span className="mr-auto text-gray-400">
                    {formatTimeAgo(conversation.resolved_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
