-- ============================================
-- مكسب (Maksab) — Seed Data Only
-- Use this if tables already exist but data is missing.
-- Paste this into Supabase SQL Editor and click "Run"
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)
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
  ('services',   'الخدمات',           '🛠️', 'services',    12),
  ('computers',  'الكمبيوتر واللابتوب','💻', 'computers',   13),
  ('kids_babies','مستلزمات الأطفال',  '👶', 'kids-babies',  14),
  ('electronics','الإلكترونيات',      '📺', 'electronics',  15),
  ('beauty',     'الجمال والصحة',     '💄', 'beauty',       16)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Subcategories (الأقسام الفرعية)
-- ============================================

-- 1. السيارات
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('cars_passenger',   'cars', 'سيارات ملاكي',  'passenger',   1),
  ('cars_microbus',    'cars', 'ميكروباص',      'microbus',    2),
  ('cars_trucks',      'cars', 'نقل',           'trucks',      3),
  ('cars_motorcycles', 'cars', 'موتوسيكلات',    'motorcycles', 4),
  ('cars_parts',       'cars', 'قطع غيار',      'car-parts',   5)
ON CONFLICT (id) DO NOTHING;

-- 2. العقارات
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('re_apartments_sale', 'real_estate', 'شقق للبيع',     'apartments-sale', 1),
  ('re_apartments_rent', 'real_estate', 'شقق للإيجار',   'apartments-rent', 2),
  ('re_villas',          'real_estate', 'فيلات',          'villas',          3),
  ('re_land',            'real_estate', 'أراضي',          'land',            4),
  ('re_commercial',      'real_estate', 'محلات تجارية',   'commercial',      5),
  ('re_offices',         'real_estate', 'مكاتب',          'offices',         6)
ON CONFLICT (id) DO NOTHING;

-- 3. الموبايلات والتابلت
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('phones_mobile',      'phones', 'موبايلات',    'mobile',           1),
  ('phones_tablet',      'phones', 'تابلت',       'tablet',           2),
  ('phones_accessories', 'phones', 'إكسسوارات',   'phone-accessories', 3),
  ('phones_parts',       'phones', 'قطع غيار',    'phone-parts',      4)
ON CONFLICT (id) DO NOTHING;

-- 4. الموضة
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('fashion_men',         'fashion', 'ملابس رجالي',  'men',                1),
  ('fashion_women',       'fashion', 'ملابس حريمي',  'women',              2),
  ('fashion_kids',        'fashion', 'ملابس أطفال',  'kids',               3),
  ('fashion_shoes',       'fashion', 'أحذية',        'shoes',              4),
  ('fashion_bags',        'fashion', 'شنط',          'bags',               5),
  ('fashion_accessories', 'fashion', 'إكسسوارات',    'fashion-accessories', 6)
ON CONFLICT (id) DO NOTHING;

-- 5. الخردة
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('scrap_iron',         'scrap', 'حديد',          'iron',         1),
  ('scrap_aluminum',     'scrap', 'ألومنيوم',      'aluminum',     2),
  ('scrap_copper',       'scrap', 'نحاس',          'copper',       3),
  ('scrap_plastic',      'scrap', 'بلاستيك',       'plastic',      4),
  ('scrap_paper',        'scrap', 'ورق',           'paper',        5),
  ('scrap_old_devices',  'scrap', 'أجهزة قديمة',   'old-devices',  6),
  ('scrap_construction', 'scrap', 'مخلفات بناء',   'construction', 7),
  ('scrap_other',        'scrap', 'أخرى',          'scrap-other',  8)
ON CONFLICT (id) DO NOTHING;

-- 6. الذهب والفضة
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('gold_items',          'gold', 'ذهب',           'gold-items',      1),
  ('gold_silver',         'gold', 'فضة',           'silver',          2),
  ('gold_diamond',        'gold', 'ألماس',         'diamond',         3),
  ('gold_precious_watch', 'gold', 'ساعات ثمينة',   'precious-watches', 4)
