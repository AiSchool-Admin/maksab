-- ============================================
-- مكسب (Maksab) — Complete Database Setup
-- Paste this entire script into Supabase SQL Editor and click "Run"
-- This creates all tables, indexes, security policies, and seed data
-- ✅ FULLY IDEMPOTENT — safe to run multiple times
-- ============================================


-- ============================================
-- PART 0: CRITICAL FIX — Rename public.users to public.profiles
-- Having a table named "users" in the public schema conflicts with
-- Supabase Auth's internal auth.users table, causing "Database error
-- finding user" during signup/login. Renaming to "profiles" fixes this.
-- ============================================
DO $$
BEGIN
  -- If public.users exists, rename it to profiles
  -- This preserves all data, FK constraints, indexes, and policies
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.users RENAME TO profiles;
    RAISE NOTICE '✅ Renamed public.users → public.profiles';
  END IF;
END $$;


-- ============================================
-- PART 1: Extensions
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- Fuzzy text matching
CREATE EXTENSION IF NOT EXISTS unaccent;      -- Accent-insensitive search


-- ============================================
-- PART 2: Core Tables
-- ============================================

-- ============================================
-- Profiles table (extends Supabase auth.users)
-- Named "profiles" to avoid conflict with auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) DEFAULT '',
  display_name VARCHAR(100),
  avatar_url TEXT,
  governorate VARCHAR(50),
  city VARCHAR(100),
  bio TEXT,
  is_commission_supporter BOOLEAN DEFAULT FALSE,
  total_ads_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: if table had old phone column (VARCHAR(11) UNIQUE NOT NULL)
-- safely widen it to VARCHAR(20), drop UNIQUE and NOT NULL constraints
DO $$
BEGIN
  -- Remove UNIQUE constraint on phone if exists (old name)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_phone_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT users_phone_key;
  END IF;
  -- Also check new name
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_phone_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_phone_key;
  END IF;

  -- Allow NULL and widen phone column
  ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
  ALTER TABLE public.profiles ALTER COLUMN phone SET DEFAULT '';
  ALTER TABLE public.profiles ALTER COLUMN phone TYPE VARCHAR(20);
EXCEPTION WHEN OTHERS THEN
  -- Ignore if column doesn't exist or already modified
  NULL;
END $$;

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(governorate, city);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Clean up old trigger name if it exists from before rename
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.profiles;

-- ============================================
-- Categories
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  slug VARCHAR(50) UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- ============================================
-- Subcategories
-- ============================================
CREATE TABLE IF NOT EXISTS subcategories (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);

-- ============================================
-- Governorates (المحافظات)
-- ============================================
CREATE TABLE IF NOT EXISTS governorates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  name_en VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_governorates_name ON governorates(name);

-- ============================================
-- Cities (المدن)
-- ============================================
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  governorate_id INTEGER NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_cities_governorate ON cities(governorate_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);


-- ============================================
-- PART 3: Ads Table + Indexes
-- ============================================

CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Classification
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id),
  subcategory_id VARCHAR(50) REFERENCES subcategories(id),
  sale_type VARCHAR(10) NOT NULL CHECK (sale_type IN ('cash', 'auction', 'exchange')),

  -- Content (auto-generated from category fields)
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Price (NULL for exchange-only)
  price DECIMAL(12,2),
  is_negotiable BOOLEAN DEFAULT FALSE,

  -- Auction specific
  auction_start_price DECIMAL(12,2),
  auction_buy_now_price DECIMAL(12,2),
  auction_duration_hours INTEGER CHECK (auction_duration_hours IN (24, 48, 72)),
  auction_min_increment DECIMAL(12,2),
  auction_ends_at TIMESTAMPTZ,
  auction_status VARCHAR(20) DEFAULT 'active'
    CHECK (auction_status IN ('active', 'ended', 'bought_now', 'cancelled')),
  auction_winner_id UUID REFERENCES public.profiles(id),

  -- Exchange specific
  exchange_description TEXT,
  exchange_accepts_price_diff BOOLEAN DEFAULT FALSE,
  exchange_price_diff DECIMAL(12,2),

  -- Category-specific fields (JSONB for flexibility)
  category_fields JSONB DEFAULT '{}',

  -- Location
  governorate VARCHAR(50),
  city VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Media (max 5 images)
  images TEXT[] DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'exchanged', 'expired', 'deleted')),
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trigger_ads_updated_at ON ads;
CREATE TRIGGER trigger_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Full-text search index (Arabic)
CREATE INDEX IF NOT EXISTS idx_ads_search ON ads USING GIN (
  to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Trigram index for fuzzy matching (handles typos like "تويتا" → "تويوتا")
CREATE INDEX IF NOT EXISTS idx_ads_title_trgm ON ads USING GIN (title gin_trgm_ops);

-- Category + status + date (main feed queries)
CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category_id, status, created_at DESC);

