/**
 * Points transaction history list.
 * Shows recent point-earning activities with emoji and timestamps.
 */

"use client";

import { formatTimeAgo } from "@/lib/utils/format";
import { POINT_ACTIONS, type PointTransaction } from "@/lib/loyalty/types";

interface PointsHistoryProps {
  transactions: PointTransaction[];
}

export default function PointsHistory({ transactions }: PointsHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-3xl mb-2">🎯</p>
        <p className="text-sm text-gray-text">
          لسه مفيش نقاط. ابدأ بنشر إعلان أو تقييم بائع!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => {
        const config = POINT_ACTIONS[tx.action];
        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-light/50 transition-colors"
          >
            <span className="text-lg flex-shrink-0">{config?.emoji || "🔹"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-dark truncate">
                {tx.description}
              </p>
              <p className="text-[10px] text-gray-text">
                {formatTimeAgo(tx.createdAt)}
              </p>
            </div>
            <span className="text-xs font-bold text-brand-green flex-shrink-0">
              +{tx.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}