ON CONFLICT (id) DO NOTHING;

-- 7. السلع الفاخرة
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('luxury_bags',       'luxury', 'شنط فاخرة', 'luxury-bags',  1),
  ('luxury_sunglasses', 'luxury', 'نظارات',    'sunglasses',   2),
  ('luxury_watches',    'luxury', 'ساعات',     'watches',      3),
  ('luxury_perfumes',   'luxury', 'عطور',      'perfumes',     4),
  ('luxury_pens',       'luxury', 'أقلام',     'pens',         5)
ON CONFLICT (id) DO NOTHING;

-- 8. الأجهزة المنزلية
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('app_washers',     'appliances', 'غسالات',       'washers',          1),
  ('app_fridges',     'appliances', 'ثلاجات',       'fridges',          2),
  ('app_cookers',     'appliances', 'بوتاجازات',    'cookers',          3),
  ('app_ac',          'appliances', 'مكيفات',       'ac',               4),
  ('app_heaters',     'appliances', 'سخانات',       'heaters',          5),
  ('app_small',       'appliances', 'أجهزة صغيرة',  'small-appliances', 6)
ON CONFLICT (id) DO NOTHING;

-- 9. الأثاث والديكور
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('furn_bedroom',  'furniture', 'غرف نوم',   'bedroom',         1),
  ('furn_dining',   'furniture', 'سفرة',      'dining',          2),
  ('furn_living',   'furniture', 'أنتريه',    'living',          3),
  ('furn_kitchen',  'furniture', 'مطابخ',     'kitchen',         4),
  ('furn_decor',    'furniture', 'ديكورات',   'decor',           5),
  ('furn_lighting', 'furniture', 'إضاءة',     'lighting',        6),
  ('furn_carpets',  'furniture', 'سجاد',      'carpets',         7),
  ('furn_other',    'furniture', 'أخرى',      'furniture-other', 8)
ON CONFLICT (id) DO NOTHING;

-- 10. الهوايات
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('hobby_music',     'hobbies', 'آلات موسيقية',     'music',     1),
  ('hobby_sports',    'hobbies', 'معدات رياضية',     'sports',    2),
  ('hobby_gaming',    'hobbies', 'ألعاب فيديو',      'gaming',    3),
  ('hobby_books',     'hobbies', 'كتب',              'books',     4),
  ('hobby_cameras',   'hobbies', 'كاميرات',          'cameras',   5),
  ('hobby_bikes',     'hobbies', 'دراجات',           'bikes',     6),
  ('hobby_antiques',  'hobbies', 'تحف وأنتيكات',     'antiques',  7),
  ('hobby_pets',      'hobbies', 'حيوانات أليفة',    'pets',      8)
ON CONFLICT (id) DO NOTHING;

-- 11. العدد والأدوات
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('tools_hand',        'tools', 'عدد يدوية',       'hand-tools',           1),
  ('tools_power',       'tools', 'عدد كهربائية',    'power-tools',          2),
  ('tools_workshop',    'tools', 'معدات ورش',       'workshop',             3),
  ('tools_agricultural','tools', 'معدات زراعية',    'agricultural',         4),
  ('tools_restaurant',  'tools', 'معدات مطاعم',     'restaurant-equipment', 5)
ON CONFLICT (id) DO NOTHING;

-- 12. الخدمات
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
  ('svc_other',          'services', 'خدمات أخرى',     'services-other', 10)
ON CONFLICT (id) DO NOTHING;

-- 13. الكمبيوتر واللابتوب
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

-- 14. مستلزمات الأطفال
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

