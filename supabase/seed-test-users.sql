-- ============================================
-- مكسب (Maksab) — 5 حسابات تجريبية + إعلانات نموذجية
-- ✅ IDEMPOTENT — آمن للتشغيل أكتر من مرة
--
-- ⚠️ شغّل الملف ده بعد complete-setup.sql
-- ⚠️ لازم يتشغل في Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: Test Users in auth.users
-- Password for all: Test123456
-- bcrypt hash of 'Test123456'
-- ============================================

-- Helper: Generate bcrypt hash (Supabase uses $2a$ format)
-- The hash below is for password "Test123456"
DO $$
DECLARE
  pwd_hash TEXT := '$2a$10$PwGnSEfKdMg8c.WfYr3zKuT7jXSJ6DfJP0xDFhKJqrYaEfV7EbGHi';
  ts TIMESTAMPTZ := NOW();
BEGIN

  -- ══════════════════════════════════════════
  -- 1. محمد أحمد — بائع سيارات — القاهرة
  -- ══════════════════════════════════════════
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'mohamed@test.maksab.app', pwd_hash,
    ts, '+201012345678', ts,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"محمد أحمد"}',
    ts, ts, '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'mohamed@test.maksab.app',
    '{"sub":"a1111111-1111-1111-1111-111111111111","email":"mohamed@test.maksab.app"}',
    'email', ts, ts, ts
  ) ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════
  -- 2. فاطمة علي — بائعة موبايلات — الجيزة
  -- ══════════════════════════════════════════
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    'b2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'fatma@test.maksab.app', pwd_hash,
    ts, '+201198765432', ts,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"فاطمة علي"}',
    ts, ts, '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'fatma@test.maksab.app',
    '{"sub":"b2222222-2222-2222-2222-222222222222","email":"fatma@test.maksab.app"}',
    'email', ts, ts, ts
  ) ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════
  -- 3. أحمد حسن — بائع عقارات — الإسكندرية
  -- ══════════════════════════════════════════
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    'c3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'ahmed@test.maksab.app', pwd_hash,
    ts, '+201234567890', ts,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"أحمد حسن"}',
    ts, ts, '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'c3333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333333',
    'ahmed@test.maksab.app',
    '{"sub":"c3333333-3333-3333-3333-333333333333","email":"ahmed@test.maksab.app"}',
    'email', ts, ts, ts
  ) ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════
  -- 4. نورا محمود — بائعة موضة — الدقهلية
  -- ══════════════════════════════════════════
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    'd4444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'noura@test.maksab.app', pwd_hash,
    ts, '+201556789012', ts,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"نورا محمود"}',
    ts, ts, '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'd4444444-4444-4444-4444-444444444444',
    'd4444444-4444-4444-4444-444444444444',
    'noura@test.maksab.app',
    '{"sub":"d4444444-4444-4444-4444-444444444444","email":"noura@test.maksab.app"}',
    'email', ts, ts, ts
  ) ON CONFLICT DO NOTHING;

  -- ══════════════════════════════════════════
  -- 5. عمر خالد — بائع أجهزة منزلية — الغربية
  -- ══════════════════════════════════════════
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token
  ) VALUES (
    'e5555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'omar@test.maksab.app', pwd_hash,
    ts, '+201087654321', ts,
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"عمر خالد"}',
    ts, ts, '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'e5555555-5555-5555-5555-555555555555',
    'e5555555-5555-5555-5555-555555555555',
    'omar@test.maksab.app',
    '{"sub":"e5555555-5555-5555-5555-555555555555","email":"omar@test.maksab.app"}',
    'email', ts, ts, ts
  ) ON CONFLICT DO NOTHING;

END;
$$;


-- ============================================
-- PART 2: User Profiles in public.users
-- ============================================

