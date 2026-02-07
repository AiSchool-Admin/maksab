-- ============================================
-- مكسب (Maksab) — Complete Database Setup
-- Paste this entire script into Supabase SQL Editor and click "Run"
-- This creates all tables, indexes, security policies, and seed data
-- ============================================


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
-- Users table (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(11) UNIQUE NOT NULL,
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

-- Index for phone lookups
CREATE INDEX idx_users_phone ON public.users(phone);
-- Index for location-based queries
CREATE INDEX idx_users_location ON public.users(governorate, city);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Categories
-- ============================================
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  slug VARCHAR(50) UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- ============================================
-- Subcategories
-- ============================================
CREATE TABLE subcategories (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(category_id, slug)
);

CREATE INDEX idx_subcategories_category ON subcategories(category_id);

-- ============================================
-- Governorates (المحافظات)
-- ============================================
CREATE TABLE governorates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  name_en VARCHAR(50)
);

CREATE INDEX idx_governorates_name ON governorates(name);

-- ============================================
-- Cities (المدن)
-- ============================================
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  governorate_id INTEGER NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100)
);

CREATE INDEX idx_cities_governorate ON cities(governorate_id);
CREATE INDEX idx_cities_name ON cities(name);


-- ============================================
-- PART 3: Ads Table + Indexes
-- ============================================

CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

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
  auction_winner_id UUID REFERENCES public.users(id),

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
CREATE TRIGGER trigger_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Full-text search index (Arabic)
CREATE INDEX idx_ads_search ON ads USING GIN (
  to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Trigram index for fuzzy matching (handles typos like "تويتا" → "تويوتا")
CREATE INDEX idx_ads_title_trgm ON ads USING GIN (title gin_trgm_ops);

-- Category + status + date (main feed queries)
CREATE INDEX idx_ads_category ON ads(category_id, status, created_at DESC);

-- User's own ads
CREATE INDEX idx_ads_user ON ads(user_id, status);

-- Location-based queries
CREATE INDEX idx_ads_location ON ads(governorate, city);

-- Price filtering
CREATE INDEX idx_ads_price ON ads(price) WHERE price IS NOT NULL;

-- Sale type filtering
CREATE INDEX idx_ads_sale_type ON ads(sale_type, status);

-- Active auctions ending soon
CREATE INDEX idx_ads_auction_ends ON ads(auction_ends_at)
  WHERE sale_type = 'auction' AND auction_status = 'active';

-- Status + created_at (general feed)
CREATE INDEX idx_ads_status_date ON ads(status, created_at DESC);

-- Category fields JSONB (for category-specific filtering)
CREATE INDEX idx_ads_category_fields ON ads USING GIN (category_fields);

-- Exchange description search
CREATE INDEX idx_ads_exchange_search ON ads
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
CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, ad_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_ad ON favorites(ad_id);

-- ============================================
-- Auction Bids (المزايدات)
-- ============================================
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick lookup of highest bid per ad
CREATE INDEX idx_bids_ad ON auction_bids(ad_id, amount DESC);
-- User's bidding history
CREATE INDEX idx_bids_bidder ON auction_bids(bidder_id, created_at DESC);

-- ============================================
-- Conversations (المحادثات)
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One conversation per buyer per ad
  UNIQUE(ad_id, buyer_id)
);

-- User's conversations (as buyer or seller)
CREATE INDEX idx_conversations_buyer ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON conversations(seller_id, last_message_at DESC);
CREATE INDEX idx_conversations_ad ON conversations(ad_id);

-- ============================================
-- Messages (الرسائل)
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages in a conversation (ordered by time)
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at DESC);
-- Unread messages for a user
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read)
  WHERE is_read = FALSE;

-- ============================================
-- Commissions (العمولات التطوعية)
-- ============================================
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_payer ON commissions(payer_id);
CREATE INDEX idx_commissions_ad ON commissions(ad_id);
CREATE INDEX idx_commissions_status ON commissions(status);


-- ============================================
-- PART 5: Recommendations Engine Tables
-- (user_signals, user_interest_profiles)
-- ============================================

-- ============================================
-- User Signals (إشارات سلوك المستخدم)
-- Collects user behavior for recommendation engine
-- ============================================
CREATE TABLE user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_signals_user_recent ON user_signals(user_id, created_at DESC);
-- User + category weighted signals (for category-level recommendations)
CREATE INDEX idx_signals_user_category ON user_signals(user_id, category_id, weight DESC);
-- JSONB signal data (for filtering by brand, price, etc.)
CREATE INDEX idx_signals_data ON user_signals USING GIN (signal_data);
-- Signal type (for analytics)
CREATE INDEX idx_signals_type ON user_signals(signal_type, created_at DESC);

