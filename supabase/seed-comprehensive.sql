-- ═══════════════════════════════════════════════════════════════════
-- مكسب Maksab — Comprehensive Seed Data
-- ═══════════════════════════════════════════════════════════════════
--
-- Run this AFTER complete-setup.sql in Supabase SQL Editor.
-- Creates 13 test users + 30 sample ads covering ALL 12 categories,
-- all 3 sale types (cash, auction, exchange), conversations, bids,
-- and favorites.
--
-- All subcategory IDs use the SHORT format matching categories-config.ts.
--
-- Safe to run multiple times (uses ON CONFLICT).
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- PART 0: Auth Users (required before profiles)
-- ────────────────────────────────────────────────
-- profiles.id references auth.users(id), so we must create auth entries first.
-- Each insert is wrapped in BEGIN/EXCEPTION so one failure doesn't block others.
-- Password for all: Test123456

DO $$
DECLARE
  pwd_hash TEXT := '$2a$10$PwGnSEfKdMg8c.WfYr3zKuT7jXSJ6DfJP0xDFhKJqrYaEfV7EbGHi';
  ts TIMESTAMPTZ := NOW();

  -- All 13 test users: (id, email, phone, display_name)
  user_data TEXT[][] := ARRAY[
    ARRAY['a1111111-1111-1111-1111-111111111111', 'mohamed@test.maksab.app', '+201012345678', 'محمد أحمد'],
    ARRAY['b2222222-2222-2222-2222-222222222222', 'fatma@test.maksab.app', '+201198765432', 'فاطمة علي'],
    ARRAY['c3333333-3333-3333-3333-333333333333', 'ahmed@test.maksab.app', '+201234567890', 'أحمد حسن'],
    ARRAY['d4444444-4444-4444-4444-444444444444', 'noura@test.maksab.app', '+201556789012', 'نورا محمود'],
    ARRAY['e5555555-5555-5555-5555-555555555555', 'omar@test.maksab.app', '+201087654321', 'عمر خالد'],
    ARRAY['f6666666-6666-6666-6666-666666666666', 'sara@test.maksab.app', '+201023456789', 'سارة إبراهيم'],
    ARRAY['a7777777-7777-7777-7777-777777777777', 'hussein@test.maksab.app', '+201134567890', 'حسين علاء'],
    ARRAY['b8888888-8888-8888-8888-888888888888', 'mona@test.maksab.app', '+201245678901', 'منى عبدالله'],
    ARRAY['c9999999-9999-9999-9999-999999999999', 'karim@test.maksab.app', '+201556781234', 'كريم مصطفى'],
    ARRAY['d0000000-aaaa-bbbb-cccc-111111111111', 'yasmin@test.maksab.app', '+201067891234', 'ياسمين حسن'],
    ARRAY['e1111111-aaaa-bbbb-cccc-222222222222', 'tarek@test.maksab.app', '+201178901234', 'طارق محمود'],
    ARRAY['f2222222-aaaa-bbbb-cccc-333333333333', 'heba@test.maksab.app', '+201289012345', 'هبة سعيد'],
    ARRAY['a3333333-aaaa-bbbb-cccc-444444444444', 'mahmoud@test.maksab.app', '+201590123456', 'محمود رضا']
  ];
  u TEXT[];
BEGIN
  FOREACH u SLICE 1 IN ARRAY user_data LOOP
    BEGIN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, phone, phone_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token
      ) VALUES (
        u[1]::UUID,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        u[2], pwd_hash,
        ts, u[3], ts,
        '{"provider":"email","providers":["email"]}',
        format('{"display_name":"%s"}', u[4])::jsonb,
        ts, ts, '', ''
      ) ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'auth.users %: % — skipping', u[2], SQLERRM;
    END;

    BEGIN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        u[1]::UUID, u[1]::UUID, u[2],
        format('{"sub":"%s","email":"%s"}', u[1], u[2])::jsonb,
        'email', ts, ts, ts
      ) ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'auth.identities %: % — skipping', u[2], SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'auth.users creation complete for 13 test users';
END;
$$;

-- ────────────────────────────────────────────────
-- PART 1: Test Profiles
-- ────────────────────────────────────────────────

