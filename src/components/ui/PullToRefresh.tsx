"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{
          height: pullDistance > 0 || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` : "0px",
          transition: isPulling.current ? "none" : "height 0.3s ease-out",
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            opacity: progress,
            transform: `scale(${0.5 + progress * 0.5})`,
          }}
        >
          {isRefreshing ? (
            <Loader2 size={20} className="animate-spin text-brand-green" />
          ) : (
            <div
              className="w-5 h-5 border-2 border-brand-green rounded-full border-t-transparent"
              style={{
                transform: `rotate(${progress * 360}deg)`,
              }}
            />
          )}
          <span className="text-xs text-gray-text font-medium">
            {isRefreshing ? "جاري التحديث..." : progress >= 1 ? "اترك للتحديث" : "اسحب للتحديث"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
