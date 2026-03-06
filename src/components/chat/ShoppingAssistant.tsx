"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Search, ShoppingBag, ArrowLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actionType?: "search" | "compare" | "info" | "general";
  suggestedFilters?: Record<string, unknown>;
}

interface ShoppingAssistantProps {
  onClose?: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "أهلاً! أنا مكسب بوت 🤖 مساعدك الذكي للتسوق.\n\nقولي بتدور على إيه وأنا هلاقيهولك!\n\nمثلاً:\n• \"عايز آيفون 15 تحت 20 ألف\"\n• \"كام سعر تويوتا كورولا 2020؟\"\n• \"إيه أحسن غسالة في حدود 5000؟\"",
  actionType: "general",
};

const QUICK_SUGGESTIONS = [
  "آيفون تحت 20 ألف",
  "شقة في مدينة نصر",
  "سيارة مستعملة",
];

export default function ShoppingAssistant({ onClose }: ShoppingAssistantProps) {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessageWithText = useCallback(async (text: string) => {
    if (!text || isLoading) return;

    // Require auth before sending — opens login sheet for visitors
    const authedUser = await requireAuth();
    if (!authedUser) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .concat(userMsg)
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const { authFetch } = await import("@/lib/utils/auth-fetch");
      const res = await authFetch("/api/chat/shopping-assistant", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          conversation_history: conversationHistory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.response || "معلش، مقدرتش أفهم. جرب تاني.",
          actionType: data.actionType,
          suggestedFilters: data.suggestedFilters,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "عديت الحد المسموح للأسئلة. جرب تاني بعد شوية." },
        ]);
      } else if (res.status === 503) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "مساعد التسوق مش متاح حالياً. جرب تاني بعدين." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "حصل مشكلة، جرب تاني بعد شوية." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "مفيش اتصال بالإنترنت. جرب تاني." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, requireAuth]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (text) sendMessageWithText(text);
  }, [input, sendMessageWithText]);

  const handleSearch = (filters: Record<string, unknown>) => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", String(filters.category));
    if (filters.brand) params.set("q", String(filters.brand));
    if (filters.price_min) params.set("price_min", String(filters.price_min));
    if (filters.price_max) params.set("price_max", String(filters.price_max));
    router.push(`/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-light flex-shrink-0">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-text hover:text-dark rounded-full"
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
            <ShoppingBag size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark">مساعد التسوق</h2>
            <p className="text-[10px] text-brand-green">مكسب بوت</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === "user"
                  ? "bg-brand-green text-white rounded-tl-sm"
                  : "bg-gray-light text-dark rounded-tr-sm"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>

              {/* Search action button */}
              {msg.role === "assistant" && msg.suggestedFilters && msg.actionType === "search" && (
                <button
                  type="button"
                  onClick={() => handleSearch(msg.suggestedFilters!)}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-brand-green text-white text-xs font-bold rounded-lg hover:bg-brand-green-dark active:scale-[0.97] transition-all"
                >
                  <Search size={12} />
                  <span>ابحث دلوقتي</span>
                  <ArrowLeft size={12} />
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-light rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-brand-green" />
              <span className="text-xs text-gray-text">بفكر...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-light px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="بتدور على إيه؟..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-gray-light rounded-xl text-sm text-dark placeholder:text-gray-text focus:outline-none focus:ring-2 focus:ring-brand-green/30 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark active:scale-[0.95] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Quick suggestions */}
        {messages.length <= 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessageWithText(suggestion)}
                disabled={isLoading}
                className="flex-shrink-0 px-3 py-1.5 bg-gray-light text-dark text-[11px] font-medium rounded-full hover:bg-brand-green-light hover:text-brand-green transition-colors disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