INSERT INTO profiles (id, phone, display_name, governorate, city, bio, is_commission_supporter, total_ads_count, rating)
VALUES
  -- Original 5 test users
  ('a1111111-1111-1111-1111-111111111111', '01012345678', 'محمد أحمد', 'القاهرة', 'مدينة نصر', 'بائع سيارات مستعملة — خبرة 10 سنين في السوق', true, 5, 4.8),
  ('b2222222-2222-2222-2222-222222222222', '01198765432', 'فاطمة علي', 'الجيزة', 'المهندسين', 'بيع وشراء موبايلات وتابلت — أصلي ومضمون', false, 3, 4.5),
  ('c3333333-3333-3333-3333-333333333333', '01234567890', 'أحمد حسن', 'الإسكندرية', 'سموحة', 'مكتب عقارات — شقق وفيلات في إسكندرية', true, 4, 4.9),
  ('d4444444-4444-4444-4444-444444444444', '01556789012', 'نورا محمود', 'الدقهلية', 'المنصورة', 'ملابس ماركات أصلية — جديد ومستعمل نضيف', false, 3, 4.2),
  ('e5555555-5555-5555-5555-555555555555', '01087654321', 'عمر خالد', 'الغربية', 'طنطا', 'أجهزة منزلية مستعملة بحالة ممتازة — ضمان شخصي', false, 3, 4.6),
  -- Additional 8 users for full category coverage
  ('f6666666-6666-6666-6666-666666666666', '01023456789', 'سارة إبراهيم', 'القاهرة', 'التجمع الخامس', 'ذهب ومجوهرات — أصلي بالفاتورة', true, 2, 4.7),
  ('a7777777-7777-7777-7777-777777777777', '01134567890', 'حسين علاء', 'الجيزة', 'الشيخ زايد', 'سلع فاخرة وماركات عالمية', false, 2, 4.4),
  ('b8888888-8888-8888-8888-888888888888', '01245678901', 'منى عبدالله', 'القاهرة', 'مصر الجديدة', 'أثاث وديكور منزلي — خشب أصلي', false, 2, 4.3),
  ('c9999999-9999-9999-9999-999999999999', '01556781234', 'كريم مصطفى', 'الإسكندرية', 'المنتزه', 'ألعاب فيديو وهوايات — أسعار زمان', true, 2, 4.6),
  ('d0000000-aaaa-bbbb-cccc-111111111111', '01067891234', 'ياسمين حسن', 'المنوفية', 'شبين الكوم', 'عدد وأدوات — جديد ومستعمل', false, 2, 4.1),
  ('e1111111-aaaa-bbbb-cccc-222222222222', '01178901234', 'طارق محمود', 'بورسعيد', 'بورسعيد', 'خردة ومخلفات — أسعار عادلة', false, 2, 4.0),
  ('f2222222-aaaa-bbbb-cccc-333333333333', '01289012345', 'هبة سعيد', 'الشرقية', 'الزقازيق', 'سباكة وكهرباء — خبرة 8 سنوات', true, 2, 4.8),
  ('a3333333-aaaa-bbbb-cccc-444444444444', '01590123456', 'محمود رضا', 'القليوبية', 'بنها', 'بيع وشراء كل حاجة — مكسب للجميع', false, 3, 4.5)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  governorate = EXCLUDED.governorate,
  city = EXCLUDED.city,
  bio = EXCLUDED.bio;

-- ────────────────────────────────────────────────
-- PART 2: Sample Ads — ALL 12 Categories
-- ────────────────────────────────────────────────

