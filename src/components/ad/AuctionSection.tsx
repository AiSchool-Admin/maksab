"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  TrendingUp,
  Trophy,
  Ban,
  ShoppingCart,
  Flame,
  Timer,
  Plus,
  Minus,
  Radio,
  XCircle,
  TimerReset,
} from "lucide-react";
import Button from "@/components/ui/Button";
import type { AuctionState, AuctionBid } from "@/lib/auction/types";
import { calcMinNextBid, getAuctionStatusLabel } from "@/lib/auction/types";
import { formatPrice, formatCountdown, formatTimeAgo } from "@/lib/utils/format";

interface AuctionSectionProps {
  auctionState: AuctionState;
  currentUserId: string | null;
  sellerId?: string;
  onPlaceBid: (amount: number) => void;
  onBuyNow: () => void;
  onCancelAuction?: () => void;
  onExtendAuction?: (hours: number) => void;
  isBidding?: boolean;
  isBuyingNow?: boolean;
  isCancelling?: boolean;
  isExtending?: boolean;
  isLiveAuction?: boolean;
}

export default function AuctionSection({
  auctionState,
  currentUserId,
  sellerId,
  onPlaceBid,
  onBuyNow,
  onCancelAuction,
  onExtendAuction,
  isBidding = false,
  isBuyingNow = false,
  isCancelling = false,
  isExtending = false,
  isLiveAuction = false,
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
  const [bidError, setBidError] = useState<string | null>(null);
  const [showExtendOptions, setShowExtendOptions] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isActive = status === "active";
  const isSeller = !!currentUserId && currentUserId === sellerId;
  const currentPrice = currentHighestBid ?? startPrice;
  // Use seller-defined increment when set, otherwise 2% (min 50 EGP)
  const sellerIncrement = auctionState.minIncrement > 0 ? auctionState.minIncrement : undefined;
  const minIncrement = sellerIncrement ?? Math.max(Math.ceil(currentPrice * 0.02), 50);
  const minNextBid = calcMinNextBid(currentPrice, sellerIncrement);

  // Quick-bid stepper state: starts at minimum next bid
  const [bidAmount, setBidAmount] = useState(minNextBid);

  // Update bidAmount when minNextBid changes (new bid comes in)
  useEffect(() => {
    setBidAmount(minNextBid);
  }, [minNextBid]);

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

  const isUrgent = isActive && remaining > 0 && remaining < 6 * 3600000;
  const isLastMinutes = isActive && remaining > 0 && remaining < 5 * 60 * 1000;
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

  /* ── Quick bid stepper handlers ─────────────────────────────── */
  const handleIncrement = useCallback(() => {
    setBidAmount((prev) => prev + minIncrement);
    setBidError(null);
  }, [minIncrement]);

  const handleDecrement = useCallback(() => {
    setBidAmount((prev) => {
      const next = prev - minIncrement;
      return next >= minNextBid ? next : minNextBid;
    });
    setBidError(null);
  }, [minIncrement, minNextBid]);

  /* ── Handle bid submission ──────────────────────────────────── */
  const handleBid = useCallback(() => {
    setBidError(null);

    if (bidAmount < minNextBid) {
      setBidError(`الحد الأدنى للمزايدة ${formatPrice(minNextBid)}`);
      return;
    }
    if (isCurrentUserHighest) {
      setBidError("أنت بالفعل صاحب أعلى مزايدة");
      return;
    }

    onPlaceBid(bidAmount);
  }, [bidAmount, minNextBid, isCurrentUserHighest, onPlaceBid]);

  /* ── ENDED STATES ───────────────────────────────────────────── */

  if (status === "ended_winner") {
    return (
      <div className="space-y-4">
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
            {bidsCount} مزايدة
          </div>
        </div>
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
            خلص المزاد ومحدش زايد — سعر الافتتاح كان{" "}
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
            البائع لغى المزاد ده.
          </p>
        </div>
      </div>
    );
  }

  /* ── ACTIVE STATE ────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Live auction badge */}
      {isLiveAuction && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <Radio size={16} className="text-red-500" />
          <span className="text-sm font-bold text-red-600">مزاد لايف — على الهوا دلوقتي! 📡</span>
        </div>
      )}

      {/* Timer */}
      <div className="bg-brand-gold-light rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-dark">
            {remaining <= 0 ? "المزاد خلص..." : "⏰ فاضل"}
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
            <span>المزاد اتمدد — حماية من المزايدة في الآخر</span>
          </div>
        )}
      </div>

      {/* Current highest bid */}
      <div className="bg-gray-light rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-text">🔥 أعلى مزايدة</span>
          <span className="text-lg font-bold text-brand-green">
            {formatPrice(currentPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-text">
          <span className="flex items-center gap-1">
            <TrendingUp size={14} />
            {bidsCount} مزايدة
          </span>
          {highestBidderName && (
            <span className={isCurrentUserHighest ? "text-brand-green font-bold" : ""}>
              {isCurrentUserHighest ? "أنت 🏆" : highestBidderName}
            </span>
          )}
        </div>
        {isCurrentUserHighest && (
          <p className="text-xs text-brand-green font-medium">
            أنت الأول دلوقتي — كمّل كده 🏆
          </p>
        )}
      </div>

      {/* Bid history */}
      <BidHistory bids={bids} />

      {/* ── Quick Bid Stepper (hidden for seller) ──────────── */}
      {remaining > 0 && !isSeller && (
        <div className="space-y-3">
          {/* Next bid label */}
          <div className="text-center">
            <span className="text-xs text-gray-text">زايد بكام؟</span>
          </div>

          {/* Stepper control */}
          <div className="flex items-center justify-center gap-3">
            {/* Decrement button */}
            <button
              type="button"
              onClick={handleDecrement}
              disabled={bidAmount <= minNextBid || isBidding}
              className="w-12 h-12 rounded-full bg-gray-light hover:bg-gray-200 active:scale-95 flex items-center justify-center transition-all disabled:opacity-40 disabled:active:scale-100"
              aria-label="تقليل المبلغ"
            >
              <Minus size={20} className="text-dark" />
            </button>

            {/* Amount display */}
            <div className="flex-1 max-w-[200px] text-center">
              <div className="bg-brand-green-light border-2 border-brand-green rounded-2xl px-4 py-3">
                <span className="text-2xl font-bold text-brand-green" dir="ltr">
                  {bidAmount.toLocaleString("en-US")}
                </span>
                <span className="text-sm font-medium text-brand-green me-1">
                  {" "}جنيه
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-gray-text">
                الحد الأدنى: {formatPrice(minNextBid)} — الزيادة: {formatPrice(minIncrement)}
              </div>
            </div>

            {/* Increment button */}
            <button
              type="button"
              onClick={handleIncrement}
              disabled={isBidding}
              className="w-12 h-12 rounded-full bg-brand-green-light hover:bg-brand-green/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-40 disabled:active:scale-100"
              aria-label="زيادة المبلغ"
            >
              <Plus size={20} className="text-brand-green" />
            </button>
          </div>

          {/* Quick increment chips */}
          <div className="flex justify-center gap-2">
            {[1, 2, 5, 10].map((multiplier) => {
              const chipAmount = minIncrement * multiplier;
              return (
                <button
                  key={multiplier}
                  type="button"
                  onClick={() => {
                    setBidAmount(minNextBid + chipAmount - minIncrement);
                    setBidError(null);
                  }}
                  disabled={isBidding}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-gray-light text-gray-text hover:bg-brand-gold-light hover:text-brand-gold active:scale-95 transition-all disabled:opacity-40"
                >
                  +{formatPrice(chipAmount)}
                </button>
              );
            })}
          </div>

          {/* Error message */}
          {bidError && (
            <p className="text-xs text-error text-center font-medium">
              {bidError}
            </p>
          )}

          {/* Bid button */}
          <Button
            fullWidth
            size="lg"
            onClick={handleBid}
            disabled={isBidding || isCurrentUserHighest}
            isLoading={isBidding}
            variant="secondary"
          >
            <Flame size={18} />
            🔥 زايد بـ {formatPrice(bidAmount)}
          </Button>

          {isLastMinutes && (
            <p className="text-xs text-error text-center font-medium">
              ⚠️ المزاد في آخر 5 دقائق — أي مزايدة هتمدد المزاد 5 دقائق
            </p>
          )}
        </div>
      )}

      {/* Buy now */}
      {remaining > 0 && buyNowPrice && !isSeller && (
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

      {/* Seller controls: extend & cancel */}
      {isSeller && (
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-text text-center">تحكم في المزاد</p>

          {/* Extend auction */}
          {onExtendAuction && (
            <>
              {!showExtendOptions ? (
                <Button
                  fullWidth
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExtendOptions(true)}
                  disabled={isExtending}
                >
                  <TimerReset size={16} />
                  مدد المزاد
                </Button>
              ) : (
                <div className="bg-brand-gold-light rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-dark text-center">مدد بكام ساعة؟</p>
                  <div className="flex gap-2">
                    {[12, 24, 48].map((h) => (
                      <button
                        key={h}
                        onClick={() => {
                          onExtendAuction(h);
                          setShowExtendOptions(false);
                        }}
                        disabled={isExtending}
                        className="flex-1 py-2 text-sm font-bold rounded-lg bg-brand-gold text-white hover:bg-brand-gold/90 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {h} ساعة
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowExtendOptions(false)}
                    className="w-full text-xs text-gray-text py-1"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </>
          )}

          {/* Cancel auction */}
          {onCancelAuction && (
            <>
              {!showCancelConfirm ? (
                <Button
                  fullWidth
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={isCancelling}
                  className="!border-error !text-error hover:!bg-error/5"
                >
                  <XCircle size={16} />
                  إلغاء المزاد
                </Button>
              ) : (
                <div className="bg-error/5 border border-error/20 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-bold text-error text-center">متأكد تلغي المزاد؟</p>
                  {bidsCount > 0 && (
                    <p className="text-xs text-gray-text text-center">
                      فيه {bidsCount} مزايدة — هيتم إبلاغ المزايدين
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2 text-sm font-medium rounded-lg bg-gray-light text-dark hover:bg-gray-200 transition-colors"
                    >
                      لا، رجوع
                    </button>
                    <button
                      onClick={() => {
                        onCancelAuction();
                        setShowCancelConfirm(false);
                      }}
                      disabled={isCancelling}
                      className="flex-1 py-2 text-sm font-bold rounded-lg bg-error text-white hover:bg-error/90 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isCancelling ? "جاري الإلغاء..." : "أيوا، إلغي"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
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