-- User's own ads
CREATE INDEX IF NOT EXISTS idx_ads_user ON ads(user_id, status);

-- Location-based queries
CREATE INDEX IF NOT EXISTS idx_ads_location ON ads(governorate, city);

-- Price filtering
CREATE INDEX IF NOT EXISTS idx_ads_price ON ads(price) WHERE price IS NOT NULL;

-- Sale type filtering
CREATE INDEX IF NOT EXISTS idx_ads_sale_type ON ads(sale_type, status);

-- Active auctions ending soon
CREATE INDEX IF NOT EXISTS idx_ads_auction_ends ON ads(auction_ends_at)
  WHERE sale_type = 'auction' AND auction_status = 'active';

-- Status + created_at (general feed)
CREATE INDEX IF NOT EXISTS idx_ads_status_date ON ads(status, created_at DESC);

-- Category fields JSONB (for category-specific filtering)
CREATE INDEX IF NOT EXISTS idx_ads_category_fields ON ads USING GIN (category_fields);

-- Exchange description search
CREATE INDEX IF NOT EXISTS idx_ads_exchange_search ON ads
  USING GIN (to_tsvector('arabic', coalesce(exchange_description, '')))
  WHERE sale_type = 'exchange' AND status = 'active';


-- ============================================
-- PART 4: Interaction Tables
-- (favorites, auction_bids, conversations,
--  messages, commissions)
-- ============================================

-- ============================================
-- Favorites (المفضلة)
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_ad ON favorites(ad_id);

-- ============================================
-- Auction Bids (المزايدات)
-- ============================================
CREATE TABLE IF NOT EXISTS auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick lookup of highest bid per ad
CREATE INDEX IF NOT EXISTS idx_bids_ad ON auction_bids(ad_id, amount DESC);
-- User's bidding history
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON auction_bids(bidder_id, created_at DESC);

-- ============================================
-- Conversations (المحادثات)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One conversation per buyer per ad
  UNIQUE(ad_id, buyer_id)
);

-- User's conversations (as buyer or seller)
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_ad ON conversations(ad_id);

-- ============================================
-- Messages (الرسائل)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages in a conversation (ordered by time)
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
-- Unread messages for a user
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read)
  WHERE is_read = FALSE;

