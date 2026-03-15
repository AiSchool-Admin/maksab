-- ═══ Aqarmap City Scopes — 10 مدن × (بيع + إيجار شقق) + فلل ═══
-- 23 نطاق جديد لتغطية أهم المناطق العقارية في مصر

INSERT INTO ahe_scopes (code, name, source_platform, maksab_category, governorate, base_url, harvest_interval_minutes, max_pages_per_harvest, priority, is_active) VALUES
-- الجيزة
('aqarmap_sale_giza', 'شقق بيع — الجيزة — عقارماب', 'aqarmap', 'properties', 'giza', 'https://aqarmap.com.eg/en/for-sale/apartment/giza/', 120, 1, 5, true),
('aqarmap_rent_giza', 'شقق إيجار — الجيزة — عقارماب', 'aqarmap', 'properties', 'giza', 'https://aqarmap.com.eg/en/for-rent/apartment/giza/', 120, 1, 5, true),
-- التجمع الخامس
('aqarmap_sale_new_cairo', 'شقق بيع — التجمع — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/apartment/new-cairo/', 120, 1, 5, true),
('aqarmap_rent_new_cairo', 'شقق إيجار — التجمع — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-rent/apartment/new-cairo/', 120, 1, 5, true),
-- أكتوبر
('aqarmap_sale_october', 'شقق بيع — أكتوبر — عقارماب', 'aqarmap', 'properties', 'giza', 'https://aqarmap.com.eg/en/for-sale/apartment/6th-of-october-city/', 120, 1, 5, true),
('aqarmap_rent_october', 'شقق إيجار — أكتوبر — عقارماب', 'aqarmap', 'properties', 'giza', 'https://aqarmap.com.eg/en/for-rent/apartment/6th-of-october-city/', 120, 1, 5, true),
-- الشيخ زايد
('aqarmap_sale_zayed', 'شقق بيع — الشيخ زايد — عقارماب', 'aqarmap', 'properties', 'giza', 'https://aqarmap.com.eg/en/for-sale/apartment/sheikh-zayed/', 120, 1, 5, true),
('aqarmap_rent_zayed', 'شقق إيجار — الشيخ زايد — عقارماب', 'aqarmap', 'properties', 'giza', 'https://aqarmap.com.eg/en/for-rent/apartment/sheikh-zayed/', 120, 1, 5, true),
-- المعادي
('aqarmap_sale_maadi', 'شقق بيع — المعادي — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/apartment/maadi/', 120, 1, 5, true),
('aqarmap_rent_maadi', 'شقق إيجار — المعادي — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-rent/apartment/maadi/', 120, 1, 5, true),
-- مدينة نصر
('aqarmap_sale_nasr_city', 'شقق بيع — مدينة نصر — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/apartment/nasr-city/', 120, 1, 5, true),
('aqarmap_rent_nasr_city', 'شقق إيجار — مدينة نصر — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-rent/apartment/nasr-city/', 120, 1, 5, true),
-- مصر الجديدة
('aqarmap_sale_heliopolis', 'شقق بيع — مصر الجديدة — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/apartment/heliopolis/', 120, 1, 5, true),
('aqarmap_rent_heliopolis', 'شقق إيجار — مصر الجديدة — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-rent/apartment/heliopolis/', 120, 1, 5, true),
-- الشروق
('aqarmap_sale_shorouk', 'شقق بيع — الشروق — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/apartment/al-shorouk-city/', 120, 1, 5, true),
-- العبور
('aqarmap_sale_obour', 'شقق بيع — العبور — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/apartment/al-obour-city/', 120, 1, 5, true),
-- فلل
('aqarmap_villa_cairo', 'فلل بيع — القاهرة — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/villa/cairo/', 120, 1, 5, true),
('aqarmap_villa_new_cairo', 'فلل بيع — التجمع — عقارماب', 'aqarmap', 'properties', 'cairo', 'https://aqarmap.com.eg/en/for-sale/villa/new-cairo/', 120, 1, 5, true),
('aqarmap_villa_october', 'فلل بيع — أكتوبر — عقارماب', 'aqarmap', 'properties', 'giza', 'https://aqarmap.com.eg/en/for-sale/villa/6th-of-october-city/', 120, 1, 5, true)
ON CONFLICT (code) DO NOTHING;
