-- ============================================
-- Migration 002: Ads Table + Indexes
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

-- ============================================
-- Ads Indexes
-- ============================================

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
