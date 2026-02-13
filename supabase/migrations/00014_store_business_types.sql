-- ============================================
-- Migration 014: Store Business Types
-- أنواع النشاط التجاري للمتاجر
-- ============================================
-- Adds business_type differentiation to stores table
-- and extra fields for different business types

-- ============================================
-- 1. Add business_type to stores
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'business_type') THEN
    ALTER TABLE stores ADD COLUMN business_type TEXT NOT NULL DEFAULT 'shop'
      CHECK (business_type IN (
        'shop',        -- محل (بقالة، محل موبايلات، محل ملابس...)
        'showroom',    -- معرض (سيارات، أثاث، أجهزة...)
        'office',      -- مكتب (عقارات، استيراد، خدمات...)
        'workshop',    -- ورشة (صيانة، تصليح، حدادة...)
        'restaurant',  -- مطعم/كافيه
        'freelancer',  -- مقدم خدمات (سباك، كهربائي، مصمم...)
        'wholesaler',  -- تاجر جملة
        'online'       -- متجر أونلاين فقط
      ));
  END IF;
END $$;

-- ============================================
-- 2. Add extra fields for business-specific data
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'address_detail') THEN
    ALTER TABLE stores ADD COLUMN address_detail TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'working_hours_text') THEN
    ALTER TABLE stores ADD COLUMN working_hours_text TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'social_links') THEN
    ALTER TABLE stores ADD COLUMN social_links JSONB DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'business_data') THEN
    ALTER TABLE stores ADD COLUMN business_data JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- 3. Index for business_type queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stores_business_type ON stores(business_type);
