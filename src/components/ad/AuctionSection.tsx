"use client";

import { useState, useEffect } from "react";
import { Clock, TrendingUp } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatPrice, formatCountdown, formatTimeAgo } from "@/lib/utils/format";
import type { MockBid } from "@/lib/mock-ad-detail";

interface AuctionSectionProps {
  startPrice: number;
  buyNowPrice: number | null;
  highestBid: number | null;
  bidsCount: number;
  minIncrement: number;
  endsAt: string;
  bids: MockBid[];
  onPlaceBid: (amount: number) => void;
  onBuyNow: () => void;
}

export default function AuctionSection({
  startPrice,
  buyNowPrice,
  highestBid,
  bidsCount,
  minIncrement,
  endsAt,
  bids,
  onPlaceBid,
  onBuyNow,
}: AuctionSectionProps) {
  const [remaining, setRemaining] = useState(
    () => new Date(endsAt).getTime() - Date.now(),
  );
  const [bidAmount, setBidAmount] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const isEnded = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 6 * 3600000;
  const currentPrice = highestBid ?? startPrice;
  const minNextBid = currentPrice + Math.max(minIncrement, Math.ceil(currentPrice * 0.02), 50);
  const progress = 1 - remaining / (72 * 3600000); // rough progress

  const handleBid = () => {
    const amount = Number(bidAmount);
    if (amount >= minNextBid) {
      onPlaceBid(amount);
      setBidAmount("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Timer */}
      <div className="bg-brand-gold-light rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-dark">
            {isEnded ? "انتهى المزاد" : "ينتهي خلال"}
          </span>
          <div
            className={`flex items-center gap-1.5 text-lg font-bold ${
              isEnded
                ? "text-error"
                : isUrgent
                  ? "text-error"
                  : "text-brand-gold"
            }`}
          >
            <Clock size={18} />
            <span dir="ltr">{formatCountdown(remaining)}</span>
            {isUrgent && !isEnded && <span>🔥</span>}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-brand-gold/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-gold rounded-full transition-all"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
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
          {highestBid && bids.length > 0 && (
            <span>{bids[0].bidderName}</span>
          )}
        </div>
      </div>

      {/* Bid history */}
      {bids.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-dark mb-2">سجل المزايدات</h4>
          <div className="bg-gray-light rounded-xl divide-y divide-gray-200 max-h-48 overflow-y-auto">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-sm font-medium text-dark">
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
      )}

      {/* Place bid */}
      {!isEnded && (
        <div className="space-y-3">
          <Input
            label="مزايدتك"
            name="bid"
            type="number"
            inputMode="numeric"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            unit="جنيه"
            placeholder={String(minNextBid)}
            hint={`الحد الأدنى: ${formatPrice(minNextBid)}`}
          />
          <Button
            fullWidth
            size="lg"
            onClick={handleBid}
            disabled={!bidAmount || Number(bidAmount) < minNextBid}
            variant="secondary"
          >
            🔨 زايد الآن
          </Button>
        </div>
      )}

      {/* Buy now */}
      {!isEnded && buyNowPrice && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-text">أو</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <Button fullWidth size="lg" onClick={onBuyNow}>
            🛒 اشتري الآن بـ {formatPrice(buyNowPrice)}
          </Button>
          <p className="text-xs text-gray-text text-center">
            ينهي المزاد فوراً
          </p>
        </>
      )}
    </div>
  );
}
