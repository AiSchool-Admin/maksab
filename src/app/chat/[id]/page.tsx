"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, User, Phone, Home } from "lucide-react";
import Link from "next/link";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import ChatAdLink from "@/components/chat/ChatAdLink";
import OnlineIndicator from "@/components/chat/OnlineIndicator";
import TypingIndicator from "@/components/chat/TypingIndicator";
import BlockUserButton from "@/components/chat/BlockUserButton";
import GroupChatManager from "@/components/chat/GroupChatManager";
import ReportButton from "@/components/report/ReportButton";
import SmartQuestionsSection from "@/components/chat/SmartQuestionsSection";
import NegotiationAssistant from "@/components/chat/NegotiationAssistant";
import ProductInsightsCard from "@/components/chat/ProductInsightsCard";
import { ChatBubbleSkeleton } from "@/components/ui/SkeletonLoader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useChatStore } from "@/stores/chat-store";
import {
  fetchConversation,
  sendMessage,
  markMessagesAsRead,
  uploadChatImage,
} from "@/lib/chat/chat-service";
import type { ChatConversation, ChatMessage } from "@/lib/chat/chat-service";
import { useRealtimeChat } from "@/lib/hooks/useRealtimeChat";
import { useTyping } from "@/lib/hooks/useTyping";
import { useIsOnline } from "@/lib/hooks/usePresence";

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
    markMessagesRead,
  } = useChatStore();

  const [conversation, setConversation] = useState<ChatConversation | null>(
    null,
  );
  const [isLoadingConv, setIsLoadingConv] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [adMeta, setAdMeta] = useState<{
    categoryId: string;
    categoryFields: Record<string, unknown>;
    saleType: string;
    description?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const messages = messagesByConversation[conversationId] || [];
  const currentUserId = user?.id || "";

  // Check if the other user is online via presence
  const otherUserOnline = useIsOnline(conversation?.otherUser.id || null);

  /* ── Load conversation info ────────────────────────────────────────── */
  useEffect(() => {
    setIsLoadingConv(true);
    fetchConversation(conversationId).then((conv) => {
      setConversation(conv);
      setIsLoadingConv(false);

      // Fetch ad metadata for AI features (non-blocking)
      if (conv?.adId) {
        import("@/lib/ad-detail").then(({ fetchAdDetail }) => {
          fetchAdDetail(conv.adId).then((ad) => {
            if (ad) {
              setAdMeta({
                categoryId: ad.categoryId,
                categoryFields: ad.categoryFields as Record<string, unknown>,
                saleType: ad.saleType,
                description: ad.description,
              });
            }
          });
        }).catch(() => {});
      }
    });
  }, [conversationId]);

  /* ── Load messages ─────────────────────────────────────────────────── */
  useEffect(() => {
    loadMessages(conversationId);
    // Mark messages as read in DB
    if (currentUserId) {
      markMessagesAsRead(conversationId, currentUserId);
    }
    markAsRead(conversationId);
  }, [conversationId, loadMessages, markAsRead, currentUserId]);

  /* ── Real-time subscription ────────────────────────────────────────── */
  const handleNewMessage = useCallback(
    (msg: ChatMessage) => {
      addMessage(msg);
      // Mark as read immediately since user is viewing this conversation
      if (currentUserId) {
        markMessagesAsRead(conversationId, currentUserId);
      }
    },
    [addMessage, conversationId, currentUserId],
  );

  const handleMessageRead = useCallback(
    (messageIds: string[]) => {
      markMessagesRead(conversationId, messageIds);
    },
    [conversationId, markMessagesRead],
  );

  const { sendTyping } = useRealtimeChat({
    conversationId,
    currentUserId,
    onNewMessage: handleNewMessage,
    onMessageRead: handleMessageRead,
    onTypingChange: (payload) => {
      handleRemoteTyping(payload.isTyping, payload.displayName);
    },
  });

  /* ── Typing indicator ──────────────────────────────────────────────── */
  const {
    isOtherTyping,
    typingUserName,
    handleLocalTyping,
    handleRemoteTyping,
    stopTyping,
  } = useTyping({
    sendTyping,
    displayName: user?.display_name || "مستخدم",
  });

  /* ── Scroll to bottom on new messages ──────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isOtherTyping]);

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
  const handleSendText = async (text: string) => {
    stopTyping();
    setIsSending(true);

    // Optimistic: add immediately with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      content: text,
      imageUrl: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(optimisticMsg);

    // Persist to DB
    const savedMsg = await sendMessage({
      conversationId,
      senderId: currentUserId,
      content: text,
    });

    if (savedMsg) {
      // Replace temp message with real one
      useChatStore.setState((state) => {
        const msgs = state.messagesByConversation[conversationId] || [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: msgs.map((m) =>
              m.id === tempId ? savedMsg : m,
            ),
          },
        };
      });
    }

    setIsSending(false);
    notifyRecipient(text);
  };

  /* ── Send image message ────────────────────────────────────────────── */
  const handleSendImage = async (preview: string, file?: File) => {
    stopTyping();
    setIsSending(true);

    // Optimistic: show preview immediately
    const tempId = `temp-img-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: currentUserId,
      content: null,
      imageUrl: preview,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(optimisticMsg);

    // Upload to Supabase Storage if file provided
    let imageUrl = preview;
    if (file) {
      const uploadedUrl = await uploadChatImage(file, conversationId);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }

    // Persist to DB
    const savedMsg = await sendMessage({
      conversationId,
      senderId: currentUserId,
      imageUrl,
    });

    if (savedMsg) {
      useChatStore.setState((state) => {
        const msgs = state.messagesByConversation[conversationId] || [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: msgs.map((m) =>
              m.id === tempId ? savedMsg : m,
            ),
          },
        };
      });
    }

    setIsSending(false);
    notifyRecipient("📷 صورة");
  };

  /* ── Handle typing in input ────────────────────────────────────────── */
  const handleTyping = () => {
    handleLocalTyping();
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
  const isOnline = otherUserOnline || otherUser.isOnline;

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
            {isOnline && (
              <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-brand-green border-2 border-white rounded-full" />
            )}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-dark truncate">
              {otherUser.displayName}
            </h2>
            {isOtherTyping ? (
              <span className="flex items-center gap-1 text-xs text-brand-green">
                <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
                بيكتب...
              </span>
            ) : (
              <OnlineIndicator
                isOnline={isOnline}
                lastSeen={otherUser.lastSeen}
              />
            )}
          </div>

          {/* Group Chat + Block & Report */}
          {currentUserId && otherUser.id && (
            <>
              <GroupChatManager
                conversationId={conversationId}
                buyerId={conversation.buyerId}
                sellerId={conversation.sellerId}
                otherUser={otherUser}
              />
              <BlockUserButton
                currentUserId={currentUserId}
                otherUserId={otherUser.id}
                otherUserName={otherUser.displayName}
                onBlocked={() => router.push("/chat")}
              />
              <ReportButton targetType="user" targetId={otherUser.id} />
            </>
          )}

          {/* Home button */}
          <Link
            href="/"
            className="p-2 text-brand-green hover:text-brand-green-dark hover:bg-green-50 rounded-full transition-colors flex-shrink-0"
            aria-label="الرئيسية"
          >
            <Home size={18} />
          </Link>

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

        {/* Product Insights Card — collapsible */}
        {adMeta && (
          <div className="px-3 pt-1">
            <ProductInsightsCard
              categoryId={adMeta.categoryId}
              categoryFields={adMeta.categoryFields}
              title={conversation.adTitle}
              price={conversation.adPrice}
              saleType={adMeta.saleType}
              description={adMeta.description}
            />
          </div>
        )}

        <div className="h-2" />
      </header>

      {/* ── Messages area ───────────────────────────────────────────── */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {/* Smart Questions — show for new conversations */}
        {adMeta && !isLoadingMessages && (
          <SmartQuestionsSection
            adId={conversation.adId}
            categoryId={adMeta.categoryId}
            categoryFields={adMeta.categoryFields}
            title={conversation.adTitle}
            price={conversation.adPrice}
            saleType={adMeta.saleType}
            description={adMeta.description}
            onSendQuestion={handleSendText}
            messagesCount={messages.length}
          />
        )}

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

        {/* Typing indicator */}
        <TypingIndicator
          userName={typingUserName || otherUser.displayName}
          isVisible={isOtherTyping}
        />

        <div ref={messagesEndRef} />
      </div>

      {/* ── Negotiation Assistant + Input area ─────────────────────── */}
      <div className="flex-shrink-0">
        {/* Negotiation assistant — shows when there's a price-related chat */}
        {adMeta && conversation.adPrice && conversation.adPrice > 0 && messages.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-light">
            <NegotiationAssistant
              categoryId={adMeta.categoryId}
              title={conversation.adTitle}
              listingPrice={conversation.adPrice}
              isBuyer={currentUserId === conversation.buyerId}
              lastOtherMessage={
                messages
                  .filter((m) => m.senderId !== currentUserId && m.content)
                  .slice(-1)[0]?.content || null
              }
              conversationHistory={messages
                .filter((m) => m.content)
                .slice(-6)
                .map((m) => ({
                  role: m.senderId === currentUserId ? "user" : "assistant",
                  content: m.content || "",
                }))}
              onUseSuggestion={handleSendText}
            />
          </div>
        )}
        <ChatInput
          onSendText={handleSendText}
          onSendImage={handleSendImage}
          onTyping={handleTyping}
          disabled={isSending}
        />
      </div>
    </main>
  );
}
