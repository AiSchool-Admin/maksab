-- ============================================
-- Seed Data: Categories & Subcategories
-- 12 قسم رئيسي مع الأقسام الفرعية
-- ============================================

-- ============================================
-- Categories (الأقسام الرئيسية)
-- ============================================
INSERT INTO categories (id, name, icon, slug, sort_order) VALUES
  ('cars',       'السيارات',          '🚗', 'cars',        1),
  ('real_estate','العقارات',          '🏠', 'real-estate',  2),
  ('phones',     'الموبايلات والتابلت','📱', 'phones',      3),
  ('fashion',    'الموضة',            '👗', 'fashion',      4),
  ('scrap',      'الخردة',            '♻️', 'scrap',        5),
  ('gold',       'الذهب والفضة',      '💰', 'gold',         6),
  ('luxury',     'السلع الفاخرة',     '💎', 'luxury',       7),
  ('appliances', 'الأجهزة المنزلية',  '🏠', 'appliances',   8),
  ('furniture',  'الأثاث والديكور',   '🪑', 'furniture',    9),
  ('hobbies',    'الهوايات',          '🎮', 'hobbies',     10),
  ('tools',      'العدد والأدوات',    '🔧', 'tools',       11),
  ('services',   'الخدمات',           '🛠️', 'services',    12);

-- ============================================
-- 1. السيارات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('cars_passenger',   'cars', 'سيارات ملاكي',  'passenger',   1),
  ('cars_microbus',    'cars', 'ميكروباص',      'microbus',    2),
  ('cars_trucks',      'cars', 'نقل',           'trucks',      3),
  ('cars_motorcycles', 'cars', 'موتوسيكلات',    'motorcycles', 4),
  ('cars_parts',       'cars', 'قطع غيار',      'car-parts',   5);

-- ============================================
-- 2. العقارات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('re_apartments_sale', 'real_estate', 'شقق للبيع',     'apartments-sale', 1),
  ('re_apartments_rent', 'real_estate', 'شقق للإيجار',   'apartments-rent', 2),
  ('re_villas',          'real_estate', 'فيلات',          'villas',          3),
  ('re_land',            'real_estate', 'أراضي',          'land',            4),
  ('re_commercial',      'real_estate', 'محلات تجارية',   'commercial',      5),
  ('re_offices',         'real_estate', 'مكاتب',          'offices',         6);

-- ============================================
-- 3. الموبايلات والتابلت — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('phones_mobile',      'phones', 'موبايلات',    'mobile',           1),
  ('phones_tablet',      'phones', 'تابلت',       'tablet',           2),
  ('phones_accessories', 'phones', 'إكسسوارات',   'phone-accessories', 3),
  ('phones_parts',       'phones', 'قطع غيار',    'phone-parts',      4);

-- ============================================
-- 4. الموضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('fashion_men',         'fashion', 'ملابس رجالي',  'men',                1),
  ('fashion_women',       'fashion', 'ملابس حريمي',  'women',              2),
  ('fashion_kids',        'fashion', 'ملابس أطفال',  'kids',               3),
  ('fashion_shoes',       'fashion', 'أحذية',        'shoes',              4),
  ('fashion_bags',        'fashion', 'شنط',          'bags',               5),
  ('fashion_accessories', 'fashion', 'إكسسوارات',    'fashion-accessories', 6);

-- ============================================
-- 5. الخردة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('scrap_iron',         'scrap', 'حديد',          'iron',         1),
  ('scrap_aluminum',     'scrap', 'ألومنيوم',      'aluminum',     2),
  ('scrap_copper',       'scrap', 'نحاس',          'copper',       3),
  ('scrap_plastic',      'scrap', 'بلاستيك',       'plastic',      4),
  ('scrap_paper',        'scrap', 'ورق',           'paper',        5),
  ('scrap_old_devices',  'scrap', 'أجهزة قديمة',   'old-devices',  6),
  ('scrap_construction', 'scrap', 'مخلفات بناء',   'construction', 7),
  ('scrap_other',        'scrap', 'أخرى',          'scrap-other',  8);