-- 15. الإلكترونيات
INSERT INTO subcategories (id, category_id, name, slug, sort_order) VALUES
  ('elec_tvs',          'electronics', 'تليفزيونات وشاشات',  'tvs',              1),
  ('elec_speakers',     'electronics', 'سماعات وأنظمة صوت',  'speakers',         2),
  ('elec_cameras',      'electronics', 'كاميرات مراقبة',     'security-cameras', 3),
  ('elec_smart',        'electronics', 'أجهزة ذكية',         'smart-home',       4),
  ('elec_projectors',   'electronics', 'بروجكتور',           'projectors',       5),
  ('elec_gaming',       'electronics', 'أجهزة ألعاب',        'gaming-consoles',  6),
  ('elec_other',        'electronics', 'إلكترونيات أخرى',    'electronics-other', 7)
ON CONFLICT (id) DO NOTHING;

-- 16. الجمال والصحة
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
-- Egyptian Governorates (المحافظات)
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES
  (1, 'القاهرة', 'Cairo'),
  (2, 'الجيزة', 'Giza'),
  (3, 'الإسكندرية', 'Alexandria'),
  (4, 'القليوبية', 'Qalyubia'),
  (5, 'الشرقية', 'Sharqia'),
  (6, 'الدقهلية', 'Dakahlia'),
  (7, 'البحيرة', 'Beheira'),
  (8, 'الغربية', 'Gharbia'),
  (9, 'المنوفية', 'Monufia'),
  (10, 'كفر الشيخ', 'Kafr El Sheikh'),
  (11, 'دمياط', 'Damietta'),
  (12, 'بورسعيد', 'Port Said'),
  (13, 'الإسماعيلية', 'Ismailia'),
  (14, 'السويس', 'Suez'),
  (15, 'شمال سيناء', 'North Sinai'),
  (16, 'جنوب سيناء', 'South Sinai'),
  (17, 'الفيوم', 'Fayoum'),
  (18, 'بني سويف', 'Beni Suef'),
  (19, 'المنيا', 'Minya'),
  (20, 'أسيوط', 'Asyut'),
  (21, 'سوهاج', 'Sohag'),
  (22, 'قنا', 'Qena'),
  (23, 'الأقصر', 'Luxor'),
  (24, 'أسوان', 'Aswan'),
  (25, 'البحر الأحمر', 'Red Sea'),
  (26, 'الوادي الجديد', 'New Valley'),
  (27, 'مطروح', 'Matrouh')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- Cities (المدن الرئيسية)
-- ============================================

-- القاهرة
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

-- الجيزة
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

-- الإسكندرية
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

-- القليوبية
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

-- الشرقية
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

-- الدقهلية
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

-- البحيرة
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

-- الغربية
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

-- المنوفية
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

-- كفر الشيخ
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

-- دمياط
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (11, 'دمياط', 'Damietta'),
  (11, 'دمياط الجديدة', 'New Damietta'),
  (11, 'رأس البر', 'Ras El Bar'),
  (11, 'فارسكور', 'Faraskour'),
  (11, 'كفر سعد', 'Kafr Saad'),
  (11, 'الزرقا', 'El Zarqa')
ON CONFLICT DO NOTHING;

-- بورسعيد
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (12, 'بورسعيد', 'Port Said'),
  (12, 'بورفؤاد', 'Port Fouad'),
  (12, 'العرب', 'El Arab'),
  (12, 'الزهور', 'El Zohour'),
  (12, 'الضواحي', 'El Dawahy')
ON CONFLICT DO NOTHING;

-- الإسماعيلية
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (13, 'الإسماعيلية', 'Ismailia'),
  (13, 'فايد', 'Fayed'),
  (13, 'القنطرة شرق', 'El Qantara Sharq'),
  (13, 'القنطرة غرب', 'El Qantara Gharb'),
  (13, 'التل الكبير', 'El Tal El Kebir'),
  (13, 'أبو صوير', 'Abu Suweir')
ON CONFLICT DO NOTHING;

-- السويس
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (14, 'السويس', 'Suez'),
  (14, 'الأربعين', 'El Arbaeen'),
  (14, 'عتاقة', 'Ataka'),
  (14, 'فيصل', 'Faisal'),
  (14, 'الجناين', 'El Ganayen')