-- ============================================
-- User Interest Profiles (ملفات اهتمامات المستخدمين)
-- Precomputed by background worker, used for fast recommendations
-- ============================================
CREATE TABLE user_interest_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
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
-- ============================================

-- ============================================
-- USERS
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Anyone can view user profiles
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "Users can create their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- CATEGORIES (public read-only)
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- ============================================
-- SUBCATEGORIES (public read-only)
-- ============================================
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategories are viewable by everyone"
  ON subcategories FOR SELECT
  USING (true);

-- ============================================
-- GOVERNORATES (public read-only)
-- ============================================
ALTER TABLE governorates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Governorates are viewable by everyone"
  ON governorates FOR SELECT
  USING (true);

-- ============================================
-- CITIES (public read-only)
-- ============================================
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities are viewable by everyone"
  ON cities FOR SELECT
  USING (true);

-- ============================================
-- ADS
-- ============================================
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Everyone can see non-deleted ads
CREATE POLICY "Ads are viewable by everyone"
  ON ads FOR SELECT
  USING (status != 'deleted');

-- Authenticated users can create ads (owner only)
CREATE POLICY "Users can create their own ads"
  ON ads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ads
CREATE POLICY "Users can update their own ads"
  ON ads FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can soft-delete their own ads (update status to 'deleted')
-- Hard delete is not allowed from client
CREATE POLICY "Users can delete their own ads"
  ON ads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FAVORITES
-- ============================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can see their own favorites
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own favorites
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- AUCTION BIDS
-- ============================================
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

-- Everyone can see bids on active ads (for transparency)
CREATE POLICY "Bids are viewable by everyone"
  ON auction_bids FOR SELECT
  USING (true);

-- Authenticated users can place bids
CREATE POLICY "Users can place bids"
  ON auction_bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

-- ============================================
-- CONVERSATIONS
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Only participants can see their conversations
CREATE POLICY "Conversation participants can view"
  ON conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Authenticated users can start conversations (as buyer)
CREATE POLICY "Users can start conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Participants can update conversation (e.g., last_message_at)
CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================
-- MESSAGES
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only conversation participants can view messages
CREATE POLICY "Chat participants can view messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Only conversation participants can send messages
CREATE POLICY "Chat participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Recipient can mark messages as read
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

-- Users can view their own commission history
CREATE POLICY "Users can view their own commissions"
  ON commissions FOR SELECT
  USING (auth.uid() = payer_id);

-- Users can create commission payments
CREATE POLICY "Users can create commissions"
  ON commissions FOR INSERT
  WITH CHECK (auth.uid() = payer_id);

-- ============================================
-- USER SIGNALS
-- ============================================
ALTER TABLE user_signals ENABLE ROW LEVEL SECURITY;

-- Users can only see their own signals
CREATE POLICY "Users can view their own signals"
  ON user_signals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own signals
CREATE POLICY "Users can create signals"
  ON user_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- USER INTEREST PROFILES
-- ============================================
ALTER TABLE user_interest_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own interest profile
CREATE POLICY "Users can view their own interest profile"
  ON user_interest_profiles FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================
-- PART 7: Notifications & Push Subscriptions
-- ============================================

-- ============================================
-- Notifications (الإشعارات)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
-- Unread count query
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- ============================================
-- Push Subscriptions (اشتراكات الإشعارات)
-- ============================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_sub_user ON push_subscriptions(user_id);

-- ============================================
-- RLS for Notifications
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS for Push Subscriptions
-- ============================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- Enable Realtime for notifications
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================
-- PART 8: Seed Data — Categories & Subcategories
-- 12 قسم رئيسي مع الأقسام الفرعية
-- ============================================

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
  ('services',   'الخدمات',           '🛠️', 'services',    12)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 1. السيارات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('cars_passenger',   'cars', 'سيارات ملاكي',  'passenger',   1),
  ('cars_microbus',    'cars', 'ميكروباص',      'microbus',    2),
  ('cars_trucks',      'cars', 'نقل',           'trucks',      3),
  ('cars_motorcycles', 'cars', 'موتوسيكلات',    'motorcycles', 4),
  ('cars_parts',       'cars', 'قطع غيار',      'car-parts',   5);

