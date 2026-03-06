-- Add auction_cancelled and auction_extended to notification type constraint.
-- These types are used when a seller cancels or extends an active auction
-- to notify all bidders.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'chat', 'auction_bid', 'auction_outbid', 'auction_ending',
    'auction_ended', 'auction_won', 'auction_ended_no_bids',
    'auction_cancelled', 'auction_extended',
    'favorite_price_drop', 'recommendation', 'system',
    'new_match', 'exchange_match', 'seller_interest',
    'buy_request_match', 'buyer_looking', 'buy_request_offer',
    'commission_thank_you', 'commission_reminder', 'commission_verified',
    'commission_pending_verification', 'commission_rejected'
  ));