INSERT INTO public.users (id, phone, display_name, governorate, city, bio, is_commission_supporter, total_ads_count, rating) VALUES
  ('a1111111-1111-1111-1111-111111111111', '01012345678', 'محمد أحمد', 'القاهرة', 'مدينة نصر', 'بائع سيارات مستعملة — خبرة 10 سنين في السوق', true, 5, 4.8),
  ('b2222222-2222-2222-2222-222222222222', '01198765432', 'فاطمة علي', 'الجيزة', 'المهندسين', 'بيع وشراء موبايلات وتابلت — أصلي ومضمون', false, 3, 4.5),
  ('c3333333-3333-3333-3333-333333333333', '01234567890', 'أحمد حسن', 'الإسكندرية', 'سموحة', 'مكتب عقارات — شقق وفيلات في إسكندرية', true, 4, 4.9),
  ('d4444444-4444-4444-4444-444444444444', '01556789012', 'نورا محمود', 'الدقهلية', 'المنصورة', 'ملابس ماركات أصلية — جديد ومستعمل نضيف', false, 3, 4.2),
  ('e5555555-5555-5555-5555-555555555555', '01087654321', 'عمر خالد', 'الغربية', 'طنطا', 'أجهزة منزلية مستعملة بحالة ممتازة — ضمان شخصي', false, 3, 4.6)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- PART 3: Sample Ads (18 إعلان نموذجي)
-- Mix of cash, auction, exchange
-- ============================================

-- ── محمد أحمد — سيارات (5 إعلانات) ──────────

-- 1. سيارة تويوتا كورولا — بيع نقدي
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '11111111-0001-0001-0001-000000000001',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'cars_passenger', 'cash',
  'تويوتا كورولا 2022 — 35,000 كم — أوتوماتيك',
  'سيارة تويوتا كورولا موديل 2022، مسافة 35,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة. السيارة بحالة ممتازة، صيانة وكالة، فابريكة بالكامل.',
  450000, true,
  '{"brand":"تويوتا","model":"كورولا","year":"2022","mileage":"35000","color":"أبيض","fuel":"بنزين","transmission":"أوتوماتيك","engine_cc":"1600","condition":"مستعملة","licensed":true}',
  'القاهرة', 'مدينة نصر', 'active', 245, 18
) ON CONFLICT (id) DO NOTHING;

-- 2. هيونداي توسان — مزاد
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '11111111-0001-0001-0001-000000000002',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'cars_passenger', 'auction',
  'هيونداي توسان 2021 — 50,000 كم — فول أوبشن',
  'هيونداي توسان موديل 2021، فول أوبشن، مسافة 50,000 كم، لون رمادي، بنزين، أوتوماتيك. بانوراما، كاميرا خلفية، شاشة.',
  NULL, 380000, 480000, 48, 5000,
  NOW() + INTERVAL '36 hours', 'active',
  '{"brand":"هيونداي","model":"توسان","year":"2021","mileage":"50000","color":"رمادي","fuel":"بنزين","transmission":"أوتوماتيك","engine_cc":"1600","condition":"مستعملة","licensed":true}',
  'القاهرة', 'مدينة نصر', 'active', 189, 32
) ON CONFLICT (id) DO NOTHING;

-- 3. نيسان صني — تبديل
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, exchange_description, exchange_accepts_price_diff, exchange_price_diff, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '11111111-0001-0001-0001-000000000003',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'cars_passenger', 'exchange',
  'نيسان صني 2020 — 60,000 كم — للتبديل بكورولا',
  'نيسان صني موديل 2020، مسافة 60,000 كم، أوتوماتيك، بنزين، لون أسود. السيارة فابريكة، صيانة دورية.',
  'عايز أبدل بتويوتا كورولا 2019 أو أحدث',
  true, 30000,
  '{"brand":"نيسان","model":"صني","year":"2020","mileage":"60000","color":"أسود","fuel":"بنزين","transmission":"أوتوماتيك","engine_cc":"1500","condition":"مستعملة","licensed":true}',
  'القاهرة', 'المعادي', 'active', 95, 7
) ON CONFLICT (id) DO NOTHING;

-- 4. شيفروليه أوبترا — بيع نقدي
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '11111111-0001-0001-0001-000000000004',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'cars_passenger', 'cash',
  'شيفروليه أوبترا 2023 — 15,000 كم — زيرو',
  'شيفروليه أوبترا موديل 2023، مسافة 15,000 كم فقط، أوتوماتيك، بنزين، لون فضي. السيارة زيرو ضمان وكالة.',
  520000, false,
  '{"brand":"شيفروليه","model":"أوبترا","year":"2023","mileage":"15000","color":"فضي","fuel":"بنزين","transmission":"أوتوماتيك","engine_cc":"1500","condition":"مستعملة","licensed":true}',
  'القاهرة', 'التجمع الخامس', 'active', 312, 28
) ON CONFLICT (id) DO NOTHING;

