-- Sprint 2 — Task 9: Referral System
-- Full referral codes, events tracking, and points system

-- Referral codes (auto-created per user)
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referral events (click, signup, first_ad, first_sale)
CREATE TABLE IF NOT EXISTS public.referral_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code TEXT NOT NULL REFERENCES public.referral_codes(code),
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'first_ad', 'first_sale')),
  referred_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User points (aggregated)
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_points INT DEFAULT 0,
  level TEXT DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'ambassador')),
  referral_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_events_code ON public.referral_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_type ON public.referral_events(event_type, created_at DESC);

-- Auto-create referral code on signup
CREATE OR REPLACE FUNCTION public.create_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, 'MKS' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 6)));
  INSERT INTO public.user_points (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists then create
DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_code();

-- Add points function
CREATE OR REPLACE FUNCTION public.add_referral_points(
  p_user_id UUID, p_points INT, p_reason TEXT DEFAULT ''
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (p_user_id, p_points)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_points.total_points + p_points,
    referral_count = CASE WHEN p_reason = 'referral_signup' THEN user_points.referral_count + 1 ELSE user_points.referral_count END,
    level = CASE
      WHEN user_points.total_points + p_points >= 1000 THEN 'ambassador'
      WHEN user_points.total_points + p_points >= 500 THEN 'gold'
      WHEN user_points.total_points + p_points >= 100 THEN 'silver'
      ELSE 'bronze'
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Everyone can read referral codes (to validate them)
CREATE POLICY "referral_codes_select" ON public.referral_codes
  FOR SELECT USING (true);

-- Users can only see their own code for insert
CREATE POLICY "referral_codes_insert" ON public.referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referral events: anyone can insert (for tracking clicks from anonymous users)
CREATE POLICY "referral_events_insert" ON public.referral_events
  FOR INSERT WITH CHECK (true);

-- Referral events: users can see events related to their code
CREATE POLICY "referral_events_select" ON public.referral_events
  FOR SELECT USING (
    referral_code IN (
      SELECT code FROM public.referral_codes WHERE user_id = auth.uid()
    )
  );

-- User points: users can see their own
CREATE POLICY "user_points_select" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);
