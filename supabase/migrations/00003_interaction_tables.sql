-- ============================================
-- Migration 003: Interaction Tables
-- favorites, auction_bids, conversations,
-- messages, commissions
-- ============================================

-- ============================================
-- Favorites (المفضلة)
-- ============================================
CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_payer ON commissions(payer_id);
CREATE INDEX idx_commissions_ad ON commissions(ad_id);
CREATE INDEX idx_commissions_status ON commissions(status);
