"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Star,
  Headphones,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { CSMessage, CSConversation, CSCategory } from "@/types/cs";

interface QuickAction {
  label: string;
  category: CSCategory;
  message: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "تسجيل", category: "registration", message: "عايز أعرف إزاي أسجّل" },
  { label: "نشر إعلان", category: "listing", message: "عايز أنشر إعلان" },
  { label: "مشكلة تقنية", category: "technical", message: "عندي مشكلة تقنية" },
  { label: "شكوى", category: "complaint", message: "عايز أقدم شكوى" },
  { label: "أخرى", category: "general", message: "" },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CSSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<CSConversation | null>(null);
  const [messages, setMessages] = useState<CSMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("maksab_session_token");
  };

  const getHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const isLoggedIn = (): boolean => {
    return !!getAuthToken();
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch existing conversation
  const fetchConversation = useCallback(async () => {
    if (!isLoggedIn()) return;

    try {
      const res = await fetch("/api/cs/chat", {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setConversation(data.conversation);
          setMessages(data.messages || []);

          // Check if resolved and should show rating
          if (
            data.conversation.status === "resolved" &&
            !data.conversation.csat_rating
          ) {
            setShowRating(true);
          }
        }
      }
    } catch {
      // Network error
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConversation();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, fetchConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`cs_user_${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cs_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as CSMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Increment unread if chat is closed and message is not from user
          if (!isOpen && newMsg.sender_type !== "user") {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    // Also listen to conversation status changes
    const convChannel = supabase
      .channel(`cs_conv_user_${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cs_conversations",
          filter: `id=eq.${conversation.id}`,
        },
        (payload) => {
          const updated = payload.new as CSConversation;
          setConversation(updated);
          if (updated.status === "resolved" && !updated.csat_rating) {
            setShowRating(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(convChannel);
    };
  }, [conversation?.id, isOpen]);

  const handleQuickAction = async (action: QuickAction) => {
    if (!isLoggedIn()) return;
    setSending(true);

    try {
      const res = await fetch("/api/cs/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({
          action: "start",
          category: action.category,
          message: action.message || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);
      }
    } catch {
      // Network error
    }
    setSending(false);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      if (!conversation) {
        // Start new conversation
        const res = await fetch("/api/cs/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getHeaders(),
          },
          body: JSON.stringify({
            action: "start",
            category: "general",
            message: text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setConversation(data.conversation);
          setMessages(data.messages || []);
        }
      } else {
        // Send to existing conversation
        const res = await fetch("/api/cs/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getHeaders(),
          },
          body: JSON.stringify({
            action: "send",
            conversation_id: conversation.id,
            message: text,
          }),
        });
        if (res.ok) {
          // Message will come via realtime, but also refresh
          await fetchConversation();
        }
      }
    } catch {
      // Network error
    }
    setSending(false);
  };

  const handleRate = async (stars: number) => {
    setRating(stars);
    try {
      await fetch("/api/cs/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({
          action: "rate",
          conversation_id: conversation?.id,
          rating: stars,
        }),
      });
      setShowRating(false);
    } catch {
      // Network error
    }
  };

  // Don't show for non-logged-in users
  if (!isLoggedIn()) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 w-14 h-14 bg-[#145C2E] text-white rounded-full shadow-lg hover:bg-[#1B7A3D] z-40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="مساعدة مكسب"
        >
          <Headphones size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 sm:bottom-6 sm:left-6 w-full sm:w-96 h-[100dvh] sm:h-[520px] bg-white sm:rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-[#1B7A3D] to-[#145C2E] text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Headphones size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm">مساعدة مكسب</h3>
                <p className="text-[10px] text-white/70">
                  {conversation?.status === "agent_handling"
                    ? `${conversation.assigned_agent_name || "موظف"} بيرد`
                    : conversation?.status === "ai_handling"
                    ? "سارة AI بترد"
                    : "أهلاً بيك!"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]" dir="rtl">
            {messages.length === 0 && !conversation ? (
              // Welcome screen with quick actions
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot size={32} className="text-purple-500" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">
                  أهلاً! أنا سارة 🤖
                </h4>
                <p className="text-sm text-gray-500 mb-6">
                  إزاي أقدر أساعدك؟
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action)}
                      disabled={sending}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:border-[#1B7A3D] transition-all disabled:opacity-50"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Chat messages
              messages.map((msg) => {
                const isUser = msg.sender_type === "user";
                const isSystem = msg.sender_type === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="bg-gray-100 text-gray-500 text-[10px] px-3 py-1 rounded-full">
                        {msg.message}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
                      {/* Sender icon */}
                      {!isUser && (
                        <div className="flex items-center gap-1 mb-0.5">
                          {msg.sender_type === "ai" ? (
                            <Bot size={10} className="text-purple-500" />
                          ) : (
                            <User size={10} className="text-blue-500" />
                          )}
                          <span className="text-[10px] text-gray-400">
                            {msg.sender_name}
                          </span>
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          isUser
                            ? "bg-[#1B7A3D] text-white rounded-bl-md"
                            : msg.sender_type === "ai"
                            ? "bg-purple-50 border border-purple-100 text-gray-900 rounded-br-md"
                            : "bg-white border border-gray-200 text-gray-900 rounded-br-md"
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.message}</p>
                      </div>

                      <div
                        className={`text-[10px] mt-0.5 ${
                          isUser ? "text-left" : "text-right"
                        } text-gray-400`}
                      >
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Rating prompt */}
            {showRating && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  قيّم الخدمة
                </p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => handleRate(i)}
                      className="transition-transform hover:scale-125"
                    >
                      <Star
                        size={24}
                        className={
                          i <= rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 shrink-0" dir="rtl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="اكتب رسالتك..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="px-4 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm hover:bg-[#145C2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
