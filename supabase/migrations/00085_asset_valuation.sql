-- ══════════════════════════════════════════════
-- Migration 00085: Asset Valuation + Price Index + Portfolio
-- مكسب — تقييم الأصول ومؤشر الأسعار والمحفظة
-- ══════════════════════════════════════════════

-- 1. جدول تقييمات الأصول
CREATE TABLE IF NOT EXISTS asset_valuations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('car', 'property')),

  -- بيانات السيارة
  car_make TEXT,
  car_model TEXT,
  car_year INTEGER,
  car_mileage INTEGER,
  car_condition TEXT,

  -- بيانات العقار
  property_type TEXT,
  property_area_sqm INTEGER,
  property_floor INTEGER,
  property_rooms INTEGER,
  property_finishing TEXT,

  -- الموقع
  governorate TEXT DEFAULT 'alexandria',
  district TEXT,

  -- نتيجة التقييم
  estimated_min BIGINT,
  estimated_max BIGINT,
  estimated_avg BIGINT,
  confidence_score FLOAT,

  comparable_count INTEGER,
  data_freshness_days INTEGER,

  -- AI
  ai_analysis TEXT,
  market_trend TEXT,
  trend_pct FLOAT,

  -- المستخدم
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuations_type ON asset_valuations(asset_type);
CREATE INDEX IF NOT EXISTS idx_valuations_user ON asset_valuations(user_id);
CREATE INDEX IF NOT EXISTS idx_valuations_created ON asset_valuations(created_at DESC);

-- 2. جدول مؤشر مكسب الشهري
CREATE TABLE IF NOT EXISTS maksab_price_index (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  asset_type TEXT NOT NULL,
  category TEXT,
  governorate TEXT DEFAULT 'alexandria',

  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_label TEXT,

  avg_price BIGINT,
  median_price BIGINT,
  min_price BIGINT,
  max_price BIGINT,
  price_per_sqm BIGINT,

  listings_count INTEGER,
  sold_count INTEGER,
  days_on_market FLOAT,

  change_vs_last_month FLOAT,
  change_vs_last_year FLOAT,
  trend TEXT,

  report_text TEXT,
  published_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(asset_type, governorate, period_year, period_month, COALESCE(category, ''))
);

CREATE INDEX IF NOT EXISTS idx_price_index_period ON maksab_price_index(period_year, period_month DESC);
CREATE INDEX IF NOT EXISTS idx_price_index_type ON maksab_price_index(asset_type, governorate);

-- 3. جدول محفظة الأصول الشخصية
CREATE TABLE IF NOT EXISTS user_asset_portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  asset_type TEXT NOT NULL CHECK (asset_type IN ('car', 'property')),
  asset_name TEXT NOT NULL,

  purchase_price BIGINT,
  purchase_date DATE,

  current_value BIGINT,
  last_valued_at TIMESTAMPTZ,

  rental_income_monthly BIGINT DEFAULT 0,
  total_income BIGINT DEFAULT 0,

  unrealized_gain BIGINT,
  unrealized_gain_pct FLOAT,

  asset_details JSONB DEFAULT '{}',

  listing_id UUID REFERENCES ads(id) ON DELETE SET NULL,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON user_asset_portfolio(user_id);

ALTER TABLE user_asset_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio" ON user_asset_portfolio
  FOR ALL USING (auth.uid() = user_id);

-- 4. RPC لحساب المؤشر الشهري
CREATE OR REPLACE FUNCTION calculate_monthly_index(
  p_asset_type TEXT,
  p_governorate TEXT,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_start_date DATE;
  v_end_date DATE;
  v_cat TEXT;
BEGIN
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month')::DATE;

  v_cat := CASE WHEN p_asset_type = 'car' THEN 'vehicles' ELSE 'properties' END;

  SELECT jsonb_build_object(
    'avg_price', ROUND(AVG(price)),
    'median_price', PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price),
    'min_price', MIN(price),
    'max_price', MAX(price),
    'listings_count', COUNT(*),
    'price_per_sqm', CASE
      WHEN p_asset_type = 'property'
      THEN ROUND(AVG(price / NULLIF((category_fields->>'area_sqm')::INTEGER, 0)))
      ELSE NULL
    END
  )
  INTO v_result
  FROM ahe_listings
  WHERE maksab_category = v_cat
    AND governorate IN ('الإسكندرية', 'alexandria', p_governorate)
    AND price > 0
    AND created_at >= v_start_date
    AND created_at < v_end_date;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
