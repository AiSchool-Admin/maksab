-- ============================================
-- Migration 007: Smart Notifications
-- Adds new notification types for buyer-seller matching
-- ============================================

-- Drop old CHECK constraint and add new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'chat', 'auction_bid', 'auction_outbid', 'auction_ending',
  'auction_ended', 'auction_won', 'auction_ended_no_bids',
  'favorite_price_drop', 'recommendation', 'new_match',
  'seller_interest', 'exchange_match',
  'price_offer_new', 'price_offer_accepted',
  'price_offer_rejected', 'price_offer_countered',
  'system'
));

-- Index to prevent duplicate notifications (same user, same type, same ad within 24h)
CREATE INDEX IF NOT EXISTS idx_notifications_dedup
  ON notifications(user_id, type, ad_id, created_at DESC);

-- Index for push subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_push_sub_user_endpoint
  ON push_subscriptions(user_id);
