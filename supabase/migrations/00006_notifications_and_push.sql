-- ============================================
-- Migration 006: Notifications & Push Subscriptions
-- ✅ IDEMPOTENT — safe to run multiple times
-- ============================================

-- ============================================
-- Notifications (الإشعارات)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'chat', 'auction_bid', 'auction_outbid', 'auction_ending',
    'auction_ended', 'auction_won', 'auction_ended_no_bids',
    'favorite_price_drop', 'recommendation', 'system'
  )),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's notifications ordered by time
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
-- Unread count query
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- ============================================
-- Push Subscriptions (اشتراكات الإشعارات)
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);

-- ============================================
-- RLS for Notifications
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- RLS for Push Subscriptions
-- ============================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own push subscriptions'
  ) THEN
    CREATE POLICY "Users can manage their own push subscriptions"
      ON push_subscriptions FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- Enable Realtime for notifications
-- ============================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
  -- Already added, ignore
END $$;