-- ============================================
-- 2. العقارات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('re_apartments_sale', 'real_estate', 'شقق للبيع',     'apartments-sale', 1),
  ('re_apartments_rent', 'real_estate', 'شقق للإيجار',   'apartments-rent', 2),
  ('re_villas',          'real_estate', 'فيلات',          'villas',          3),
  ('re_land',            'real_estate', 'أراضي',          'land',            4),
  ('re_commercial',      'real_estate', 'محلات تجارية',   'commercial',      5),
  ('re_offices',         'real_estate', 'مكاتب',          'offices',         6);

-- ============================================
-- 3. الموبايلات والتابلت — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('phones_mobile',      'phones', 'موبايلات',    'mobile',           1),
  ('phones_tablet',      'phones', 'تابلت',       'tablet',           2),
  ('phones_accessories', 'phones', 'إكسسوارات',   'phone-accessories', 3),
  ('phones_parts',       'phones', 'قطع غيار',    'phone-parts',      4);

-- ============================================
-- 4. الموضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('fashion_men',         'fashion', 'ملابس رجالي',  'men',                1),
  ('fashion_women',       'fashion', 'ملابس حريمي',  'women',              2),
  ('fashion_kids',        'fashion', 'ملابس أطفال',  'kids',               3),
  ('fashion_shoes',       'fashion', 'أحذية',        'shoes',              4),
  ('fashion_bags',        'fashion', 'شنط',          'bags',               5),
  ('fashion_accessories', 'fashion', 'إكسسوارات',    'fashion-accessories', 6);

-- ============================================
-- 5. الخردة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('scrap_iron',         'scrap', 'حديد',          'iron',         1),
  ('scrap_aluminum',     'scrap', 'ألومنيوم',      'aluminum',     2),
  ('scrap_copper',       'scrap', 'نحاس',          'copper',       3),
  ('scrap_plastic',      'scrap', 'بلاستيك',       'plastic',      4),
  ('scrap_paper',        'scrap', 'ورق',           'paper',        5),
  ('scrap_old_devices',  'scrap', 'أجهزة قديمة',   'old-devices',  6),
  ('scrap_construction', 'scrap', 'مخلفات بناء',   'construction', 7),
  ('scrap_other',        'scrap', 'أخرى',          'scrap-other',  8);

-- ============================================
-- 6. الذهب والفضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('gold_items',          'gold', 'ذهب',           'gold-items',      1),
  ('gold_silver',         'gold', 'فضة',           'silver',          2),
  ('gold_diamond',        'gold', 'ألماس',         'diamond',         3),
  ('gold_precious_watch', 'gold', 'ساعات ثمينة',   'precious-watches', 4);

-- ============================================
-- 7. السلع الفاخرة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('luxury_bags',       'luxury', 'شنط فاخرة', 'luxury-bags',  1),
  ('luxury_sunglasses', 'luxury', 'نظارات',    'sunglasses',   2),
  ('luxury_watches',    'luxury', 'ساعات',     'watches',      3),
  ('luxury_perfumes',   'luxury', 'عطور',      'perfumes',     4),
  ('luxury_pens',       'luxury', 'أقلام',     'pens',         5);

-- ============================================
-- 8. الأجهزة المنزلية — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('app_washers',     'appliances', 'غسالات',       'washers',          1),
  ('app_fridges',     'appliances', 'ثلاجات',       'fridges',          2),
  ('app_cookers',     'appliances', 'بوتاجازات',    'cookers',          3),
  ('app_ac',          'appliances', 'مكيفات',       'ac',               4),
  ('app_heaters',     'appliances', 'سخانات',       'heaters',          5),
  ('app_small',       'appliances', 'أجهزة صغيرة',  'small-appliances', 6);

-- ============================================
-- 9. الأثاث والديكور — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('furn_bedroom',  'furniture', 'غرف نوم',   'bedroom',         1),
  ('furn_dining',   'furniture', 'سفرة',      'dining',          2),
  ('furn_living',   'furniture', 'أنتريه',    'living',          3),
  ('furn_kitchen',  'furniture', 'مطابخ',     'kitchen',         4),
  ('furn_decor',    'furniture', 'ديكورات',   'decor',           5),
  ('furn_lighting', 'furniture', 'إضاءة',     'lighting',        6),
  ('furn_carpets',  'furniture', 'سجاد',      'carpets',         7),
  ('furn_other',    'furniture', 'أخرى',      'furniture-other', 8);