-- 5. موتوسيكل — بيع نقدي
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '11111111-0001-0001-0001-000000000005',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'cars_motorcycles', 'cash',
  'هوندا PCX 150 — 2023 — مستعمل ممتاز',
  'موتوسيكل هوندا PCX 150 موديل 2023، مسافة 5,000 كم، لون أحمر. بحالة ممتازة.',
  85000, true,
  '{"brand":"هوندا","model":"PCX 150","year":"2023","mileage":"5000","color":"أحمر","condition":"مستعملة"}',
  'القاهرة', 'مدينة نصر', 'active', 78, 5
) ON CONFLICT (id) DO NOTHING;


-- ── فاطمة علي — موبايلات (3 إعلانات) ──────────

-- 6. آيفون 15 برو ماكس
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '22222222-0002-0002-0002-000000000001',
  'b2222222-2222-2222-2222-222222222222',
  'phones', 'phones_mobile', 'cash',
  'آيفون 15 برو ماكس — 256GB — مستعمل زيرو',
  'آيفون 15 برو ماكس، مساحة 256 جيجا، لون تيتانيوم أسود، مستعمل زيرو. البطارية 98%، مع العلبة والشاحن الأصلي.',
  52000, true,
  '{"brand":"آيفون","model":"15 برو ماكس","storage":"256GB","condition":"مستعمل زيرو","color":"تيتانيوم أسود","ram":"8GB","battery_health":"ممتازة","with_box":true,"with_warranty":false}',
  'الجيزة', 'المهندسين', 'active', 456, 52
) ON CONFLICT (id) DO NOTHING;

-- 7. سامسونج S24 — مزاد
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '22222222-0002-0002-0002-000000000002',
  'b2222222-2222-2222-2222-222222222222',
  'phones', 'phones_mobile', 'auction',
  'سامسونج S24 Ultra — 512GB — جديد متبرشم',
  'سامسونج جالاكسي S24 ألترا، 512 جيجا، لون بنفسجي، جديد متبرشم. الضمان الدولي.',
  NULL, 38000, 48000, 72, 1000,
  NOW() + INTERVAL '60 hours', 'active',
  '{"brand":"سامسونج","model":"S24 Ultra","storage":"512GB","condition":"جديد متبرشم","color":"بنفسجي","ram":"12GB","battery_health":"ممتازة","with_box":true,"with_warranty":true}',
  'الجيزة', 'المهندسين', 'active', 334, 45
) ON CONFLICT (id) DO NOTHING;

-- 8. شاومي — تبديل
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, exchange_description, exchange_accepts_price_diff, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '22222222-0002-0002-0002-000000000003',
  'b2222222-2222-2222-2222-222222222222',
  'phones', 'phones_mobile', 'exchange',
  'شاومي 14 — 256GB — للتبديل بآيفون',
  'شاومي 14، مساحة 256 جيجا، لون أسود، مستعمل كويس. الشاشة والبطارية بحالة ممتازة.',
  'عايزة أبدل بآيفون 14 أو 15 — مع فرق لو لازم',
  true,
  '{"brand":"شاومي","model":"14","storage":"256GB","condition":"مستعمل كويس","color":"أسود","ram":"12GB","battery_health":"جيدة","with_box":false,"with_warranty":false}',
  'الجيزة', 'الشيخ زايد', 'active', 123, 8
) ON CONFLICT (id) DO NOTHING;


-- ── أحمد حسن — عقارات (4 إعلانات) ──────────

-- 9. شقة للبيع
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '33333333-0003-0003-0003-000000000001',
  'c3333333-3333-3333-3333-333333333333',
  'real_estate', 're_apartments_sale', 'cash',
  'شقة 180م² — 3 غرف — سوبر لوكس — سموحة',
  'شقة 180 متر مربع في سموحة، 3 غرف نوم، 2 حمام، سوبر لوكس، الطابق الخامس، أسانسير. تشطيب فاخر، واجهة بحري.',
  2800000, true,
  '{"type":"شقة","area":"180","rooms":"3","floor":"5","bathrooms":"2","finishing":"سوبر لوكس","elevator":true,"garage":false,"garden":false,"facing":"بحري","furnished":false}',
  'الإسكندرية', 'سموحة', 'active', 567, 78
) ON CONFLICT (id) DO NOTHING;

