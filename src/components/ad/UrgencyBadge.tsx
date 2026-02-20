"use client";

import { Clock, Zap } from "lucide-react";

interface UrgencyBadgeProps {
  createdAt: string;
}

/**
 * Urgency badge showing time since posting in Egyptian Arabic.
 * Highlights recent posts with special styling.
 */
export default function UrgencyBadge({ createdAt }: UrgencyBadgeProps) {
  const now = Date.now();
  const posted = new Date(createdAt).getTime();
  const diffMs = now - posted;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let text: string;
  let isRecent = false;

  if (diffMinutes < 5) {
    text = "الآن";
    isRecent = true;
  } else if (diffMinutes < 60) {
    text = `من ${diffMinutes} دقيقة`;
    isRecent = true;
  } else if (diffHours < 24) {
    text = diffHours === 1 ? "من ساعة" : `من ${diffHours} ساعة`;
    isRecent = diffHours <= 3;
  } else if (diffDays === 1) {
    text = "من إمبارح";
  } else if (diffDays < 7) {
    text = `من ${diffDays} يوم`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    text = weeks === 1 ? "من أسبوع" : `من ${weeks} أسابيع`;
  } else {
    const months = Math.floor(diffDays / 30);
    text = months === 1 ? "من شهر" : `من ${months} شهور`;
  }

  if (isRecent) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200/50 text-red-600 rounded-lg px-2.5 py-1">
        <Zap size={12} fill="currentColor" />
        <span className="text-xs font-bold">اتنشر {text}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-gray-text">
      <Clock size={12} />
      <span className="text-xs">اتنشر {text}</span>
    </div>
  );
}
