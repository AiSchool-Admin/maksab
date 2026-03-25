-- ══════════════════════════════════════════════
-- Migration 00086: Normalize Alexandria district names in ahe_listings
-- توحيد أسماء أحياء الإسكندرية (إنجليزي → عربي)
-- ══════════════════════════════════════════════

UPDATE ahe_listings SET city = 'سموحة' WHERE city IN ('smoha', 'smouha') AND city != 'سموحة';
UPDATE ahe_listings SET city = 'سيدي بشر' WHERE city IN ('sidi_beshr', 'sidi beshr') AND city != 'سيدي بشر';
UPDATE ahe_listings SET city = 'ميامي' WHERE city IN ('miami') AND city != 'ميامي';
UPDATE ahe_listings SET city = 'المندرة' WHERE city IN ('mandara', 'al_mandara') AND city != 'المندرة';
UPDATE ahe_listings SET city = 'جليم' WHERE city IN ('glim') AND city != 'جليم';
UPDATE ahe_listings SET city = 'السيوف' WHERE city IN ('seyouf', 'al_seyouf') AND city != 'السيوف';
UPDATE ahe_listings SET city = 'العصافرة' WHERE city IN ('asafra', 'al_asafra') AND city != 'العصافرة';
UPDATE ahe_listings SET city = 'محرم بك' WHERE city IN ('moharam_bik', 'moharam_bek', 'محرم بيك') AND city != 'محرم بك';
UPDATE ahe_listings SET city = 'سيدي جابر' WHERE city IN ('sidi_gaber') AND city != 'سيدي جابر';
UPDATE ahe_listings SET city = 'كفر عبده' WHERE city IN ('kafr_abdo', 'kafr_abdu') AND city != 'كفر عبده';
UPDATE ahe_listings SET city = 'وابور المياه' WHERE city IN ('wabour_elmoya', 'wabour_almiyah') AND city != 'وابور المياه';
UPDATE ahe_listings SET city = 'كامب شيزار' WHERE city IN ('camp_caesar', 'camp_shezar') AND city != 'كامب شيزار';
UPDATE ahe_listings SET city = 'سان ستيفانو' WHERE city IN ('san_stefano') AND city != 'سان ستيفانو';
UPDATE ahe_listings SET city = 'المنتزه' WHERE city IN ('montaza') AND city != 'المنتزه';
UPDATE ahe_listings SET city = 'المعمورة' WHERE city IN ('mamoura') AND city != 'المعمورة';
UPDATE ahe_listings SET city = 'ستانلي' WHERE city IN ('stanley') AND city != 'ستانلي';
UPDATE ahe_listings SET city = 'العجمي' WHERE city IN ('agami') AND city != 'العجمي';
UPDATE ahe_listings SET city = 'العامرية' WHERE city IN ('amreya') AND city != 'العامرية';
UPDATE ahe_listings SET city = 'برج العرب' WHERE city IN ('borg_alarab') AND city != 'برج العرب';
UPDATE ahe_listings SET city = 'كليوباترا' WHERE city IN ('cleopatra') AND city != 'كليوباترا';
UPDATE ahe_listings SET city = 'لوران' WHERE city IN ('laurent') AND city != 'لوران';
UPDATE ahe_listings SET city = 'رشدي' WHERE city IN ('rushdy') AND city != 'رشدي';
UPDATE ahe_listings SET city = 'أبو قير' WHERE city IN ('abu_qir') AND city != 'أبو قير';
UPDATE ahe_listings SET city = 'الدخيلة' WHERE city IN ('dakhela') AND city != 'الدخيلة';
UPDATE ahe_listings SET city = 'المنشية' WHERE city IN ('manshia') AND city != 'المنشية';
UPDATE ahe_listings SET city = 'الإبراهيمية' WHERE city IN ('ibrahimia') AND city != 'الإبراهيمية';
UPDATE ahe_listings SET city = 'بحري' WHERE city IN ('bahary') AND city != 'بحري';
UPDATE ahe_listings SET city = 'بولكلي' WHERE city IN ('bolkly') AND city != 'بولكلي';
UPDATE ahe_listings SET city = 'سبورتنج' WHERE city IN ('sporting') AND city != 'سبورتنج';
UPDATE ahe_listings SET city = 'فلمنج' WHERE city IN ('fleming') AND city != 'فلمنج';
UPDATE ahe_listings SET city = 'جناكليس' WHERE city IN ('janaklis') AND city != 'جناكليس';
UPDATE ahe_listings SET city = 'الأنفوشي' WHERE city IN ('anfoushi') AND city != 'الأنفوشي';
UPDATE ahe_listings SET city = 'اللبان' WHERE city IN ('laban') AND city != 'اللبان';

-- Also normalize in ahe_sellers
UPDATE ahe_sellers SET primary_governorate = 'الإسكندرية'
  WHERE primary_governorate IN ('alexandria', 'Alexandria') AND primary_governorate != 'الإسكندرية';
