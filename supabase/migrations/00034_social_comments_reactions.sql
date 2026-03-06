-- Migration 00034: Social features — Comments and Reactions on ads
-- Creates ad_comments, ad_comment_likes, and ad_reactions tables
-- These support the CommentsSection and ReactionsBar components

-- ============================================
-- 1. AD COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ad_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500 AND char_length(content) > 0),
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_ad_comments_ad ON ad_comments(ad_id, created_at DESC);
CREATE INDEX idx_ad_comments_user ON ad_comments(user_id, created_at DESC);
-- For rate limiting: recent comments by user
CREATE INDEX idx_ad_comments_user_recent ON ad_comments(user_id, created_at DESC);

-- ============================================
-- 2. AD COMMENT LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ad_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES ad_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One like per user per comment
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_ad_comment_likes_comment ON ad_comment_likes(comment_id);
CREATE INDEX idx_ad_comment_likes_user ON ad_comment_likes(user_id);

-- ============================================
-- 3. AD REACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ad_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN (
    'great_price',   -- سعر ممتاز 🔥
    'expensive',     -- غالي شوية 💸
    'fair_price',    -- سعر معقول 👍
    'want_it',       -- نفسي فيه 😍
    'amazing'        -- حاجة جامدة ✨
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One reaction per user per ad
  UNIQUE(ad_id, user_id)
);

CREATE INDEX idx_ad_reactions_ad ON ad_reactions(ad_id);
CREATE INDEX idx_ad_reactions_user ON ad_reactions(user_id);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

-- Comments: anyone can read, authenticated users can write/delete their own
ALTER TABLE ad_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_comments_select" ON ad_comments
  FOR SELECT USING (true);

CREATE POLICY "ad_comments_insert" ON ad_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ad_comments_delete" ON ad_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Comment likes: anyone can read, authenticated users can write/delete their own
ALTER TABLE ad_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_comment_likes_select" ON ad_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "ad_comment_likes_insert" ON ad_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ad_comment_likes_delete" ON ad_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions: anyone can read, authenticated users can write/delete their own
ALTER TABLE ad_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_reactions_select" ON ad_reactions
  FOR SELECT USING (true);

CREATE POLICY "ad_reactions_insert" ON ad_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ad_reactions_update" ON ad_reactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ad_reactions_delete" ON ad_reactions
  FOR DELETE USING (auth.uid() = user_id);
