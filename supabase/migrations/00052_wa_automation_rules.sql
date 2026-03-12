-- WhatsApp Automation Rules
-- Defines templates and trigger rules for automated outreach

CREATE TABLE IF NOT EXISTS wa_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type VARCHAR(30) NOT NULL CHECK (
    trigger_type IN ('new_seller', 'followup', 'response', 'signup', 'milestone', 'scheduled')
  ),
  conditions JSONB DEFAULT '{}',

  -- Action
  action_type VARCHAR(20) NOT NULL DEFAULT 'send_template' CHECK (
    action_type IN ('send_template', 'send_text', 'assign', 'escalate', 'update_status')
  ),
  template_id TEXT,
  template_body TEXT,
  delay_minutes INTEGER DEFAULT 0,

  -- Control
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 50,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE wa_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to wa_automation_rules" ON wa_automation_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══ Seed: 14 automation rules ═══

-- === 1-3: Welcome messages by seller type ===
INSERT INTO wa_automation_rules (name, description, trigger_type, conditions, action_type, template_id, template_body, priority) VALUES

-- 1. Whale welcome
('acq_welcome_whale_v1', 'ترحيب بالحيتان (20+ إعلان)', 'new_seller',
 '{"seller_type": "whale"}',
 'send_template', 'acq_welcome_whale_v1',
 'السلام عليكم {{first_name}} 👋

أنا من فريق مكسب — أكبر سوق إلكتروني جديد في مصر.

لاحظنا إنك من أكبر المعلنين في قسم {{category_name_ar}} على {{competitor_name}} ({{listings_count}} إعلان 🔥)

عندنا عرض خاص ليك:
✅ حساب تاجر مميز مجاناً
✅ إعلاناتك تتنقل تلقائياً
✅ ظهور أولوية في نتائج البحث
✅ تقارير وتحليلات لإعلاناتك

تحب أعرفك أكتر؟ 🤝',
 100),

-- 2. Business welcome (phones/vehicles)
('acq_welcome_business_v1', 'ترحيب بالتجار', 'new_seller',
 '{"seller_type": "business"}',
 'send_template', 'acq_welcome_business_v1',
 'أهلاً {{first_name}} 👋

أنا من فريق مكسب — سوق إلكتروني جديد في مصر.

شايفين إنك بتبيع {{category_name_ar}} على {{competitor_name}} وعندك {{listings_count}} إعلان.

مكسب هيوفرلك:
✅ عرض إعلاناتك لعملاء جدد
✅ نظام رسائل ومزادات متطور
✅ بدون عمولة إجبارية

عايز تجرب مجاناً؟ سجّل من هنا:
{{join_url}}',
 80),

-- 3. General welcome
('acq_welcome_general_v1', 'ترحيب عام', 'new_seller',
 '{"seller_type": "individual"}',
 'send_template', 'acq_welcome_general_v1',
 'أهلاً {{first_name}} 👋

أنا من فريق مكسب — سوق إلكتروني جديد في مصر.

لاحظنا إعلانك على {{competitor_name}} في قسم {{category_name_ar}}.

مكسب مجاني بالكامل وبيوفرلك:
✅ وصول لعملاء جدد
✅ شات مباشر مع المشترين
✅ نظام مزادات ذكي

جرّب مجاناً:
{{join_url}}',
 50),

-- === 4. Category-specific: Phones ===
('acq_welcome_phones_v1', 'ترحيب لتجار الموبايلات', 'new_seller',
 '{"category": "phones", "seller_type": "business"}',
 'send_template', 'acq_welcome_phones_v1',
 'أهلاً {{first_name}} 👋

شايفين إنك بتبيع موبايلات على {{competitor_name}} 📱

مكسب عنده مميزات خاصة لتجار الموبايلات:
✅ قسم موبايلات متخصص بفلاتر ذكية
✅ نظام مزادات (بيزود سعر البيع 20%)
✅ عملاء جدد من كل مصر

سجّل مجاناً:
{{join_url}}',
 90),

-- === 5. Category-specific: Vehicles ===
('acq_welcome_vehicles_v1', 'ترحيب لتجار السيارات', 'new_seller',
 '{"category": "vehicles", "seller_type": "business"}',
 'send_template', 'acq_welcome_vehicles_v1',
 'أهلاً {{first_name}} 👋

شايفين إنك بتبيع سيارات على {{competitor_name}} 🚗

مكسب عنده مميزات خاصة لتجار السيارات:
✅ فلاتر متخصصة (ماركة، موديل، سنة، كيلومتراج)
✅ نظام مزادات مع حماية ضد التلاعب
✅ وصول لمشترين جدد

سجّل مجاناً:
{{join_url}}',
 90),