-- 10. شقة للإيجار
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '33333333-0003-0003-0003-000000000002',
  'c3333333-3333-3333-3333-333333333333',
  'real_estate', 're_apartments_rent', 'cash',
  'شقة 120م² للإيجار — 2 غرف — سيدي جابر',
  'شقة 120 متر للإيجار الشهري في سيدي جابر، 2 غرف نوم، حمام، مطبخ مجهز. قريبة من المحطة.',
  8000, false,
  '{"type":"شقة","area":"120","rooms":"2","floor":"3","bathrooms":"1","finishing":"لوكس","elevator":true,"furnished":false}',
  'الإسكندرية', 'سيدي جابر', 'active', 234, 19
) ON CONFLICT (id) DO NOTHING;

-- 11. فيلا — مزاد
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '33333333-0003-0003-0003-000000000003',
  'c3333333-3333-3333-3333-333333333333',
  'real_estate', 're_villas', 'auction',
  'فيلا 350م² — 5 غرف — حديقة — برج العرب',
  'فيلا مستقلة 350 متر على أرض 500 متر، 5 غرف نوم، 3 حمامات، حديقة كبيرة، جراج 2 سيارة. تشطيب سوبر لوكس.',
  NULL, 5000000, 7000000, 72, 100000,
  NOW() + INTERVAL '48 hours', 'active',
  '{"type":"فيلا","area":"350","rooms":"5","floor":"أرضي","bathrooms":"3","finishing":"سوبر لوكس","elevator":false,"garage":true,"garden":true,"facing":"شرقي"}',
  'الإسكندرية', 'برج العرب', 'active', 412, 65
) ON CONFLICT (id) DO NOTHING;

-- 12. محل تجاري
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '33333333-0003-0003-0003-000000000004',
  'c3333333-3333-3333-3333-333333333333',
  'real_estate', 're_commercial', 'cash',
  'محل تجاري 60م² — شارع رئيسي — المنتزه',
  'محل تجاري 60 متر على شارع رئيسي في المنتزه. مناسب لأي نشاط تجاري. واجهة زجاج 8 متر.',
  1200000, true,
  '{"type":"محل","area":"60","floor":"أرضي","finishing":"نص تشطيب"}',
  'الإسكندرية', 'المنتزه', 'active', 156, 12
) ON CONFLICT (id) DO NOTHING;


-- ── نورا محمود — موضة (3 إعلانات) ──────────

-- 13. جاكت جلد
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '44444444-0004-0004-0004-000000000001',
  'd4444444-4444-4444-4444-444444444444',
  'fashion', 'fashion_women', 'cash',
  'جاكت جلد طبيعي — Zara — مقاس M — جديد بالتاج',
  'جاكت جلد طبيعي من زارا، مقاس M، لون أسود. جديد بالتاج، اتشرى من برة ومتلبسش.',
  3500, false,
  '{"type":"جاكت","condition":"جديد بالتاج","size":"M","brand":"Zara","color":"أسود","material":"جلد"}',
  'الدقهلية', 'المنصورة', 'active', 198, 34
) ON CONFLICT (id) DO NOTHING;

-- 14. شنطة — مزاد
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '44444444-0004-0004-0004-000000000002',
  'd4444444-4444-4444-4444-444444444444',
  'fashion', 'fashion_bags', 'auction',
  'شنطة Michael Kors — أصلي بالضمان — مستعملة ممتاز',
  'شنطة مايكل كورس أصلية، لون بني، مستعملة استعمال خفيف. مع الداست باج والفاتورة.',
  NULL, 2000, 4500, 24, 200,
  NOW() + INTERVAL '18 hours', 'active',
  '{"type":"شنطة","condition":"مستعمل ممتاز","brand":"Michael Kors","color":"بني","material":"جلد"}',
  'الدقهلية', 'المنصورة', 'active', 267, 41
) ON CONFLICT (id) DO NOTHING;

