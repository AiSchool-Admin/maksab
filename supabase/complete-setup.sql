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
    CHECK (auction_status IN ('active', 'ended_winner', 'ended_no_bids', 'bought_now', 'cancelled')),
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


-- ============================================
-- PART 8: Seed Data — Categories & Subcategories
-- 12 قسم رئيسي مع الأقسام الفرعية
-- All inserts use ON CONFLICT DO NOTHING for idempotency
--
-- ⚠️ IMPORTANT: Subcategory IDs MUST match categories-config.ts
-- Old format (cars_passenger, re_land, etc.) is WRONG — causes FK violations
-- Correct format: short IDs matching the slug (passenger, land, etc.)
-- ============================================

-- NOTE: Old DELETE migration removed — not needed since INSERT uses ON CONFLICT DO NOTHING
-- and existing ads may reference current subcategory IDs.

-- ============================================
-- Categories (الأقسام الرئيسية)
-- ============================================
INSERT INTO categories (id, name, icon, slug, sort_order) VALUES
  ('cars',       'السيارات',          '🚗', 'cars',        1),
  ('real_estate','العقارات',          '🏠', 'real-estate',  2),
  ('phones',     'الموبايلات والتابلت','📱', 'phones',      3),
  ('fashion',    'الموضة',            '👗', 'fashion',      4),
  ('scrap',      'الخردة',            '♻️', 'scrap',        5),
  ('gold',       'الذهب والفضة',      '💰', 'gold',         6),
  ('luxury',     'السلع الفاخرة',     '💎', 'luxury',       7),
  ('appliances', 'الأجهزة المنزلية',  '🏠', 'appliances',   8),
  ('furniture',  'الأثاث والديكور',   '🪑', 'furniture',    9),
  ('hobbies',    'الهوايات',          '🎮', 'hobbies',     10),
  ('tools',      'العدد والأدوات',    '🔧', 'tools',       11),
  ('services',   'الخدمات',           '🛠️', 'services',    12),
  ('computers',  'الكمبيوتر واللابتوب','💻', 'computers',   13),
  ('kids_babies','مستلزمات الأطفال',  '👶', 'kids-babies',  14),
  ('electronics','الإلكترونيات',      '📺', 'electronics',  15),
  ('beauty',     'الجمال والصحة',     '💄', 'beauty',       16)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 1. السيارات — Subcategories (IDs match categories-config.ts)
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('passenger',   'cars', 'سيارات ملاكي',  'passenger',   1),
  ('microbus',    'cars', 'ميكروباص',      'microbus',    2),
  ('trucks',      'cars', 'نقل',           'trucks',      3),
  ('motorcycles', 'cars', 'موتوسيكلات',    'motorcycles', 4),
  ('car-parts',   'cars', 'قطع غيار',      'car-parts',   5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. العقارات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('apartments-sale', 'real_estate', 'شقق للبيع',     'apartments-sale', 1),
  ('apartments-rent', 'real_estate', 'شقق للإيجار',   'apartments-rent', 2),
  ('villas',          'real_estate', 'فيلات',          'villas',          3),
  ('land',            'real_estate', 'أراضي',          'land',            4),
  ('commercial',      'real_estate', 'محلات تجارية',   'commercial',      5),
  ('offices',         'real_estate', 'مكاتب',          'offices',         6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. الموبايلات والتابلت — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('mobile',           'phones', 'موبايلات',    'mobile',           1),
  ('tablet',           'phones', 'تابلت',       'tablet',           2),
  ('phone-accessories','phones', 'إكسسوارات',   'phone-accessories', 3),
  ('phone-parts',      'phones', 'قطع غيار',    'phone-parts',      4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. الموضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('men',                 'fashion', 'ملابس رجالي',  'men',                1),
  ('women',               'fashion', 'ملابس حريمي',  'women',              2),
  ('kids',                'fashion', 'ملابس أطفال',  'kids',               3),
  ('shoes',               'fashion', 'أحذية',        'shoes',              4),
  ('bags',                'fashion', 'شنط',          'bags',               5),
  ('fashion-accessories', 'fashion', 'إكسسوارات',    'fashion-accessories', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. الخردة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('iron',         'scrap', 'حديد',          'iron',         1),
  ('aluminum',     'scrap', 'ألومنيوم',      'aluminum',     2),
  ('copper',       'scrap', 'نحاس',          'copper',       3),
  ('plastic',      'scrap', 'بلاستيك',       'plastic',      4),
  ('paper',        'scrap', 'ورق',           'paper',        5),
  ('old-devices',  'scrap', 'أجهزة قديمة',   'old-devices',  6),
  ('construction', 'scrap', 'مخلفات بناء',   'construction', 7),
  ('scrap-other',  'scrap', 'أخرى',          'scrap-other',  8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. الذهب والفضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('gold-items',       'gold', 'ذهب',           'gold-items',       1),
  ('silver',           'gold', 'فضة',           'silver',           2),
  ('diamond',          'gold', 'ألماس',         'diamond',          3),
  ('precious-watches', 'gold', 'ساعات ثمينة',   'precious-watches', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. السلع الفاخرة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('luxury-bags', 'luxury', 'شنط فاخرة', 'luxury-bags',  1),
  ('sunglasses',  'luxury', 'نظارات',    'sunglasses',   2),
  ('watches',     'luxury', 'ساعات',     'watches',      3),
  ('perfumes',    'luxury', 'عطور',      'perfumes',     4),
  ('pens',        'luxury', 'أقلام',     'pens',         5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. الأجهزة المنزلية — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('washers',          'appliances', 'غسالات',       'washers',          1),
  ('fridges',          'appliances', 'ثلاجات',       'fridges',          2),
  ('cookers',          'appliances', 'بوتاجازات',    'cookers',          3),
  ('ac',               'appliances', 'مكيفات',       'ac',               4),
  ('heaters',          'appliances', 'سخانات',       'heaters',          5),
  ('small-appliances', 'appliances', 'أجهزة صغيرة',  'small-appliances', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. الأثاث والديكور — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('bedroom',         'furniture', 'غرف نوم',   'bedroom',         1),
  ('dining',          'furniture', 'سفرة',      'dining',          2),
  ('living',          'furniture', 'أنتريه',    'living',          3),
  ('kitchen',         'furniture', 'مطابخ',     'kitchen',         4),
  ('decor',           'furniture', 'ديكورات',   'decor',           5),
  ('lighting',        'furniture', 'إضاءة',     'lighting',        6),
  ('carpets',         'furniture', 'سجاد',      'carpets',         7),
  ('furniture-other', 'furniture', 'أخرى',      'furniture-other', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. الهوايات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('music',    'hobbies', 'آلات موسيقية',     'music',     1),
  ('sports',   'hobbies', 'معدات رياضية',     'sports',    2),
  ('gaming',   'hobbies', 'ألعاب فيديو',      'gaming',    3),
  ('books',    'hobbies', 'كتب',              'books',     4),
  ('cameras',  'hobbies', 'كاميرات',          'cameras',   5),
  ('bikes',    'hobbies', 'دراجات',           'bikes',     6),
  ('antiques', 'hobbies', 'تحف وأنتيكات',     'antiques',  7),
  ('pets',     'hobbies', 'حيوانات أليفة',    'pets',      8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 11. العدد والأدوات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('hand-tools',           'tools', 'عدد يدوية',       'hand-tools',           1),
  ('power-tools',          'tools', 'عدد كهربائية',    'power-tools',          2),
  ('workshop',             'tools', 'معدات ورش',       'workshop',             3),
  ('agricultural',         'tools', 'معدات زراعية',    'agricultural',         4),
  ('restaurant-equipment', 'tools', 'معدات مطاعم',     'restaurant-equipment', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 12. الخدمات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('plumbing',       'services', 'سباكة',          'plumbing',       1),
  ('electrical',     'services', 'كهرباء',         'electrical',     2),
  ('painting',       'services', 'نقاشة',          'painting',       3),
  ('carpentry',      'services', 'نجارة',          'carpentry',      4),
  ('device-repair',  'services', 'صيانة أجهزة',    'device-repair',  5),
  ('moving',         'services', 'نقل أثاث',       'moving',         6),
  ('cleaning',       'services', 'تنظيف',          'cleaning',       7),
  ('tech',           'services', 'خدمات تقنية',    'tech',           8),
  ('tutoring',       'services', 'دروس خصوصية',    'tutoring',       9),
  ('services-other', 'services', 'خدمات أخرى',     'services-other', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 13. الكمبيوتر واللابتوب — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('comp_laptops',      'computers', 'لابتوبات',          'laptops',          1),
  ('comp_desktops',     'computers', 'كمبيوتر مكتبي',     'desktops',         2),
  ('comp_monitors',     'computers', 'شاشات',             'monitors',         3),
  ('comp_printers',     'computers', 'طابعات وماسحات',    'printers',         4),
  ('comp_parts',        'computers', 'قطع غيار كمبيوتر',  'pc-parts',         5),
  ('comp_networking',   'computers', 'معدات شبكات',       'networking',       6),
  ('comp_storage',      'computers', 'أجهزة تخزين',       'storage-devices',  7),
  ('comp_accessories',  'computers', 'إكسسوارات كمبيوتر', 'pc-accessories',   8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 14. مستلزمات الأطفال — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('kids_clothes',      'kids_babies', 'ملابس أطفال ورضع',       'kids-clothes',    1),
  ('kids_strollers',    'kids_babies', 'عربيات أطفال',            'strollers',       2),
  ('kids_cribs',        'kids_babies', 'سراير أطفال',             'cribs',           3),
  ('kids_car_seats',    'kids_babies', 'كراسي سيارة',             'car-seats',       4),
  ('kids_feeding',      'kids_babies', 'مستلزمات رضاعة وتغذية',  'feeding',         5),
  ('kids_toys',         'kids_babies', 'ألعاب أطفال',             'kids-toys',       6),
  ('kids_maternity',    'kids_babies', 'مستلزمات حمل وأمومة',    'maternity',       7),
  ('kids_school',       'kids_babies', 'مستلزمات مدرسية',         'school-supplies', 8),
  ('kids_other',        'kids_babies', 'أخرى',                    'kids-other',      9)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 15. الإلكترونيات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('elec_tvs',          'electronics', 'تليفزيونات وشاشات',  'tvs',              1),
  ('elec_speakers',     'electronics', 'سماعات وأنظمة صوت',  'speakers',         2),
  ('elec_cameras',      'electronics', 'كاميرات مراقبة',     'security-cameras', 3),
  ('elec_smart',        'electronics', 'أجهزة ذكية',         'smart-home',       4),
  ('elec_projectors',   'electronics', 'بروجكتور',           'projectors',       5),
  ('elec_gaming',       'electronics', 'أجهزة ألعاب',        'gaming-consoles',  6),
  ('elec_other',        'electronics', 'إلكترونيات أخرى',    'electronics-other', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 16. الجمال والصحة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('beauty_makeup',       'beauty', 'مستحضرات تجميل',   'makeup',          1),
  ('beauty_skincare',     'beauty', 'عناية بالبشرة',     'skincare',        2),
  ('beauty_haircare',     'beauty', 'عناية بالشعر',      'haircare',        3),
  ('beauty_tools',        'beauty', 'أدوات تجميل',       'beauty-tools',    4),
  ('beauty_supplements',  'beauty', 'مكملات غذائية',     'supplements',     5),
  ('beauty_medical',      'beauty', 'أجهزة صحية',        'medical-devices', 6),
  ('beauty_other',        'beauty', 'أخرى',              'beauty-other',    7)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- PART 9: Seed Data — Egyptian Governorates & Main Cities
-- 27 محافظة مصرية مع المدن الرئيسية
-- All inserts use ON CONFLICT for idempotency
-- ============================================

-- ============================================
-- 1. القاهرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (1, 'القاهرة', 'Cairo')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (1, 'مدينة نصر', 'Nasr City'),
  (1, 'مصر الجديدة', 'Heliopolis'),
  (1, 'المعادي', 'Maadi'),
  (1, 'التجمع الخامس', 'Fifth Settlement'),
  (1, 'الشروق', 'El Shorouk'),
  (1, 'بدر', 'Badr'),
  (1, 'العبور', 'El Obour'),
  (1, 'شبرا', 'Shubra'),
  (1, 'عين شمس', 'Ain Shams'),
  (1, 'المطرية', 'El Matariya'),
  (1, 'حلوان', 'Helwan'),
  (1, 'المقطم', 'Mokattam'),
  (1, 'وسط البلد', 'Downtown'),
  (1, 'الزمالك', 'Zamalek'),
  (1, 'المنيل', 'El Manial'),
  (1, 'السيدة زينب', 'Sayeda Zeinab'),
  (1, 'الدرب الأحمر', 'El Darb El Ahmar'),
  (1, 'العاشر من رمضان', '10th of Ramadan'),
  (1, 'القاهرة الجديدة', 'New Cairo')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. الجيزة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (2, 'الجيزة', 'Giza')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (2, 'الدقي', 'Dokki'),
  (2, 'المهندسين', 'Mohandessin'),
  (2, 'العجوزة', 'Agouza'),
  (2, 'الهرم', 'Haram'),
  (2, 'فيصل', 'Faisal'),
  (2, 'الشيخ زايد', 'Sheikh Zayed'),
  (2, 'السادس من أكتوبر', '6th of October'),
  (2, 'حدائق الأهرام', 'Hadayek El Ahram'),
  (2, 'البدرشين', 'El Badrasheen'),
  (2, 'العياط', 'El Ayat'),
  (2, 'أبو النمرس', 'Abu El Nomros'),
  (2, 'الحوامدية', 'El Hawamdiya'),
  (2, 'أوسيم', 'Ausim'),
  (2, 'كرداسة', 'Kerdasa')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. الإسكندرية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (3, 'الإسكندرية', 'Alexandria')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (3, 'سموحة', 'Smouha'),
  (3, 'سيدي جابر', 'Sidi Gaber'),
  (3, 'المنتزه', 'El Montaza'),
  (3, 'المعمورة', 'El Maamoura'),
  (3, 'ستانلي', 'Stanley'),
  (3, 'العجمي', 'El Agami'),
  (3, 'المندرة', 'El Mandara'),
  (3, 'محرم بك', 'Moharam Bek'),
  (3, 'العصافرة', 'El Asafra'),
  (3, 'الإبراهيمية', 'El Ibrahimiya'),
  (3, 'كفر عبده', 'Kafr Abdo'),
  (3, 'بحري', 'Bahary'),
  (3, 'العامرية', 'El Ameriya'),
  (3, 'برج العرب', 'Borg El Arab')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. القليوبية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (4, 'القليوبية', 'Qalyubia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (4, 'بنها', 'Banha'),
  (4, 'شبرا الخيمة', 'Shubra El Kheima'),
  (4, 'قليوب', 'Qalyub'),
  (4, 'القناطر الخيرية', 'El Qanater El Khayriya'),
  (4, 'الخانكة', 'El Khanka'),
  (4, 'كفر شكر', 'Kafr Shokr'),
  (4, 'طوخ', 'Tukh'),
  (4, 'قها', 'Qaha')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. الشرقية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (5, 'الشرقية', 'Sharqia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (5, 'الزقازيق', 'Zagazig'),
  (5, 'العاشر من رمضان', '10th of Ramadan'),
  (5, 'بلبيس', 'Belbeis'),
  (5, 'منيا القمح', 'Minya El Qamh'),
  (5, 'أبو حماد', 'Abu Hammad'),
  (5, 'فاقوس', 'Faqous'),
  (5, 'ههيا', 'Hihya'),
  (5, 'ديرب نجم', 'Diarb Negm'),
  (5, 'أبو كبير', 'Abu Kebir'),
  (5, 'كفر صقر', 'Kafr Saqr')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. الدقهلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (6, 'الدقهلية', 'Dakahlia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (6, 'المنصورة', 'Mansoura'),
  (6, 'طلخا', 'Talkha'),
  (6, 'ميت غمر', 'Mit Ghamr'),
  (6, 'دكرنس', 'Dikirnis'),
  (6, 'أجا', 'Aga'),
  (6, 'السنبلاوين', 'El Sinbellawin'),
  (6, 'شربين', 'Sherbin'),
  (6, 'المنزلة', 'El Manzala'),
  (6, 'بلقاس', 'Belqas'),
  (6, 'نبروه', 'Nabaroh')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. البحيرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (7, 'البحيرة', 'Beheira')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (7, 'دمنهور', 'Damanhour'),
  (7, 'كفر الدوار', 'Kafr El Dawar'),
  (7, 'رشيد', 'Rashid'),
  (7, 'إدكو', 'Edku'),
  (7, 'أبو المطامير', 'Abu El Matamir'),
  (7, 'حوش عيسى', 'Hosh Eisa'),
  (7, 'إيتاي البارود', 'Itay El Barud'),
  (7, 'شبراخيت', 'Shubrakheit')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. الغربية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (8, 'الغربية', 'Gharbia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (8, 'طنطا', 'Tanta'),
  (8, 'المحلة الكبرى', 'El Mahalla El Kubra'),
  (8, 'كفر الزيات', 'Kafr El Zayat'),
  (8, 'زفتى', 'Zifta'),
  (8, 'السنطة', 'El Santa'),
  (8, 'سمنود', 'Samannoud'),
  (8, 'بسيون', 'Basyoun'),
  (8, 'قطور', 'Qutur')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. المنوفية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (9, 'المنوفية', 'Monufia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (9, 'شبين الكوم', 'Shibin El Kom'),
  (9, 'منوف', 'Menouf'),
  (9, 'السادات', 'El Sadat'),
  (9, 'أشمون', 'Ashmoun'),
  (9, 'الباجور', 'El Bagour'),
  (9, 'قويسنا', 'Quesna'),
  (9, 'بركة السبع', 'Berket El Sabaa'),
  (9, 'تلا', 'Tala')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. كفر الشيخ
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (10, 'كفر الشيخ', 'Kafr El Sheikh')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (10, 'كفر الشيخ', 'Kafr El Sheikh'),
  (10, 'دسوق', 'Desouk'),
  (10, 'فوه', 'Fuwwah'),
  (10, 'بيلا', 'Billa'),
  (10, 'الحامول', 'El Hamoul'),
  (10, 'سيدي سالم', 'Sidi Salem'),
  (10, 'البرلس', 'El Burullus'),
  (10, 'مطوبس', 'Mutubas')
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. دمياط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (11, 'دمياط', 'Damietta')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (11, 'دمياط', 'Damietta'),
  (11, 'دمياط الجديدة', 'New Damietta'),
  (11, 'رأس البر', 'Ras El Bar'),
  (11, 'فارسكور', 'Faraskour'),
  (11, 'كفر سعد', 'Kafr Saad'),
  (11, 'الزرقا', 'El Zarqa')
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. بورسعيد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (12, 'بورسعيد', 'Port Said')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (12, 'بورسعيد', 'Port Said'),
  (12, 'بورفؤاد', 'Port Fouad'),
  (12, 'العرب', 'El Arab'),
  (12, 'الزهور', 'El Zohour'),
  (12, 'الضواحي', 'El Dawahy')
ON CONFLICT DO NOTHING;

-- ============================================
-- 13. الإسماعيلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (13, 'الإسماعيلية', 'Ismailia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (13, 'الإسماعيلية', 'Ismailia'),
  (13, 'فايد', 'Fayed'),
  (13, 'القنطرة شرق', 'El Qantara Sharq'),
  (13, 'القنطرة غرب', 'El Qantara Gharb'),
  (13, 'التل الكبير', 'El Tal El Kebir'),
  (13, 'أبو صوير', 'Abu Suweir')
ON CONFLICT DO NOTHING;

-- ============================================
-- 14. السويس
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (14, 'السويس', 'Suez')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (14, 'السويس', 'Suez'),
  (14, 'الأربعين', 'El Arbaeen'),
  (14, 'عتاقة', 'Ataka'),
  (14, 'فيصل', 'Faisal'),
  (14, 'الجناين', 'El Ganayen')
ON CONFLICT DO NOTHING;

-- ============================================
-- 15. شمال سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (15, 'شمال سيناء', 'North Sinai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (15, 'العريش', 'El Arish'),
  (15, 'الشيخ زويد', 'Sheikh Zuweid'),
  (15, 'رفح', 'Rafah'),
  (15, 'بئر العبد', 'Bir El Abd'),
  (15, 'الحسنة', 'El Hasana'),
  (15, 'نخل', 'Nakhl')
ON CONFLICT DO NOTHING;

-- ============================================
-- 16. جنوب سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (16, 'جنوب سيناء', 'South Sinai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (16, 'الطور', 'El Tur'),
  (16, 'شرم الشيخ', 'Sharm El Sheikh'),
  (16, 'دهب', 'Dahab'),
  (16, 'نويبع', 'Nuweiba'),
  (16, 'طابا', 'Taba'),
  (16, 'سانت كاترين', 'Saint Catherine')
ON CONFLICT DO NOTHING;

-- ============================================
-- 17. الفيوم
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (17, 'الفيوم', 'Fayoum')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (17, 'الفيوم', 'Fayoum'),
  (17, 'الفيوم الجديدة', 'New Fayoum'),
  (17, 'إبشواي', 'Ibsheway'),
  (17, 'طامية', 'Tamiya'),
  (17, 'سنورس', 'Sennoures'),
  (17, 'إطسا', 'Itsa'),
  (17, 'يوسف الصديق', 'Yusuf El Siddiq')
ON CONFLICT DO NOTHING;

-- ============================================
-- 18. بني سويف
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (18, 'بني سويف', 'Beni Suef')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (18, 'بني سويف', 'Beni Suef'),
  (18, 'بني سويف الجديدة', 'New Beni Suef'),
  (18, 'الواسطى', 'El Wasta'),
  (18, 'ناصر', 'Nasser'),
  (18, 'إهناسيا', 'Ihnasya'),
  (18, 'ببا', 'Beba'),
  (18, 'الفشن', 'El Fashn')
ON CONFLICT DO NOTHING;

-- ============================================
-- 19. المنيا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (19, 'المنيا', 'Minya')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (19, 'المنيا', 'Minya'),
  (19, 'المنيا الجديدة', 'New Minya'),
  (19, 'ملوي', 'Mallawi'),
  (19, 'سمالوط', 'Samalut'),
  (19, 'أبو قرقاص', 'Abu Qurqas'),
  (19, 'مغاغة', 'Maghagha'),
  (19, 'بني مزار', 'Beni Mazar'),
  (19, 'ديرمواس', 'Deir Mawas'),
  (19, 'العدوة', 'El Edwa')
ON CONFLICT DO NOTHING;

-- ============================================
-- 20. أسيوط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (20, 'أسيوط', 'Asyut')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (20, 'أسيوط', 'Asyut'),
  (20, 'أسيوط الجديدة', 'New Asyut'),
  (20, 'ديروط', 'Dairut'),
  (20, 'القوصية', 'El Qusiya'),
  (20, 'منفلوط', 'Manfalut'),
  (20, 'أبنوب', 'Abnoub'),
  (20, 'الفتح', 'El Fath'),
  (20, 'ساحل سليم', 'Sahel Selim'),
  (20, 'أبو تيج', 'Abu Tig'),
  (20, 'الغنايم', 'El Ghanayem'),
  (20, 'البداري', 'El Badari')
ON CONFLICT DO NOTHING;

-- ============================================
-- 21. سوهاج
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (21, 'سوهاج', 'Sohag')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (21, 'سوهاج', 'Sohag'),
  (21, 'سوهاج الجديدة', 'New Sohag'),
  (21, 'أخميم', 'Akhmim'),
  (21, 'جرجا', 'Girga'),
  (21, 'طهطا', 'Tahta'),
  (21, 'المراغة', 'El Maragha'),
  (21, 'البلينا', 'El Balyana'),
  (21, 'المنشأة', 'El Monshaa'),
  (21, 'ساقلتة', 'Saqulta'),
  (21, 'دار السلام', 'Dar El Salam')
ON CONFLICT DO NOTHING;

-- ============================================
-- 22. قنا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (22, 'قنا', 'Qena')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (22, 'قنا', 'Qena'),
  (22, 'قنا الجديدة', 'New Qena'),
  (22, 'نجع حمادي', 'Nag Hammadi'),
  (22, 'دشنا', 'Dishna'),
  (22, 'قفط', 'Qift'),
  (22, 'قوص', 'Qus'),
  (22, 'نقادة', 'Naqada'),
  (22, 'فرشوط', 'Farshut'),
  (22, 'أبو تشت', 'Abu Tesht')
ON CONFLICT DO NOTHING;

-- ============================================
-- 23. الأقصر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (23, 'الأقصر', 'Luxor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (23, 'الأقصر', 'Luxor'),
  (23, 'الأقصر الجديدة', 'New Luxor'),
  (23, 'الطود', 'El Tod'),
  (23, 'إسنا', 'Esna'),
  (23, 'أرمنت', 'Armant'),
  (23, 'البياضية', 'El Bayadiya')
ON CONFLICT DO NOTHING;

-- ============================================
-- 24. أسوان
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (24, 'أسوان', 'Aswan')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (24, 'أسوان', 'Aswan'),
  (24, 'أسوان الجديدة', 'New Aswan'),
  (24, 'كوم أمبو', 'Kom Ombo'),
  (24, 'إدفو', 'Edfu'),
  (24, 'دراو', 'Daraw'),
  (24, 'نصر النوبة', 'Nasr El Nuba'),
  (24, 'أبو سمبل', 'Abu Simbel')
ON CONFLICT DO NOTHING;

-- ============================================
-- 25. البحر الأحمر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (25, 'البحر الأحمر', 'Red Sea')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (25, 'الغردقة', 'Hurghada'),
  (25, 'سفاجا', 'Safaga'),
  (25, 'القصير', 'El Quseir'),
  (25, 'مرسى علم', 'Marsa Alam'),
  (25, 'رأس غارب', 'Ras Gharib'),
  (25, 'الجونة', 'El Gouna')
ON CONFLICT DO NOTHING;

-- ============================================
-- 26. الوادي الجديد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (26, 'الوادي الجديد', 'New Valley')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (26, 'الخارجة', 'El Kharga'),
  (26, 'الداخلة', 'El Dakhla'),
  (26, 'الفرافرة', 'El Farafra'),
  (26, 'باريس', 'Paris'),
  (26, 'بلاط', 'Balat')
ON CONFLICT DO NOTHING;

-- ============================================
-- 27. مطروح
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (27, 'مطروح', 'Matrouh')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (27, 'مرسى مطروح', 'Marsa Matrouh'),
  (27, 'العلمين', 'El Alamein'),
  (27, 'العلمين الجديدة', 'New Alamein'),
  (27, 'الحمام', 'El Hammam'),
  (27, 'الضبعة', 'El Dabaa'),
  (27, 'سيدي براني', 'Sidi Barani'),
  (27, 'سيوة', 'Siwa'),
  (27, 'الساحل الشمالي', 'North Coast')
ON CONFLICT DO NOTHING;


-- ============================================
-- PART 10: Storage Bucket for Ad Images
-- (wrapped in DO block — only works if executed
--  with service_role privileges)
-- ============================================
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'ad-images',
    'ad-images',
    true,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage bucket creation — requires service_role privileges. Create "ad-images" bucket manually in Supabase Dashboard → Storage.';
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.buckets table not found — create "ad-images" bucket manually in Supabase Dashboard → Storage.';
END;
$$;

-- Storage RLS: anyone can read, authenticated users can upload
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read access for ad images" ON storage.objects;
  CREATE POLICY "Public read access for ad images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ad-images');

  DROP POLICY IF EXISTS "Authenticated users can upload ad images" ON storage.objects;
  CREATE POLICY "Authenticated users can upload ad images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ad-images' AND auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Users can update their own ad images" ON storage.objects;
  CREATE POLICY "Users can update their own ad images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'ad-images' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "Users can delete their own ad images" ON storage.objects;
  CREATE POLICY "Users can delete their own ad images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'ad-images' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage policies — requires service_role privileges.';
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.objects table not found — configure storage policies in Supabase Dashboard.';
END;
$$;


-- ============================================
-- Custom Phone OTP (for free phone verification)
-- ============================================
CREATE TABLE IF NOT EXISTS phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(11) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_lookup ON phone_otps(phone, code, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires ON phone_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_otps_rate ON phone_otps(phone, created_at DESC);

-- RLS: Only server-side (service role) can access this table
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;
-- No public policies = no public access (only service_role key works)


-- ============================================
-- VERIFICATION: Check that seed data was inserted
-- ============================================
DO $$
DECLARE
  cat_count INTEGER;
  sub_count INTEGER;
  gov_count INTEGER;
  city_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM categories;
  SELECT COUNT(*) INTO sub_count FROM subcategories;
  SELECT COUNT(*) INTO gov_count FROM governorates;
  SELECT COUNT(*) INTO city_count FROM cities;

  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE '   Categories: % (expected 12)', cat_count;
  RAISE NOTICE '   Subcategories: % (expected 72, IDs match frontend config)', sub_count;
  RAISE NOTICE '   Governorates: % (expected 27)', gov_count;
  RAISE NOTICE '   Cities: % (expected 200+)', city_count;
END;
$$;


-- ============================================
-- PART 8: RATINGS, VERIFICATION, PRICE OFFERS
-- ============================================

-- D. Reviews & Ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_ad ON reviews(ad_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Reviews are viewable by everyone') THEN
    CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Users can create reviews') THEN
    CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Users can update own reviews') THEN
    CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);
  END IF;
END $$;

-- Add review columns to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'positive_reviews_count') THEN
    ALTER TABLE profiles ADD COLUMN positive_reviews_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_reviews_count') THEN
    ALTER TABLE profiles ADD COLUMN total_reviews_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_trusted_seller') THEN
    ALTER TABLE profiles ADD COLUMN is_trusted_seller BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- E. Identity Verification
CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type VARCHAR(30) NOT NULL CHECK (
    verification_type IN ('phone', 'national_id', 'commercial_register')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  document_hash TEXT,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(user_id, verification_type)
);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON identity_verifications(user_id, status);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'identity_verifications' AND policyname = 'Users can view own verifications') THEN
    CREATE POLICY "Users can view own verifications" ON identity_verifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'identity_verifications' AND policyname = 'Users can submit verifications') THEN
    CREATE POLICY "Users can submit verifications" ON identity_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
    ALTER TABLE profiles ADD COLUMN verification_level VARCHAR(20) DEFAULT 'basic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_id_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_id_verified BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- F. Price Offers
CREATE TABLE IF NOT EXISTS price_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')
  ),
  counter_amount DECIMAL(12,2),
  counter_message TEXT,
  parent_offer_id UUID REFERENCES price_offers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours')
);
CREATE INDEX IF NOT EXISTS idx_offers_ad ON price_offers(ad_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON price_offers(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON price_offers(seller_id, status);

ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_offers' AND policyname = 'Ad viewers can see offer counts') THEN
    CREATE POLICY "Ad viewers can see offer counts" ON price_offers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_offers' AND policyname = 'Buyers can create offers') THEN
    CREATE POLICY "Buyers can create offers" ON price_offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_offers' AND policyname = 'Participants can update offers') THEN
    CREATE POLICY "Participants can update offers" ON price_offers FOR UPDATE USING (
      auth.uid() = buyer_id OR auth.uid() = seller_id
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'highest_offer') THEN
    ALTER TABLE ads ADD COLUMN highest_offer DECIMAL(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'offers_count') THEN
    ALTER TABLE ads ADD COLUMN offers_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ✅ Part 8: Reviews, Verification, Price Offers tables created!


-- ============================================
-- PART 11: STORES & UNIFIED SELLER SYSTEM
-- نظام المحلات والبائعين الموحد
-- ============================================

-- Add seller_type to profiles (individual or store)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_type') THEN
    ALTER TABLE profiles ADD COLUMN seller_type TEXT NOT NULL DEFAULT 'individual'
      CHECK (seller_type IN ('individual', 'store'));
  END IF;
END $$;

-- ==========================================
-- TABLE: stores
-- ==========================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  slug VARCHAR(60) NOT NULL UNIQUE,
  logo_url TEXT,
  cover_url TEXT,
  description VARCHAR(500),
  main_category TEXT NOT NULL,
  sub_categories TEXT[] DEFAULT '{}',
  primary_color VARCHAR(7) DEFAULT '#1B5E20',
  secondary_color VARCHAR(7),
  theme TEXT NOT NULL DEFAULT 'classic'
    CHECK (theme IN ('classic', 'modern', 'elegant', 'sporty')),
  layout TEXT NOT NULL DEFAULT 'grid'
    CHECK (layout IN ('grid', 'list', 'showcase')),
  location_gov TEXT,
  location_area TEXT,
  phone VARCHAR(20),
  working_hours JSONB,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  settings JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_main_category ON stores(main_category);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);

-- ==========================================
-- TABLE: store_categories (internal sections)
-- ==========================================
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  products_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_store ON store_categories(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_unique ON store_categories(store_id, slug);

-- Add store_id FK to profiles (depends on stores table)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'store_id') THEN
    ALTER TABLE profiles ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_seller_type ON profiles(seller_type);
CREATE INDEX IF NOT EXISTS idx_profiles_store_id ON profiles(store_id);

-- Add store fields to ads table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'store_id') THEN
    ALTER TABLE ads ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'store_category_id') THEN
    ALTER TABLE ads ADD COLUMN store_category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'is_pinned') THEN
    ALTER TABLE ads ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'original_price') THEN
    ALTER TABLE ads ADD COLUMN original_price DECIMAL(12,2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ads_store_id ON ads(store_id);

-- ==========================================
-- TABLE: store_followers
-- ==========================================
CREATE TABLE IF NOT EXISTS store_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_followers_user ON store_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_store ON store_followers(store_id);

-- ==========================================
-- TABLE: store_reviews
-- ==========================================
CREATE TABLE IF NOT EXISTS store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL UNIQUE,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  accuracy_rating SMALLINT CHECK (accuracy_rating BETWEEN 1 AND 5),
  response_rating SMALLINT CHECK (response_rating BETWEEN 1 AND 5),
  commitment_rating SMALLINT CHECK (commitment_rating BETWEEN 1 AND 5),
  comment TEXT,
  seller_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_reviewer ON store_reviews(reviewer_id);

-- ==========================================
-- TABLE: store_badges
-- ==========================================
CREATE TABLE IF NOT EXISTS store_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL
    CHECK (badge_type IN ('verified', 'trusted', 'active', 'top_seller', 'gold', 'platinum')),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(store_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_store_badges_store ON store_badges(store_id);

-- ==========================================
-- TABLE: store_pinned_products
-- ==========================================
CREATE TABLE IF NOT EXISTS store_pinned_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0 CHECK (sort_order <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_store_pinned_store ON store_pinned_products(store_id);

-- ==========================================
-- TABLE: store_analytics
-- ==========================================
CREATE TABLE IF NOT EXISTS store_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_views INT NOT NULL DEFAULT 0,
  unique_visitors INT NOT NULL DEFAULT 0,
  source_search INT NOT NULL DEFAULT 0,
  source_direct INT NOT NULL DEFAULT 0,
  source_followers INT NOT NULL DEFAULT 0,
  source_product_card INT NOT NULL DEFAULT 0,
  top_products UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, date)
);

CREATE INDEX IF NOT EXISTS idx_store_analytics_store_date ON store_analytics(store_id, date DESC);

-- ==========================================
-- TABLE: store_promotions
-- ==========================================
CREATE TABLE IF NOT EXISTS store_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  promo_type TEXT NOT NULL
    CHECK (promo_type IN ('discount', 'bundle', 'free_shipping', 'timed')),
  discount_percent SMALLINT,
  original_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_promotions_store ON store_promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_promotions_active ON store_promotions(is_active, end_at);

-- ==========================================
-- TABLE: store_subscriptions
-- ==========================================
CREATE TABLE IF NOT EXISTS store_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'gold', 'platinum')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'cancelled')),
  price DECIMAL(10,2),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_subscriptions_store ON store_subscriptions(store_id);

-- ==========================================
-- TABLE: user_wishlist
-- ==========================================
CREATE TABLE IF NOT EXISTS user_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_user ON user_wishlist(user_id);

-- ==========================================
-- TABLE: user_recently_viewed
-- ==========================================
CREATE TABLE IF NOT EXISTS user_recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_recently_viewed ON user_recently_viewed(user_id, viewed_at DESC);

-- Keep only last 20 per user
CREATE OR REPLACE FUNCTION trim_recently_viewed() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM user_recently_viewed
  WHERE id IN (
    SELECT id FROM user_recently_viewed
    WHERE user_id = NEW.user_id
    ORDER BY viewed_at DESC
    OFFSET 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trim_recently_viewed ON user_recently_viewed;
CREATE TRIGGER trg_trim_recently_viewed
  AFTER INSERT ON user_recently_viewed
  FOR EACH ROW EXECUTE FUNCTION trim_recently_viewed();

-- ============================================
-- STORES RLS Policies
-- ============================================

-- stores: public read, owner write
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_select') THEN
    CREATE POLICY stores_select ON stores FOR SELECT USING (status = 'active');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_select_own') THEN
    CREATE POLICY stores_select_own ON stores FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_insert') THEN
    CREATE POLICY stores_insert ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_update') THEN
    CREATE POLICY stores_update ON stores FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- store_categories: public read, store owner write
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_select') THEN
    CREATE POLICY store_cats_select ON store_categories FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_insert') THEN
    CREATE POLICY store_cats_insert ON store_categories FOR INSERT
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_update') THEN
    CREATE POLICY store_cats_update ON store_categories FOR UPDATE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_categories' AND policyname = 'store_cats_delete') THEN
    CREATE POLICY store_cats_delete ON store_categories FOR DELETE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_followers: public read, user controls own follows
ALTER TABLE store_followers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_followers' AND policyname = 'followers_select') THEN
    CREATE POLICY followers_select ON store_followers FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_followers' AND policyname = 'followers_insert') THEN
    CREATE POLICY followers_insert ON store_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_followers' AND policyname = 'followers_delete') THEN
    CREATE POLICY followers_delete ON store_followers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- store_reviews: public read, reviewer insert, store owner reply
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_reviews' AND policyname = 'reviews_select') THEN
    CREATE POLICY reviews_select ON store_reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_reviews' AND policyname = 'reviews_insert') THEN
    CREATE POLICY reviews_insert ON store_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_reviews' AND policyname = 'reviews_reply') THEN
    CREATE POLICY reviews_reply ON store_reviews FOR UPDATE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()))
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_analytics: owner only
ALTER TABLE store_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_analytics' AND policyname = 'analytics_owner') THEN
    CREATE POLICY analytics_owner ON store_analytics FOR SELECT
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_badges: public read
ALTER TABLE store_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_badges' AND policyname = 'badges_select') THEN
    CREATE POLICY badges_select ON store_badges FOR SELECT USING (true);
  END IF;
END $$;

-- store_pinned_products: public read, store owner write
ALTER TABLE store_pinned_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_pinned_products' AND policyname = 'pinned_select') THEN
    CREATE POLICY pinned_select ON store_pinned_products FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_pinned_products' AND policyname = 'pinned_insert') THEN
    CREATE POLICY pinned_insert ON store_pinned_products FOR INSERT
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_pinned_products' AND policyname = 'pinned_delete') THEN
    CREATE POLICY pinned_delete ON store_pinned_products FOR DELETE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_promotions: public read active, store owner write
ALTER TABLE store_promotions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_select') THEN
    CREATE POLICY promotions_select ON store_promotions FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_select_own') THEN
    CREATE POLICY promotions_select_own ON store_promotions FOR SELECT
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_insert') THEN
    CREATE POLICY promotions_insert ON store_promotions FOR INSERT
      WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_promotions' AND policyname = 'promotions_update') THEN
    CREATE POLICY promotions_update ON store_promotions FOR UPDATE
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- store_subscriptions: owner only
ALTER TABLE store_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_subscriptions' AND policyname = 'subscriptions_select_own') THEN
    CREATE POLICY subscriptions_select_own ON store_subscriptions FOR SELECT
      USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
  END IF;
END $$;

-- user_wishlist: user own data
ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_wishlist' AND policyname = 'wishlist_select') THEN
    CREATE POLICY wishlist_select ON user_wishlist FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_wishlist' AND policyname = 'wishlist_insert') THEN
    CREATE POLICY wishlist_insert ON user_wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_wishlist' AND policyname = 'wishlist_delete') THEN
    CREATE POLICY wishlist_delete ON user_wishlist FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- user_recently_viewed: user own data
ALTER TABLE user_recently_viewed ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_recently_viewed' AND policyname = 'recent_select') THEN
    CREATE POLICY recent_select ON user_recently_viewed FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_recently_viewed' AND policyname = 'recent_insert') THEN
    CREATE POLICY recent_insert ON user_recently_viewed FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_recently_viewed' AND policyname = 'recent_delete') THEN
    CREATE POLICY recent_delete ON user_recently_viewed FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- STORES Helper Functions
-- ============================================

-- Auto-generate unique slug from store name
CREATE OR REPLACE FUNCTION generate_store_slug(store_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  base_slug := lower(regexp_replace(store_name, '[^a-zA-Z0-9\u0600-\u06FF]', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'store-' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM stores WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at for stores
DROP TRIGGER IF EXISTS trg_stores_updated ON stores;
CREATE TRIGGER trg_stores_updated
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ✅ Part 11: Stores & Unified Seller System tables created!

-- ============================================
-- PART 12: Seed Demo Stores
-- ============================================
-- ⚠️ Stores need auth.users entries (profiles → auth.users FK).
-- Cannot seed from SQL alone. Use the API endpoint instead:
--
--   GET /api/seed-stores
--
-- This creates 8 demo stores with owners and products:
--   1. سيارات الفاروق (cars) — القاهرة
--   2. موبايلات سمير (phones) — الجيزة
--   3. صاغة الحسين (gold) — القاهرة
--   4. ستايل سارة (fashion) — الإسكندرية
--   5. عقارات التجمع (real_estate) — القاهرة
--   6. توكيل الأجهزة (appliances) — الجيزة
--   7. أثاث دمياط الأصلي (furniture) — الدقهلية
--   8. خردة شبرا (scrap) — القاهرة
--
-- Run after deploying: visit your-app-url/api/seed-stores
-- Requires SUPABASE_SERVICE_ROLE_KEY in environment variables.
-- ============================================


-- ============================================
-- PART 13: Analytics Events
-- Lightweight analytics for tracking user behavior
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR(100) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  event_data JSONB DEFAULT '{}',
  page VARCHAR(500),
  referrer VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Anyone can insert analytics events') THEN
    CREATE POLICY "Anyone can insert analytics events"
      ON analytics_events FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Only admins can read analytics') THEN
    CREATE POLICY "Only admins can read analytics"
      ON analytics_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.is_admin = true)
        )
      );
  END IF;
END $$;

-- ✅ Part 13: Analytics Events table created!


-- ============================================
-- PART 14: Buy Requests & Smart Matching
-- Allows buyers to post what they want to buy
-- ============================================

CREATE TABLE IF NOT EXISTS buy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- What they want
  category_id VARCHAR(50) REFERENCES categories(id),
  subcategory_id VARCHAR(50),
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Purchase method
  purchase_type VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (purchase_type IN ('cash', 'exchange', 'both')),

  -- Budget (for cash / both)
  budget_min DECIMAL(12,2),
  budget_max DECIMAL(12,2),

  -- Exchange details (for exchange / both)
  exchange_offer TEXT,
  exchange_category_id VARCHAR(50),
  exchange_description TEXT,

  -- Location preference
  governorate VARCHAR(50),
  city VARCHAR(100),

  -- Category-specific filters (JSONB)
  desired_specs JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'fulfilled', 'expired', 'deleted')),

  -- Matching
  matches_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_buy_requests_user ON buy_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_buy_requests_category ON buy_requests(category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buy_requests_active ON buy_requests(status, created_at DESC) WHERE status = 'active';

-- Buy request matches: links buy requests to matching sell ads
CREATE TABLE IF NOT EXISTS buy_request_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_request_id UUID REFERENCES buy_requests(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) DEFAULT 0,
  match_type VARCHAR(20) NOT NULL
    CHECK (match_type IN ('exact', 'category', 'exchange', 'price')),
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buy_request_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_request ON buy_request_matches(buy_request_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_ad ON buy_request_matches(ad_id);

-- RLS Policies
ALTER TABLE buy_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_requests' AND policyname = 'Buy requests viewable by everyone') THEN
    CREATE POLICY "Buy requests viewable by everyone" ON buy_requests
      FOR SELECT USING (status != 'deleted');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_requests' AND policyname = 'Users can create own buy requests') THEN
    CREATE POLICY "Users can create own buy requests" ON buy_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_requests' AND policyname = 'Users can update own buy requests') THEN
    CREATE POLICY "Users can update own buy requests" ON buy_requests
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE buy_request_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'buy_request_matches' AND policyname = 'Matches viewable by request owner and ad owner') THEN
    CREATE POLICY "Matches viewable by request owner and ad owner" ON buy_request_matches
      FOR SELECT USING (
        buy_request_id IN (SELECT id FROM buy_requests WHERE user_id = auth.uid())
        OR ad_id IN (SELECT id FROM ads WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Function: Find matching ads for a buy request
CREATE OR REPLACE FUNCTION find_matches_for_buy_request(
  p_request_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
  ad_id UUID,
  match_score DECIMAL,
  match_type VARCHAR
) AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM buy_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  WITH scored_ads AS (
    SELECT
      a.id AS ad_id,
      CASE
        WHEN a.category_id = v_request.category_id
          AND to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
            @@ plainto_tsquery('arabic', v_request.title)
        THEN 90.0
        WHEN a.category_id = v_request.category_id
          AND (v_request.budget_max IS NULL OR a.price <= v_request.budget_max)
          AND (v_request.budget_min IS NULL OR a.price >= v_request.budget_min)
        THEN 70.0
        WHEN a.category_id = v_request.category_id
        THEN 50.0
        WHEN v_request.purchase_type IN ('exchange', 'both')
          AND a.sale_type IN ('exchange')
          AND a.category_id = v_request.exchange_category_id
        THEN 80.0
        ELSE 0
      END AS match_score,
      CASE
        WHEN a.category_id = v_request.category_id
          AND to_tsvector('arabic', coalesce(a.title,'') || ' ' || coalesce(a.description,''))
            @@ plainto_tsquery('arabic', v_request.title)
        THEN 'exact'
        WHEN v_request.purchase_type IN ('exchange', 'both')
          AND a.sale_type = 'exchange'
        THEN 'exchange'
        WHEN v_request.budget_max IS NOT NULL AND a.price <= v_request.budget_max
        THEN 'price'
        ELSE 'category'
      END AS match_type
    FROM ads a
    WHERE a.status = 'active'
      AND a.user_id != v_request.user_id
      AND (
        a.category_id = v_request.category_id
        OR (v_request.exchange_category_id IS NOT NULL AND a.category_id = v_request.exchange_category_id)
      )
  )
  SELECT sa.ad_id, sa.match_score, sa.match_type
  FROM scored_ads sa
  WHERE sa.match_score > 0
  ORDER BY sa.match_score DESC, sa.ad_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ✅ Part 14: Buy Requests & Smart Matching tables created!
