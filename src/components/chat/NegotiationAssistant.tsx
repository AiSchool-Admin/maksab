"use client";

import { useState, useCallback } from "react";
import { Sparkles, Send, MessageCircle, DollarSign, Info, ThumbsUp, Loader2, X } from "lucide-react";
import { formatPrice } from "@/lib/utils/format";

interface NegotiationSuggestion {
  type: "counter_offer" | "accept" | "reject" | "info_request";
  message: string;
  reasoning: string;
  suggestedPrice?: number;
}

interface NegotiationAssistantProps {
  categoryId: string;
  title: string;
  listingPrice: number;
  isBuyer: boolean;
  lastOtherMessage: string | null;
  conversationHistory: Array<{ role: string; content: string }>;
  onUseSuggestion: (message: string) => void;
}

const typeConfig: Record<string, { icon: typeof MessageCircle; label: string; color: string }> = {
  counter_offer: { icon: DollarSign, label: "عرض مضاد", color: "text-brand-gold" },
  accept: { icon: ThumbsUp, label: "موافقة", color: "text-brand-green" },
  reject: { icon: X, label: "رفض", color: "text-error" },
  info_request: { icon: Info, label: "استفسار", color: "text-blue-600" },
};

export default function NegotiationAssistant({
  categoryId,
  title,
  listingPrice,
  isBuyer,
  lastOtherMessage,
  conversationHistory,
  onUseSuggestion,
}: NegotiationAssistantProps) {
  const [suggestions, setSuggestions] = useState<NegotiationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!lastOtherMessage) return;
    setIsLoading(true);
    setError(null);
    setIsOpen(true);

    try {
      const res = await fetch("/api/chat/negotiation-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          title,
          listing_price: listingPrice,
          last_message: lastOtherMessage,
          is_buyer: isBuyer,
          conversation_history: conversationHistory.slice(-6),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } else {
        setError("مقدرناش نجيب اقتراحات دلوقتي");
      }
    } catch {
      setError("حصل مشكلة في الاتصال");
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, title, listingPrice, isBuyer, lastOtherMessage, conversationHistory]);

  const handleUseSuggestion = (message: string) => {
    onUseSuggestion(message);
    setIsOpen(false);
    setSuggestions([]);
  };

  // Floating trigger button
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={fetchSuggestions}
        disabled={!lastOtherMessage}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold-light border border-brand-gold/20 rounded-full text-xs font-semibold text-brand-gold hover:bg-brand-gold hover:text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles size={12} />
        <span>مساعد التفاوض</span>
      </button>
    );
  }

  // Expanded panel
  return (
    <div className="bg-brand-gold-light/50 rounded-xl border border-brand-gold/15 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-gold/10">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-brand-gold" />
          <span className="text-xs font-bold text-dark">مساعد التفاوض الذكي</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 text-gray-text hover:text-dark rounded-full"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader2 size={14} className="animate-spin text-brand-gold" />
            <span className="text-xs text-gray-text">بنفكرلك في أحسن رد...</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-error text-center py-2">{error}</p>
        )}

        {!isLoading && suggestions.map((s, i) => {
          const config = typeConfig[s.type] || typeConfig.info_request;
          const Icon = config.icon;

          return (
            <div key={i} className="bg-white rounded-lg p-2.5 space-y-2">
              {/* Type badge */}
              <div className="flex items-center gap-1.5">
                <Icon size={12} className={config.color} />
                <span className={`text-[10px] font-bold ${config.color}`}>{config.label}</span>
                {s.suggestedPrice && (
                  <span className="text-[10px] font-bold text-dark bg-gray-light px-1.5 py-0.5 rounded">
                    {formatPrice(s.suggestedPrice)}
                  </span>
                )}
              </div>

              {/* Message preview */}
              <p className="text-xs text-dark leading-relaxed">&ldquo;{s.message}&rdquo;</p>

              {/* Reasoning */}
              <p className="text-[10px] text-gray-text leading-relaxed">{s.reasoning}</p>

              {/* Use button */}
              <button
                type="button"
                onClick={() => handleUseSuggestion(s.message)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-gold text-white rounded-lg text-[11px] font-bold hover:bg-brand-gold/90 active:scale-[0.97] transition-all"
              >
                <Send size={10} />
                <span>ابعت الرد ده</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