-- ============================================
-- 10. الهوايات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('hobby_music',     'hobbies', 'آلات موسيقية',     'music',     1),
  ('hobby_sports',    'hobbies', 'معدات رياضية',     'sports',    2),
  ('hobby_gaming',    'hobbies', 'ألعاب فيديو',      'gaming',    3),
  ('hobby_books',     'hobbies', 'كتب',              'books',     4),
  ('hobby_cameras',   'hobbies', 'كاميرات',          'cameras',   5),
  ('hobby_bikes',     'hobbies', 'دراجات',           'bikes',     6),
  ('hobby_antiques',  'hobbies', 'تحف وأنتيكات',     'antiques',  7),
  ('hobby_pets',      'hobbies', 'حيوانات أليفة',    'pets',      8);

-- ============================================
-- 11. العدد والأدوات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('tools_hand',        'tools', 'عدد يدوية',       'hand-tools',           1),
  ('tools_power',       'tools', 'عدد كهربائية',    'power-tools',          2),
  ('tools_workshop',    'tools', 'معدات ورش',       'workshop',             3),
  ('tools_agricultural','tools', 'معدات زراعية',    'agricultural',         4),
  ('tools_restaurant',  'tools', 'معدات مطاعم',     'restaurant-equipment', 5);

-- ============================================
-- 12. الخدمات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('svc_plumbing',       'services', 'سباكة',          'plumbing',       1),
  ('svc_electrical',     'services', 'كهرباء',         'electrical',     2),
  ('svc_painting',       'services', 'نقاشة',          'painting',       3),
  ('svc_carpentry',      'services', 'نجارة',          'carpentry',      4),
  ('svc_device_repair',  'services', 'صيانة أجهزة',    'device-repair',  5),
  ('svc_moving',         'services', 'نقل أثاث',       'moving',         6),
  ('svc_cleaning',       'services', 'تنظيف',          'cleaning',       7),
  ('svc_tech',           'services', 'خدمات تقنية',    'tech',           8),
  ('svc_tutoring',       'services', 'دروس خصوصية',    'tutoring',       9),
  ('svc_other',          'services', 'خدمات أخرى',     'services-other', 10);


-- ============================================
-- PART 9: Seed Data — Egyptian Governorates & Main Cities
-- 27 محافظة مصرية مع المدن الرئيسية
-- ============================================

-- ============================================
-- 1. القاهرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (1, 'القاهرة', 'Cairo');
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
  (1, 'القاهرة الجديدة', 'New Cairo');

-- ============================================
-- 2. الجيزة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (2, 'الجيزة', 'Giza');
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
  (2, 'كرداسة', 'Kerdasa');

-- ============================================
-- 3. الإسكندرية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (3, 'الإسكندرية', 'Alexandria');
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
  (3, 'برج العرب', 'Borg El Arab');