-- 15. أحذية — تبديل
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, exchange_description, exchange_accepts_price_diff, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '44444444-0004-0004-0004-000000000003',
  'd4444444-4444-4444-4444-444444444444',
  'fashion', 'fashion_shoes', 'exchange',
  'حذاء Nike Air Max — مقاس 38 — للتبديل بأديداس',
  'حذاء نايكي اير ماكس، مقاس 38، لون أبيض وزهري. مستعمل استعمال خفيف — حالة ممتازة.',
  'عايزة أبدل بأديداس ألتربوست نفس المقاس',
  false,
  '{"type":"حذاء","condition":"مستعمل ممتاز","size":"38","brand":"Nike","color":"أبيض وزهري"}',
  'الدقهلية', 'المنصورة', 'active', 87, 6
) ON CONFLICT (id) DO NOTHING;


-- ── عمر خالد — أجهزة منزلية (3 إعلانات) ──────────

-- 16. غسالة توشيبا
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '55555555-0005-0005-0005-000000000001',
  'e5555555-5555-5555-5555-555555555555',
  'appliances', 'app_washers', 'cash',
  'غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز',
  'غسالة توشيبا فول أوتوماتيك 10 كيلو، موديل 2023، لون أبيض. مستعملة 6 شهور بس. بحالة الزيرو.',
  9500, true,
  '{"type":"غسالة","brand":"توشيبا","condition":"مستعمل ممتاز","purchase_year":"2023","capacity":"10 كيلو","warranty":false,"color":"أبيض","model":"فول أوتوماتيك"}',
  'الغربية', 'طنطا', 'active', 145, 11
) ON CONFLICT (id) DO NOTHING;

-- 17. ثلاجة شارب — مزاد
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '55555555-0005-0005-0005-000000000002',
  'e5555555-5555-5555-5555-555555555555',
  'appliances', 'app_fridges', 'auction',
  'ثلاجة شارب 18 قدم — نوفروست — 2022',
  'ثلاجة شارب 18 قدم نوفروست، موديل 2022، لون سيلفر. بحالة ممتازة — التبريد شغال 100%.',
  NULL, 8000, 13000, 48, 500,
  NOW() + INTERVAL '30 hours', 'active',
  '{"type":"ثلاجة","brand":"شارب","condition":"مستعمل ممتاز","purchase_year":"2022","capacity":"18 قدم","warranty":false,"color":"سيلفر","model":"نوفروست"}',
  'الغربية', 'طنطا', 'active', 203, 22
) ON CONFLICT (id) DO NOTHING;

-- 18. مكيف كاريير
INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, status, views_count, favorites_count)
VALUES (
  '55555555-0005-0005-0005-000000000003',
  'e5555555-5555-5555-5555-555555555555',
  'appliances', 'app_ac', 'cash',
  'مكيف كاريير 1.5 حصان — بارد ساخن — 2024',
  'مكيف كاريير 1.5 حصان بارد ساخن، موديل 2024، إنفرتر. جديد متبرشم — ضمان وكالة سنتين.',
  18000, false,
  '{"type":"مكيف","brand":"كاريير","condition":"جديد متبرشم","purchase_year":"2024","capacity":"1.5 حصان","warranty":true,"color":"أبيض","model":"إنفرتر بارد ساخن"}',
  'الغربية', 'المحلة الكبرى', 'active', 178, 15
) ON CONFLICT (id) DO NOTHING;


-- ============================================
-- PART 4: Sample Auction Bids
-- ============================================

