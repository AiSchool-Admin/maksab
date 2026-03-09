-- ═══════════════════════════════════════════════════════════════
-- محرك الحصاد الآلي (AHE) — المرحلة 1
-- Automated Harvesting Engine — Phase 1
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. ENGINE STATUS (singleton) ═══
CREATE TABLE IF NOT EXISTS ahe_engine_status (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'stopped',
  status_changed_at TIMESTAMPTZ DEFAULT now(),
  status_changed_by UUID,
  status_reason TEXT,
  active_scopes_count INTEGER DEFAULT 0,
  running_jobs_count INTEGER DEFAULT 0,
  global_max_concurrent_jobs INTEGER DEFAULT 3,
  global_max_requests_per_hour INTEGER DEFAULT 500,
  current_requests_this_hour INTEGER DEFAULT 0,
  hour_started_at TIMESTAMPTZ DEFAULT now(),
  consecutive_errors INTEGER DEFAULT 0,
  auto_pause_threshold INTEGER DEFAULT 10,
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ 2. CATEGORY MAPPINGS ═══
CREATE TABLE IF NOT EXISTS ahe_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maksab_category TEXT NOT NULL,
  maksab_category_ar TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  source_category_name TEXT NOT NULL,
  source_url_segment TEXT NOT NULL,
  source_url_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(maksab_category, source_platform)
);

-- ═══ 3. GOVERNORATE MAPPINGS ═══
CREATE TABLE IF NOT EXISTS ahe_governorate_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maksab_governorate TEXT NOT NULL,
  maksab_governorate_ar TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  source_governorate_name TEXT NOT NULL,
  source_url_segment TEXT NOT NULL,
  estimated_daily_listings INTEGER DEFAULT 100,
  suggested_interval_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(maksab_governorate, source_platform)
);

-- ═══ 4. CITY MAPPINGS ═══
CREATE TABLE IF NOT EXISTS ahe_city_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maksab_governorate TEXT NOT NULL,
  maksab_city TEXT NOT NULL,
  maksab_city_ar TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  source_city_name TEXT NOT NULL,
  source_url_segment TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(maksab_city, maksab_governorate, source_platform)
);

-- ═══ 5. SCOPES ═══
CREATE TABLE IF NOT EXISTS ahe_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  source_platform TEXT NOT NULL,
  maksab_category TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT,
  base_url TEXT NOT NULL,
  pagination_pattern TEXT DEFAULT '?page={page}',
  harvest_interval_minutes INTEGER NOT NULL DEFAULT 60,
  fetch_depth_minutes INTEGER,
  max_pages_per_harvest INTEGER DEFAULT 5,
  delay_between_requests_ms INTEGER DEFAULT 5000,
  detail_fetch_enabled BOOLEAN DEFAULT true,
  detail_delay_between_requests_ms INTEGER DEFAULT 5000,
  is_active BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  last_harvest_at TIMESTAMPTZ,
  last_harvest_job_id UUID,
  last_harvest_new_listings INTEGER DEFAULT 0,
  last_harvest_new_sellers INTEGER DEFAULT 0,
  next_harvest_at TIMESTAMPTZ,
  total_harvests INTEGER DEFAULT 0,
  total_listings_found INTEGER DEFAULT 0,
  total_sellers_found INTEGER DEFAULT 0,
  total_phones_extracted INTEGER DEFAULT 0,
  avg_new_listings_per_harvest NUMERIC(6,1) DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  listing_max_age_days INTEGER DEFAULT 30,
  listing_not_seen_hours INTEGER DEFAULT 48,
  seller_inactive_days INTEGER DEFAULT 14,
  renewal_wait_hours INTEGER DEFAULT 72,
  auto_renew_active_sellers BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ 6. HARVEST JOBS ═══