-- ============================================
-- Commissions (العمولات التطوعية)
-- ============================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_payer ON commissions(payer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_ad ON commissions(ad_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);


-- ============================================
-- PART 5: Recommendations Engine Tables
-- (user_signals, user_interest_profiles)
-- ============================================

-- ============================================
-- User Signals (إشارات سلوك المستخدم)
-- Collects user behavior for recommendation engine
-- ============================================
CREATE TABLE IF NOT EXISTS user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type VARCHAR(20) NOT NULL CHECK (
    signal_type IN ('search', 'view', 'favorite', 'ad_created', 'bid_placed', 'chat_initiated')
  ),
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory_id VARCHAR(50),
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  -- Flexible data: keywords, filters, brand, model, price range, etc.
  signal_data JSONB DEFAULT '{}',
  governorate VARCHAR(50),
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recent signals per user (for real-time recommendations)
CREATE INDEX IF NOT EXISTS idx_signals_user_recent ON user_signals(user_id, created_at DESC);
-- User + category weighted signals (for category-level recommendations)
CREATE INDEX IF NOT EXISTS idx_signals_user_category ON user_signals(user_id, category_id, weight DESC);
-- JSONB signal data (for filtering by brand, price, etc.)
CREATE INDEX IF NOT EXISTS idx_signals_data ON user_signals USING GIN (signal_data);
-- Signal type (for analytics)
CREATE INDEX IF NOT EXISTS idx_signals_type ON user_signals(signal_type, created_at DESC);

-- ============================================
-- User Interest Profiles (ملفات اهتمامات المستخدمين)
-- Precomputed by background worker, used for fast recommendations
-- ============================================
CREATE TABLE IF NOT EXISTS user_interest_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  interests JSONB NOT NULL DEFAULT '[]',
  -- Example structure:
  -- [
  --   { "category": "cars", "brand": "Toyota", "price_range": [200000, 400000], "score": 25 },
  --   { "category": "phones", "brand": "Apple", "price_range": [10000, 25000], "score": 18 }
  -- ]
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Cleanup: Auto-delete old signals (> 90 days)
-- Run periodically via background worker
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM user_signals
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- PART 6: Row Level Security Policies
-- Using DROP IF EXISTS before CREATE to be idempotent
-- ============================================

-- ============================================
-- PROFILES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policy names (from when table was called "users")
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
-- Drop new policy names for idempotency
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile in profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile in profiles" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own profile in profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile in profiles"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- CATEGORIES (public read-only)
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- ============================================
-- SUBCATEGORIES (public read-only)
-- ============================================
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subcategories are viewable by everyone" ON subcategories;
CREATE POLICY "Subcategories are viewable by everyone"
  ON subcategories FOR SELECT
  USING (true);

-- ============================================
-- GOVERNORATES (public read-only)
-- ============================================
ALTER TABLE governorates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Governorates are viewable by everyone" ON governorates;
CREATE POLICY "Governorates are viewable by everyone"
  ON governorates FOR SELECT
  USING (true);

-- ============================================
-- CITIES (public read-only)
-- ============================================
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cities are viewable by everyone" ON cities;
CREATE POLICY "Cities are viewable by everyone"
  ON cities FOR SELECT
  USING (true);

-- ============================================
-- ADS
-- ============================================
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ads are viewable by everyone" ON ads;
CREATE POLICY "Ads are viewable by everyone"
  ON ads FOR SELECT
  USING (status != 'deleted');

DROP POLICY IF EXISTS "Users can create their own ads" ON ads;
CREATE POLICY "Users can create their own ads"
  ON ads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ads" ON ads;
CREATE POLICY "Users can update their own ads"
  ON ads FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ads" ON ads;
CREATE POLICY "Users can delete their own ads"
  ON ads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FAVORITES
-- ============================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove favorites" ON favorites;
CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- AUCTION BIDS
-- ============================================
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bids are viewable by everyone" ON auction_bids;
CREATE POLICY "Bids are viewable by everyone"
  ON auction_bids FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can place bids" ON auction_bids;
CREATE POLICY "Users can place bids"
  ON auction_bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

-- ============================================
-- CONVERSATIONS
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation participants can view" ON conversations;
CREATE POLICY "Conversation participants can view"
  ON conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can start conversations" ON conversations;
CREATE POLICY "Users can start conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================
-- MESSAGES
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can view messages" ON messages;
CREATE POLICY "Chat participants can view messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Chat participants can send messages" ON messages;
CREATE POLICY "Chat participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON messages;
CREATE POLICY "Recipients can mark messages as read"
  ON messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- ============================================
-- COMMISSIONS
-- ============================================
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own commissions" ON commissions;
CREATE POLICY "Users can view their own commissions"
  ON commissions FOR SELECT
  USING (auth.uid() = payer_id);

DROP POLICY IF EXISTS "Users can create commissions" ON commissions;
CREATE POLICY "Users can create commissions"
  ON commissions FOR INSERT
  WITH CHECK (auth.uid() = payer_id);

-- ============================================
-- USER SIGNALS
-- ============================================
ALTER TABLE user_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own signals" ON user_signals;
CREATE POLICY "Users can view their own signals"
  ON user_signals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create signals" ON user_signals;
CREATE POLICY "Users can create signals"
  ON user_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- USER INTEREST PROFILES
-- ============================================
ALTER TABLE user_interest_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own interest profile" ON user_interest_profiles;
CREATE POLICY "Users can view their own interest profile"
  ON user_interest_profiles FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================
-- PART 7: Notifications & Push Subscriptions
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
    'favorite_price_drop', 'recommendation', 'system',
    'new_match', 'seller_interest'
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

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS for Push Subscriptions
-- ============================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- Enable Realtime for notifications
-- (wrapped in DO block for idempotency)
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already added
END;
$$;

