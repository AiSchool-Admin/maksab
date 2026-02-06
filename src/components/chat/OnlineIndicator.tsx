"use client";

import { formatTimeAgo } from "@/lib/utils/format";

interface OnlineIndicatorProps {
  isOnline: boolean;
  lastSeen: string | null;
}

export default function OnlineIndicator({
  isOnline,
  lastSeen,
}: OnlineIndicatorProps) {
  if (isOnline) {
    return (
      <span className="flex items-center gap-1 text-xs text-brand-green">
        <span className="w-2 h-2 bg-brand-green rounded-full" />
        متصل الآن
      </span>
    );
  }

  if (lastSeen) {
    return (
      <span className="text-xs text-gray-text">
        آخر ظهور {formatTimeAgo(lastSeen)}
      </span>
    );
  }

  return null;
}
