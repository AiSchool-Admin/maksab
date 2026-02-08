-- ============================================
-- Migration 005: Row Level Security Policies
-- ============================================

-- ============================================
-- USERS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view user profiles
CREATE POLICY "Users are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
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