-- === 6-8: Follow-up sequences ===

-- 6. Follow-up after 24h (no response)
('followup_24h', 'متابعة بعد 24 ساعة', 'followup',
 '{"hours_since_last": 24}',
 'send_template', 'followup_24h',
 'أهلاً {{first_name}} 👋

بعتلك رسالة إمبارح عن مكسب — سوق إلكتروني جديد في مصر.

لو عندك أي سؤال أنا موجود!
أو سجّل مباشرة من هنا:
{{join_url}}',
 60),

-- 7. Follow-up after 48h (value offer)
('followup_48h', 'متابعة بعد 48 ساعة — عرض قيمة', 'followup',
 '{"hours_since_last": 48}',
 'send_template', 'followup_48h',
 '{{first_name}}، عارف إنك مشغول 😊

بس حبيت أقولك إن أول 100 تاجر على مكسب هياخدوا:
🎁 حساب مميز مجاني 3 شهور
🎁 ظهور أولوية في نتائج البحث
🎁 دعم فني خاص

لسه الفرصة موجودة!
{{join_url}}',
 55),

-- 8. Final follow-up after 72h
('followup_72h', 'متابعة أخيرة بعد 72 ساعة', 'followup',
 '{"hours_since_last": 72}',
 'send_template', 'followup_72h',
 '{{first_name}}، آخر رسالة مني 🙏

لو مش مهتم دلوقتي مفيش مشكلة خالص.
بس لو غيّرت رأيك في أي وقت:
{{join_url}}

بالتوفيق! 💚',
 50),

-- === 9-10: Response handling ===

-- 9. Positive response
('response_positive', 'رد إيجابي — إرشاد للتسجيل', 'response',
 '{"intent": "interested"}',
 'send_template', 'response_positive',
 'تمام يا {{first_name}}! 🎉

التسجيل سهل جداً ومش هياخد دقيقة:
1️⃣ ادخل على {{join_url}}
2️⃣ سجّل برقم موبايلك
3️⃣ إعلاناتك تتنقل تلقائياً

لو محتاج مساعدة أنا هنا! 💚',
 70),

-- 10. Question response
('response_question', 'رد على سؤال', 'response',
 '{"intent": "question"}',
 'send_text', 'response_question',
 NULL,
 65),

-- === 11-12: Signup & onboarding ===

-- 11. Welcome after signup
('signup_welcome', 'ترحيب بعد التسجيل', 'signup',
 '{}',
 'send_template', 'signup_welcome',
 'مبروك يا {{first_name}}! 🎉🎉

تم تسجيلك على مكسب بنجاح!

الخطوات الجاية:
1️⃣ كمّل بياناتك الشخصية
2️⃣ أضف أول إعلان ليك
3️⃣ ابدأ استقبل عملاء جدد

أي سؤال أنا موجود! 💚',
 80),

-- 12. Onboarding: first ad reminder
('onboarding_first_ad', 'تذكير بنشر أول إعلان', 'milestone',
 '{"event": "no_ads_after_24h"}',
 'send_template', 'onboarding_first_ad',
 'أهلاً {{first_name}} 👋

لاحظنا إنك لسه ما نشرتش أول إعلان على مكسب.

نشر الإعلان مش هياخد دقيقة:
✅ صور + سعر + وصف تلقائي
✅ هيوصل لآلاف المشترين

ابدأ دلوقتي:
https://maksab.app/ad/create',
 60),

-- === 13-14: Growth ===

-- 13. Milestone: 5 listings
('milestone_5_listings', 'إنجاز: 5 إعلانات', 'milestone',
 '{"event": "listings_count_5"}',
 'send_template', 'milestone_5_listings',
 'يا بطل يا {{first_name}}! 🔥

نشرت 5 إعلانات على مكسب — ده إنجاز!

كمكافأة ليك:
⭐ حصلت على بادج "بائع نشط"
⭐ إعلاناتك هتظهر في الأولوية

كمّل كده! 💪',
 40),

-- 14. Referral program
('growth_referral', 'برنامج الإحالة', 'milestone',
 '{"event": "first_sale"}',
 'send_template', 'growth_referral',
 'مبروك أول صفقة يا {{first_name}}! 🎉

عارف إنك ممكن تكسب أكتر؟
كل ما تدعو صاحبك يسجّل على مكسب:
🎁 أنت وهو تاخدوا ظهور مجاني

شارك رابطك:
https://maksab.app/ref/{{first_name}}',
 30);
