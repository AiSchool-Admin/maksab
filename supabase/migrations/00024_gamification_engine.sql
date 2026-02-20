-- Sprint 3 — Task 17: Gamification Engine
-- 5 levels, 9 achievements, leaderboard, streak tracking

-- ── Achievements ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  emoji TEXT NOT NULL,
  points_reward INT NOT NULL DEFAULT 0,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN (
    'ads_count', 'sales_count', 'reviews_count', 'referrals_count',
    'streak_days', 'profile_complete', 'first_ad', 'first_sale', 'first_bid'
  )),
  requirement_value INT NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User unlocked achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Daily streak tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leaderboard materialized view (refreshed periodically)
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  total_points INT DEFAULT 0,
  level TEXT DEFAULT 'bronze',
  rank INT DEFAULT 0,
  ads_count INT DEFAULT 0,
  sales_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON public.leaderboard_cache(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_streaks_active ON public.user_streaks(last_active_date);

-- RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Achievements: everyone can read
CREATE POLICY "achievements_read" ON public.achievements FOR SELECT USING (true);

-- User achievements: own only
CREATE POLICY "user_achievements_read" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_achievements_insert" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streaks: own only
CREATE POLICY "user_streaks_all" ON public.user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Leaderboard: everyone can read
CREATE POLICY "leaderboard_read" ON public.leaderboard_cache
  FOR SELECT USING (true);

-- ── Seed 9 Achievements ──────────────────────────────

INSERT INTO public.achievements (id, name_ar, description_ar, emoji, points_reward, requirement_type, requirement_value, sort_order) VALUES
  ('first_ad', 'أول إعلان', 'نشرت أول إعلان على مكسب', '📝', 50, 'first_ad', 1, 1),
  ('first_sale', 'أول بيعة', 'بعت أول حاجة على مكسب', '💰', 100, 'first_sale', 1, 2),
  ('first_bid', 'أول مزايدة', 'زايدت لأول مرة في مزاد', '🔨', 30, 'first_bid', 1, 3),
  ('seller_10', 'بائع نشط', 'نشرت 10 إعلانات', '🏪', 200, 'ads_count', 10, 4),
  ('seller_50', 'بائع محترف', 'نشرت 50 إعلان', '🏆', 500, 'ads_count', 50, 5),
  ('reviewer_5', 'مقيّم نشط', 'كتبت 5 تقييمات', '⭐', 100, 'reviews_count', 5, 6),
  ('referrer_5', 'داعي الخير', 'دعيت 5 أصدقاء', '🤝', 200, 'referrals_count', 5, 7),
  ('streak_7', 'مداوم أسبوعي', 'دخلت 7 أيام متتالية', '🔥', 150, 'streak_days', 7, 8),
  ('streak_30', 'مداوم شهري', 'دخلت 30 يوم متتالي', '💎', 500, 'streak_days', 30, 9)
ON CONFLICT (id) DO NOTHING;

-- ── Update Streak Function ───────────────────────────

CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INT, longest_streak INT, new_achievements TEXT[]) AS $$
DECLARE
  v_last_date DATE;
  v_current INT;
  v_longest INT;
  v_today DATE := CURRENT_DATE;
  v_new_achievements TEXT[] := '{}';
BEGIN
  -- Get or create streak record
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_active_date)
  VALUES (p_user_id, 0, 0, v_today - 1)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT us.last_active_date, us.current_streak, us.longest_streak
  INTO v_last_date, v_current, v_longest
  FROM public.user_streaks us WHERE us.user_id = p_user_id;

  -- Already logged in today
  IF v_last_date = v_today THEN
    RETURN QUERY SELECT v_current, v_longest, v_new_achievements;
    RETURN;
  END IF;

  -- Consecutive day
  IF v_last_date = v_today - 1 THEN
    v_current := v_current + 1;
  ELSE
    v_current := 1;
  END IF;

  IF v_current > v_longest THEN
    v_longest := v_current;
  END IF;

  UPDATE public.user_streaks SET
    current_streak = v_current,
    longest_streak = v_longest,
    last_active_date = v_today,
    updated_at = now()
  WHERE user_streaks.user_id = p_user_id;

  -- Check streak achievements
  IF v_current >= 7 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'streak_7')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    IF FOUND THEN v_new_achievements := array_append(v_new_achievements, 'streak_7'); END IF;
  END IF;

  IF v_current >= 30 THEN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'streak_30')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    IF FOUND THEN v_new_achievements := array_append(v_new_achievements, 'streak_30'); END IF;
  END IF;

  RETURN QUERY SELECT v_current, v_longest, v_new_achievements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Check & Unlock Achievement ───────────────────────

CREATE OR REPLACE FUNCTION public.check_achievement(
  p_user_id UUID, p_achievement_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_unlocked BOOLEAN := FALSE;
BEGIN
  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (p_user_id, p_achievement_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  GET DIAGNOSTICS v_unlocked = ROW_COUNT;

  -- Award points if newly unlocked
  IF v_unlocked THEN
    PERFORM public.add_referral_points(
      p_user_id,
      (SELECT points_reward FROM public.achievements WHERE id = p_achievement_id),
      'achievement_' || p_achievement_id
    );
  END IF;

  RETURN v_unlocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Refresh Leaderboard Function ─────────────────────

CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.leaderboard_cache;

  INSERT INTO public.leaderboard_cache (user_id, display_name, avatar_url, total_points, level, rank, ads_count, sales_count)
  SELECT
    up.user_id,
    p.display_name,
    p.avatar_url,
    up.total_points,
    up.level,
    ROW_NUMBER() OVER (ORDER BY up.total_points DESC),
    COALESCE((SELECT COUNT(*) FROM ads WHERE ads.user_id = up.user_id), 0)::INT,
    COALESCE((SELECT COUNT(*) FROM ads WHERE ads.user_id = up.user_id AND ads.status = 'sold'), 0)::INT
  FROM public.user_points up
  LEFT JOIN public.profiles p ON p.id = up.user_id
  WHERE up.total_points > 0
  ORDER BY up.total_points DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
