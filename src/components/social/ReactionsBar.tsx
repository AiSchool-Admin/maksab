"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getReactionSummary,
  toggleReaction,
  getReactionConfigs,
  type ReactionType,
  type ReactionSummary,
  type ReactionConfig,
} from "@/lib/social/reactions-service";
import { getCurrentUser } from "@/lib/supabase/auth";

interface ReactionsBarProps {
  adId: string;
  compact?: boolean;
}

export default function ReactionsBar({ adId, compact = false }: ReactionsBarProps) {
  const [summary, setSummary] = useState<ReactionSummary>({
    total: 0,
    counts: {
      great_price: 0,
      expensive: 0,
      fair_price: 0,
      want_it: 0,
      amazing: 0,
    },
    userReaction: null,
    topReaction: null,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [animatingReaction, setAnimatingReaction] = useState<ReactionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const configs = getReactionConfigs();

  // Fetch user and summary on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      const user = await getCurrentUser();
      if (mounted && user) setUserId(user.id);
      const data = await getReactionSummary(adId);
      if (mounted) setSummary(data);
    }
    load();
    return () => { mounted = false; };
  }, [adId]);

  // Close picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  const handleReaction = useCallback(async (reactionType: ReactionType) => {
    if (isLoading) return;

    if (!userId) {
      // Trigger auth — for now just close picker
      setPickerOpen(false);
      return;
    }

    setIsLoading(true);
    setAnimatingReaction(reactionType);
    setPickerOpen(false);

    // Optimistic update
    const wasSame = summary.userReaction === reactionType;
    const prevSummary = { ...summary };

    setSummary((prev) => {
      const newCounts = { ...prev.counts };

      // Remove old reaction count
      if (prev.userReaction && newCounts[prev.userReaction] > 0) {
        newCounts[prev.userReaction]--;
      }

      // Add new reaction count (unless toggling off)
      if (!wasSame) {
        newCounts[reactionType]++;
      }

      const newTotal = Object.values(newCounts).reduce((a, b) => a + b, 0);

      // Find top reaction
      let topReaction: ReactionType | null = null;
      let topCount = 0;
      for (const [type, count] of Object.entries(newCounts)) {
        if (count > topCount) {
          topCount = count;
          topReaction = type as ReactionType;
        }
      }

      return {
        total: newTotal,
        counts: newCounts,
        userReaction: wasSame ? null : reactionType,
        topReaction,
      };
    });

    const { error } = await toggleReaction(adId, reactionType);

    if (error) {
      // Revert optimistic update
      setSummary(prevSummary);
    }

    setTimeout(() => setAnimatingReaction(null), 400);
    setIsLoading(false);
  }, [adId, isLoading, summary, userId]);

  const topConfig = summary.topReaction
    ? configs.find((c) => c.type === summary.topReaction) ?? null
    : null;

  // ── Compact mode: for ad cards ─────────────────────────────────────

  if (compact) {
    if (summary.total === 0) return null;

    return (
      <div className="flex items-center gap-1 text-[11px] text-gray-text">
        {topConfig && (
          <span className="text-sm">{topConfig.emoji}</span>
        )}
        <span>{summary.total}</span>
      </div>
    );
  }

  // ── Full mode: for ad detail page ──────────────────────────────────

  return (
    <div className="relative" ref={pickerRef}>
      {/* Reaction pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {configs.map((config) => {
          const count = summary.counts[config.type];
          const isActive = summary.userReaction === config.type;
          const isAnimating = animatingReaction === config.type;

          return (
            <motion.button
              key={config.type}
              onClick={() => handleReaction(config.type)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all border
                ${isActive
                  ? "bg-brand-green-light border-brand-green text-brand-green-dark"
                  : "bg-white border-gray-light text-gray-text hover:border-gray-300 hover:bg-gray-50"
                }
              `}
              whileTap={{ scale: 0.92 }}
              animate={isAnimating ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <motion.span
                className="text-base"
                animate={isAnimating ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                {config.emoji}
              </motion.span>
              <span>{config.label}</span>
              {count > 0 && (
                <span className={`text-xs font-bold ${isActive ? "text-brand-green" : "text-gray-text"}`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Total reactions summary */}
      {summary.total > 0 && (
        <p className="text-[11px] text-gray-text mt-2">
          {summary.total === 1 && "تفاعل واحد"}
          {summary.total === 2 && "تفاعلين"}
          {summary.total >= 3 && summary.total <= 10 && `${summary.total} تفاعلات`}
          {summary.total > 10 && `${summary.total} تفاعل`}
        </p>
      )}

      {/* Floating reaction picker (shown on long-press / tap on mobile) */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute bottom-full mb-2 start-0 bg-white rounded-2xl shadow-xl border border-gray-light p-2 flex items-center gap-1 z-50"
          >
            {configs.map((config) => (
              <ReactionPickerItem
                key={config.type}
                config={config}
                isActive={summary.userReaction === config.type}
                onSelect={() => handleReaction(config.type)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Reaction picker bubble item ────────────────────────────────────────

function ReactionPickerItem({
  config,
  isActive,
  onSelect,
}: {
  config: ReactionConfig;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <div className="relative">
      <motion.button
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={onSelect}
        className={`
          w-10 h-10 flex items-center justify-center rounded-full text-xl
          transition-colors
          ${isActive ? "bg-brand-green-light" : "hover:bg-gray-50"}
        `}
        whileHover={{ scale: 1.3 }}
        whileTap={{ scale: 0.9 }}
      >
        {config.emoji}
      </motion.button>

      {/* Tooltip label */}
      <AnimatePresence>
        {hovering && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full mb-1 start-1/2 -translate-x-1/2 bg-dark text-white text-[10px] px-2 py-0.5 rounded-lg whitespace-nowrap pointer-events-none"
          >
            {config.label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
