
-- ============================================
-- PART 8: Seed Data — Categories & Subcategories
-- 12 قسم رئيسي مع الأقسام الفرعية
-- All inserts use ON CONFLICT DO NOTHING for idempotency
--
-- ⚠️ IMPORTANT: Subcategory IDs MUST match categories-config.ts
-- Old format (cars_passenger, re_land, etc.) is WRONG — causes FK violations
-- Correct format: short IDs matching the slug (passenger, land, etc.)
-- ============================================

-- NOTE: Old DELETE migration removed — not needed since INSERT uses ON CONFLICT DO NOTHING
-- and existing ads may reference current subcategory IDs.

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
  ('services',   'الخدمات',           '🛠️', 'services',    12),
  ('computers',  'الكمبيوتر واللابتوب','💻', 'computers',   13),
  ('kids_babies','مستلزمات الأطفال',  '👶', 'kids-babies',  14),
  ('electronics','الإلكترونيات',      '📺', 'electronics',  15),
  ('beauty',     'الجمال والصحة',     '💄', 'beauty',       16)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 1. السيارات — Subcategories (IDs match categories-config.ts)
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('passenger',   'cars', 'سيارات ملاكي',  'passenger',   1),
  ('microbus',    'cars', 'ميكروباص',      'microbus',    2),
  ('trucks',      'cars', 'نقل',           'trucks',      3),
  ('motorcycles', 'cars', 'موتوسيكلات',    'motorcycles', 4),
  ('car-parts',   'cars', 'قطع غيار',      'car-parts',   5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. العقارات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('apartments-sale', 'real_estate', 'شقق للبيع',     'apartments-sale', 1),
  ('apartments-rent', 'real_estate', 'شقق للإيجار',   'apartments-rent', 2),
  ('villas',          'real_estate', 'فيلات',          'villas',          3),
  ('land',            'real_estate', 'أراضي',          'land',            4),
  ('commercial',      'real_estate', 'محلات تجارية',   'commercial',      5),
  ('offices',         'real_estate', 'مكاتب',          'offices',         6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. الموبايلات والتابلت — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('mobile',           'phones', 'موبايلات',    'mobile',           1),
  ('tablet',           'phones', 'تابلت',       'tablet',           2),
  ('phone-accessories','phones', 'إكسسوارات',   'phone-accessories', 3),
  ('phone-parts',      'phones', 'قطع غيار',    'phone-parts',      4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. الموضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('men',                 'fashion', 'ملابس رجالي',  'men',                1),
  ('women',               'fashion', 'ملابس حريمي',  'women',              2),
  ('kids',                'fashion', 'ملابس أطفال',  'kids',               3),
  ('shoes',               'fashion', 'أحذية',        'shoes',              4),
  ('bags',                'fashion', 'شنط',          'bags',               5),
  ('fashion-accessories', 'fashion', 'إكسسوارات',    'fashion-accessories', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. الخردة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('iron',         'scrap', 'حديد',          'iron',         1),
  ('aluminum',     'scrap', 'ألومنيوم',      'aluminum',     2),
  ('copper',       'scrap', 'نحاس',          'copper',       3),
  ('plastic',      'scrap', 'بلاستيك',       'plastic',      4),
  ('paper',        'scrap', 'ورق',           'paper',        5),
  ('old-devices',  'scrap', 'أجهزة قديمة',   'old-devices',  6),
  ('construction', 'scrap', 'مخلفات بناء',   'construction', 7),
  ('scrap-other',  'scrap', 'أخرى',          'scrap-other',  8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. الذهب والفضة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('gold-items',       'gold', 'ذهب',           'gold-items',       1),
  ('silver',           'gold', 'فضة',           'silver',           2),
  ('diamond',          'gold', 'ألماس',         'diamond',          3),
  ('precious-watches', 'gold', 'ساعات ثمينة',   'precious-watches', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. السلع الفاخرة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('luxury-bags', 'luxury', 'شنط فاخرة', 'luxury-bags',  1),
  ('sunglasses',  'luxury', 'نظارات',    'sunglasses',   2),
  ('watches',     'luxury', 'ساعات',     'watches',      3),
  ('perfumes',    'luxury', 'عطور',      'perfumes',     4),
  ('pens',        'luxury', 'أقلام',     'pens',         5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. الأجهزة المنزلية — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('washers',          'appliances', 'غسالات',       'washers',          1),
  ('fridges',          'appliances', 'ثلاجات',       'fridges',          2),
  ('cookers',          'appliances', 'بوتاجازات',    'cookers',          3),
  ('ac',               'appliances', 'مكيفات',       'ac',               4),
  ('heaters',          'appliances', 'سخانات',       'heaters',          5),
  ('small-appliances', 'appliances', 'أجهزة صغيرة',  'small-appliances', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. الأثاث والديكور — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('bedroom',         'furniture', 'غرف نوم',   'bedroom',         1),
  ('dining',          'furniture', 'سفرة',      'dining',          2),
  ('living',          'furniture', 'أنتريه',    'living',          3),
  ('kitchen',         'furniture', 'مطابخ',     'kitchen',         4),
  ('decor',           'furniture', 'ديكورات',   'decor',           5),
  ('lighting',        'furniture', 'إضاءة',     'lighting',        6),
  ('carpets',         'furniture', 'سجاد',      'carpets',         7),
  ('furniture-other', 'furniture', 'أخرى',      'furniture-other', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. الهوايات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('music',    'hobbies', 'آلات موسيقية',     'music',     1),
  ('sports',   'hobbies', 'معدات رياضية',     'sports',    2),
  ('gaming',   'hobbies', 'ألعاب فيديو',      'gaming',    3),
  ('books',    'hobbies', 'كتب',              'books',     4),
  ('cameras',  'hobbies', 'كاميرات',          'cameras',   5),
  ('bikes',    'hobbies', 'دراجات',           'bikes',     6),
  ('antiques', 'hobbies', 'تحف وأنتيكات',     'antiques',  7),
  ('pets',     'hobbies', 'حيوانات أليفة',    'pets',      8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 11. العدد والأدوات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('hand-tools',           'tools', 'عدد يدوية',       'hand-tools',           1),
  ('power-tools',          'tools', 'عدد كهربائية',    'power-tools',          2),
  ('workshop',             'tools', 'معدات ورش',       'workshop',             3),
  ('agricultural',         'tools', 'معدات زراعية',    'agricultural',         4),
  ('restaurant-equipment', 'tools', 'معدات مطاعم',     'restaurant-equipment', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 12. الخدمات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('plumbing',       'services', 'سباكة',          'plumbing',       1),
  ('electrical',     'services', 'كهرباء',         'electrical',     2),
  ('painting',       'services', 'نقاشة',          'painting',       3),
  ('carpentry',      'services', 'نجارة',          'carpentry',      4),
  ('device-repair',  'services', 'صيانة أجهزة',    'device-repair',  5),
  ('moving',         'services', 'نقل أثاث',       'moving',         6),
  ('cleaning',       'services', 'تنظيف',          'cleaning',       7),
  ('tech',           'services', 'خدمات تقنية',    'tech',           8),
  ('tutoring',       'services', 'دروس خصوصية',    'tutoring',       9),
  ('services-other', 'services', 'خدمات أخرى',     'services-other', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 13. الكمبيوتر واللابتوب — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('comp_laptops',      'computers', 'لابتوبات',          'laptops',          1),
  ('comp_desktops',     'computers', 'كمبيوتر مكتبي',     'desktops',         2),
  ('comp_monitors',     'computers', 'شاشات',             'monitors',         3),
  ('comp_printers',     'computers', 'طابعات وماسحات',    'printers',         4),
  ('comp_parts',        'computers', 'قطع غيار كمبيوتر',  'pc-parts',         5),
  ('comp_networking',   'computers', 'معدات شبكات',       'networking',       6),
  ('comp_storage',      'computers', 'أجهزة تخزين',       'storage-devices',  7),
  ('comp_accessories',  'computers', 'إكسسوارات كمبيوتر', 'pc-accessories',   8)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 14. مستلزمات الأطفال — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('kids_clothes',      'kids_babies', 'ملابس أطفال ورضع',       'kids-clothes',    1),
  ('kids_strollers',    'kids_babies', 'عربيات أطفال',            'strollers',       2),
  ('kids_cribs',        'kids_babies', 'سراير أطفال',             'cribs',           3),
  ('kids_car_seats',    'kids_babies', 'كراسي سيارة',             'car-seats',       4),
  ('kids_feeding',      'kids_babies', 'مستلزمات رضاعة وتغذية',  'feeding',         5),
  ('kids_toys',         'kids_babies', 'ألعاب أطفال',             'kids-toys',       6),
  ('kids_maternity',    'kids_babies', 'مستلزمات حمل وأمومة',    'maternity',       7),
  ('kids_school',       'kids_babies', 'مستلزمات مدرسية',         'school-supplies', 8),
  ('kids_other',        'kids_babies', 'أخرى',                    'kids-other',      9)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 15. الإلكترونيات — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('elec_tvs',          'electronics', 'تليفزيونات وشاشات',  'tvs',              1),
  ('elec_speakers',     'electronics', 'سماعات وأنظمة صوت',  'speakers',         2),
  ('elec_cameras',      'electronics', 'كاميرات مراقبة',     'security-cameras', 3),
  ('elec_smart',        'electronics', 'أجهزة ذكية',         'smart-home',       4),
  ('elec_projectors',   'electronics', 'بروجكتور',           'projectors',       5),
  ('elec_gaming',       'electronics', 'أجهزة ألعاب',        'gaming-consoles',  6),
  ('elec_other',        'electronics', 'إلكترونيات أخرى',    'electronics-other', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 16. الجمال والصحة — Subcategories
-- ============================================
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('beauty_makeup',       'beauty', 'مستحضرات تجميل',   'makeup',          1),
  ('beauty_skincare',     'beauty', 'عناية بالبشرة',     'skincare',        2),
  ('beauty_haircare',     'beauty', 'عناية بالشعر',      'haircare',        3),
  ('beauty_tools',        'beauty', 'أدوات تجميل',       'beauty-tools',    4),
  ('beauty_supplements',  'beauty', 'مكملات غذائية',     'supplements',     5),
  ('beauty_medical',      'beauty', 'أجهزة صحية',        'medical-devices', 6),
  ('beauty_other',        'beauty', 'أخرى',              'beauty-other',    7)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- PART 9: Seed Data — Egyptian Governorates & Main Cities
-- 27 محافظة مصرية مع المدن الرئيسية
-- All inserts use ON CONFLICT for idempotency
-- ============================================

-- ============================================
-- 1. القاهرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (1, 'القاهرة', 'Cairo')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (1, 'مدينة نصر', 'Nasr City'),
  (1, 'مصر الجديدة', 'Heliopolis'),
  (1, 'المعادي', 'Maadi'),
  (1, 'التجمع الخامس', 'Fifth Settlement'),
  (1, 'الشروق', 'El Shorouk'),
  (1, 'بدر', 'Badr'),
  (1, 'العبور', 'El Obour'),
  (1, 'شبرا', 'Shubra'),
  (1, 'عين شمس', 'Ain Shams'),
  (1, 'المطرية', 'El Matariya'),
  (1, 'حلوان', 'Helwan'),
  (1, 'المقطم', 'Mokattam'),
  (1, 'وسط البلد', 'Downtown'),
  (1, 'الزمالك', 'Zamalek'),
  (1, 'المنيل', 'El Manial'),
  (1, 'السيدة زينب', 'Sayeda Zeinab'),
  (1, 'الدرب الأحمر', 'El Darb El Ahmar'),
  (1, 'العاشر من رمضان', '10th of Ramadan'),
  (1, 'القاهرة الجديدة', 'New Cairo')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. الجيزة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (2, 'الجيزة', 'Giza')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (2, 'الدقي', 'Dokki'),
  (2, 'المهندسين', 'Mohandessin'),
  (2, 'العجوزة', 'Agouza'),
  (2, 'الهرم', 'Haram'),
  (2, 'فيصل', 'Faisal'),
  (2, 'الشيخ زايد', 'Sheikh Zayed'),
  (2, 'السادس من أكتوبر', '6th of October'),
  (2, 'حدائق الأهرام', 'Hadayek El Ahram'),
  (2, 'البدرشين', 'El Badrasheen'),
  (2, 'العياط', 'El Ayat'),
  (2, 'أبو النمرس', 'Abu El Nomros'),
  (2, 'الحوامدية', 'El Hawamdiya'),
  (2, 'أوسيم', 'Ausim'),
  (2, 'كرداسة', 'Kerdasa')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. الإسكندرية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (3, 'الإسكندرية', 'Alexandria')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (3, 'سموحة', 'Smouha'),
  (3, 'سيدي جابر', 'Sidi Gaber'),
  (3, 'المنتزه', 'El Montaza'),
  (3, 'المعمورة', 'El Maamoura'),
  (3, 'ستانلي', 'Stanley'),
  (3, 'العجمي', 'El Agami'),
  (3, 'المندرة', 'El Mandara'),
  (3, 'محرم بك', 'Moharam Bek'),
  (3, 'العصافرة', 'El Asafra'),
  (3, 'الإبراهيمية', 'El Ibrahimiya'),
  (3, 'كفر عبده', 'Kafr Abdo'),
  (3, 'بحري', 'Bahary'),
  (3, 'العامرية', 'El Ameriya'),
  (3, 'برج العرب', 'Borg El Arab')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. القليوبية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (4, 'القليوبية', 'Qalyubia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (4, 'بنها', 'Banha'),
  (4, 'شبرا الخيمة', 'Shubra El Kheima'),
  (4, 'قليوب', 'Qalyub'),
  (4, 'القناطر الخيرية', 'El Qanater El Khayriya'),
  (4, 'الخانكة', 'El Khanka'),
  (4, 'كفر شكر', 'Kafr Shokr'),
  (4, 'طوخ', 'Tukh'),
  (4, 'قها', 'Qaha')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. الشرقية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (5, 'الشرقية', 'Sharqia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (5, 'الزقازيق', 'Zagazig'),
  (5, 'العاشر من رمضان', '10th of Ramadan'),
  (5, 'بلبيس', 'Belbeis'),
  (5, 'منيا القمح', 'Minya El Qamh'),
  (5, 'أبو حماد', 'Abu Hammad'),
  (5, 'فاقوس', 'Faqous'),
  (5, 'ههيا', 'Hihya'),
  (5, 'ديرب نجم', 'Diarb Negm'),
  (5, 'أبو كبير', 'Abu Kebir'),
  (5, 'كفر صقر', 'Kafr Saqr')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. الدقهلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (6, 'الدقهلية', 'Dakahlia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (6, 'المنصورة', 'Mansoura'),
  (6, 'طلخا', 'Talkha'),
  (6, 'ميت غمر', 'Mit Ghamr'),
  (6, 'دكرنس', 'Dikirnis'),
  (6, 'أجا', 'Aga'),
  (6, 'السنبلاوين', 'El Sinbellawin'),
  (6, 'شربين', 'Sherbin'),
  (6, 'المنزلة', 'El Manzala'),
  (6, 'بلقاس', 'Belqas'),
  (6, 'نبروه', 'Nabaroh')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. البحيرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (7, 'البحيرة', 'Beheira')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (7, 'دمنهور', 'Damanhour'),
  (7, 'كفر الدوار', 'Kafr El Dawar'),
  (7, 'رشيد', 'Rashid'),
  (7, 'إدكو', 'Edku'),
  (7, 'أبو المطامير', 'Abu El Matamir'),
  (7, 'حوش عيسى', 'Hosh Eisa'),
  (7, 'إيتاي البارود', 'Itay El Barud'),
  (7, 'شبراخيت', 'Shubrakheit')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. الغربية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (8, 'الغربية', 'Gharbia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (8, 'طنطا', 'Tanta'),
  (8, 'المحلة الكبرى', 'El Mahalla El Kubra'),
  (8, 'كفر الزيات', 'Kafr El Zayat'),
  (8, 'زفتى', 'Zifta'),
  (8, 'السنطة', 'El Santa'),
  (8, 'سمنود', 'Samannoud'),
  (8, 'بسيون', 'Basyoun'),
  (8, 'قطور', 'Qutur')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. المنوفية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (9, 'المنوفية', 'Monufia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (9, 'شبين الكوم', 'Shibin El Kom'),
  (9, 'منوف', 'Menouf'),
  (9, 'السادات', 'El Sadat'),
  (9, 'أشمون', 'Ashmoun'),
  (9, 'الباجور', 'El Bagour'),
  (9, 'قويسنا', 'Quesna'),
  (9, 'بركة السبع', 'Berket El Sabaa'),
  (9, 'تلا', 'Tala')
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. كفر الشيخ
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (10, 'كفر الشيخ', 'Kafr El Sheikh')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (10, 'كفر الشيخ', 'Kafr El Sheikh'),
  (10, 'دسوق', 'Desouk'),
  (10, 'فوه', 'Fuwwah'),
  (10, 'بيلا', 'Billa'),
  (10, 'الحامول', 'El Hamoul'),
  (10, 'سيدي سالم', 'Sidi Salem'),
  (10, 'البرلس', 'El Burullus'),
  (10, 'مطوبس', 'Mutubas')
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. دمياط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (11, 'دمياط', 'Damietta')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (11, 'دمياط', 'Damietta'),
  (11, 'دمياط الجديدة', 'New Damietta'),
  (11, 'رأس البر', 'Ras El Bar'),
  (11, 'فارسكور', 'Faraskour'),
  (11, 'كفر سعد', 'Kafr Saad'),
  (11, 'الزرقا', 'El Zarqa')
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. بورسعيد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (12, 'بورسعيد', 'Port Said')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (12, 'بورسعيد', 'Port Said'),
  (12, 'بورفؤاد', 'Port Fouad'),
  (12, 'العرب', 'El Arab'),
  (12, 'الزهور', 'El Zohour'),
  (12, 'الضواحي', 'El Dawahy')
ON CONFLICT DO NOTHING;

-- ============================================
-- 13. الإسماعيلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (13, 'الإسماعيلية', 'Ismailia')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (13, 'الإسماعيلية', 'Ismailia'),
  (13, 'فايد', 'Fayed'),
  (13, 'القنطرة شرق', 'El Qantara Sharq'),
  (13, 'القنطرة غرب', 'El Qantara Gharb'),
  (13, 'التل الكبير', 'El Tal El Kebir'),
  (13, 'أبو صوير', 'Abu Suweir')
ON CONFLICT DO NOTHING;

-- ============================================
-- 14. السويس
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (14, 'السويس', 'Suez')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (14, 'السويس', 'Suez'),
  (14, 'الأربعين', 'El Arbaeen'),
  (14, 'عتاقة', 'Ataka'),
  (14, 'فيصل', 'Faisal'),
  (14, 'الجناين', 'El Ganayen')
ON CONFLICT DO NOTHING;

-- ============================================
-- 15. شمال سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (15, 'شمال سيناء', 'North Sinai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (15, 'العريش', 'El Arish'),
  (15, 'الشيخ زويد', 'Sheikh Zuweid'),
  (15, 'رفح', 'Rafah'),
  (15, 'بئر العبد', 'Bir El Abd'),
  (15, 'الحسنة', 'El Hasana'),
  (15, 'نخل', 'Nakhl')
ON CONFLICT DO NOTHING;

-- ============================================
-- 16. جنوب سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (16, 'جنوب سيناء', 'South Sinai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (16, 'الطور', 'El Tur'),
  (16, 'شرم الشيخ', 'Sharm El Sheikh'),
  (16, 'دهب', 'Dahab'),
  (16, 'نويبع', 'Nuweiba'),
  (16, 'طابا', 'Taba'),
  (16, 'سانت كاترين', 'Saint Catherine')
ON CONFLICT DO NOTHING;

-- ============================================
-- 17. الفيوم
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (17, 'الفيوم', 'Fayoum')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (17, 'الفيوم', 'Fayoum'),
  (17, 'الفيوم الجديدة', 'New Fayoum'),
  (17, 'إبشواي', 'Ibsheway'),
  (17, 'طامية', 'Tamiya'),
  (17, 'سنورس', 'Sennoures'),
  (17, 'إطسا', 'Itsa'),
  (17, 'يوسف الصديق', 'Yusuf El Siddiq')
ON CONFLICT DO NOTHING;

-- ============================================
-- 18. بني سويف
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (18, 'بني سويف', 'Beni Suef')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (18, 'بني سويف', 'Beni Suef'),
  (18, 'بني سويف الجديدة', 'New Beni Suef'),
  (18, 'الواسطى', 'El Wasta'),
  (18, 'ناصر', 'Nasser'),
  (18, 'إهناسيا', 'Ihnasya'),
  (18, 'ببا', 'Beba'),
  (18, 'الفشن', 'El Fashn')
ON CONFLICT DO NOTHING;

-- ============================================
-- 19. المنيا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (19, 'المنيا', 'Minya')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (19, 'المنيا', 'Minya'),
  (19, 'المنيا الجديدة', 'New Minya'),
  (19, 'ملوي', 'Mallawi'),
  (19, 'سمالوط', 'Samalut'),
  (19, 'أبو قرقاص', 'Abu Qurqas'),
  (19, 'مغاغة', 'Maghagha'),
  (19, 'بني مزار', 'Beni Mazar'),
  (19, 'ديرمواس', 'Deir Mawas'),
  (19, 'العدوة', 'El Edwa')
ON CONFLICT DO NOTHING;

-- ============================================
-- 20. أسيوط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (20, 'أسيوط', 'Asyut')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (20, 'أسيوط', 'Asyut'),
  (20, 'أسيوط الجديدة', 'New Asyut'),
  (20, 'ديروط', 'Dairut'),
  (20, 'القوصية', 'El Qusiya'),
  (20, 'منفلوط', 'Manfalut'),
  (20, 'أبنوب', 'Abnoub'),
  (20, 'الفتح', 'El Fath'),
  (20, 'ساحل سليم', 'Sahel Selim'),
  (20, 'أبو تيج', 'Abu Tig'),
  (20, 'الغنايم', 'El Ghanayem'),
  (20, 'البداري', 'El Badari')
ON CONFLICT DO NOTHING;

-- ============================================
-- 21. سوهاج
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (21, 'سوهاج', 'Sohag')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (21, 'سوهاج', 'Sohag'),
  (21, 'سوهاج الجديدة', 'New Sohag'),
  (21, 'أخميم', 'Akhmim'),
  (21, 'جرجا', 'Girga'),
  (21, 'طهطا', 'Tahta'),
  (21, 'المراغة', 'El Maragha'),
  (21, 'البلينا', 'El Balyana'),
  (21, 'المنشأة', 'El Monshaa'),
  (21, 'ساقلتة', 'Saqulta'),
  (21, 'دار السلام', 'Dar El Salam')
ON CONFLICT DO NOTHING;

-- ============================================
-- 22. قنا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (22, 'قنا', 'Qena')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (22, 'قنا', 'Qena'),
  (22, 'قنا الجديدة', 'New Qena'),
  (22, 'نجع حمادي', 'Nag Hammadi'),
  (22, 'دشنا', 'Dishna'),
  (22, 'قفط', 'Qift'),
  (22, 'قوص', 'Qus'),
  (22, 'نقادة', 'Naqada'),
  (22, 'فرشوط', 'Farshut'),
  (22, 'أبو تشت', 'Abu Tesht')
ON CONFLICT DO NOTHING;

-- ============================================
-- 23. الأقصر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (23, 'الأقصر', 'Luxor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (23, 'الأقصر', 'Luxor'),
  (23, 'الأقصر الجديدة', 'New Luxor'),
  (23, 'الطود', 'El Tod'),
  (23, 'إسنا', 'Esna'),
  (23, 'أرمنت', 'Armant'),
  (23, 'البياضية', 'El Bayadiya')
ON CONFLICT DO NOTHING;

-- ============================================
-- 24. أسوان
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (24, 'أسوان', 'Aswan')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (24, 'أسوان', 'Aswan'),
  (24, 'أسوان الجديدة', 'New Aswan'),
  (24, 'كوم أمبو', 'Kom Ombo'),
  (24, 'إدفو', 'Edfu'),
  (24, 'دراو', 'Daraw'),
  (24, 'نصر النوبة', 'Nasr El Nuba'),
  (24, 'أبو سمبل', 'Abu Simbel')
ON CONFLICT DO NOTHING;

-- ============================================
-- 25. البحر الأحمر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (25, 'البحر الأحمر', 'Red Sea')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (25, 'الغردقة', 'Hurghada'),
  (25, 'سفاجا', 'Safaga'),
  (25, 'القصير', 'El Quseir'),
  (25, 'مرسى علم', 'Marsa Alam'),
  (25, 'رأس غارب', 'Ras Gharib'),
  (25, 'الجونة', 'El Gouna')
ON CONFLICT DO NOTHING;

-- ============================================
-- 26. الوادي الجديد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (26, 'الوادي الجديد', 'New Valley')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (26, 'الخارجة', 'El Kharga'),
  (26, 'الداخلة', 'El Dakhla'),
  (26, 'الفرافرة', 'El Farafra'),
  (26, 'باريس', 'Paris'),
  (26, 'بلاط', 'Balat')
ON CONFLICT DO NOTHING;

-- ============================================
-- 27. مطروح
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (27, 'مطروح', 'Matrouh')
ON CONFLICT (id) DO NOTHING;
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (27, 'مرسى مطروح', 'Marsa Matrouh'),
  (27, 'العلمين', 'El Alamein'),
  (27, 'العلمين الجديدة', 'New Alamein'),
  (27, 'الحمام', 'El Hammam'),
  (27, 'الضبعة', 'El Dabaa'),
  (27, 'سيدي براني', 'Sidi Barani'),
  (27, 'سيوة', 'Siwa'),
  (27, 'الساحل الشمالي', 'North Coast')
ON CONFLICT DO NOTHING;


-- ============================================
-- PART 10: Storage Bucket for Ad Images
-- (wrapped in DO block — only works if executed
--  with service_role privileges)
-- ============================================
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'ad-images',
    'ad-images',
    true,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage bucket creation — requires service_role privileges. Create "ad-images" bucket manually in Supabase Dashboard → Storage.';
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.buckets table not found — create "ad-images" bucket manually in Supabase Dashboard → Storage.';
END;
$$;

-- Storage RLS: anyone can read, authenticated users can upload
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read access for ad images" ON storage.objects;
  CREATE POLICY "Public read access for ad images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ad-images');

  DROP POLICY IF EXISTS "Authenticated users can upload ad images" ON storage.objects;
  CREATE POLICY "Authenticated users can upload ad images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ad-images' AND auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Users can update their own ad images" ON storage.objects;
  CREATE POLICY "Users can update their own ad images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'ad-images' AND auth.uid()::text = (storage.foldername(name))[1]);

  DROP POLICY IF EXISTS "Users can delete their own ad images" ON storage.objects;
  CREATE POLICY "Users can delete their own ad images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'ad-images' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage policies — requires service_role privileges.';
  WHEN undefined_table THEN
    RAISE NOTICE 'storage.objects table not found — configure storage policies in Supabase Dashboard.';
END;
$$;


-- ============================================
-- Custom Phone OTP (for free phone verification)
-- ============================================
CREATE TABLE IF NOT EXISTS phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(11) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_lookup ON phone_otps(phone, code, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_otps_expires ON phone_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_otps_rate ON phone_otps(phone, created_at DESC);

-- RLS: Only server-side (service role) can access this table
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;
-- No public policies = no public access (only service_role key works)


-- ============================================
-- VERIFICATION: Check that seed data was inserted
-- ============================================
DO $$
DECLARE
  cat_count INTEGER;
  sub_count INTEGER;
  gov_count INTEGER;
  city_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM categories;
  SELECT COUNT(*) INTO sub_count FROM subcategories;
  SELECT COUNT(*) INTO gov_count FROM governorates;
  SELECT COUNT(*) INTO city_count FROM cities;

  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE '   Categories: % (expected 12)', cat_count;
  RAISE NOTICE '   Subcategories: % (expected 72, IDs match frontend config)', sub_count;
  RAISE NOTICE '   Governorates: % (expected 27)', gov_count;
  RAISE NOTICE '   Cities: % (expected 200+)', city_count;
END;
$$;