-- ============================================
-- 6. الذهب والفضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('gold_items',          'gold', 'ذهب',           'gold-items',      1),
  ('gold_silver',         'gold', 'فضة',           'silver',          2),
  ('gold_diamond',        'gold', 'ألماس',         'diamond',         3),
  ('gold_precious_watch', 'gold', 'ساعات ثمينة',   'precious-watches', 4);

-- ============================================
-- 7. السلع الفاخرة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('luxury_bags',       'luxury', 'شنط فاخرة', 'luxury-bags',  1),
  ('luxury_sunglasses', 'luxury', 'نظارات',    'sunglasses',   2),
  ('luxury_watches',    'luxury', 'ساعات',     'watches',      3),
  ('luxury_perfumes',   'luxury', 'عطور',      'perfumes',     4),
  ('luxury_pens',       'luxury', 'أقلام',     'pens',         5);

-- ============================================
-- 8. الأجهزة المنزلية — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('app_washers',     'appliances', 'غسالات',       'washers',          1),
  ('app_fridges',     'appliances', 'ثلاجات',       'fridges',          2),
  ('app_cookers',     'appliances', 'بوتاجازات',    'cookers',          3),
  ('app_ac',          'appliances', 'مكيفات',       'ac',               4),
  ('app_heaters',     'appliances', 'سخانات',       'heaters',          5),
  ('app_small',       'appliances', 'أجهزة صغيرة',  'small-appliances', 6);

-- ============================================
-- 9. الأثاث والديكور — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('furn_bedroom',  'furniture', 'غرف نوم',   'bedroom',         1),
  ('furn_dining',   'furniture', 'سفرة',      'dining',          2),
  ('furn_living',   'furniture', 'أنتريه',    'living',          3),
  ('furn_kitchen',  'furniture', 'مطابخ',     'kitchen',         4),
  ('furn_decor',    'furniture', 'ديكورات',   'decor',           5),
  ('furn_lighting', 'furniture', 'إضاءة',     'lighting',        6),
  ('furn_carpets',  'furniture', 'سجاد',      'carpets',         7),
  ('furn_other',    'furniture', 'أخرى',      'furniture-other', 8);

-- ============================================
-- 10. الهوايات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('hobby_music',     'hobbies', 'آلات موسيقية',     'music',     1),
  ('hobby_sports',    'hobbies', 'معدات رياضية',     'sports',    2),
  ('hobby_gaming',    'hobbies', 'ألعاب فيديو',      'gaming',    3),
  ('hobby_books',     'hobbies', 'كتب',              'books',     4),
  ('hobby_cameras',   'hobbies', 'كاميرات',          'cameras',   5),
  ('hobby_bikes',     'hobbies', 'دراجات',           'bikes',     6),
  ('hobby_antiques',  'hobbies', 'تحف وأنتيكات',     'antiques',  7),
  ('hobby_pets',      'hobbies', 'حيوانات أليفة',    'pets',      8);

-- ============================================
-- 11. العدد والأدوات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('tools_hand',        'tools', 'عدد يدوية',       'hand-tools',           1),
  ('tools_power',       'tools', 'عدد كهربائية',    'power-tools',          2),
  ('tools_workshop',    'tools', 'معدات ورش',       'workshop',             3),
  ('tools_agricultural','tools', 'معدات زراعية',    'agricultural',         4),
  ('tools_restaurant',  'tools', 'معدات مطاعم',     'restaurant-equipment', 5);

-- ============================================
-- 12. الخدمات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('svc_plumbing',       'services', 'سباكة',          'plumbing',       1),
  ('svc_electrical',     'services', 'كهرباء',         'electrical',     2),
  ('svc_painting',       'services', 'نقاشة',          'painting',       3),
  ('svc_carpentry',      'services', 'نجارة',          'carpentry',      4),
  ('svc_device_repair',  'services', 'صيانة أجهزة',    'device-repair',  5),
  ('svc_moving',         'services', 'نقل أثاث',       'moving',         6),
  ('svc_cleaning',       'services', 'تنظيف',          'cleaning',       7),
  ('svc_tech',           'services', 'خدمات تقنية',    'tech',           8),
  ('svc_tutoring',       'services', 'دروس خصوصية',    'tutoring',       9),
  ('svc_other',          'services', 'خدمات أخرى',     'services-other', 10);
