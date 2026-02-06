"use client";

import { Check, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  content: string | null;
  imageUrl: string | null;
  isOwn: boolean;
  isRead: boolean;
  time: string;
}

function formatMessageTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ChatBubble({
  content,
  imageUrl,
  isOwn,
  isRead,
  time,
}: ChatBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? "bg-brand-green text-white rounded-ee-sm"
            : "bg-gray-light text-dark rounded-es-sm"
        }`}
      >
        {/* Image message */}
        {imageUrl && (
          <div className="mb-1.5 -mx-1 -mt-0.5">
            <img
              src={imageUrl}
              alt="صورة"
              className="rounded-xl max-w-full max-h-60 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Text content */}
        {content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        )}

        {/* Time + read status */}
        <div
          className={`flex items-center gap-1 mt-1 ${
            isOwn ? "justify-start" : "justify-end"
          }`}
        >
          <span
            className={`text-[10px] ${
              isOwn ? "text-white/70" : "text-gray-text"
            }`}
          >
            {formatMessageTime(time)}
          </span>
          {isOwn && (
            <span className={isRead ? "text-white" : "text-white/50"}>
              {isRead ? (
                <CheckCheck size={12} />
              ) : (
                <Check size={12} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
