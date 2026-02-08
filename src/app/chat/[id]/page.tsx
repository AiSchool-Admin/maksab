"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, User, Phone } from "lucide-react";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import ChatAdLink from "@/components/chat/ChatAdLink";
import OnlineIndicator from "@/components/chat/OnlineIndicator";
import { ChatBubbleSkeleton } from "@/components/ui/SkeletonLoader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useChatStore } from "@/stores/chat-store";
import { fetchConversation } from "@/lib/chat/mock-chat";
import type { ChatConversation, ChatMessage } from "@/lib/chat/mock-chat";

const DEV_USER_ID = "dev-00000000-0000-0000-0000-000000000000";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conversationId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const {
    messagesByConversation,
    isLoadingMessages,
    loadMessages,
    addMessage,
    markAsRead,
  } = useChatStore();

  const [conversation, setConversation] = useState<ChatConversation | null>(
    null,
  );
  const [isLoadingConv, setIsLoadingConv] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const messages = messagesByConversation[conversationId] || [];
  const currentUserId = user?.id || DEV_USER_ID;

  /* ── Load conversation info ────────────────────────────────────────── */
  useEffect(() => {
    setIsLoadingConv(true);
    fetchConversation(conversationId).then((conv) => {
      setConversation(conv);
      setIsLoadingConv(false);
    });
  }, [conversationId]);

  /* ── Load messages ─────────────────────────────────────────────────── */
  useEffect(() => {
    loadMessages(conversationId);
    markAsRead(conversationId);
  }, [conversationId, loadMessages, markAsRead]);

  /* ── Scroll to bottom on new messages ──────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /* ── Notify recipient of new message (fire and forget) ─────────────── */
  const notifyRecipient = (messageContent: string) => {
    if (!conversation) return;
    const recipientId =
      conversation.otherUser.id ||
      (currentUserId === conversation.buyerId
        ? conversation.sellerId
        : conversation.buyerId);
    if (!recipientId || recipientId === currentUserId) return;

    fetch("/api/notifications/on-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_name: user?.display_name || "مستخدم",
        recipient_id: recipientId,
        message_content: messageContent,
        ad_id: conversation.adId,
      }),
    }).catch(() => {});
  };

  /* ── Send text message ─────────────────────────────────────────────── */
  const handleSendText = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-new-${Date.now()}`,
      conversationId,
      senderId: currentUserId,
      content: text,
      imageUrl: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(newMsg);
    notifyRecipient(text);
  };

  /* ── Send image message ────────────────────────────────────────────── */
  const handleSendImage = (preview: string) => {
    const newMsg: ChatMessage = {
      id: `msg-new-${Date.now()}`,
      conversationId,
      senderId: currentUserId,
      content: null,
      imageUrl: preview,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(newMsg);
    notifyRecipient("📷 صورة");
  };

  /* ── Loading state ─────────────────────────────────────────────────── */
  if (isLoadingConv) {
    return (
      <main className="flex flex-col h-screen bg-white">
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-light">
          <div className="w-10 h-10 rounded-full bg-gray-light animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-light rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-light rounded animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (!conversation) {
    return (
      <main className="flex flex-col items-center justify-center h-screen bg-white">
        <p className="text-gray-text text-sm">المحادثة مش موجودة</p>
        <button
          type="button"
          onClick={() => router.push("/chat")}
          className="mt-3 text-brand-green text-sm font-semibold"
        >
          رجوع للرسائل
        </button>
      </main>
    );
  }

  const { otherUser } = conversation;

  return (
    <main className="flex flex-col h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-light z-10">
        <div className="flex items-center gap-3 px-4 h-16">
          {/* Back button */}
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="p-1 -me-1 text-gray-text hover:text-dark transition-colors flex-shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight size={24} />
          </button>

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-brand-green-light flex items-center justify-center text-brand-green overflow-hidden">
              {otherUser.avatarUrl ? (
                <img
                  src={otherUser.avatarUrl}
                  alt={otherUser.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} />
              )}
            </div>
            {otherUser.isOnline && (
              <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-brand-green border-2 border-white rounded-full" />
            )}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-dark truncate">
              {otherUser.displayName}
            </h2>
            <OnlineIndicator
              isOnline={otherUser.isOnline}
              lastSeen={otherUser.lastSeen}
            />
          </div>

          {/* Call button */}
          <a
            href={`tel:+2${otherUser.phone}`}
            className="p-2 text-gray-text hover:text-brand-green rounded-full hover:bg-gray-light transition-colors flex-shrink-0"
            aria-label="اتصال"
          >
            <Phone size={20} />
          </a>
        </div>

        {/* Linked ad */}
        <ChatAdLink
          adId={conversation.adId}
          title={conversation.adTitle}
          price={conversation.adPrice}
          image={conversation.adImage}
        />
        <div className="h-2" />
      </header>

      {/* ── Messages area ───────────────────────────────────────────── */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {isLoadingMessages ? (
          <div className="space-y-4">
            <ChatBubbleSkeleton isOwn={false} />
            <ChatBubbleSkeleton isOwn={true} />
            <ChatBubbleSkeleton isOwn={false} />
            <ChatBubbleSkeleton isOwn={true} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-text">
              ابدأ المحادثة مع {otherUser.displayName}
            </p>
          </div>
        ) : (
          <>
            {/* Date separator for first message */}
            <div className="text-center mb-4">
              <span className="text-[10px] text-gray-text bg-gray-light px-3 py-1 rounded-full">
                {new Date(messages[0].createdAt).toLocaleDateString("ar-EG", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>

            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                imageUrl={msg.imageUrl}
                isOwn={msg.senderId === currentUserId}
                isRead={msg.isRead}
                time={msg.createdAt}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendText={handleSendText}
          onSendImage={handleSendImage}
        />
      </div>
    </main>
  );
}
