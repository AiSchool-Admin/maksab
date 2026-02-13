"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface SmartQuestion {
  question: string;
  icon: string;
}

interface SmartQuestionsSectionProps {
  adId: string;
  categoryId: string;
  categoryFields: Record<string, unknown>;
  title: string;
  price: number | null;
  saleType: string;
  description?: string;
  onSendQuestion: (question: string) => void;
  messagesCount: number;
}

export default function SmartQuestionsSection({
  categoryId,
  categoryFields,
  title,
  price,
  saleType,
  description,
  onSendQuestion,
  messagesCount,
}: SmartQuestionsSectionProps) {
  const [questions, setQuestions] = useState<SmartQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [sentQuestions, setSentQuestions] = useState<Set<number>>(new Set());

  // Only show for new conversations (few messages)
  const shouldShow = messagesCount <= 2;

  const fetchQuestions = useCallback(async () => {
    if (hasFetched || !shouldShow) return;
    setIsLoading(true);
    setHasFetched(true);

    try {
      const res = await fetch("/api/chat/smart-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          category_fields: categoryFields,
          title,
          price,
          sale_type: saleType,
          description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions?.length) {
          setQuestions(data.questions);
        }
      }
    } catch {
      // Silently fail — smart questions are optional
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, categoryFields, title, price, saleType, description, hasFetched, shouldShow]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  if (!shouldShow || (!isLoading && questions.length === 0)) return null;

  const handleSend = (index: number, question: string) => {
    onSendQuestion(question);
    setSentQuestions((prev) => new Set(prev).add(index));
  };

  return (
    <div className="mb-4 bg-brand-green-light/50 rounded-xl border border-brand-green/10 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-brand-green" />
          <span className="text-xs font-bold text-brand-green-dark">
            اسأل الصح
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-brand-green" />
        ) : (
          <ChevronDown size={14} className="text-brand-green" />
        )}
      </button>

      {/* Questions */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-3 gap-2">
              <Loader2 size={14} className="animate-spin text-brand-green" />
              <span className="text-xs text-gray-text">بنجهز أسئلة ذكية...</span>
            </div>
          ) : (
            questions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(i, q.question)}
                disabled={sentQuestions.has(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-start transition-all ${
                  sentQuestions.has(i)
                    ? "bg-brand-green/10 opacity-50"
                    : "bg-white hover:bg-brand-green/5 active:scale-[0.98]"
                }`}
              >
                <span className="text-sm flex-shrink-0">{q.icon}</span>
                <span className="text-xs text-dark flex-1 leading-relaxed">
                  {q.question}
                </span>
                {!sentQuestions.has(i) && (
                  <Send size={12} className="text-brand-green flex-shrink-0" />
                )}
                {sentQuestions.has(i) && (
                  <span className="text-[10px] text-brand-green flex-shrink-0">اتبعت</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
