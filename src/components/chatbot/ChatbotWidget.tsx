"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Minimize2,
  EyeOff,
  Search,
  TrendingUp,
  MapPin,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "أهلاً بيك في مكسب! 💚\nأنا المساعد الذكي — ممكن أساعدك تلاقي أي حاجة وأحللك الأسعار.\n\nجرب تسألني:\n• \"عايز آيفون 15 بأقل من 20 ألف\"\n• \"سعر تويوتا كورولا كام؟\"\n• \"فيه شقق في مدينة نصر؟\"",
  timestamp: Date.now(),
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHideConfirm, setShowHideConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    const hidden = localStorage.getItem("maksab_chatbot_hidden");
    if (hidden === "true") setIsHidden(true);
  }, []);

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = (text || input).trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!text) setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.response || "عذراً، جرب تاني.", timestamp: Date.now() },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "عذراً، مش قادر أوصل للسيرفر. جرب تاني بعد شوية.", timestamp: Date.now() },
        ]);
      }
      setIsLoading(false);
    },
    [input, isLoading, messages],
  );

  const hideWidget = useCallback(() => {
    setIsHidden(true);
    setIsOpen(false);
    setShowHideConfirm(false);
    localStorage.setItem("maksab_chatbot_hidden", "true");
  }, []);

  const showWidget = useCallback(() => {
    setIsHidden(false);
    localStorage.removeItem("maksab_chatbot_hidden");
  }, []);

  const quickSuggestions = [
    { text: "عايز آيفون 15", icon: <Search size={10} /> },
    { text: "سعر تويوتا كورولا كام؟", icon: <TrendingUp size={10} /> },
    { text: "شقق في مدينة نصر", icon: <MapPin size={10} /> },
    { text: "إزاي أضيف إعلان؟", icon: <Sparkles size={10} /> },
  ];

  if (isHidden) {
    return (
      <button
        onClick={showWidget}
        className="fixed bottom-20 start-2 z-50 p-1.5 rounded-full bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600 transition-all opacity-40 hover:opacity-100"
        title="إظهار المساعد الذكي"
      >
        <MessageCircle size={14} />
      </button>
    );
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 start-4 z-50 w-14 h-14 rounded-full bg-brand-green text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          aria-label="المساعد الذكي"
        >
          <Bot size={26} />
          {messages.length <= 1 && (
            <span className="absolute -top-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-16 start-3 end-3 z-50 sm:start-4 sm:end-auto sm:w-[380px] max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-brand-green px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">المساعد الذكي</h3>
                <p className="text-[10px] text-white/70">بحث ذكي · تحليل أسعار · مساعدة</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowHideConfirm(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="إخفاء">
                <EyeOff size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <Minimize2 size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {showHideConfirm && (
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between">
              <p className="text-xs text-yellow-800">إخفاء المساعد؟</p>
              <div className="flex gap-2">
                <button onClick={hideWidget} className="text-xs px-2.5 py-1 rounded-lg bg-yellow-200 text-yellow-800 font-medium">إخفاء</button>
                <button onClick={() => setShowHideConfirm(false)} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">إلغاء</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 max-h-[50vh]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user" ? "bg-brand-green text-white rounded-es-sm" : "bg-gray-100 text-dark rounded-ee-sm"
                }`}>
                  <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-gray-100 rounded-2xl rounded-ee-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-brand-green animate-pulse" />
                    <span className="text-[10px] text-gray-text">بدور ليك...</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {quickSuggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-full bg-brand-green-light text-brand-green hover:bg-brand-green/10 transition-colors disabled:opacity-50"
                >
                  {s.icon}
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="اسألني عن أي حاجة..."
                disabled={isLoading}
                className="flex-1 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm text-dark placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-brand-green/20 disabled:opacity-60"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-brand-green text-white flex items-center justify-center hover:bg-brand-green-dark active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
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
