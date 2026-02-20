-- Sprint 2 — Task 13 & 16: Notification preferences + Email subscribers

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  push_enabled BOOLEAN DEFAULT true,
  new_message BOOLEAN DEFAULT true,
  auction_updates BOOLEAN DEFAULT true,
  price_drops BOOLEAN DEFAULT true,
  new_in_category BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notification campaigns log
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'welcome', 'activation_nudge', 'new_in_category', 'new_message',
    'price_drop', 'weekly_digest', 'inactive_return', 'custom'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notification_campaigns_user ON public.notification_campaigns(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_type ON public.notification_campaigns(campaign_type, sent_at DESC);

-- Email subscribers
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  utm_source TEXT,
  utm_campaign TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_active ON public.email_subscribers(is_active, subscribed_at DESC);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "users_own_notification_prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Users can see their own campaign history
CREATE POLICY "users_own_campaigns" ON public.notification_campaigns
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can subscribe (email capture)
CREATE POLICY "email_subscribe_insert" ON public.email_subscribers
  FOR INSERT WITH CHECK (true);