-- ── 🚗 Cars (3 ads: cash, auction, exchange) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0001-0001-0001-000000000001',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'passenger', 'cash',
  'تويوتا كورولا 2022 — 35,000 كم — أوتوماتيك',
  'سيارة تويوتا كورولا موديل 2022، مسافة 35,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة. السيارة بحالة ممتازة، صيانة وكالة.',
  450000, true,
  '{"brand":"toyota","model":"كورولا","year":"2022","mileage":"35000","color":"white","fuel":"petrol","transmission":"automatic","condition":"used","licensed":true}'::jsonb,
  'القاهرة', 'مدينة نصر', 245, 18, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0001-0001-0001-000000000002',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'passenger', 'auction',
  'هيونداي توسان 2021 — 50,000 كم — فول أوبشن',
  'هيونداي توسان موديل 2021، فول أوبشن، مسافة 50,000 كم، بنزين، أوتوماتيك. بانوراما، كاميرا خلفية.',
  NULL, false,
  380000, 480000, 48, 5000, NOW() + INTERVAL '36 hours', 'active',
  '{"brand":"hyundai","model":"توسان","year":"2021","mileage":"50000","color":"gray","fuel":"petrol","transmission":"automatic","condition":"used"}'::jsonb,
  'القاهرة', 'مدينة نصر', 189, 32, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, exchange_description, exchange_accepts_price_diff, exchange_price_diff, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0001-0001-0001-000000000003',
  'a1111111-1111-1111-1111-111111111111',
  'cars', 'passenger', 'exchange',
  'نيسان صني 2020 — 60,000 كم — للتبديل بكورولا',
  'نيسان صني موديل 2020، مسافة 60,000 كم، أوتوماتيك، بنزين، لون أسود. فابريكة بالكامل.',
  NULL, false,
  'عايز أبدل بتويوتا كورولا 2019 أو أحدث', true, 30000,
  '{"brand":"nissan","model":"صني","year":"2020","mileage":"60000","color":"black","fuel":"petrol","transmission":"automatic","condition":"used"}'::jsonb,
  'القاهرة', 'المعادي', 95, 7, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 🏠 Real Estate (3 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0002-0002-0002-000000000001',
  'c3333333-3333-3333-3333-333333333333',
  'real_estate', 'apartments-sale', 'cash',
  'شقة 180م² — 3 غرف — سوبر لوكس — سموحة',
  'شقة 180 متر في سموحة، 3 غرف، 2 حمام، سوبر لوكس، الطابق الخامس، أسانسير. واجهة بحري.',
  2800000, true,
  '{"property_type":"apartment","area":"180","rooms":"3","floor":"5","bathrooms":"2","finishing":"super_lux","elevator":true,"facing":"north"}'::jsonb,
  'الإسكندرية', 'سموحة', 567, 78, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0002-0002-0002-000000000002',
  'c3333333-3333-3333-3333-333333333333',
  'real_estate', 'apartments-rent', 'cash',
  'شقة 120م² للإيجار — 2 غرف — سيدي جابر',
  'شقة 120 متر للإيجار الشهري، 2 غرف، حمام، مطبخ مجهز. قريبة من المحطة.',
  8000, false,
  '{"property_type":"apartment","area":"120","rooms":"2","floor":"3","bathrooms":"1","finishing":"lux","elevator":true}'::jsonb,
  'الإسكندرية', 'سيدي جابر', 234, 19, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0002-0002-0002-000000000003',
  'c3333333-3333-3333-3333-333333333333',
  'real_estate', 'land', 'auction',
  'أرض 300م² — الساحل الشمالي — مزاد',
  'أرض 300 متر في الساحل الشمالي، قريبة من الطريق الرئيسي. فرصة استثمارية.',
  NULL, false,
  '{"property_type":"land","area":"300"}'::jsonb,
  'مطروح', 'الساحل الشمالي', 412, 56, 'active'
) ON CONFLICT (id) DO NOTHING;

UPDATE ads SET auction_start_price = 500000, auction_buy_now_price = 900000, auction_duration_hours = 72, auction_min_increment = 10000, auction_ends_at = NOW() + INTERVAL '60 hours', auction_status = 'active' WHERE id = '10000000-0002-0002-0002-000000000003';