-- Bids on هيونداي توسان (ad 002)
INSERT INTO auction_bids (id, ad_id, bidder_id, amount, created_at) VALUES
  ('aab00001-0000-0000-0000-000000000001', '11111111-0001-0001-0001-000000000002', 'c3333333-3333-3333-3333-333333333333', 385000, NOW() - INTERVAL '12 hours'),
  ('aab00001-0000-0000-0000-000000000002', '11111111-0001-0001-0001-000000000002', 'e5555555-5555-5555-5555-555555555555', 395000, NOW() - INTERVAL '8 hours'),
  ('aab00001-0000-0000-0000-000000000003', '11111111-0001-0001-0001-000000000002', 'c3333333-3333-3333-3333-333333333333', 405000, NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- Bids on سامسونج S24 Ultra (ad phone 002)
INSERT INTO auction_bids (id, ad_id, bidder_id, amount, created_at) VALUES
  ('aab00002-0000-0000-0000-000000000001', '22222222-0002-0002-0002-000000000002', 'd4444444-4444-4444-4444-444444444444', 39000, NOW() - INTERVAL '20 hours'),
  ('aab00002-0000-0000-0000-000000000002', '22222222-0002-0002-0002-000000000002', 'a1111111-1111-1111-1111-111111111111', 41000, NOW() - INTERVAL '10 hours'),
  ('aab00002-0000-0000-0000-000000000003', '22222222-0002-0002-0002-000000000002', 'd4444444-4444-4444-4444-444444444444', 43000, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- Bids on شنطة Michael Kors (ad fashion 002)
INSERT INTO auction_bids (id, ad_id, bidder_id, amount, created_at) VALUES
  ('aab00003-0000-0000-0000-000000000001', '44444444-0004-0004-0004-000000000002', 'b2222222-2222-2222-2222-222222222222', 2200, NOW() - INTERVAL '6 hours'),
  ('aab00003-0000-0000-0000-000000000002', '44444444-0004-0004-0004-000000000002', 'e5555555-5555-5555-5555-555555555555', 2500, NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- PART 5: Sample Conversations
-- ============================================

INSERT INTO conversations (id, ad_id, buyer_id, seller_id, last_message_at) VALUES
  -- أحمد بيسأل محمد عن التويوتا
  ('cc000001-0000-0000-0000-000000000001', '11111111-0001-0001-0001-000000000001', 'c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 hour'),
  -- نورا بتسأل فاطمة عن الآيفون
  ('cc000001-0000-0000-0000-000000000002', '22222222-0002-0002-0002-000000000001', 'd4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Messages in conversation 1
INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at) VALUES
  ('dd000001-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'السلام عليكم، السيارة لسه متاحة؟', true, NOW() - INTERVAL '2 hours'),
  ('dd000001-0000-0000-0000-000000000002', 'cc000001-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'وعليكم السلام، أيوا متاحة الحمد لله', true, NOW() - INTERVAL '1 hour 50 minutes'),
  ('dd000001-0000-0000-0000-000000000003', 'cc000001-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'تمام، ممكن أجي أعاينها بكرة؟', true, NOW() - INTERVAL '1 hour 45 minutes'),
  ('dd000001-0000-0000-0000-000000000004', 'cc000001-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'أكيد، أي وقت يناسبك. أنا في مدينة نصر', false, NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- Messages in conversation 2
INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at) VALUES
  ('dd000002-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000002', 'd4444444-4444-4444-4444-444444444444', 'أهلاً، الآيفون ده أصلي ولا كوبي؟', true, NOW() - INTERVAL '45 minutes'),
  ('dd000002-0000-0000-0000-000000000002', 'cc000001-0000-0000-0000-000000000002', 'b2222222-2222-2222-2222-222222222222', 'أصلي 100% يا قمر، معاه العلبة والفاتورة', true, NOW() - INTERVAL '40 minutes'),
  ('dd000002-0000-0000-0000-000000000003', 'cc000001-0000-0000-0000-000000000002', 'd4444444-4444-4444-4444-444444444444', 'لو 50 ألف ممكن آخده؟', false, NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  user_count INTEGER;
  ad_count INTEGER;
  bid_count INTEGER;
  conv_count INTEGER;
  msg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  SELECT COUNT(*) INTO ad_count FROM ads;
  SELECT COUNT(*) INTO bid_count FROM auction_bids;
  SELECT COUNT(*) INTO conv_count FROM conversations;
  SELECT COUNT(*) INTO msg_count FROM messages;

  RAISE NOTICE '✅ Test data seeded!';
  RAISE NOTICE '   Users: %', user_count;
  RAISE NOTICE '   Ads: %', ad_count;
  RAISE NOTICE '   Auction Bids: %', bid_count;
  RAISE NOTICE '   Conversations: %', conv_count;
  RAISE NOTICE '   Messages: %', msg_count;
END;
$$;