ON CONFLICT DO NOTHING;

-- شمال سيناء
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (15, 'العريش', 'El Arish'),
  (15, 'الشيخ زويد', 'Sheikh Zuweid'),
  (15, 'رفح', 'Rafah'),
  (15, 'بئر العبد', 'Bir El Abd'),
  (15, 'الحسنة', 'El Hasana'),
  (15, 'نخل', 'Nakhl')
ON CONFLICT DO NOTHING;

-- جنوب سيناء
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (16, 'الطور', 'El Tur'),
  (16, 'شرم الشيخ', 'Sharm El Sheikh'),
  (16, 'دهب', 'Dahab'),
  (16, 'نويبع', 'Nuweiba'),
  (16, 'طابا', 'Taba'),
  (16, 'سانت كاترين', 'Saint Catherine')
ON CONFLICT DO NOTHING;

-- الفيوم
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (17, 'الفيوم', 'Fayoum'),
  (17, 'الفيوم الجديدة', 'New Fayoum'),
  (17, 'إبشواي', 'Ibsheway'),
  (17, 'طامية', 'Tamiya'),
  (17, 'سنورس', 'Sennoures'),
  (17, 'إطسا', 'Itsa'),
  (17, 'يوسف الصديق', 'Yusuf El Siddiq')
ON CONFLICT DO NOTHING;

-- بني سويف
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (18, 'بني سويف', 'Beni Suef'),
  (18, 'بني سويف الجديدة', 'New Beni Suef'),
  (18, 'الواسطى', 'El Wasta'),
  (18, 'ناصر', 'Nasser'),
  (18, 'إهناسيا', 'Ihnasya'),
  (18, 'ببا', 'Beba'),
  (18, 'الفشن', 'El Fashn')
ON CONFLICT DO NOTHING;

-- المنيا
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

-- أسيوط
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

-- سوهاج
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

-- قنا
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

-- الأقصر
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (23, 'الأقصر', 'Luxor'),
  (23, 'الأقصر الجديدة', 'New Luxor'),
  (23, 'الطود', 'El Tod'),
  (23, 'إسنا', 'Esna'),
  (23, 'أرمنت', 'Armant'),
  (23, 'البياضية', 'El Bayadiya')
ON CONFLICT DO NOTHING;

-- أسوان
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (24, 'أسوان', 'Aswan'),
  (24, 'أسوان الجديدة', 'New Aswan'),
  (24, 'كوم أمبو', 'Kom Ombo'),
  (24, 'إدفو', 'Edfu'),
  (24, 'دراو', 'Daraw'),
  (24, 'نصر النوبة', 'Nasr El Nuba'),
  (24, 'أبو سمبل', 'Abu Simbel')
ON CONFLICT DO NOTHING;

-- البحر الأحمر
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (25, 'الغردقة', 'Hurghada'),
  (25, 'سفاجا', 'Safaga'),
  (25, 'القصير', 'El Quseir'),
  (25, 'مرسى علم', 'Marsa Alam'),
  (25, 'رأس غارب', 'Ras Gharib'),
  (25, 'الجونة', 'El Gouna')
ON CONFLICT DO NOTHING;

-- الوادي الجديد
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (26, 'الخارجة', 'El Kharga'),
  (26, 'الداخلة', 'El Dakhla'),
  (26, 'الفرافرة', 'El Farafra'),
  (26, 'باريس', 'Paris'),
  (26, 'بلاط', 'Balat')
ON CONFLICT DO NOTHING;

-- مطروح
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
-- Verify seed data
-- ============================================
SELECT 'categories' as table_name, count(*) as row_count FROM categories
UNION ALL
SELECT 'subcategories', count(*) FROM subcategories
UNION ALL
SELECT 'governorates', count(*) FROM governorates
UNION ALL
SELECT 'cities', count(*) FROM cities;