-- ── 📱 Phones (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0003-0003-0003-000000000001',
  'b2222222-2222-2222-2222-222222222222',
  'phones', 'mobile', 'cash',
  'آيفون 15 برو ماكس — 256GB — مستعمل زيرو',
  'آيفون 15 برو ماكس، 256 جيجا، تيتانيوم أسود. البطارية 98%، مع العلبة والشاحن الأصلي.',
  52000, true,
  '{"brand":"apple","model":"15 Pro Max","storage":"256","condition":"like_new","color":"black","battery":"excellent","with_box":true}'::jsonb,
  'الجيزة', 'المهندسين', 456, 52, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0003-0003-0003-000000000002',
  'b2222222-2222-2222-2222-222222222222',
  'phones', 'mobile', 'auction',
  'سامسونج S24 Ultra — 512GB — جديد متبرشم',
  'سامسونج جالاكسي S24 ألترا، 512 جيجا، بنفسجي، جديد متبرشم. ضمان دولي.',
  NULL, false,
  38000, 48000, 72, 1000, NOW() + INTERVAL '60 hours', 'active',
  '{"brand":"samsung","model":"S24 Ultra","storage":"512","condition":"sealed","color":"other","with_warranty":true}'::jsonb,
  'الجيزة', 'المهندسين', 334, 45, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 👗 Fashion (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0004-0004-0004-000000000001',
  'd4444444-4444-4444-4444-444444444444',
  'fashion', 'women', 'cash',
  'جاكت جلد طبيعي — Zara — مقاس M — جديد بالتاج',
  'جاكت جلد طبيعي من زارا، مقاس M، لون أسود. جديد بالتاج، اتشرى من برة.',
  3500, false,
  '{"type":"jacket","condition":"new_tagged","size":"m","brand":"zara","color":"black","material":"leather"}'::jsonb,
  'الدقهلية', 'المنصورة', 198, 34, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0004-0004-0004-000000000002',
  'd4444444-4444-4444-4444-444444444444',
  'fashion', 'bags', 'auction',
  'شنطة Michael Kors — أصلي بالضمان — مستعملة ممتاز',
  'شنطة مايكل كورس أصلية، لون بني، استعمال خفيف. مع الداست باج والفاتورة.',
  NULL, false,
  2000, 4500, 24, 200, NOW() + INTERVAL '18 hours', 'active',
  '{"type":"handbag","condition":"excellent","brand":"other","color":"other"}'::jsonb,
  'الدقهلية', 'المنصورة', 267, 41, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── ♻️ Scrap (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0005-0005-0005-000000000001',
  'e1111111-aaaa-bbbb-cccc-222222222222',
  'scrap', 'iron', 'cash',
  'حديد خردة — 500 كجم — نظيف',
  'حديد خردة نظيف، 500 كيلو تقريباً. جاهز للتسليم فوراً.',
  8500, true,
  '{"type":"iron","weight":"500","condition":"clean","quantity":"large"}'::jsonb,
  'بورسعيد', 'بورسعيد', 87, 4, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0005-0005-0005-000000000002',
  'e1111111-aaaa-bbbb-cccc-222222222222',
  'scrap', 'old-devices', 'cash',
  'ثلاجة قديمة + غسالة — للخردة أو الإصلاح',
  'ثلاجة توشيبا قديمة 12 قدم + غسالة 7 كيلو. ممكن تتصلح أو تتباع خردة.',
  1500, true,
  '{"type":"fridge","weight":"120","condition":"mixed"}'::jsonb,
  'بورسعيد', 'بورسعيد', 56, 2, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 💰 Gold & Silver (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0006-0006-0006-000000000001',
  'f6666666-6666-6666-6666-666666666666',
  'gold', 'gold-items', 'cash',
  'سلسلة ذهب عيار 21 — 15 جرام — جديدة',
  'سلسلة ذهب عيار 21، 15 جرام، جديدة بالفاتورة من لازوردي.',
  52500, false,
  '{"type":"chain","karat":"21","weight":"15","condition":"new","brand":"lazurde","certificate":true}'::jsonb,
  'القاهرة', 'التجمع الخامس', 312, 45, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0006-0006-0006-000000000002',
  'f6666666-6666-6666-6666-666666666666',
  'gold', 'gold-items', 'auction',
  'دبلة ذهب عيار 18 — 8 جرام — مع فص ألماس',
  'دبلة ذهب عيار 18، 8 جرام، مع فص ألماس صغير. مستعملة بحالة ممتازة.',
  NULL, false,
  15000, 25000, 48, 500, NOW() + INTERVAL '40 hours', 'active',
  '{"type":"wedding_ring","karat":"18","weight":"8","condition":"used","has_gemstone":true}'::jsonb,
  'القاهرة', 'التجمع الخامس', 189, 28, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 💎 Luxury Goods (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0007-0007-0007-000000000001',
  'a7777777-7777-7777-7777-777777777777',
  'luxury', 'luxury-bags', 'cash',
  'شنطة Louis Vuitton Neverfull — أصلي بالضمان — ممتازة',
  'شنطة لويس فيتون نيفرفول MM، أصلي بالضمان والفاتورة. مستعملة ممتاز، استعمال خفيف.',
  28000, true,
  '{"type":"tote","brand":"louis_vuitton","condition":"excellent","authentic":"authentic_warranty","with_box":true,"with_receipt":true}'::jsonb,
  'الجيزة', 'الشيخ زايد', 456, 67, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0007-0007-0007-000000000002',
  'a7777777-7777-7777-7777-777777777777',
  'luxury', 'perfumes', 'cash',
  'عطر Dior Sauvage — 100ml — أصلي بالضمان — جديد',
  'عطر ديور سوفاج EDP، 100ml، جديد متبرشم. أصلي بالضمان.',
  4500, false,
  '{"type":"perfume","brand":"dior","condition":"sealed","authentic":"authentic_warranty","perfume_size":"100ml","concentration":"edp","gender":"men"}'::jsonb,
  'الجيزة', 'الشيخ زايد', 234, 38, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 🏠 Home Appliances (3 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0008-0008-0008-000000000001',
  'e5555555-5555-5555-5555-555555555555',
  'appliances', 'washers', 'cash',
  'غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز',
  'غسالة توشيبا فول أوتوماتيك 10 كيلو، موديل 2023، أبيض. مستعملة 6 شهور. حالة الزيرو.',
  9500, true,
  '{"type":"washer","brand":"toshiba","condition":"excellent","purchase_year":"2023","capacity":"10kg","color":"white"}'::jsonb,
  'الغربية', 'طنطا', 145, 11, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, auction_start_price, auction_buy_now_price, auction_duration_hours, auction_min_increment, auction_ends_at, auction_status, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0008-0008-0008-000000000002',
  'e5555555-5555-5555-5555-555555555555',
  'appliances', 'fridges', 'auction',
  'ثلاجة شارب 18 قدم — نوفروست — 2022',
  'ثلاجة شارب 18 قدم نوفروست، 2022، سيلفر. بحالة ممتازة.',
  NULL, false,
  8000, 13000, 48, 500, NOW() + INTERVAL '30 hours', 'active',
  '{"type":"fridge","brand":"sharp","condition":"excellent","purchase_year":"2022","capacity":"18ft","color":"silver"}'::jsonb,
  'الغربية', 'طنطا', 203, 22, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0008-0008-0008-000000000003',
  'e5555555-5555-5555-5555-555555555555',
  'appliances', 'ac', 'cash',
  'مكيف كاريير 1.5 حصان — بارد ساخن — 2024',
  'مكيف كاريير 1.5 حصان بارد ساخن، 2024، إنفرتر. جديد متبرشم — ضمان وكالة سنتين.',
  18000, false,
  '{"type":"ac","brand":"carrier","condition":"sealed","purchase_year":"2024","capacity":"1.5hp","color":"white","warranty":true}'::jsonb,
  'الغربية', 'المحلة الكبرى', 178, 15, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 🪑 Furniture & Decor (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0009-0009-0009-000000000001',
  'b8888888-8888-8888-8888-888888888888',
  'furniture', 'bedroom', 'cash',
  'غرفة نوم خشب زان — 7 قطع — مستعملة ممتاز',
  'غرفة نوم كاملة 7 قطع، خشب زان أصلي، مستعملة سنة واحدة. دولاب 250 سم، سرير 180، 2 كومودينو، تسريحة، شماعة.',
  35000, true,
  '{"type":"bedroom","condition":"excellent","material":"beech","color":"brown","pieces":"7"}'::jsonb,
  'القاهرة', 'مصر الجديدة', 312, 41, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, exchange_description, exchange_accepts_price_diff, exchange_price_diff, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0009-0009-0009-000000000002',
  'b8888888-8888-8888-8888-888888888888',
  'furniture', 'living', 'exchange',
  'أنتريه كلاسيك 9 قطع — خشب زان — للتبديل بمودرن',
  'أنتريه كلاسيك 9 قطع، خشب زان، مستعمل بحالة ممتازة. عايزة أبدله بأنتريه مودرن.',
  NULL, false,
  'عايزة أنتريه مودرن — 7 قطع أو أكتر — أي خامة', true, 5000,
  '{"type":"living","condition":"excellent","material":"beech","color":"brown","pieces":"9"}'::jsonb,
  'القاهرة', 'مصر الجديدة', 156, 18, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 🎮 Hobbies (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0010-0010-0010-000000000001',
  'c9999999-9999-9999-9999-999999999999',
  'hobbies', 'gaming', 'cash',
  'بلايستيشن 5 — مع 2 يد — مستعمل ممتاز',
  'بلايستيشن 5 ديسك إيديشن، مع 2 يد وصندوق أصلي. مستعمل 6 شهور بس.',
  18500, true,
  '{"type":"ps5","condition":"excellent","brand":"sony","with_accessories":true}'::jsonb,
  'الإسكندرية', 'المنتزه', 423, 56, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0010-0010-0010-000000000002',
  'c9999999-9999-9999-9999-999999999999',
  'hobbies', 'cameras', 'auction',
  'كاميرا Canon EOS R6 — بودي + عدسة 24-105 — ممتازة',
  'كاميرا كانون EOS R6 ميرورلس، مع عدسة 24-105mm f/4L. مستعملة ممتاز، عداد 8000 صورة.',
  NULL, false,
  '{"type":"camera_kit","condition":"excellent","brand":"canon","camera_type":"mirrorless","megapixels":"20mp","with_accessories":true}'::jsonb,
  'الإسكندرية', 'المنتزه', 278, 39, 'active'
) ON CONFLICT (id) DO NOTHING;

UPDATE ads SET auction_start_price = 25000, auction_buy_now_price = 42000, auction_duration_hours = 72, auction_min_increment = 1000, auction_ends_at = NOW() + INTERVAL '48 hours', auction_status = 'active' WHERE id = '10000000-0010-0010-0010-000000000002';

-- ── 🔧 Tools & Equipment (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0011-0011-0011-000000000001',
  'd0000000-aaaa-bbbb-cccc-111111111111',
  'tools', 'power-tools', 'cash',
  'شنيور بوش كهرباء — مستعمل يعمل',
  'شنيور بوش مع شنطة وسنن. مستعمل يعمل بحالة ممتازة.',
  2500, true,
  '{"type":"drill","condition":"working","brand":"bosch","power":"electric"}'::jsonb,
  'المنوفية', 'شبين الكوم', 67, 5, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0011-0011-0011-000000000002',
  'd0000000-aaaa-bbbb-cccc-111111111111',
  'tools', 'workshop', 'cash',
  'ماكينة لحام كهرباء 250 أمبير — ديوالت — مستعملة',
  'ماكينة لحام ديوالت 250 أمبير، مستعملة يعمل بدون مشاكل. مع كابلات وقناع.',
  5500, true,
  '{"type":"welder","condition":"working","brand":"dewalt","power":"electric"}'::jsonb,
  'المنوفية', 'شبين الكوم', 89, 8, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── 🛠️ Services (2 ads) ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0012-0012-0012-000000000001',
  'f2222222-aaaa-bbbb-cccc-333333333333',
  'services', 'plumbing', 'cash',
  'سباك خبرة 8 سنوات — القاهرة والجيزة',
  'سباك محترف، خبرة 8 سنوات. تأسيس وصيانة. بالمشروع أو بالساعة. خدمة سريعة.',
  250, false,
  '{"service_type":"plumbing","pricing":"by_project","experience":"5_plus"}'::jsonb,
  'الشرقية', 'الزقازيق', 145, 12, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0012-0012-0012-000000000002',
  'f2222222-aaaa-bbbb-cccc-333333333333',
  'services', 'electrical', 'cash',
  'كهربائي منازل — تأسيس وصيانة — خبرة 8 سنوات',
  'كهربائي منازل محترف. تأسيس، صيانة، إصلاح أعطال. بالاتفاق.',
  200, false,
  '{"service_type":"electrical","pricing":"by_agreement","experience":"5_plus"}'::jsonb,
  'الشرقية', 'الزقازيق', 98, 7, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ── Extra: More diverse ads for feed variety ──

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0013-0013-0013-000000000001',
  'a3333333-aaaa-bbbb-cccc-444444444444',
  'phones', 'tablet', 'cash',
  'آيباد برو 12.9 — M2 — 256GB — مستعمل ممتاز',
  'آيباد برو 12.9 إنش، شريحة M2، 256 جيجا، WiFi + Cellular. مع Apple Pencil الجيل التاني.',
  28000, true,
  '{"brand":"apple","model":"iPad Pro 12.9 M2","storage":"256","condition":"like_new","color":"other"}'::jsonb,
  'القليوبية', 'بنها', 234, 32, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0013-0013-0013-000000000002',
  'a3333333-aaaa-bbbb-cccc-444444444444',
  'cars', 'motorcycles', 'cash',
  'بينيلي TNT 250 — 2023 — 5,000 كم — ممتازة',
  'موتوسيكل بينيلي TNT 250 موديل 2023، 5,000 كم. حالة ممتازة، صيانة وكالة.',
  65000, true,
  '{"brand":"other","model":"بينيلي TNT 250","year":"2023","mileage":"5000","color":"red","fuel":"petrol","condition":"used"}'::jsonb,
  'القليوبية', 'بنها', 178, 21, 'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ads (id, user_id, category_id, subcategory_id, sale_type, title, description, price, is_negotiable, category_fields, governorate, city, views_count, favorites_count, status)
VALUES (
  '10000000-0013-0013-0013-000000000003',
  'a3333333-aaaa-bbbb-cccc-444444444444',
  'fashion', 'men', 'cash',
  'بدلة رجالي — Hugo Boss — مقاس 50 — جديدة بالتاج',
  'بدلة هوجو بوص كلاسيك فت، مقاس 50، لون كحلي. جديدة بالتاج. اتشريت من دبي.',
  8500, false,
  '{"type":"suit","condition":"new_tagged","size":"xl","brand":"other","color":"blue","material":"polyester"}'::jsonb,
  'القليوبية', 'بنها', 145, 19, 'active'
) ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- PART 3: Auction Bids (for active auctions)
-- ────────────────────────────────────────────────

-- Bids on the Hyundai Tucson auction
INSERT INTO auction_bids (id, ad_id, bidder_id, amount, created_at)
VALUES
  ('b0000001-0001-0001-0001-000000000001', '10000000-0001-0001-0001-000000000002', 'b2222222-2222-2222-2222-222222222222', 385000, NOW() - INTERVAL '10 hours'),
  ('b0000001-0001-0001-0001-000000000002', '10000000-0001-0001-0001-000000000002', 'c3333333-3333-3333-3333-333333333333', 390000, NOW() - INTERVAL '8 hours'),
  ('b0000001-0001-0001-0001-000000000003', '10000000-0001-0001-0001-000000000002', 'b2222222-2222-2222-2222-222222222222', 400000, NOW() - INTERVAL '5 hours'),
  ('b0000001-0001-0001-0001-000000000004', '10000000-0001-0001-0001-000000000002', 'd4444444-4444-4444-4444-444444444444', 410000, NOW() - INTERVAL '2 hours'),
  ('b0000001-0001-0001-0001-000000000005', '10000000-0001-0001-0001-000000000002', 'b2222222-2222-2222-2222-222222222222', 420000, NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Bids on the Samsung S24 Ultra auction
INSERT INTO auction_bids (id, ad_id, bidder_id, amount, created_at)
VALUES
  ('b0000002-0002-0002-0002-000000000001', '10000000-0003-0003-0003-000000000002', 'a1111111-1111-1111-1111-111111111111', 39000, NOW() - INTERVAL '6 hours'),
  ('b0000002-0002-0002-0002-000000000002', '10000000-0003-0003-0003-000000000002', 'c3333333-3333-3333-3333-333333333333', 40000, NOW() - INTERVAL '4 hours'),
  ('b0000002-0002-0002-0002-000000000003', '10000000-0003-0003-0003-000000000002', 'a1111111-1111-1111-1111-111111111111', 41500, NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- Bids on the gold ring auction
INSERT INTO auction_bids (id, ad_id, bidder_id, amount, created_at)
VALUES
  ('b0000003-0003-0003-0003-000000000001', '10000000-0006-0006-0006-000000000002', 'd4444444-4444-4444-4444-444444444444', 15500, NOW() - INTERVAL '3 hours'),
  ('b0000003-0003-0003-0003-000000000002', '10000000-0006-0006-0006-000000000002', 'a3333333-aaaa-bbbb-cccc-444444444444', 16000, NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- PART 4: Conversations & Messages
-- ────────────────────────────────────────────────

-- Conversation 1: Fatma asks Mohamed about his Toyota Corolla
INSERT INTO conversations (id, ad_id, buyer_id, seller_id, last_message_at, created_at)
VALUES (
  'conv0001-0001-0001-0001-000000000001',
  '10000000-0001-0001-0001-000000000001',
  'b2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
VALUES
  ('msg00001-0001-0001-0001-000000000001', 'conv0001-0001-0001-0001-000000000001', 'b2222222-2222-2222-2222-222222222222', 'السلام عليكم، السيارة لسه متاحة؟', true, NOW() - INTERVAL '2 hours'),
  ('msg00001-0001-0001-0001-000000000002', 'conv0001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'وعليكم السلام، أيوا متاحة. تحبي تيجي تعاينيها؟', true, NOW() - INTERVAL '1 hour 50 minutes'),
  ('msg00001-0001-0001-0001-000000000003', 'conv0001-0001-0001-0001-000000000001', 'b2222222-2222-2222-2222-222222222222', 'ممكن أعرف آخر سعر؟ لو ينفع 420 ألف؟', true, NOW() - INTERVAL '1 hour 30 minutes'),
  ('msg00001-0001-0001-0001-000000000004', 'conv0001-0001-0001-0001-000000000001', 'a1111111-1111-1111-1111-111111111111', 'لا ده قليل شوية. ممكن 440 وتاخديها النهارده.', true, NOW() - INTERVAL '1 hour'),
  ('msg00001-0001-0001-0001-000000000005', 'conv0001-0001-0001-0001-000000000001', 'b2222222-2222-2222-2222-222222222222', 'تمام، هبعتلك لوكيشن عشان أجيلك. إن شاء الله بكرة الصبح.', false, NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- Conversation 2: Ahmed asks about a phone
INSERT INTO conversations (id, ad_id, buyer_id, seller_id, last_message_at, created_at)
VALUES (
  'conv0002-0002-0002-0002-000000000001',
  '10000000-0003-0003-0003-000000000001',
  'c3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '5 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
VALUES
  ('msg00002-0002-0002-0002-000000000001', 'conv0002-0002-0002-0002-000000000001', 'c3333333-3333-3333-3333-333333333333', 'الآيفون ده عليه أي خدش أو حاجة؟', true, NOW() - INTERVAL '5 hours'),
  ('msg00002-0002-0002-0002-000000000002', 'conv0002-0002-0002-0002-000000000001', 'b2222222-2222-2222-2222-222222222222', 'لا والله زيرو خالص. عليه جراب وإسكرينة من أول يوم.', true, NOW() - INTERVAL '4 hours 30 minutes'),
  ('msg00002-0002-0002-0002-000000000003', 'conv0002-0002-0002-0002-000000000001', 'c3333333-3333-3333-3333-333333333333', 'تمام. هل ممكن نتقابل في المهندسين؟', false, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────
-- PART 5: Favorites
-- ────────────────────────────────────────────────

INSERT INTO favorites (user_id, ad_id, created_at)
VALUES
  ('b2222222-2222-2222-2222-222222222222', '10000000-0001-0001-0001-000000000001', NOW() - INTERVAL '1 day'),
  ('c3333333-3333-3333-3333-333333333333', '10000000-0001-0001-0001-000000000002', NOW() - INTERVAL '2 days'),
  ('d4444444-4444-4444-4444-444444444444', '10000000-0003-0003-0003-000000000001', NOW() - INTERVAL '12 hours'),
  ('a1111111-1111-1111-1111-111111111111', '10000000-0003-0003-0003-000000000002', NOW() - INTERVAL '6 hours'),
  ('e5555555-5555-5555-5555-555555555555', '10000000-0006-0006-0006-000000000001', NOW() - INTERVAL '8 hours'),
  ('a7777777-7777-7777-7777-777777777777', '10000000-0009-0009-0009-000000000001', NOW() - INTERVAL '3 hours'),
  ('c9999999-9999-9999-9999-999999999999', '10000000-0007-0007-0007-000000000001', NOW() - INTERVAL '1 hour'),
  ('a3333333-aaaa-bbbb-cccc-444444444444', '10000000-0010-0010-0010-000000000001', NOW() - INTERVAL '30 minutes')
ON CONFLICT (user_id, ad_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- DONE! Summary:
-- ═══════════════════════════════════════════════════════════════════
-- 13 test profiles
-- 30 ads across all 12 categories (cash + auction + exchange)
-- 10 auction bids
-- 2 conversations with 8 messages
-- 8 favorites
-- ═══════════════════════════════════════════════════════════════════
