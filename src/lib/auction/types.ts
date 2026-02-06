/**
 * Auction system types — shared between frontend and edge functions.
 */

export type AuctionStatus =
  | "active"
  | "ended_winner"
  | "ended_no_bids"
  | "bought_now"
  | "cancelled";

export interface AuctionBid {
  id: string;
  adId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  createdAt: string;
}

export interface AuctionState {
  adId: string;
  status: AuctionStatus;
  startPrice: number;
  buyNowPrice: number | null;
  currentHighestBid: number | null;
  highestBidderName: string | null;
  highestBidderId: string | null;
  bidsCount: number;
  minIncrement: number;
  endsAt: string;
  originalEndsAt: string;
  bids: AuctionBid[];
  winnerId: string | null;
  winnerName: string | null;
  /** Whether the timer was extended due to anti-sniping */
  wasExtended: boolean;
}

/** Calculate the minimum next bid amount */
export function calcMinNextBid(currentPrice: number): number {
  return currentPrice + Math.max(Math.ceil(currentPrice * 0.02), 50);
}

/** Human-readable auction status label */
export function getAuctionStatusLabel(status: AuctionStatus): string {
  switch (status) {
    case "active":
      return "مزاد نشط";
    case "ended_winner":
      return "انتهى المزاد — تم البيع";
    case "ended_no_bids":
      return "انتهى المزاد — بدون مزايدات";
    case "bought_now":
      return "تم الشراء فوراً";
    case "cancelled":
      return "مزاد ملغي";
  }
}
