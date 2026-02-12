"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Send, Heart, Trash2, MessageCircle, Loader2, ChevronDown } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/format";
import {
  getComments,
  addComment,
  deleteComment,
  toggleCommentLike,
  type AdComment,
} from "@/lib/social/reactions-service";
import { getCurrentUser, type UserProfile } from "@/lib/supabase/auth";
import EmptyState from "@/components/ui/EmptyState";

interface CommentsSectionProps {
  adId: string;
  adOwnerId: string;
}

const PAGE_SIZE = 10;

export default function CommentsSection({ adId, adOwnerId }: CommentsSectionProps) {
  const [comments, setComments] = useState<AdComment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Comment input state
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Load user on mount
  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((user) => {
      if (mounted) setCurrentUser(user);
    });
    return () => { mounted = false; };
  }, []);

  // Load initial comments
  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      const result = await getComments(adId, 1, PAGE_SIZE);
      if (mounted) {
        setComments(result.comments);
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setPage(1);
        setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [adId]);

  // Load more comments
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const result = await getComments(adId, nextPage, PAGE_SIZE);
    setComments((prev) => [...prev, ...result.comments]);
    setHasMore(result.hasMore);
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [adId, page, hasMore, isLoadingMore]);

  // Submit comment
  const handleSubmit = useCallback(async () => {
    if (isSending) return;

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputError("اكتب تعليق الأول");
      return;
    }
    if (trimmed.length > 500) {
      setInputError("التعليق طويل أوي. الحد الأقصى 500 حرف");
      return;
    }

    if (!currentUser) {
      setInputError("لازم تسجل دخول الأول عشان تعلّق");
      return;
    }

    setIsSending(true);
    setInputError(null);

    const { comment, error } = await addComment(adId, trimmed);

    if (error) {
      setInputError(error);
      setIsSending(false);
      return;
    }

    if (comment) {
      // Add the new comment at the top of the list
      setComments((prev) => [comment, ...prev]);
      setTotalCount((prev) => prev + 1);
      setInputValue("");
    }

    setIsSending(false);
  }, [adId, inputValue, isSending, currentUser]);

  // Delete comment
  const handleDelete = useCallback(async (commentId: string) => {
    const { success } = await deleteComment(commentId);
    if (success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  // Toggle like
  const handleToggleLike = useCallback(async (commentId: string) => {
    if (!currentUser) return;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        return {
          ...c,
          isLikedByMe: !c.isLikedByMe,
          likesCount: c.isLikedByMe ? Math.max(0, c.likesCount - 1) : c.likesCount + 1,
        };
      }),
    );

    const { error } = await toggleCommentLike(commentId);
    if (error) {
      // Revert optimistic update
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            isLikedByMe: !c.isLikedByMe,
            likesCount: c.isLikedByMe ? Math.max(0, c.likesCount - 1) : c.likesCount + 1,
          };
        }),
      );
    }
  }, [currentUser]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-brand-green" />
        <h3 className="text-base font-bold text-dark">
          التعليقات
        </h3>
        {totalCount > 0 && (
          <span className="bg-gray-light text-gray-text text-xs font-semibold px-2 py-0.5 rounded-full">
            {totalCount}
          </span>
        )}
      </div>

      {/* Comment input */}
      <div className="flex items-start gap-3">
        {/* User avatar */}
        <div className="w-9 h-9 rounded-full bg-brand-green-light flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.display_name || ""}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={16} className="text-brand-green" />
          )}
        </div>

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={currentUser ? "اكتب تعليق..." : "سجّل دخول عشان تعلّق"}
              disabled={!currentUser || isSending}
              rows={1}
              maxLength={500}
              className={`
                w-full resize-none rounded-xl border px-3 py-2.5 pe-12 text-sm text-dark
                placeholder:text-gray-text/60 focus:outline-none focus:border-brand-green
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${inputError ? "border-error" : "border-gray-light"}
              `}
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!currentUser || isSending || !inputValue.trim()}
              className={`
                absolute end-2 bottom-2 p-1.5 rounded-full transition-all
                ${inputValue.trim()
                  ? "text-brand-green hover:bg-brand-green-light"
                  : "text-gray-text/40 cursor-not-allowed"
                }
              `}
              aria-label="إرسال التعليق"
            >
              {isSending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          {/* Character counter + error */}
          <div className="flex items-center justify-between mt-1 px-1">
            {inputError ? (
              <p className="text-[11px] text-error">{inputError}</p>
            ) : (
              <span />
            )}
            {inputValue.length > 0 && (
              <span className={`text-[11px] ${inputValue.length > 450 ? "text-error" : "text-gray-text/60"}`}>
                {inputValue.length}/500
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4 py-4">
          {[1, 2, 3].map((i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon="💬"
          title="مفيش تعليقات لسه"
          description="كن أول من يعلّق على هذا الإعلان"
        />
      ) : (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                adOwnerId={adOwnerId}
                currentUserId={currentUser?.id ?? null}
                onDelete={handleDelete}
                onToggleLike={handleToggleLike}
              />
            ))}
          </AnimatePresence>

          {/* Load more button */}
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-dark transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ChevronDown size={14} />
                )}
                <span>حمّل تعليقات أكتر</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Comment card ───────────────────────────────────────────────────────

function CommentCard({
  comment,
  adOwnerId,
  currentUserId,
  onDelete,
  onToggleLike,
}: {
  comment: AdComment;
  adOwnerId: string;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = comment.userId === adOwnerId;
  const isMyComment = currentUserId ? comment.userId === currentUserId : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="py-3 border-b border-gray-light/60 last:border-b-0"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden
          ${isOwner ? "bg-brand-gold/15 ring-1 ring-brand-gold/30" : "bg-brand-green-light"}
        `}>
          {comment.userAvatar ? (
            <img
              src={comment.userAvatar}
              alt={comment.userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={14} className={isOwner ? "text-brand-gold" : "text-brand-green"} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + badges + time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-dark">
              {comment.userName}
            </span>
            {isOwner && (
              <span className="text-[10px] font-semibold bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded-md">
                صاحب الإعلان
              </span>
            )}
            <span className="text-[11px] text-gray-text">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>

          {/* Comment text */}
          <p className="text-sm text-dark leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Actions row */}
          <div className="flex items-center gap-4 mt-1.5">
            {/* Like button */}
            <button
              onClick={() => onToggleLike(comment.id)}
              disabled={!currentUserId}
              className={`
                inline-flex items-center gap-1 text-[12px] font-medium transition-colors
                ${comment.isLikedByMe
                  ? "text-error"
                  : "text-gray-text hover:text-error"
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <Heart
                size={13}
                fill={comment.isLikedByMe ? "currentColor" : "none"}
              />
              {comment.likesCount > 0 && (
                <span>{comment.likesCount}</span>
              )}
            </button>

            {/* Delete button (own comments only) */}
            {isMyComment && (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onDelete(comment.id);
                        setConfirmDelete(false);
                      }}
                      className="text-[12px] font-medium text-error hover:text-error/80 transition-colors"
                    >
                      تأكيد المسح
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-[12px] font-medium text-gray-text hover:text-dark transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-text hover:text-error transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>مسح</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Comment skeleton loader ────────────────────────────────────────────

function CommentSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-light flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 bg-gray-light rounded" />
          <div className="h-3 w-12 bg-gray-light rounded" />
        </div>
        <div className="h-3 w-3/4 bg-gray-light rounded" />
        <div className="h-3 w-1/2 bg-gray-light rounded" />
      </div>
    </div>
  );
}