CREATE TABLE IF NOT EXISTS ahe_harvest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID REFERENCES ahe_scopes(id) NOT NULL,
  target_from TIMESTAMPTZ NOT NULL,
  target_to TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  pages_fetched INTEGER DEFAULT 0,
  pages_total INTEGER,
  listings_fetched INTEGER DEFAULT 0,
  details_fetched INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  current_step TEXT,
  listings_total INTEGER DEFAULT 0,
  listings_new INTEGER DEFAULT 0,
  listings_duplicate INTEGER DEFAULT 0,
  listings_expired INTEGER DEFAULT 0,
  sellers_total INTEGER DEFAULT 0,
  sellers_new INTEGER DEFAULT 0,
  sellers_existing INTEGER DEFAULT 0,
  phones_extracted INTEGER DEFAULT 0,
  phones_new INTEGER DEFAULT 0,
  auto_queued INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ahe_jobs_scope ON ahe_harvest_jobs(scope_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ahe_jobs_status ON ahe_harvest_jobs(status);

-- ═══ 7. SELLERS ═══
CREATE TABLE IF NOT EXISTS ahe_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT,
  profile_url TEXT,
  name TEXT,
  avatar_url TEXT,
  source_platform TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_business BOOLEAN DEFAULT false,
  badge TEXT,
  member_since TEXT,
  detected_account_type TEXT DEFAULT 'individual',
  primary_category TEXT,
  primary_governorate TEXT,
  operating_areas TEXT[] DEFAULT '{}',
  total_listings_seen INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_new_listing_at TIMESTAMPTZ,
  priority_score INTEGER DEFAULT 0,
  pipeline_status TEXT DEFAULT 'discovered',
  crm_customer_id UUID,
  assigned_agent_id UUID,
  campaign_id UUID,
  first_outreach_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ahe_sellers_phone ON ahe_sellers(phone);
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_profile ON ahe_sellers(profile_url);
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_pipeline ON ahe_sellers(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_platform ON ahe_sellers(source_platform);

-- ═══ 8. LISTINGS ═══
CREATE TABLE IF NOT EXISTS ahe_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID REFERENCES ahe_scopes(id) NOT NULL,
  harvest_job_id UUID REFERENCES ahe_harvest_jobs(id),
  source_platform TEXT NOT NULL,
  source_listing_url TEXT NOT NULL,
  source_listing_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'EGP',
  is_negotiable BOOLEAN DEFAULT false,
  supports_exchange BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  condition TEXT,
  payment_method TEXT,
  has_warranty BOOLEAN,
  thumbnail_url TEXT,
  main_image_url TEXT,
  all_image_urls TEXT[] DEFAULT '{}',
  images_downloaded BOOLEAN DEFAULT false,
  local_image_urls TEXT[] DEFAULT '{}',
  source_category TEXT,
  maksab_category TEXT,
  detected_brand TEXT,
  detected_model TEXT,
  specifications JSONB DEFAULT '{}',
  source_location TEXT,
  governorate TEXT,
  city TEXT,
  area TEXT,
  source_date_text TEXT,
  estimated_posted_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  seller_name TEXT,
  seller_profile_url TEXT,
  seller_is_verified BOOLEAN DEFAULT false,
  seller_is_business BOOLEAN DEFAULT false,
  seller_badge TEXT,
  ahe_seller_id UUID,
  extracted_phone TEXT,
  phone_source TEXT,
  mapped_title TEXT,
  mapped_description TEXT,
  mapped_condition TEXT,
  mapped_sale_types TEXT[] DEFAULT '{direct_sale}',
  ai_enhanced BOOLEAN DEFAULT false,
  ai_quality_score INTEGER,
  migration_status TEXT DEFAULT 'harvested',
  maksab_listing_id UUID,
  migrated_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT false,
  expired_at TIMESTAMPTZ,
  expiry_reason TEXT,
  renewal_offered BOOLEAN DEFAULT false,
  renewal_accepted BOOLEAN,
  renewal_offered_at TIMESTAMPTZ,
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ahe_listings_url ON ahe_listings(source_listing_url);
CREATE INDEX IF NOT EXISTS idx_ahe_listings_scope ON ahe_listings(scope_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ahe_listings_seller ON ahe_listings(ahe_seller_id);
CREATE INDEX IF NOT EXISTS idx_ahe_listings_platform ON ahe_listings(source_platform, maksab_category);
CREATE INDEX IF NOT EXISTS idx_ahe_listings_phone ON ahe_listings(extracted_phone) WHERE extracted_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ahe_listings_migration ON ahe_listings(migration_status);

-- ═══ 9. HOURLY METRICS ═══
CREATE TABLE IF NOT EXISTS ahe_hourly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID REFERENCES ahe_scopes(id) NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  listings_fetched INTEGER DEFAULT 0,
  listings_new INTEGER DEFAULT 0,
  listings_duplicate INTEGER DEFAULT 0,
  sellers_new INTEGER DEFAULT 0,
  phones_extracted INTEGER DEFAULT 0,
  auto_queued INTEGER DEFAULT 0,
  fetch_duration_seconds INTEGER,
  pages_fetched INTEGER,
  errors_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scope_id, hour_start)
);

-- ═══ 10. DAILY METRICS ═══
CREATE TABLE IF NOT EXISTS ahe_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_harvests INTEGER DEFAULT 0,
  total_listings_new INTEGER DEFAULT 0,
  total_sellers_new INTEGER DEFAULT 0,
  total_phones_extracted INTEGER DEFAULT 0,
  total_auto_queued INTEGER DEFAULT 0,
  contacted INTEGER DEFAULT 0,
  responded INTEGER DEFAULT 0,
  signed_up INTEGER DEFAULT 0,
  activated INTEGER DEFAULT 0,
  listings_expired INTEGER DEFAULT 0,
  listings_renewed INTEGER DEFAULT 0,
  listings_deleted INTEGER DEFAULT 0,
  by_platform JSONB DEFAULT '{}',
  by_category JSONB DEFAULT '{}',
  by_governorate JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ RPC FUNCTIONS ═══

-- Increment hourly request counter
CREATE OR REPLACE FUNCTION increment_hourly_requests(increment_by INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE ahe_engine_status
  SET
    current_requests_this_hour = current_requests_this_hour + increment_by,
    updated_at = now()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto pause on consecutive errors
CREATE OR REPLACE FUNCTION auto_pause_on_consecutive_errors()
RETURNS void AS $$
DECLARE
  v_threshold INTEGER;
  v_current_errors INTEGER;
BEGIN
  SELECT auto_pause_threshold, consecutive_errors INTO v_threshold, v_current_errors
  FROM ahe_engine_status WHERE id = 1;

  IF v_current_errors >= v_threshold THEN
    UPDATE ahe_engine_status
    SET
      status = 'paused',
      status_reason = 'توقف تلقائي — ' || v_current_errors || ' أخطاء متتالية',
      status_changed_at = now(),
      updated_at = now()
    WHERE id = 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset hourly request counter
CREATE OR REPLACE FUNCTION reset_hourly_request_counter()
RETURNS void AS $$
BEGIN
  UPDATE ahe_engine_status
  SET
    current_requests_this_hour = 0,
    hour_started_at = now(),
    updated_at = now()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update daily metrics (upsert)
CREATE OR REPLACE FUNCTION upsert_ahe_daily_metrics(
  p_listings_new INTEGER DEFAULT 0,
  p_sellers_new INTEGER DEFAULT 0,
  p_phones_extracted INTEGER DEFAULT 0,
  p_auto_queued INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO ahe_daily_metrics (metric_date, total_harvests, total_listings_new, total_sellers_new, total_phones_extracted, total_auto_queued)
  VALUES (CURRENT_DATE, 1, p_listings_new, p_sellers_new, p_phones_extracted, p_auto_queued)
  ON CONFLICT (metric_date) DO UPDATE SET
    total_harvests = ahe_daily_metrics.total_harvests + 1,
    total_listings_new = ahe_daily_metrics.total_listings_new + EXCLUDED.total_listings_new,
    total_sellers_new = ahe_daily_metrics.total_sellers_new + EXCLUDED.total_sellers_new,
    total_phones_extracted = ahe_daily_metrics.total_phones_extracted + EXCLUDED.total_phones_extracted,
    total_auto_queued = ahe_daily_metrics.total_auto_queued + EXCLUDED.total_auto_queued;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment seller listings count
CREATE OR REPLACE FUNCTION increment_seller_listings(p_seller_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ahe_sellers
  SET
    total_listings_seen = total_listings_seen + 1,
    last_seen_at = now(),
    last_new_listing_at = now(),
    updated_at = now()
  WHERE id = p_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ RLS POLICIES ═══
ALTER TABLE ahe_engine_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_harvest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_hourly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_governorate_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahe_city_mappings ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so these policies are for anon/authenticated
-- Admin-only access (no public access)
CREATE POLICY "ahe_engine_status_admin" ON ahe_engine_status FOR ALL USING (false);
CREATE POLICY "ahe_scopes_admin" ON ahe_scopes FOR ALL USING (false);
CREATE POLICY "ahe_harvest_jobs_admin" ON ahe_harvest_jobs FOR ALL USING (false);
CREATE POLICY "ahe_sellers_admin" ON ahe_sellers FOR ALL USING (false);
CREATE POLICY "ahe_listings_admin" ON ahe_listings FOR ALL USING (false);
CREATE POLICY "ahe_hourly_metrics_admin" ON ahe_hourly_metrics FOR ALL USING (false);
CREATE POLICY "ahe_daily_metrics_admin" ON ahe_daily_metrics FOR ALL USING (false);
CREATE POLICY "ahe_category_mappings_admin" ON ahe_category_mappings FOR ALL USING (false);
CREATE POLICY "ahe_governorate_mappings_admin" ON ahe_governorate_mappings FOR ALL USING (false);
CREATE POLICY "ahe_city_mappings_admin" ON ahe_city_mappings FOR ALL USING (false);

-- ═══ SEED DATA ═══

-- Engine status (singleton)
INSERT INTO ahe_engine_status (id, status, status_reason, consecutive_errors)
VALUES (1, 'stopped', 'في انتظار التفعيل الأول', 0)
ON CONFLICT (id) DO NOTHING;

-- Category mappings (12 categories)
INSERT INTO ahe_category_mappings
(maksab_category, maksab_category_ar, source_platform, source_category_name, source_url_segment, source_url_template) VALUES
('phones', 'موبايلات', 'dubizzle', 'موبايلات', 'mobile-phones-tablets-accessories-numbers/mobile-phones', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/{gov}/'),
('electronics', 'إلكترونيات', 'dubizzle', 'أجهزة إلكترونية', 'electronics-home-appliances', 'https://www.dubizzle.com.eg/electronics-home-appliances/{gov}/'),
('vehicles', 'سيارات', 'dubizzle', 'سيارات للبيع', 'vehicles/cars-for-sale', 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/{gov}/'),
('properties', 'عقارات', 'dubizzle', 'شقق للبيع', 'properties/apartments-duplex-for-sale', 'https://www.dubizzle.com.eg/properties/apartments-duplex-for-sale/{gov}/'),
('furniture', 'أثاث', 'dubizzle', 'أثاث المنزل والمكتب', 'home-furniture-decor', 'https://www.dubizzle.com.eg/home-furniture-decor/{gov}/'),
('fashion', 'ملابس', 'dubizzle', 'الموضة والجمال', 'fashion-beauty', 'https://www.dubizzle.com.eg/fashion-beauty/{gov}/'),
('kids', 'أطفال', 'dubizzle', 'مستلزمات أطفال', 'kids-babies', 'https://www.dubizzle.com.eg/kids-babies/{gov}/'),
('sports', 'رياضة', 'dubizzle', 'هوايات', 'books-sports-hobbies', 'https://www.dubizzle.com.eg/books-sports-hobbies/{gov}/'),
('pets', 'حيوانات', 'dubizzle', 'حيوانات أليفة', 'pets', 'https://www.dubizzle.com.eg/pets/{gov}/'),
('jobs', 'وظائف', 'dubizzle', 'وظائف', 'jobs', 'https://www.dubizzle.com.eg/jobs/{gov}/'),
('services', 'خدمات', 'dubizzle', 'خدمات', 'services', 'https://www.dubizzle.com.eg/services/{gov}/'),
('other', 'أخرى', 'dubizzle', 'تجارة و صناعة', 'business-industrial-agriculture', 'https://www.dubizzle.com.eg/business-industrial-agriculture/{gov}/')
ON CONFLICT (maksab_category, source_platform) DO NOTHING;

-- Governorate mappings (27 governorates)
INSERT INTO ahe_governorate_mappings
(maksab_governorate, maksab_governorate_ar, source_platform, source_governorate_name, source_url_segment, estimated_daily_listings, suggested_interval_minutes) VALUES
('cairo', 'القاهرة', 'dubizzle', 'القاهرة', 'cairo', 500, 60),
('alexandria', 'الإسكندرية', 'dubizzle', 'الإسكندرية', 'alexandria', 300, 60),
('giza', 'الجيزة', 'dubizzle', 'الجيزة', 'giza', 200, 60),
('qalyubia', 'القليوبية', 'dubizzle', 'القليوبية', 'qalyubia', 80, 120),
('sharqia', 'الشرقية', 'dubizzle', 'الشرقية', 'sharqia', 60, 120),
('dakahlia', 'الدقهلية', 'dubizzle', 'الدقهلية', 'dakahlia', 50, 120),
('gharbia', 'الغربية', 'dubizzle', 'الغربية', 'gharbia', 30, 360),
('monufia', 'المنوفية', 'dubizzle', 'المنوفية', 'monufia', 25, 360),
('beheira', 'البحيرة', 'dubizzle', 'البحيرة', 'beheira', 25, 360),
('kafr_el_sheikh', 'كفر الشيخ', 'dubizzle', 'كفر الشيخ', 'kafr-el-sheikh', 15, 360),
('damietta', 'دمياط', 'dubizzle', 'دمياط', 'damietta', 20, 360),
('port_said', 'بورسعيد', 'dubizzle', 'بورسعيد', 'port-said', 20, 360),
('ismailia', 'الإسماعيلية', 'dubizzle', 'الإسماعيلية', 'ismailia', 20, 360),
('suez', 'السويس', 'dubizzle', 'السويس', 'suez', 15, 360),
('fayoum', 'الفيوم', 'dubizzle', 'الفيوم', 'fayoum', 10, 1440),
('beni_suef', 'بني سويف', 'dubizzle', 'بني سويف', 'beni-suef', 10, 1440),
('minya', 'المنيا', 'dubizzle', 'المنيا', 'minya', 15, 1440),
('assiut', 'أسيوط', 'dubizzle', 'أسيوط', 'assiut', 15, 1440),
('sohag', 'سوهاج', 'dubizzle', 'سوهاج', 'sohag', 10, 1440),
('qena', 'قنا', 'dubizzle', 'قنا', 'qena', 8, 1440),
('luxor', 'الأقصر', 'dubizzle', 'الأقصر', 'luxor', 10, 1440),
('aswan', 'أسوان', 'dubizzle', 'أسوان', 'aswan', 8, 1440),
('red_sea', 'البحر الأحمر', 'dubizzle', 'البحر الأحمر', 'red-sea', 15, 1440),
('matrouh', 'مطروح', 'dubizzle', 'مطروح', 'matrouh', 8, 1440),
('north_sinai', 'شمال سيناء', 'dubizzle', 'شمال سيناء', 'north-sinai', 5, 1440),
('south_sinai', 'جنوب سيناء', 'dubizzle', 'جنوب سيناء', 'south-sinai', 10, 1440),
('new_valley', 'الوادي الجديد', 'dubizzle', 'الوادي الجديد', 'new-valley', 3, 1440)
ON CONFLICT (maksab_governorate, source_platform) DO NOTHING;

-- City mappings (sample — Alexandria & Cairo)
INSERT INTO ahe_city_mappings
(maksab_governorate, maksab_city, maksab_city_ar, source_platform, source_city_name, source_url_segment) VALUES
('alexandria', 'agami', 'العجمي', 'dubizzle', 'عجمي', 'agami'),
('alexandria', 'sidi_beshr', 'سيدي بشر', 'dubizzle', 'سيدي بشر', 'sidi-beshr'),
('alexandria', 'smoha', 'سموحة', 'dubizzle', 'سموحة', 'smoha'),
('alexandria', 'seyouf', 'السيوف', 'dubizzle', 'السيوف', 'seyouf'),
('alexandria', 'awayed', 'العوايد', 'dubizzle', 'العوايد', 'awayed'),
('alexandria', 'asafra', 'العصافرة', 'dubizzle', 'العصافرة', 'asafra'),
('alexandria', 'moharam_bik', 'محرم بيك', 'dubizzle', 'محرّم بيك', 'moharam-bik'),
('alexandria', 'mandara', 'المندرة', 'dubizzle', 'المندرة', 'mandara'),
('alexandria', 'miami', 'ميامي', 'dubizzle', 'ميامي', 'miami'),
('alexandria', 'glim', 'جليم', 'dubizzle', 'جليم', 'glim'),
('alexandria', 'sidi_gaber', 'سيدي جابر', 'dubizzle', 'سيدي جابر', 'sidi-gaber'),
('alexandria', 'san_stefano', 'سان ستيفانو', 'dubizzle', 'سان ستيفانو', 'san-stefano'),
('alexandria', 'victoria', 'فيكتوريا', 'dubizzle', 'فيكتوريا', 'victoria'),
('cairo', 'nasr_city', 'مدينة نصر', 'dubizzle', 'مدينة نصر', 'nasr-city'),
('cairo', 'maadi', 'المعادي', 'dubizzle', 'المعادي', 'maadi'),
('cairo', 'heliopolis', 'مصر الجديدة', 'dubizzle', 'مصر الجديدة', 'heliopolis'),
('cairo', 'new_cairo', 'القاهرة الجديدة', 'dubizzle', 'القاهرة الجديدة', 'new-cairo'),
('cairo', 'downtown', 'وسط البلد', 'dubizzle', 'وسط البلد', 'downtown-cairo'),
('cairo', 'shubra', 'شبرا', 'dubizzle', 'شبرا', 'shubra')
ON CONFLICT (maksab_city, maksab_governorate, source_platform) DO NOTHING;

-- Initial scopes (14 scopes — all inactive)
INSERT INTO ahe_scopes
(code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority, is_active) VALUES
('dub_phones_cairo', 'موبايلات — القاهرة — دوبيزل', 'dubizzle', 'phones', 'cairo', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/cairo/', 60, 5, 10, false),
('dub_phones_alex', 'موبايلات — الإسكندرية — دوبيزل', 'dubizzle', 'phones', 'alexandria', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/alexandria/', 60, 5, 10, false),
('dub_phones_giza', 'موبايلات — الجيزة — دوبيزل', 'dubizzle', 'phones', 'giza', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/giza/', 60, 3, 8, false),
('dub_electronics_cairo', 'إلكترونيات — القاهرة — دوبيزل', 'dubizzle', 'electronics', 'cairo', 'https://www.dubizzle.com.eg/electronics-home-appliances/cairo/', 60, 4, 8, false),
('dub_electronics_alex', 'إلكترونيات — الإسكندرية — دوبيزل', 'dubizzle', 'electronics', 'alexandria', 'https://www.dubizzle.com.eg/electronics-home-appliances/alexandria/', 60, 3, 7, false),
('dub_vehicles_cairo', 'سيارات — القاهرة — دوبيزل', 'dubizzle', 'vehicles', 'cairo', 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/cairo/', 120, 5, 7, false),
('dub_vehicles_alex', 'سيارات — الإسكندرية — دوبيزل', 'dubizzle', 'vehicles', 'alexandria', 'https://www.dubizzle.com.eg/vehicles/cars-for-sale/alexandria/', 120, 3, 6, false),
('dub_properties_cairo', 'عقارات — القاهرة — دوبيزل', 'dubizzle', 'properties', 'cairo', 'https://www.dubizzle.com.eg/properties/apartments-duplex-for-sale/cairo/', 120, 5, 6, false),
('dub_furniture_cairo', 'أثاث — القاهرة — دوبيزل', 'dubizzle', 'furniture', 'cairo', 'https://www.dubizzle.com.eg/home-furniture-decor/cairo/', 360, 3, 5, false),
('dub_phones_qalyubia', 'موبايلات — القليوبية — دوبيزل', 'dubizzle', 'phones', 'qalyubia', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/qalyubia/', 120, 3, 5, false),
('dub_phones_sharqia', 'موبايلات — الشرقية — دوبيزل', 'dubizzle', 'phones', 'sharqia', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/sharqia/', 360, 3, 3, false),
('dub_phones_dakahlia', 'موبايلات — الدقهلية — دوبيزل', 'dubizzle', 'phones', 'dakahlia', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/dakahlia/', 360, 3, 3, false),
('dub_phones_gharbia', 'موبايلات — الغربية — دوبيزل', 'dubizzle', 'phones', 'gharbia', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/gharbia/', 1440, 3, 1, false),
('dub_phones_fayoum', 'موبايلات — الفيوم — دوبيزل', 'dubizzle', 'phones', 'fayoum', 'https://www.dubizzle.com.eg/mobile-phones-tablets-accessories-numbers/mobile-phones/fayoum/', 1440, 2, 1, false)
ON CONFLICT (code) DO NOTHING;
