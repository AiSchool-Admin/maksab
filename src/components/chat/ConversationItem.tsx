"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";
import type { ChatConversation } from "@/lib/chat/mock-chat";

interface ConversationItemProps {
  conversation: ChatConversation;
}

export default function ConversationItem({
  conversation: conv,
}: ConversationItemProps) {
  const { otherUser } = conv;

  return (
    <Link
      href={`/chat/${conv.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-light transition-colors"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green overflow-hidden">
          {otherUser.avatarUrl ? (
            <img
              src={otherUser.avatarUrl}
              alt={otherUser.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={22} />
          )}
        </div>
        {/* Online dot */}
        {otherUser.isOnline && (
          <span className="absolute bottom-0 end-0 w-3.5 h-3.5 bg-brand-green border-2 border-white rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-bold text-dark truncate">
            {otherUser.displayName}
          </h3>
          <span className="text-[10px] text-gray-text flex-shrink-0 ms-2">
            {formatTimeAgo(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-text truncate flex-1">
            {conv.lastMessage || "..."}
          </p>
          {/* Unread badge */}
          {conv.unreadCount > 0 && (
            <span className="flex-shrink-0 ms-2 bg-brand-green text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
              {conv.unreadCount}
            </span>
          )}
        </div>
        {/* Ad title preview */}
        <p className="text-[10px] text-gray-text/60 truncate mt-0.5">
          📦 {conv.adTitle}
        </p>
      </div>
    </Link>
  );
}
