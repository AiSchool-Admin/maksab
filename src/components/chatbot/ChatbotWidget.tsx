"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Minimize2,
  EyeOff,
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
    "أهلاً بيك في مكسب! 💚\nأنا المساعد الذكي، ممكن أساعدك في أي استفسار عن التطبيق.\n\nجرب تسألني:\n• إزاي أضيف إعلان؟\n• إيه هو المزاد المباشر؟\n• إيه الأقسام المتاحة؟",
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Check if hidden preference is stored
  useEffect(() => {
    const hidden = localStorage.getItem("maksab_chatbot_hidden");
    if (hidden === "true") {
      setIsHidden(true);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "عذراً، حصلت مشكلة. جرب تاني.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "عذراً، مش قادر أوصل للسيرفر دلوقتي. جرب تاني بعد شوية.",
          timestamp: Date.now(),
        },
      ]);
    }

    setIsLoading(false);
  }, [input, isLoading, messages]);

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

  // Quick suggestion chips
  const quickSuggestions = [
    "إزاي أضيف إعلان؟",
    "إيه هو المزاد؟",
    "الأقسام المتاحة",
    "رسوم مكسب",
  ];

  // Hidden — show a tiny restore button
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
      {/* ── Floating action button ────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 start-4 z-50 w-14 h-14 rounded-full bg-brand-green text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          aria-label="المساعد الذكي"
        >
          <Bot size={26} />
          {/* Notification dot */}
          {messages.length <= 1 && (
            <span className="absolute -top-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
      )}

      {/* ── Chat panel ────────────────────────────────── */}
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
                <p className="text-[10px] text-white/70">مكسب — كل صفقة مكسب</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Hide button */}
              <button
                onClick={() => setShowHideConfirm(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="إخفاء المساعد"
              >
                <EyeOff size={16} />
              </button>
              {/* Minimize */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <Minimize2 size={16} />
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Hide confirmation */}
          {showHideConfirm && (
            <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between">
              <p className="text-xs text-yellow-800">إخفاء المساعد؟</p>
              <div className="flex gap-2">
                <button
                  onClick={hideWidget}
                  className="text-xs px-2.5 py-1 rounded-lg bg-yellow-200 text-yellow-800 font-medium"
                >
                  إخفاء
                </button>
                <button
                  onClick={() => setShowHideConfirm(false)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 max-h-[50vh]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    msg.role === "user"
                      ? "bg-brand-green text-white rounded-es-sm"
                      : "bg-gray-100 text-dark rounded-ee-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-gray-100 rounded-2xl rounded-ee-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions — shown when only welcome message */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    const userMsg: ChatMessage = {
                      id: crypto.randomUUID(),
                      role: "user",
                      content: suggestion,
                      timestamp: Date.now(),
                    };
                    setMessages((prev) => [...prev, userMsg]);
                    setIsLoading(true);
                    fetch("/api/chatbot", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ message: suggestion }),
                    })
                      .then((res) => res.json())
                      .then((data) => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            role: "assistant" as const,
                            content: data.response || "عذراً، جرب تاني.",
                            timestamp: Date.now(),
                          },
                        ]);
                      })
                      .catch(() => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            role: "assistant" as const,
                            content: "عذراً، حصلت مشكلة. جرب تاني.",
                            timestamp: Date.now(),
                          },
                        ]);
                      })
                      .finally(() => setIsLoading(false));
                  }}
                  className="px-3 py-1.5 text-[11px] font-medium rounded-full bg-brand-green-light text-brand-green hover:bg-brand-green/10 transition-colors"
                >
                  {suggestion}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="اكتب سؤالك هنا..."
                disabled={isLoading}
                className="flex-1 bg-gray-100 rounded-xl px-3.5 py-2.5 text-sm text-dark placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-brand-green/20 disabled:opacity-60"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-brand-green text-white flex items-center justify-center hover:bg-brand-green-dark active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 flex-shrink-0"
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
