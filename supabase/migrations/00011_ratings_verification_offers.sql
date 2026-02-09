-- Migration 00011: Ratings & Reviews, Identity Verification, Price Offers
-- All tables use IF NOT EXISTS for idempotency

-- ============================================================
-- D. RATINGS & REVIEWS SYSTEM
-- ============================================================

-- Reviews table: one review per buyer per transaction (ad)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id, reviewer_id)  -- One review per buyer per ad
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_ad ON reviews(ad_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);

-- RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Reviews are viewable by everyone') THEN
    CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Users can create reviews') THEN
    CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Users can update own reviews') THEN
    CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);
  END IF;
END $$;

-- Add verified_seller badge field to profiles
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


-- ============================================================
-- E. IDENTITY VERIFICATION SYSTEM
-- ============================================================

-- Verification levels: basic (phone) -> verified (national ID) -> premium (multiple verifications)
CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type VARCHAR(30) NOT NULL CHECK (
    verification_type IN ('phone', 'national_id', 'commercial_register')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  -- For national ID: store only hash, not actual ID number
  document_hash TEXT,
  -- Admin notes for rejection
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(user_id, verification_type)
);

CREATE INDEX IF NOT EXISTS idx_verifications_user ON identity_verifications(user_id, status);

-- Add verification level to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
    ALTER TABLE profiles ADD COLUMN verification_level VARCHAR(20) DEFAULT 'basic' CHECK (
      verification_level IN ('basic', 'verified', 'premium')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_id_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_id_verified BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- RLS for identity_verifications
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'identity_verifications' AND policyname = 'Users can view own verifications') THEN
    CREATE POLICY "Users can view own verifications" ON identity_verifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'identity_verifications' AND policyname = 'Users can submit verifications') THEN
    CREATE POLICY "Users can submit verifications" ON identity_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- F. PRICE OFFERS SYSTEM
-- ============================================================

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
  -- If countered, the seller's counter amount
  counter_amount DECIMAL(12,2),
  counter_message TEXT,
  -- Reference to parent offer (for counter-offer chains)
  parent_offer_id UUID REFERENCES price_offers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours')
);

CREATE INDEX IF NOT EXISTS idx_offers_ad ON price_offers(ad_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON price_offers(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON price_offers(seller_id, status);

-- Add highest_offer to ads for display
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'highest_offer') THEN
    ALTER TABLE ads ADD COLUMN highest_offer DECIMAL(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ads' AND column_name = 'offers_count') THEN
    ALTER TABLE ads ADD COLUMN offers_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- RLS for price_offers
ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_offers' AND policyname = 'Offer participants can view offers') THEN
    CREATE POLICY "Offer participants can view offers" ON price_offers FOR SELECT USING (
      auth.uid() = buyer_id OR auth.uid() = seller_id
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_offers' AND policyname = 'Ad viewers can see offer counts') THEN
    CREATE POLICY "Ad viewers can see offer counts" ON price_offers FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_offers' AND policyname = 'Buyers can create offers') THEN
    CREATE POLICY "Buyers can create offers" ON price_offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'price_offers' AND policyname = 'Participants can update offers') THEN
    CREATE POLICY "Participants can update offers" ON price_offers FOR UPDATE USING (
      auth.uid() = buyer_id OR auth.uid() = seller_id
    );
  END IF;
END $$;