-- ============================================
-- 4. القليوبية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (4, 'القليوبية', 'Qalyubia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (4, 'بنها', 'Banha'),
  (4, 'شبرا الخيمة', 'Shubra El Kheima'),
  (4, 'قليوب', 'Qalyub'),
  (4, 'القناطر الخيرية', 'El Qanater El Khayriya'),
  (4, 'الخانكة', 'El Khanka'),
  (4, 'كفر شكر', 'Kafr Shokr'),
  (4, 'طوخ', 'Tukh'),
  (4, 'قها', 'Qaha');

-- ============================================
-- 5. الشرقية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (5, 'الشرقية', 'Sharqia');
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
  (5, 'كفر صقر', 'Kafr Saqr');

-- ============================================
-- 6. الدقهلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (6, 'الدقهلية', 'Dakahlia');
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
  (6, 'نبروه', 'Nabaroh');

-- ============================================
-- 7. البحيرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (7, 'البحيرة', 'Beheira');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (7, 'دمنهور', 'Damanhour'),
  (7, 'كفر الدوار', 'Kafr El Dawar'),
  (7, 'رشيد', 'Rashid'),
  (7, 'إدكو', 'Edku'),
  (7, 'أبو المطامير', 'Abu El Matamir'),
  (7, 'حوش عيسى', 'Hosh Eisa'),
  (7, 'إيتاي البارود', 'Itay El Barud'),
  (7, 'شبراخيت', 'Shubrakheit');

-- ============================================
-- 8. الغربية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (8, 'الغربية', 'Gharbia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (8, 'طنطا', 'Tanta'),
  (8, 'المحلة الكبرى', 'El Mahalla El Kubra'),
  (8, 'كفر الزيات', 'Kafr El Zayat'),
  (8, 'زفتى', 'Zifta'),
  (8, 'السنطة', 'El Santa'),
  (8, 'سمنود', 'Samannoud'),
  (8, 'بسيون', 'Basyoun'),
  (8, 'قطور', 'Qutur');

-- ============================================
-- 9. المنوفية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (9, 'المنوفية', 'Monufia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (9, 'شبين الكوم', 'Shibin El Kom'),
  (9, 'منوف', 'Menouf'),
  (9, 'السادات', 'El Sadat'),
  (9, 'أشمون', 'Ashmoun'),
  (9, 'الباجور', 'El Bagour'),
  (9, 'قويسنا', 'Quesna'),
  (9, 'بركة السبع', 'Berket El Sabaa'),
  (9, 'تلا', 'Tala');

-- ============================================
-- 10. كفر الشيخ
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (10, 'كفر الشيخ', 'Kafr El Sheikh');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (10, 'كفر الشيخ', 'Kafr El Sheikh'),
  (10, 'دسوق', 'Desouk'),
  (10, 'فوه', 'Fuwwah'),
  (10, 'بيلا', 'Billa'),
  (10, 'الحامول', 'El Hamoul'),
  (10, 'سيدي سالم', 'Sidi Salem'),
  (10, 'البرلس', 'El Burullus'),
  (10, 'مطوبس', 'Mutubas');

-- ============================================
-- 11. الدمياط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (11, 'دمياط', 'Damietta');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (11, 'دمياط', 'Damietta'),
  (11, 'دمياط الجديدة', 'New Damietta'),
  (11, 'رأس البر', 'Ras El Bar'),
  (11, 'فارسكور', 'Faraskour'),
  (11, 'كفر سعد', 'Kafr Saad'),
  (11, 'الزرقا', 'El Zarqa');

-- ============================================
-- 12. بورسعيد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (12, 'بورسعيد', 'Port Said');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (12, 'بورسعيد', 'Port Said'),
  (12, 'بورفؤاد', 'Port Fouad'),
  (12, 'العرب', 'El Arab'),
  (12, 'الزهور', 'El Zohour'),
  (12, 'الضواحي', 'El Dawahy');

-- ============================================
-- 13. الإسماعيلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (13, 'الإسماعيلية', 'Ismailia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (13, 'الإسماعيلية', 'Ismailia'),
  (13, 'فايد', 'Fayed'),
  (13, 'القنطرة شرق', 'El Qantara Sharq'),
  (13, 'القنطرة غرب', 'El Qantara Gharb'),
  (13, 'التل الكبير', 'El Tal El Kebir'),
  (13, 'أبو صوير', 'Abu Suweir');

-- ============================================
-- 14. السويس
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (14, 'السويس', 'Suez');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (14, 'السويس', 'Suez'),
  (14, 'الأربعين', 'El Arbaeen'),
  (14, 'عتاقة', 'Ataka'),
  (14, 'فيصل', 'Faisal'),
  (14, 'الجناين', 'El Ganayen');

-- ============================================
-- 15. شمال سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (15, 'شمال سيناء', 'North Sinai');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (15, 'العريش', 'El Arish'),
  (15, 'الشيخ زويد', 'Sheikh Zuweid'),
  (15, 'رفح', 'Rafah'),
  (15, 'بئر العبد', 'Bir El Abd'),
  (15, 'الحسنة', 'El Hasana'),
  (15, 'نخل', 'Nakhl');

-- ============================================
-- 16. جنوب سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (16, 'جنوب سيناء', 'South Sinai');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (16, 'الطور', 'El Tur'),
  (16, 'شرم الشيخ', 'Sharm El Sheikh'),
  (16, 'دهب', 'Dahab'),
  (16, 'نويبع', 'Nuweiba'),
  (16, 'طابا', 'Taba'),
  (16, 'سانت كاترين', 'Saint Catherine');

-- ============================================
-- 17. الفيوم
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (17, 'الفيوم', 'Fayoum');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (17, 'الفيوم', 'Fayoum'),
  (17, 'الفيوم الجديدة', 'New Fayoum'),
  (17, 'إبشواي', 'Ibsheway'),
  (17, 'طامية', 'Tamiya'),
  (17, 'سنورس', 'Sennoures'),
  (17, 'إطسا', 'Itsa'),
  (17, 'يوسف الصديق', 'Yusuf El Siddiq');

-- ============================================
-- 18. بني سويف
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (18, 'بني سويف', 'Beni Suef');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (18, 'بني سويف', 'Beni Suef'),
  (18, 'بني سويف الجديدة', 'New Beni Suef'),
  (18, 'الواسطى', 'El Wasta'),
  (18, 'ناصر', 'Nasser'),
  (18, 'إهناسيا', 'Ihnasya'),
  (18, 'ببا', 'Beba'),
  (18, 'الفشن', 'El Fashn');

-- ============================================
-- 19. المنيا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (19, 'المنيا', 'Minya');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (19, 'المنيا', 'Minya'),
  (19, 'المنيا الجديدة', 'New Minya'),
  (19, 'ملوي', 'Mallawi'),
  (19, 'سمالوط', 'Samalut'),
  (19, 'أبو قرقاص', 'Abu Qurqas'),
  (19, 'مغاغة', 'Maghagha'),
  (19, 'بني مزار', 'Beni Mazar'),
  (19, 'ديرمواس', 'Deir Mawas'),
  (19, 'العدوة', 'El Edwa');

-- ============================================
-- 20. أسيوط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (20, 'أسيوط', 'Asyut');
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
  (20, 'البداري', 'El Badari');

-- ============================================
-- 21. سوهاج
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (21, 'سوهاج', 'Sohag');
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
  (21, 'دار السلام', 'Dar El Salam');

-- ============================================
-- 22. قنا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (22, 'قنا', 'Qena');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (22, 'قنا', 'Qena'),
  (22, 'قنا الجديدة', 'New Qena'),
  (22, 'نجع حمادي', 'Nag Hammadi'),
  (22, 'دشنا', 'Dishna'),
  (22, 'قفط', 'Qift'),
  (22, 'قوص', 'Qus'),
  (22, 'نقادة', 'Naqada'),
  (22, 'فرشوط', 'Farshut'),
  (22, 'أبو تشت', 'Abu Tesht');

-- ============================================
-- 23. الأقصر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (23, 'الأقصر', 'Luxor');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (23, 'الأقصر', 'Luxor'),
  (23, 'الأقصر الجديدة', 'New Luxor'),
  (23, 'الطود', 'El Tod'),
  (23, 'إسنا', 'Esna'),
  (23, 'أرمنت', 'Armant'),
  (23, 'البياضية', 'El Bayadiya');

-- ============================================
-- 24. أسوان
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (24, 'أسوان', 'Aswan');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (24, 'أسوان', 'Aswan'),
  (24, 'أسوان الجديدة', 'New Aswan'),
  (24, 'كوم أمبو', 'Kom Ombo'),
  (24, 'إدفو', 'Edfu'),
  (24, 'دراو', 'Daraw'),
  (24, 'نصر النوبة', 'Nasr El Nuba'),
  (24, 'أبو سمبل', 'Abu Simbel');

-- ============================================
-- 25. البحر الأحمر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (25, 'البحر الأحمر', 'Red Sea');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (25, 'الغردقة', 'Hurghada'),
  (25, 'سفاجا', 'Safaga'),
  (25, 'القصير', 'El Quseir'),
  (25, 'مرسى علم', 'Marsa Alam'),
  (25, 'رأس غارب', 'Ras Gharib'),
  (25, 'الجونة', 'El Gouna');

-- ============================================
-- 26. الوادي الجديد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (26, 'الوادي الجديد', 'New Valley');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (26, 'الخارجة', 'El Kharga'),
  (26, 'الداخلة', 'El Dakhla'),
  (26, 'الفرافرة', 'El Farafra'),
  (26, 'باريس', 'Paris'),
  (26, 'بلاط', 'Balat');

-- ============================================
-- 27. مطروح
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (27, 'مطروح', 'Matrouh');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (27, 'مرسى مطروح', 'Marsa Matrouh'),
  (27, 'العلمين', 'El Alamein'),
  (27, 'العلمين الجديدة', 'New Alamein'),
  (27, 'الحمام', 'El Hammam'),
  (27, 'الضبعة', 'El Dabaa'),
  (27, 'سيدي براني', 'Sidi Barani'),
  (27, 'سيوة', 'Siwa'),
  (27, 'الساحل الشمالي', 'North Coast');
