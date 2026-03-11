-- ═══════════════════════════════════════════════════════════════
-- المرحلة 3 — الخطوة 1: جدول الفئات الفرعية
-- Phase 3 — Step 1: Subcategory Mappings Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ahe_subcategory_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maksab_category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  subcategory_ar TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  source_query TEXT NOT NULL,          -- النص للبحث في URL
  source_url_segment TEXT,             -- جزء URL إضافي للفلترة
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(maksab_category, subcategory, source_platform)
);

-- RLS
ALTER TABLE ahe_subcategory_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ahe_subcategory_mappings_admin" ON ahe_subcategory_mappings FOR ALL USING (false);

-- Index
CREATE INDEX IF NOT EXISTS idx_ahe_subcategory_cat ON ahe_subcategory_mappings(maksab_category, source_platform);

-- ═══ SEED: 45 فئة فرعية عبر 8 فئات رئيسية ═══

INSERT INTO ahe_subcategory_mappings
(maksab_category, subcategory, subcategory_ar, source_platform, source_query, display_order) VALUES

-- 📱 موبايلات (8 subcategories)
('phones', 'iphone', 'آيفون', 'dubizzle', 'آيفون', 1),
('phones', 'samsung', 'سامسونج', 'dubizzle', 'سامسونج', 2),
('phones', 'xiaomi', 'شاومي', 'dubizzle', 'شاومي', 3),
('phones', 'oppo', 'أوبو', 'dubizzle', 'أوبو', 4),
('phones', 'realme', 'ريلمي', 'dubizzle', 'ريلمي', 5),
('phones', 'huawei', 'هواوي', 'dubizzle', 'هواوي', 6),
('phones', 'vivo', 'فيفو', 'dubizzle', 'فيفو', 7),
('phones', 'tablets', 'تابلت', 'dubizzle', 'تابلت', 8),

-- 🚗 سيارات (8 subcategories)
('vehicles', 'toyota', 'تويوتا', 'dubizzle', 'تويوتا', 1),
('vehicles', 'hyundai', 'هيونداي', 'dubizzle', 'هيونداي', 2),
('vehicles', 'chevrolet', 'شيفروليه', 'dubizzle', 'شيفروليه', 3),
('vehicles', 'nissan', 'نيسان', 'dubizzle', 'نيسان', 4),
('vehicles', 'mercedes', 'مرسيدس', 'dubizzle', 'مرسيدس', 5),
('vehicles', 'bmw', 'بي إم دبليو', 'dubizzle', 'بي إم دبليو', 6),
('vehicles', 'kia', 'كيا', 'dubizzle', 'كيا', 7),
('vehicles', 'mg', 'إم جي', 'dubizzle', 'MG', 8),

-- 🏠 عقارات (6 subcategories)
('properties', 'apartments_sale', 'شقق للبيع', 'dubizzle', 'شقة للبيع', 1),
('properties', 'apartments_rent', 'شقق للإيجار', 'dubizzle', 'شقة للإيجار', 2),
('properties', 'villas', 'فيلات', 'dubizzle', 'فيلا', 3),
('properties', 'lands', 'أراضي', 'dubizzle', 'أرض', 4),
('properties', 'commercial', 'محلات تجارية', 'dubizzle', 'محل', 5),
('properties', 'offices', 'مكاتب', 'dubizzle', 'مكتب', 6),

-- 🖥️ إلكترونيات (5 subcategories)
('electronics', 'laptops', 'لابتوب', 'dubizzle', 'لابتوب', 1),
('electronics', 'tvs', 'تلفزيون', 'dubizzle', 'تلفزيون', 2),
('electronics', 'gaming', 'ألعاب فيديو', 'dubizzle', 'بلايستيشن', 3),
('electronics', 'cameras', 'كاميرات', 'dubizzle', 'كاميرا', 4),
('electronics', 'audio', 'سماعات', 'dubizzle', 'سماعة', 5),

-- 🪑 أثاث (5 subcategories)
('furniture', 'bedrooms', 'غرف نوم', 'dubizzle', 'غرفة نوم', 1),
('furniture', 'living_rooms', 'أنتريه', 'dubizzle', 'أنتريه', 2),
('furniture', 'kitchens', 'مطابخ', 'dubizzle', 'مطبخ', 3),
('furniture', 'offices_furniture', 'أثاث مكتبي', 'dubizzle', 'مكتب', 4),
('furniture', 'appliances', 'أجهزة منزلية', 'dubizzle', 'غسالة', 5),

-- 👗 ملابس (4 subcategories)
('fashion', 'men', 'ملابس رجالي', 'dubizzle', 'رجالي', 1),
('fashion', 'women', 'ملابس حريمي', 'dubizzle', 'حريمي', 2),
('fashion', 'shoes', 'أحذية', 'dubizzle', 'حذاء', 3),
('fashion', 'bags', 'شنط', 'dubizzle', 'شنطة', 4),

-- 👶 أطفال (4 subcategories)
('kids', 'clothes', 'ملابس أطفال', 'dubizzle', 'ملابس أطفال', 1),
('kids', 'toys', 'ألعاب', 'dubizzle', 'لعبة', 2),
('kids', 'strollers', 'عربيات أطفال', 'dubizzle', 'عربية أطفال', 3),
('kids', 'baby_gear', 'مستلزمات رضع', 'dubizzle', 'رضاعة', 4),

-- ⚽ رياضة وهوايات (5 subcategories)
('sports', 'gym', 'أجهزة رياضية', 'dubizzle', 'جيم', 1),
('sports', 'bicycles', 'دراجات', 'dubizzle', 'دراجة', 2),
('sports', 'musical', 'آلات موسيقية', 'dubizzle', 'جيتار', 3),
('sports', 'books', 'كتب', 'dubizzle', 'كتاب', 4),
('sports', 'antiques', 'تحف وأنتيكات', 'dubizzle', 'أنتيكات', 5)

ON CONFLICT (maksab_category, subcategory, source_platform) DO NOTHING;
