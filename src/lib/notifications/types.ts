export type NotificationType =
  | "chat"
  | "auction_bid"
  | "auction_outbid"
  | "auction_ending"
  | "auction_ended"
  | "auction_won"
  | "auction_ended_no_bids"
  | "favorite_price_drop"
  | "recommendation"
  | "new_match"
  | "exchange_match"
  | "seller_interest"
  | "buy_request_match"
  | "buyer_looking"
  | "buy_request_offer"
  | "commission_thank_you"
  | "commission_reminder"
  | "commission_verified"
  | "system";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  icon: string;
  adId?: string;
  conversationId?: string;
  isRead: boolean;
  createdAt: string;
}

/** Map notification types to icons */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  chat: "💬",
  auction_bid: "🔥",
  auction_outbid: "⚠️",
  auction_ending: "⏰",
  auction_ended: "🏆",
  auction_won: "🎉",
  auction_ended_no_bids: "🔥",
  favorite_price_drop: "💰",
  recommendation: "🔥",
  new_match: "🎯",
  exchange_match: "🔄",
  seller_interest: "👥",
  buy_request_match: "🎯",
  buyer_looking: "🛒",
  buy_request_offer: "💼",
  commission_thank_you: "💚",
  commission_reminder: "🏦",
  commission_verified: "✅",
  system: "📢",
};
