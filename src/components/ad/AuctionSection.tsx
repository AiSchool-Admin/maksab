"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  TrendingUp,
  Trophy,
  Ban,
  ShoppingCart,
  Gavel,
  Timer,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { AuctionState, AuctionBid } from "@/lib/auction/types";
import { calcMinNextBid, getAuctionStatusLabel } from "@/lib/auction/types";
import { formatPrice, formatCountdown, formatTimeAgo } from "@/lib/utils/format";

interface AuctionSectionProps {
  auctionState: AuctionState;
  currentUserId: string | null;
  onPlaceBid: (amount: number) => void;
  onBuyNow: () => void;
  isBidding?: boolean;
  isBuyingNow?: boolean;
}

export default function AuctionSection({
  auctionState,
  currentUserId,
  onPlaceBid,
  onBuyNow,
  isBidding = false,
  isBuyingNow = false,
}: AuctionSectionProps) {
  const {
    status,
    startPrice,
    buyNowPrice,
    currentHighestBid,
    highestBidderName,
    highestBidderId,
    bidsCount,
    endsAt,
    originalEndsAt,
    bids,
    winnerId,
    winnerName,
    wasExtended,
  } = auctionState;

  const [remaining, setRemaining] = useState(
    () => new Date(endsAt).getTime() - Date.now(),
  );
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState<string | null>(null);

  /* ── Countdown timer — updates every second ─────────────────── */
  useEffect(() => {
    if (status !== "active") return;

    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(diff);
    };
    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt, status]);

  const isEnded = status !== "active";
  const isActive = status === "active";
  const isUrgent = isActive && remaining > 0 && remaining < 6 * 3600000;
  const isLastMinutes = isActive && remaining > 0 && remaining < 5 * 60 * 1000;
  const currentPrice = currentHighestBid ?? startPrice;
  const minNextBid = calcMinNextBid(currentPrice);
  const isCurrentUserHighest =
    !!currentUserId && highestBidderId === currentUserId;
  const isCurrentUserWinner = !!currentUserId && winnerId === currentUserId;

  // Calculate progress based on original duration
  const totalDuration =
    new Date(endsAt).getTime() - new Date(originalEndsAt).getTime() < 0
      ? new Date(originalEndsAt).getTime() -
        (new Date(originalEndsAt).getTime() - 72 * 3600000)
      : 72 * 3600000;
  const elapsed = totalDuration - remaining;
  const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);

  /* ── Handle bid submission ──────────────────────────────────── */
  const handleBid = useCallback(() => {
    setBidError(null);
    const amount = Number(bidAmount);

    if (!amount || isNaN(amount)) {
      setBidError("ادخل مبلغ المزايدة");
      return;
    }
    if (amount < minNextBid) {
      setBidError(`الحد الأدنى للمزايدة ${formatPrice(minNextBid)}`);
      return;
    }
    if (isCurrentUserHighest) {
      setBidError("أنت بالفعل صاحب أعلى مزايدة");
      return;
    }

    onPlaceBid(amount);
    setBidAmount("");
  }, [bidAmount, minNextBid, isCurrentUserHighest, onPlaceBid]);

  /* ── ENDED STATES ───────────────────────────────────────────── */

  if (status === "ended_winner") {
    return (
      <div className="space-y-4">
        {/* Status banner */}
        <div className="bg-brand-green-light rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-brand-green" />
            <span className="text-sm font-bold text-brand-green">
              {getAuctionStatusLabel(status)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-text">سعر البيع النهائي</span>
            <span className="text-lg font-bold text-brand-green">
              {formatPrice(currentHighestBid ?? startPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-text">الفائز</span>
            <span className="text-sm font-bold text-dark">
              {isCurrentUserWinner ? "أنت! 🎉" : (winnerName ?? highestBidderName ?? "—")}
            </span>
          </div>
          <div className="text-xs text-gray-text">
            عدد المزايدات: {bidsCount}
          </div>
        </div>

        {/* Bid history */}
        <BidHistory bids={bids} />
      </div>
    );
  }

  if (status === "ended_no_bids") {
    return (
      <div className="space-y-4">
        <div className="bg-gray-light rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-gray-text" />
            <span className="text-sm font-bold text-gray-text">
              {getAuctionStatusLabel(status)}
            </span>
          </div>
          <p className="text-sm text-gray-text">
            انتهى المزاد بدون ما حد يزايد. سعر الافتتاح كان{" "}
            {formatPrice(startPrice)}.
          </p>
        </div>
      </div>
    );
  }

  if (status === "bought_now") {
    return (
      <div className="space-y-4">
        <div className="bg-brand-green-light rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-brand-green" />
            <span className="text-sm font-bold text-brand-green">
              {getAuctionStatusLabel(status)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-text">سعر الشراء الفوري</span>
            <span className="text-lg font-bold text-brand-green">
              {formatPrice(buyNowPrice ?? currentHighestBid ?? startPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-text">المشتري</span>
            <span className="text-sm font-bold text-dark">
              {isCurrentUserWinner ? "أنت! 🎉" : (winnerName ?? "—")}
            </span>
          </div>
        </div>

        {/* Bid history (if there were bids before buy now) */}
        {bids.length > 0 && <BidHistory bids={bids} />}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="space-y-4">
        <div className="bg-error/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Ban size={20} className="text-error" />
            <span className="text-sm font-bold text-error">
              {getAuctionStatusLabel(status)}
            </span>
          </div>
          <p className="text-sm text-gray-text">
            تم إلغاء المزاد من قبل البائع.
          </p>
        </div>
      </div>
    );
  }

  /* ── ACTIVE STATE ────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Timer */}
      <div className="bg-brand-gold-light rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-dark">
            {remaining <= 0 ? "جاري إنهاء المزاد..." : "ينتهي خلال"}
          </span>
          <div
            className={`flex items-center gap-1.5 text-lg font-bold ${
              remaining <= 0
                ? "text-error"
                : isLastMinutes
                  ? "text-error animate-pulse"
                  : isUrgent
                    ? "text-error"
                    : "text-brand-gold"
            }`}
          >
            <Clock size={18} />
            <span dir="ltr">{formatCountdown(remaining)}</span>
            {isUrgent && remaining > 0 && <span>🔥</span>}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-brand-gold/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-gold rounded-full transition-all"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>

        {/* Anti-sniping indicator */}
        {wasExtended && (
          <div className="flex items-center gap-1.5 text-xs text-brand-gold">
            <Timer size={12} />
            <span>تم تمديد المزاد (حماية من المزايدة المتأخرة)</span>
          </div>
        )}
      </div>

      {/* Current highest bid */}
      <div className="bg-gray-light rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-text">أعلى مزايدة</span>
          <span className="text-lg font-bold text-brand-green">
            {formatPrice(currentPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-text">
          <span className="flex items-center gap-1">
            <TrendingUp size={14} />
            عدد المزايدات: {bidsCount}
          </span>
          {highestBidderName && (
            <span className={isCurrentUserHighest ? "text-brand-green font-bold" : ""}>
              {isCurrentUserHighest ? "أنت 🏆" : highestBidderName}
            </span>
          )}
        </div>
        {isCurrentUserHighest && (
          <p className="text-xs text-brand-green font-medium">
            أنت صاحب أعلى مزايدة حالياً
          </p>
        )}
      </div>

      {/* Bid history */}
      <BidHistory bids={bids} />

      {/* Place bid */}
      {remaining > 0 && (
        <div className="space-y-3">
          <Input
            label="مزايدتك"
            name="bid"
            type="number"
            inputMode="numeric"
            value={bidAmount}
            onChange={(e) => {
              setBidAmount(e.target.value);
              setBidError(null);
            }}
            unit="جنيه"
            placeholder={String(minNextBid)}
            hint={
              bidError ?? `الحد الأدنى: ${formatPrice(minNextBid)}`
            }
            error={bidError ?? undefined}
          />
          <Button
            fullWidth
            size="lg"
            onClick={handleBid}
            disabled={isBidding || isCurrentUserHighest}
            isLoading={isBidding}
            variant="secondary"
          >
            <Gavel size={18} />
            زايد الآن
          </Button>

          {isLastMinutes && (
            <p className="text-xs text-error text-center font-medium">
              ⚠️ المزاد في آخر 5 دقائق — أي مزايدة هتمدد المزاد 5 دقائق
            </p>
          )}
        </div>
      )}

      {/* Buy now */}
      {remaining > 0 && buyNowPrice && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-text">أو</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <Button
            fullWidth
            size="lg"
            onClick={onBuyNow}
            disabled={isBuyingNow}
            isLoading={isBuyingNow}
          >
            <ShoppingCart size={18} />
            اشتري الآن بـ {formatPrice(buyNowPrice)}
          </Button>
          <p className="text-xs text-gray-text text-center">
            ينهي المزاد فوراً
          </p>
        </>
      )}
    </div>
  );
}

/* ── Bid history sub-component ─────────────────────────────────── */

function BidHistory({ bids }: { bids: AuctionBid[] }) {
  if (bids.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-bold text-dark mb-2 flex items-center gap-1.5">
        <TrendingUp size={14} />
        سجل المزايدات
      </h4>
      <div className="bg-gray-light rounded-xl divide-y divide-gray-200 max-h-48 overflow-y-auto">
        {bids.map((bid, index) => (
          <div
            key={bid.id}
            className={`flex items-center justify-between px-4 py-2.5 ${
              index === 0 ? "bg-brand-green-light/50" : ""
            }`}
          >
            <span className="text-sm font-medium text-dark flex items-center gap-1">
              {index === 0 && <Trophy size={12} className="text-brand-green" />}
              {bid.bidderName}
            </span>
            <span className="text-sm font-bold text-brand-green">
              {formatPrice(bid.amount)}
            </span>
            <span className="text-[11px] text-gray-text">
              {formatTimeAgo(bid.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
