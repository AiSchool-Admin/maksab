-- ============================================
-- Seed Data: Egyptian Governorates & Main Cities
-- 27 محافظة مصرية مع المدن الرئيسية
-- ============================================

-- ============================================
-- 1. القاهرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (1, 'القاهرة', 'Cairo');
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
  (1, 'القاهرة الجديدة', 'New Cairo');

-- ============================================
-- 2. الجيزة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (2, 'الجيزة', 'Giza');
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
  (2, 'كرداسة', 'Kerdasa');

-- ============================================
-- 3. الإسكندرية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (3, 'الإسكندرية', 'Alexandria');
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
  (3, 'برج العرب', 'Borg El Arab');

-- ============================================
-- 4. القليوبية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (4, 'القليوبية', 'Qalyubia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (4, 'بنها', 'Banha'),
  (4, 'شبرا الخيمة', 'Shubra El Kheima'),
  (4, 'قليوب', 'Qalyub'),
  (4, 'القناطر الخيرية', 'El Qanater El Khayriya'),
  (4, 'الخانكة', 'El Khanka'),
  (4, 'كفر شكر', 'Kafr Shokr'),
  (4, 'طوخ', 'Tukh'),
  (4, 'قها', 'Qaha');

-- ============================================
-- 5. الشرقية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (5, 'الشرقية', 'Sharqia');
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
  (5, 'كفر صقر', 'Kafr Saqr');

-- ============================================
-- 6. الدقهلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (6, 'الدقهلية', 'Dakahlia');
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
  (6, 'نبروه', 'Nabaroh');

-- ============================================
-- 7. البحيرة
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (7, 'البحيرة', 'Beheira');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (7, 'دمنهور', 'Damanhour'),
  (7, 'كفر الدوار', 'Kafr El Dawar'),
  (7, 'رشيد', 'Rashid'),
  (7, 'إدكو', 'Edku'),
  (7, 'أبو المطامير', 'Abu El Matamir'),
  (7, 'حوش عيسى', 'Hosh Eisa'),
  (7, 'إيتاي البارود', 'Itay El Barud'),
  (7, 'شبراخيت', 'Shubrakheit');

-- ============================================
-- 8. الغربية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (8, 'الغربية', 'Gharbia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (8, 'طنطا', 'Tanta'),
  (8, 'المحلة الكبرى', 'El Mahalla El Kubra'),
  (8, 'كفر الزيات', 'Kafr El Zayat'),
  (8, 'زفتى', 'Zifta'),
  (8, 'السنطة', 'El Santa'),
  (8, 'سمنود', 'Samannoud'),
  (8, 'بسيون', 'Basyoun'),
  (8, 'قطور', 'Qutur');

-- ============================================
-- 9. المنوفية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (9, 'المنوفية', 'Monufia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (9, 'شبين الكوم', 'Shibin El Kom'),
  (9, 'منوف', 'Menouf'),
  (9, 'السادات', 'El Sadat'),
  (9, 'أشمون', 'Ashmoun'),
  (9, 'الباجور', 'El Bagour'),
  (9, 'قويسنا', 'Quesna'),
  (9, 'بركة السبع', 'Berket El Sabaa'),
  (9, 'تلا', 'Tala');

-- ============================================
-- 10. كفر الشيخ
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (10, 'كفر الشيخ', 'Kafr El Sheikh');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (10, 'كفر الشيخ', 'Kafr El Sheikh'),
  (10, 'دسوق', 'Desouk'),
  (10, 'فوه', 'Fuwwah'),
  (10, 'بيلا', 'Billa'),
  (10, 'الحامول', 'El Hamoul'),
  (10, 'سيدي سالم', 'Sidi Salem'),
  (10, 'البرلس', 'El Burullus'),
  (10, 'مطوبس', 'Mutubas');

-- ============================================
-- 11. الدمياط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (11, 'دمياط', 'Damietta');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (11, 'دمياط', 'Damietta'),
  (11, 'دمياط الجديدة', 'New Damietta'),
  (11, 'رأس البر', 'Ras El Bar'),
  (11, 'فارسكور', 'Faraskour'),
  (11, 'كفر سعد', 'Kafr Saad'),
  (11, 'الزرقا', 'El Zarqa');

-- ============================================
-- 12. بورسعيد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (12, 'بورسعيد', 'Port Said');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (12, 'بورسعيد', 'Port Said'),
  (12, 'بورفؤاد', 'Port Fouad'),
  (12, 'العرب', 'El Arab'),
  (12, 'الزهور', 'El Zohour'),
  (12, 'الضواحي', 'El Dawahy');

-- ============================================
-- 13. الإسماعيلية
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (13, 'الإسماعيلية', 'Ismailia');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (13, 'الإسماعيلية', 'Ismailia'),
  (13, 'فايد', 'Fayed'),
  (13, 'القنطرة شرق', 'El Qantara Sharq'),
  (13, 'القنطرة غرب', 'El Qantara Gharb'),
  (13, 'التل الكبير', 'El Tal El Kebir'),
  (13, 'أبو صوير', 'Abu Suweir');

-- ============================================
-- 14. السويس
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (14, 'السويس', 'Suez');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (14, 'السويس', 'Suez'),
  (14, 'الأربعين', 'El Arbaeen'),
  (14, 'عتاقة', 'Ataka'),
  (14, 'فيصل', 'Faisal'),
  (14, 'الجناين', 'El Ganayen');

-- ============================================
-- 15. شمال سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (15, 'شمال سيناء', 'North Sinai');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (15, 'العريش', 'El Arish'),
  (15, 'الشيخ زويد', 'Sheikh Zuweid'),
  (15, 'رفح', 'Rafah'),
  (15, 'بئر العبد', 'Bir El Abd'),
  (15, 'الحسنة', 'El Hasana'),
  (15, 'نخل', 'Nakhl');

-- ============================================
-- 16. جنوب سيناء
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (16, 'جنوب سيناء', 'South Sinai');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (16, 'الطور', 'El Tur'),
  (16, 'شرم الشيخ', 'Sharm El Sheikh'),
  (16, 'دهب', 'Dahab'),
  (16, 'نويبع', 'Nuweiba'),
  (16, 'طابا', 'Taba'),
  (16, 'سانت كاترين', 'Saint Catherine');

-- ============================================
-- 17. الفيوم
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (17, 'الفيوم', 'Fayoum');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (17, 'الفيوم', 'Fayoum'),
  (17, 'الفيوم الجديدة', 'New Fayoum'),
  (17, 'إبشواي', 'Ibsheway'),
  (17, 'طامية', 'Tamiya'),
  (17, 'سنورس', 'Sennoures'),
  (17, 'إطسا', 'Itsa'),
  (17, 'يوسف الصديق', 'Yusuf El Siddiq');

-- ============================================
-- 18. بني سويف
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (18, 'بني سويف', 'Beni Suef');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (18, 'بني سويف', 'Beni Suef'),
  (18, 'بني سويف الجديدة', 'New Beni Suef'),
  (18, 'الواسطى', 'El Wasta'),
  (18, 'ناصر', 'Nasser'),
  (18, 'إهناسيا', 'Ihnasya'),
  (18, 'ببا', 'Beba'),
  (18, 'الفشن', 'El Fashn');

-- ============================================
-- 19. المنيا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (19, 'المنيا', 'Minya');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (19, 'المنيا', 'Minya'),
  (19, 'المنيا الجديدة', 'New Minya'),
  (19, 'ملوي', 'Mallawi'),
  (19, 'سمالوط', 'Samalut'),
  (19, 'أبو قرقاص', 'Abu Qurqas'),
  (19, 'مغاغة', 'Maghagha'),
  (19, 'بني مزار', 'Beni Mazar'),
  (19, 'ديرمواس', 'Deir Mawas'),
  (19, 'العدوة', 'El Edwa');

-- ============================================
-- 20. أسيوط
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (20, 'أسيوط', 'Asyut');
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
  (20, 'البداري', 'El Badari');

-- ============================================
-- 21. سوهاج
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (21, 'سوهاج', 'Sohag');
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
  (21, 'دار السلام', 'Dar El Salam');

-- ============================================
-- 22. قنا
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (22, 'قنا', 'Qena');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (22, 'قنا', 'Qena'),
  (22, 'قنا الجديدة', 'New Qena'),
  (22, 'نجع حمادي', 'Nag Hammadi'),
  (22, 'دشنا', 'Dishna'),
  (22, 'قفط', 'Qift'),
  (22, 'قوص', 'Qus'),
  (22, 'نقادة', 'Naqada'),
  (22, 'فرشوط', 'Farshut'),
  (22, 'أبو تشت', 'Abu Tesht');

-- ============================================
-- 23. الأقصر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (23, 'الأقصر', 'Luxor');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (23, 'الأقصر', 'Luxor'),
  (23, 'الأقصر الجديدة', 'New Luxor'),
  (23, 'الطود', 'El Tod'),
  (23, 'إسنا', 'Esna'),
  (23, 'أرمنت', 'Armant'),
  (23, 'البياضية', 'El Bayadiya');

-- ============================================
-- 24. أسوان
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (24, 'أسوان', 'Aswan');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (24, 'أسوان', 'Aswan'),
  (24, 'أسوان الجديدة', 'New Aswan'),
  (24, 'كوم أمبو', 'Kom Ombo'),
  (24, 'إدفو', 'Edfu'),
  (24, 'دراو', 'Daraw'),
  (24, 'نصر النوبة', 'Nasr El Nuba'),
  (24, 'أبو سمبل', 'Abu Simbel');

-- ============================================
-- 25. البحر الأحمر
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (25, 'البحر الأحمر', 'Red Sea');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (25, 'الغردقة', 'Hurghada'),
  (25, 'سفاجا', 'Safaga'),
  (25, 'القصير', 'El Quseir'),
  (25, 'مرسى علم', 'Marsa Alam'),
  (25, 'رأس غارب', 'Ras Gharib'),
  (25, 'الجونة', 'El Gouna');

-- ============================================
-- 26. الوادي الجديد
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (26, 'الوادي الجديد', 'New Valley');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (26, 'الخارجة', 'El Kharga'),
  (26, 'الداخلة', 'El Dakhla'),
  (26, 'الفرافرة', 'El Farafra'),
  (26, 'باريس', 'Paris'),
  (26, 'بلاط', 'Balat');

-- ============================================
-- 27. مطروح
-- ============================================
INSERT INTO governorates (id, name, name_en) VALUES (27, 'مطروح', 'Matrouh');
INSERT INTO cities (governorate_id, name, name_en) VALUES
  (27, 'مرسى مطروح', 'Marsa Matrouh'),
  (27, 'العلمين', 'El Alamein'),
  (27, 'العلمين الجديدة', 'New Alamein'),
  (27, 'الحمام', 'El Hammam'),
  (27, 'الضبعة', 'El Dabaa'),
  (27, 'سيدي براني', 'Sidi Barani'),
  (27, 'سيوة', 'Siwa'),
  (27, 'الساحل الشمالي', 'North Coast');
