-- ══════════════════════════════════════════════
-- Migration 00096: 3-message acquisition funnel templates
-- ══════════════════════════════════════════════

-- Add 'consented' to pipeline status flow
-- discovered → phone_found → contacted → consented → registered

-- Message 1 (Day 0) — First contact
INSERT INTO outreach_templates
(name, name_ar, category, target_type, target_tier, message_text, agent, is_active)
VALUES
('funnel_msg1_cars', 'فانل رسالة 1 — سيارات', 'سيارات', 'seller', 'all',
 E'أهلاً {{name}} 👋\nشفنا إعلاناتك على دوبيزل 🚗\nفريق مكسب يقدر يكتب إعلاناتك ويسجلك في دقايق — مجاناً\nيهمك؟',
 'waleed', true),
('funnel_msg1_props', 'فانل رسالة 1 — عقارات', 'عقارات', 'seller', 'all',
 E'أهلاً {{name}} 👋\nشفنا إعلاناتك على دوبيزل 🏠\nفريق مكسب يقدر يكتب إعلاناتك ويسجلك في دقايق — مجاناً\nيهمك؟',
 'ahmed', true)
ON CONFLICT DO NOTHING;

-- Message 2 (Day 2) — Consent link
INSERT INTO outreach_templates
(name, name_ar, category, target_type, target_tier, message_text, agent, is_active)
VALUES
('funnel_msg2_cars', 'فانل رسالة 2 — سيارات', 'سيارات', 'seller', 'all',
 E'{{name}}، فريقنا جاهز يسجلك ويكتب إعلاناتك على مكسب\nما محتاجش تعمل حاجة — هنكتب كل حاجة عنك 💪\n\nاضغط للموافقة وهنبدأ فوراً:\n👉 {{consent_link}}',
 'waleed', true),
('funnel_msg2_props', 'فانل رسالة 2 — عقارات', 'عقارات', 'seller', 'all',
 E'{{name}}، فريقنا جاهز يسجلك ويكتب إعلاناتك على مكسب\nما محتاجش تعمل حاجة — هنكتب كل حاجة عنك 💪\n\nاضغط للموافقة وهنبدأ فوراً:\n👉 {{consent_link}}',
 'ahmed', true)
ON CONFLICT DO NOTHING;

-- Message 3 (after consent) — Account ready
INSERT INTO outreach_templates
(name, name_ar, category, target_type, target_tier, message_text, agent, is_active)
VALUES
('funnel_msg3_cars', 'فانل رسالة 3 — سيارات', 'سيارات', 'seller', 'all',
 E'🎉 تم! حسابك جاهز على مكسب\nكتبنا إعلاناتك — ادخل وشوف:\n👉 {{magic_link}}',
 'waleed', true),
('funnel_msg3_props', 'فانل رسالة 3 — عقارات', 'عقارات', 'seller', 'all',
 E'🎉 تم! حسابك جاهز على مكسب\nكتبنا إعلاناتك — ادخل وشوف:\n👉 {{magic_link}}',
 'ahmed', true)
ON CONFLICT DO NOTHING;
