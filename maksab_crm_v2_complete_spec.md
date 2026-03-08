# مكسب — Maksab CRM v2.0
## المواصفات التقنية الشاملة والتفصيلية لنظام إدارة علاقات العملاء
### الإصدار: 2.0 Final | مارس 2026
### للتنفيذ عبر Claude Code — اقرأ الملف كاملاً قبل بدء أي تنفيذ

---

## ⚠️ تعليمات إلزامية لـ Claude Code

1. **اقرأ هذا الملف بالكامل** قبل كتابة أي سطر كود
2. **نفذ Sprint بـ Sprint** — لا تقفز بين الأقسام
3. **اختبر كل وحدة** قبل الانتقال للتالية
4. **كل الواجهات RTL بالعربية** — لا استثناء
5. **كل SQL يُنفذ على Supabase** — استخدم Dashboard أو migrations
6. **اسألني** إذا أي نقطة غير واضحة

---

## 🏢 عن تطبيق مكسب

**مكسب** (Maksab = "ربح" بالعربية) هو أول تطبيق مصري شامل للبيع والشراء والتبادل والمزادات. يستهدف سوق مصر (114 مليون نسمة، 96+ مليون مستخدم إنترنت) ويتنافس مع دوبيزل/OLX وفيسبوك ماركتبليس.

### نموذج الإيرادات المتكامل (يجب أن يتكامل CRM معه بالكامل):

#### 1. عمولة طوعية للأفراد (Voluntary Commission)
- **النسبة**: 1% من قيمة الصفقة
- **الحد الأدنى**: 10 جنيهات مصرية
- **الحد الأقصى**: 200 جنيه مصري
- **الطبيعة**: طوعية 100% — لا إجبار ولا عقوبة لعدم الدفع
- **التوقيت**: بعد إتمام الصفقة (البائع يؤكد + المشتري يؤكد)
- **الحوافز**: شارة "داعم مكسب 💚" + أولوية في الظهور + نقاط ولاء إضافية
- **الدفع**: InstaPay / Fawry / Vodafone Cash / بطاقة

#### 2. اشتراكات وباقات التجار (Merchant Subscriptions)
```
باقة أساسية (مجانية):
  - 10 إعلانات نشطة
  - حساب تاجر عادي
  - دعم عبر التطبيق

باقة فضية (99 ج.م/شهر أو 999 ج.م/سنة):
  - 50 إعلان نشط
  - 3 إعلانات مميزة/شهر
  - شارة تاجر موثق
  - إحصائيات أساسية
  - دعم أولوي

باقة ذهبية (249 ج.م/شهر أو 2,499 ج.م/سنة):
  - 200 إعلان نشط
  - 10 إعلانات مميزة/شهر
  - شارة تاجر ذهبي
  - إحصائيات متقدمة
  - صفحة متجر مخصصة
  - دعم VIP
  - أدوات إدارة المخزون

باقة بلاتينية (499 ج.م/شهر أو 4,999 ج.م/سنة):
  - إعلانات غير محدودة
  - إعلانات مميزة غير محدودة
  - شارة تاجر بلاتيني
  - تحليلات متقدمة + تقارير
  - صفحة متجر مميزة + SEO
  - مدير حساب مخصص
  - API للتكامل مع أنظمته
  - أولوية مطلقة في الظهور
```

#### 3. خدمات إضافية مدفوعة (Add-ons)
```
إعلان مميز (Featured):     15 ج.م / 7 أيام
رفع إعلان (Boost):          5 ج.م / 24 ساعة
إعادة نشر (Republish):      3 ج.م / مرة
شارة موثق (Verified Badge): 25 ج.م / شهر (للأفراد)
تقرير سوق (Market Report):  50 ج.م / تقرير
```

### Stack التقني:
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime + Storage)
- **Frontend**: Next.js 14+ (App Router) / React 18+ / Tailwind CSS
- **Deployment**: Vercel (Frontend) + Railway (Cron Jobs/Workers)
- **Messaging**: WhatsApp Business Cloud API + Twilio (SMS) + Resend (Email)
- **AI**: Claude API (Anthropic) — claude-sonnet-4-20250514
- **Payments**: Paymob + Fawry + InstaPay + Vodafone Cash
- **Design**: Green (#1B5E20) + Gold (#D4A017) + White | Arabic RTL | Mobile-First

### الفئات الـ 12:
```
phones        — موبايلات وتابلت
electronics   — إلكترونيات وكمبيوتر
vehicles      — سيارات ومركبات
properties    — عقارات
furniture     — أثاث ومفروشات
fashion       — أزياء وموضة
kids          — أطفال ومستلزمات
sports        — رياضة وهوايات
pets          — حيوانات أليفة
jobs          — وظائف
services      — خدمات
other         — أخرى
```

### المحافظات المستهدفة (بالأولوية):
```
Tier 1 (أولوية قصوى): cairo, alexandria, giza
Tier 2 (أولوية عالية): qalyubia, sharqia, dakahlia, gharbia
Tier 3 (أولوية متوسطة): monufia, beheira, fayoum, minya
Tier 4 (باقي المحافظات): 17 محافظة أخرى
```

---

## 🏗️ البنية المعمارية — 10 Modules في 4 Layers

```
╔═══════════════════════════════════════════════════════════════════╗
║                     MAKSAB CRM v2.0                              ║
║                                                                   ║
║  🔴 LAYER 1: ACQUISITION (اكتساب العملاء)                        ║
║  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐           ║
║  │   Module 1    │→│   Module 2    │→│   Module 3    │           ║
║  │   Discovery   │ │   Scoring &   │ │   Outreach    │           ║
║  │   Engine      │ │   Enrichment  │ │   Engine      │           ║
║  └───────────────┘ └───────────────┘ └───────────────┘           ║
║                                                                   ║
║  🟢 LAYER 2: CONVERSION (التحويل)                                 ║
║  ┌───────────────┐ ┌───────────────┐                             ║
║  │   Module 4    │→│   Module 5    │                             ║
║  │   Onboarding  │ │   Listing     │                             ║
║  │   Portal      │ │   Assistant   │                             ║
║  └───────────────┘ └───────────────┘                             ║
║                                                                   ║
║  🔵 LAYER 3: RETENTION & REVENUE (الاحتفاظ والإيرادات)           ║
║  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐           ║
║  │   Module 6    │ │   Module 7    │ │   Module 8    │           ║
║  │   Customer    │ │   Revenue &   │ │   CS Agent    │           ║
║  │   Care        │ │   Loyalty     │ │   Workspace   │           ║
║  └───────────────┘ └───────────────┘ └───────────────┘           ║
║                                                                   ║
║  🟡 LAYER 4: INTELLIGENCE (الذكاء والتحليلات)                    ║
║  ┌───────────────┐ ┌───────────────┐                             ║
║  │   Module 9    │ │   Module 10   │                             ║
║  │   Analytics & │ │   AI Engine   │                             ║
║  │   Investor    │ │               │                             ║
║  └───────────────┘ └───────────────┘                             ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────┐     ║
║  │          Supabase Unified Database Layer                 │     ║
║  │    PostgreSQL + Realtime + Edge Functions + Storage      │     ║
║  └─────────────────────────────────────────────────────────┘     ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 📊 قاعدة البيانات الموحدة (Unified Database)

### ⚡ تعليمات: أنشئ كل الجداول التالية في Supabase قبل أي شيء آخر.

```sql
-- ══════════════════════════════════════════════════════════
-- TABLE 1: crm_customers — الجدول الرئيسي الأهم
-- يجمع كل أنواع العملاء: أفراد + تجار، بائعين + مشترين
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ═══ IDENTITY (الهوية) ═══
  full_name TEXT NOT NULL,
  display_name TEXT,                    -- الاسم المعروض في التطبيق
  phone TEXT UNIQUE NOT NULL,           -- رقم الهاتف المصري (01xxxxxxxxx)
  phone_verified BOOLEAN DEFAULT false,
  whatsapp TEXT,                        -- رقم واتساب (قد يختلف عن الهاتف)
  whatsapp_verified BOOLEAN DEFAULT false,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  national_id TEXT,                     -- الرقم القومي (اختياري للتوثيق)
  
  -- ═══ ACCOUNT TYPE (نوع الحساب) ═══
  account_type TEXT NOT NULL DEFAULT 'individual',
    -- 'individual'    — فرد عادي
    -- 'store'         — متجر صغير
    -- 'chain'         — سلسلة محلات
    -- 'wholesaler'    — تاجر جملة
    -- 'manufacturer'  — مصنع/منتج
  
  role TEXT NOT NULL DEFAULT 'both',
    -- 'buyer'  — مشتري فقط
    -- 'seller' — بائع فقط
    -- 'both'   — بائع ومشتري
  
  is_verified BOOLEAN DEFAULT false,
  verification_level TEXT DEFAULT 'none',
    -- 'none'             — غير موثق
    -- 'phone'            — موثق بالهاتف
    -- 'id'               — موثق بالرقم القومي
    -- 'business_license' — موثق برخصة تجارية
    -- 'premium'          — توثيق متقدم (زيارة ميدانية)
  
  -- ═══ BUSINESS INFO (بيانات تجارية — للمتاجر فقط) ═══
  business_name TEXT,
  business_name_ar TEXT,
  business_license_number TEXT,
  tax_id TEXT,
  business_category TEXT,
  business_description TEXT,
  business_logo_url TEXT,
  business_cover_url TEXT,
  website_url TEXT,
  
  -- ═══ SUBSCRIPTION (اشتراك التاجر) ═══
  subscription_plan TEXT DEFAULT 'free',
    -- 'free'      — مجاني (10 إعلانات)
    -- 'silver'    — فضي (99 ج.م/شهر)
    -- 'gold'      — ذهبي (249 ج.م/شهر)
    -- 'platinum'  — بلاتيني (499 ج.م/شهر)
  subscription_billing TEXT DEFAULT 'none',
    -- 'none' | 'monthly' | 'annual'
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  subscription_auto_renew BOOLEAN DEFAULT true,
  max_active_listings INTEGER DEFAULT 5,   -- حسب الباقة
  max_featured_listings INTEGER DEFAULT 0,  -- حسب الباقة
  
  -- ═══ LOCATION (الموقع) ═══
  governorate TEXT,                     -- المحافظة
  city TEXT,                            -- المدينة
  area TEXT,                            -- المنطقة
  address TEXT,                         -- العنوان التفصيلي
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  
  -- ═══ CATEGORIES (الفئات) ═══
  primary_category TEXT,
  secondary_categories TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',        -- اهتمامات المشتري (ماذا يبحث عنه)
  
  -- ═══ SOURCE & ACQUISITION (مصدر الاكتساب) ═══
  source TEXT NOT NULL DEFAULT 'organic',
    -- 'organic'              — جاء بنفسه
    -- 'whatsapp_campaign'    — حملة واتساب
    -- 'sms_campaign'         — حملة SMS
    -- 'email_campaign'       — حملة إيميل
    -- 'facebook_ad'          — إعلان فيسبوك
    -- 'google_ad'            — إعلان جوجل
    -- 'tiktok_ad'            — إعلان تيكتوك
    -- 'referral'             — إحالة من عميل آخر
    -- 'cs_agent'             — موظف خدمة عملاء
    -- 'import_csv'           — استيراد من ملف
    -- 'competitor_migration' — انتقال من منافس
    -- 'facebook_group'       — جروب فيسبوك
    -- 'instagram'            — انستجرام
    -- 'landing_page'         — صفحة هبوط
    -- 'qr_code'              — كود QR
    -- 'offline_event'        — حدث/معرض
    -- 'partnership'          — شراكة (Fawry/Vodafone)
    -- 'app_store'            — متجر التطبيقات
  source_detail TEXT,                   -- اسم الحملة/الجروب/الإعلان المحدد
  source_url TEXT,                      -- رابط المصدر
  source_platform TEXT,                 -- 'dubizzle' | 'facebook' | 'olx' | etc.
  referral_code TEXT,                   -- كود الإحالة الخاص به (للإحالات الصادرة)
  referred_by UUID REFERENCES crm_customers(id), -- من أحاله (للإحالات الواردة)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- ═══ LIFECYCLE (دورة الحياة) ═══
  lifecycle_stage TEXT DEFAULT 'lead',
    -- ══ مراحل ما قبل التسجيل ══
    -- 'anonymous'     — زائر مجهول (لا نعرف بياناته بعد)
    -- 'lead'          — عميل محتمل (لدينا هاتفه أو بريده)
    -- 'qualified'     — مؤهل (score عالي، يستحق التواصل)
    -- 'contacted'     — تم إرسال رسالة له
    -- 'responded'     — رد على رسالتنا
    -- 'interested'    — أبدى اهتمام صريح
    -- ══ مراحل التسجيل ══
    -- 'onboarding'    — بدأ التسجيل
    -- 'activated'     — سجل بنجاح ونشر أول إعلان أو أول تفاعل
    -- ══ مراحل النشاط ══
    -- 'active'        — يستخدم التطبيق بانتظام (نشاط خلال 7 أيام)
    -- 'power_user'    — مستخدم قوي (10+ إعلان أو 5+ صفقة/شهر)
    -- 'champion'      — بطل (يحيل آخرين + نشط جداً + يدفع عمولة)
    -- ══ مراحل الخطر ══
    -- 'at_risk'       — معرض للمغادرة (لم يستخدم 14+ يوم)
    -- 'dormant'       — خامل (لم يستخدم 30+ يوم)
    -- 'churned'       — غادر (لم يستخدم 60+ يوم)
    -- ══ مراحل خاصة ══
    -- 'reactivated'   — عاد بعد مغادرة
    -- 'blacklisted'   — محظور (spam/fraud)
  
  lifecycle_changed_at TIMESTAMPTZ DEFAULT now(),
  lifecycle_history JSONB DEFAULT '[]',
  -- Format: [{"stage": "lead", "at": "2026-03-01T..."}, {"stage": "contacted", "at": "..."}]
  
  -- ═══ SCORING (التقييم — 4 مقاييس + مقياس مركب) ═══
  acquisition_score INTEGER DEFAULT 0,   -- 0-100: أولوية الاكتساب (مدى أهمية اكتسابه)
  engagement_score INTEGER DEFAULT 0,    -- 0-100: مستوى التفاعل (مدى نشاطه)
  value_score INTEGER DEFAULT 0,         -- 0-100: القيمة المالية (مدى إيراده)
  churn_risk_score INTEGER DEFAULT 0,    -- 0-100: خطر المغادرة (مدى احتمال خسارته)
  health_score INTEGER DEFAULT 0,        -- 0-100: الصحة العامة (مركب من الأربعة)
  scores_updated_at TIMESTAMPTZ,
  
  -- ═══ ACTIVITY METRICS (مقاييس النشاط) ═══
  total_listings INTEGER DEFAULT 0,           -- إجمالي الإعلانات المنشورة (تاريخياً)
  active_listings INTEGER DEFAULT 0,          -- الإعلانات النشطة حالياً
  total_sales INTEGER DEFAULT 0,              -- عمليات البيع المكتملة
  total_purchases INTEGER DEFAULT 0,          -- عمليات الشراء المكتملة
  total_exchanges INTEGER DEFAULT 0,          -- عمليات التبادل المكتملة
  total_auctions_created INTEGER DEFAULT 0,   -- مزادات أنشأها
  total_auctions_won INTEGER DEFAULT 0,       -- مزادات فاز بها
  total_views_received INTEGER DEFAULT 0,     -- مشاهدات إعلاناته
  total_messages_received INTEGER DEFAULT 0,  -- رسائل استلمها من مهتمين
  avg_response_time_minutes INTEGER,          -- متوسط وقت الرد على الرسائل
  avg_listing_quality_score NUMERIC(3,1),     -- متوسط جودة إعلاناته (AI)
  
  -- ═══ REVENUE METRICS (مقاييس الإيراد) ═══
  -- للأفراد:
  total_gmv_egp NUMERIC DEFAULT 0,            -- إجمالي قيمة الصفقات (GMV)
  total_commission_paid_egp NUMERIC DEFAULT 0, -- إجمالي العمولة المدفوعة طوعياً
  commission_payment_rate NUMERIC(5,2) DEFAULT 0, -- نسبة الصفقات التي دفع فيها عمولة
  is_commission_supporter BOOLEAN DEFAULT false,   -- هل هو "داعم مكسب"؟
  last_commission_paid_at TIMESTAMPTZ,
  -- للتجار:
  total_subscription_paid_egp NUMERIC DEFAULT 0,   -- إجمالي الاشتراكات المدفوعة
  total_addons_paid_egp NUMERIC DEFAULT 0,         -- إجمالي الخدمات الإضافية
  total_featured_purchased INTEGER DEFAULT 0,       -- عدد الإعلانات المميزة المشتراة
  total_boosts_purchased INTEGER DEFAULT 0,         -- عدد عمليات الرفع المشتراة
  
  -- ═══ COMMUNICATION PREFERENCES (تفضيلات التواصل) ═══
  preferred_channel TEXT DEFAULT 'whatsapp',
    -- 'whatsapp' | 'sms' | 'email' | 'in_app' | 'phone_call'
  preferred_language TEXT DEFAULT 'ar',
  notification_enabled BOOLEAN DEFAULT true,
  marketing_consent BOOLEAN DEFAULT true,
  marketing_consent_at TIMESTAMPTZ,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  do_not_contact BOOLEAN DEFAULT false,
  do_not_contact_reason TEXT,
  
  -- ═══ OUTREACH TRACKING (تتبع التواصل) ═══
  outreach_attempts INTEGER DEFAULT 0,
  last_outreach_at TIMESTAMPTZ,
  last_outreach_channel TEXT,
  last_response_at TIMESTAMPTZ,
  last_response_sentiment TEXT,        -- 'positive' | 'neutral' | 'negative'
  
  -- ═══ APP ACTIVITY (نشاط التطبيق) ═══
  last_active_at TIMESTAMPTZ,
  last_app_open_at TIMESTAMPTZ,
  last_listing_posted_at TIMESTAMPTZ,
  last_transaction_at TIMESTAMPTZ,
  first_listing_at TIMESTAMPTZ,
  first_transaction_at TIMESTAMPTZ,
  app_sessions_count INTEGER DEFAULT 0,
  days_since_last_active INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (now() - COALESCE(last_active_at, created_at)))
  ) STORED,
  
  -- ═══ ASSIGNMENT (التعيين) ═══
  assigned_agent_id UUID REFERENCES crm_agents(id),
  assigned_at TIMESTAMPTZ,
  
  -- ═══ LOYALTY (الولاء) ═══
  loyalty_tier TEXT DEFAULT 'bronze',
    -- 'bronze'   — 0-99 نقطة
    -- 'silver'   — 100-499 نقطة
    -- 'gold'     — 500-1999 نقطة
    -- 'platinum' — 2000-9999 نقطة
    -- 'diamond'  — 10000+ نقطة
  loyalty_points INTEGER DEFAULT 0,
  loyalty_points_lifetime INTEGER DEFAULT 0, -- إجمالي النقاط المكتسبة تاريخياً
  loyalty_tier_upgraded_at TIMESTAMPTZ,
  lifetime_value_egp NUMERIC DEFAULT 0,      -- LTV = عمولة + اشتراك + خدمات
  
  -- ═══ COMPETITOR INFO (معلومات المنافسين) ═══
  competitor_profiles JSONB DEFAULT '{}',
  -- Format: {
  --   "dubizzle": {"url": "https://...", "listings": 41, "verified": true, "last_checked": "..."},
  --   "facebook": {"groups": ["group1", "group2"], "marketplace": true},
  --   "olx": {"url": "...", "listings": 15}
  -- }
  estimated_competitor_listings INTEGER DEFAULT 0,
  migrated_from TEXT,                        -- 'dubizzle' | 'olx' | 'facebook' | etc.
  
  -- ═══ TAGS & NOTES (وسوم وملاحظات) ═══
  tags TEXT[] DEFAULT '{}',
  -- أمثلة: ['vip', 'high_value', 'phone_trader', 'needs_followup', 'arabic_only', 'english_ok']
  internal_notes TEXT,
  
  -- ═══ LINK TO APP USER (ربط بمستخدم التطبيق) ═══
  app_user_id UUID,  -- REFERENCES auth.users(id) — يُربط عند التسجيل في التطبيق
  
  -- ═══ TIMESTAMPS ═══
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══ PERFORMANCE INDEXES ══
CREATE INDEX idx_crm_cust_lifecycle ON crm_customers(lifecycle_stage);
CREATE INDEX idx_crm_cust_category ON crm_customers(primary_category);
CREATE INDEX idx_crm_cust_gov ON crm_customers(governorate);
CREATE INDEX idx_crm_cust_health ON crm_customers(health_score DESC);
CREATE INDEX idx_crm_cust_source ON crm_customers(source);
CREATE INDEX idx_crm_cust_agent ON crm_customers(assigned_agent_id);
CREATE INDEX idx_crm_cust_loyalty ON crm_customers(loyalty_tier);
CREATE INDEX idx_crm_cust_churn ON crm_customers(churn_risk_score DESC) WHERE lifecycle_stage = 'at_risk';
CREATE INDEX idx_crm_cust_phone ON crm_customers(phone);
CREATE INDEX idx_crm_cust_active ON crm_customers(last_active_at DESC NULLS LAST);
CREATE INDEX idx_crm_cust_sub ON crm_customers(subscription_plan) WHERE account_type != 'individual';
CREATE INDEX idx_crm_cust_commission ON crm_customers(is_commission_supporter) WHERE is_commission_supporter = true;
CREATE INDEX idx_crm_cust_type ON crm_customers(account_type, role);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crm_customers_updated
  BEFORE UPDATE ON crm_customers
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- ══════════════════════════════════════════════════════════
-- TABLE 2: crm_conversations — صندوق الوارد الموحد
-- كل رسالة من/إلى أي عميل عبر أي قناة
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Channel & Direction
  channel TEXT NOT NULL,              -- 'whatsapp' | 'sms' | 'email' | 'in_app_chat' | 'phone_call' | 'facebook_messenger'
  direction TEXT NOT NULL,            -- 'inbound' (من العميل) | 'outbound' (إلى العميل)
  message_type TEXT DEFAULT 'text',   -- 'text' | 'image' | 'video' | 'document' | 'template' | 'voice' | 'location' | 'system'
  
  -- Content
  content TEXT,                       -- نص الرسالة
  content_translated TEXT,            -- ترجمة إنجليزية (AI) — للتحليل
  media_urls TEXT[],                  -- مرفقات (صور/فيديو/ملفات)
  template_id TEXT,                   -- إذا كانت رسالة قالب (WhatsApp Template)
  
  -- Status
  status TEXT DEFAULT 'sent',
    -- 'queued'    — في طابور الإرسال
    -- 'sending'   — جاري الإرسال
    -- 'sent'      — تم الإرسال
    -- 'delivered' — تم التسليم
    -- 'read'      — تمت القراءة
    -- 'replied'   — تم الرد عليها
    -- 'failed'    — فشل الإرسال
    -- 'blocked'   — محظور
  
  -- Campaign & Agent
  campaign_id UUID REFERENCES crm_campaigns(id),
  agent_id UUID REFERENCES crm_agents(id),
  is_automated BOOLEAN DEFAULT false,  -- هل أرسلها النظام تلقائياً أم موظف؟
  
  -- AI Analysis (يُملأ تلقائياً للرسائل الواردة)
  sentiment TEXT,                      -- 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  intent TEXT,                         -- 'interested' | 'question' | 'complaint' | 'purchase_intent' | 'price_inquiry' | 'how_to' | 'unsubscribe' | 'spam' | 'other'
  ai_suggested_response TEXT,          -- رد مقترح من AI
  requires_human_response BOOLEAN DEFAULT false,
  
  -- External IDs (لتتبع الحالة من مزودي الخدمة)
  external_message_id TEXT,            -- WhatsApp/Twilio message ID
  external_status TEXT,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conv_customer ON crm_conversations(customer_id, created_at DESC);
CREATE INDEX idx_conv_agent ON crm_conversations(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_conv_queue ON crm_conversations(status, scheduled_at) WHERE status = 'queued';
CREATE INDEX idx_conv_unread ON crm_conversations(customer_id, status) WHERE direction = 'inbound' AND status != 'replied';
CREATE INDEX idx_conv_campaign ON crm_conversations(campaign_id) WHERE campaign_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════
-- TABLE 3: crm_campaigns — إدارة الحملات
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campaign Identity
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL,
    -- ══ أنواع الحملات ══
    -- 'acquisition'    — اكتساب عملاء جدد (leads → interested)
    -- 'activation'     — تفعيل مسجلين جدد (onboarding → activated)
    -- 'engagement'     — زيادة تفاعل (active → power_user)
    -- 'retention'      — منع المغادرة (at_risk → active)
    -- 'reactivation'   — إعادة تنشيط (dormant/churned → reactivated)
    -- 'upsell'         — ترقية باقة (free → silver → gold)
    -- 'commission'     — تشجيع دفع العمولة الطوعية
    -- 'promotion'      — عروض ترويجية (رمضان/أعياد/etc)
    -- 'loyalty'        — برنامج الولاء (ترقية tier)
    -- 'referral'       — تشجيع الإحالات
    -- 'announcement'   — إعلانات عامة (ميزة جديدة/تحديث)
    -- 'survey'         — استبيان رضا (NPS/CSAT)
  
  -- Targeting Filters (من يستهدف)
  target_filters JSONB NOT NULL DEFAULT '{}',
  /*
    كل filter اختياري. إذا لم يُحدد = الكل.
    {
      "lifecycle_stages": ["lead", "qualified"],
      "categories": ["phones", "electronics"],
      "governorates": ["cairo", "alexandria"],
      "account_types": ["individual", "store"],
      "roles": ["seller", "both"],
      "min_health_score": 50,
      "max_health_score": 100,
      "min_acquisition_score": 60,
      "loyalty_tiers": ["bronze", "silver"],
      "subscription_plans": ["free"],
      "is_commission_supporter": false,
      "tags_include": ["high_value"],
      "tags_exclude": ["do_not_contact", "blacklisted"],
      "min_days_since_active": 0,
      "max_days_since_active": 30,
      "min_listings": 0,
      "max_outreach_attempts": 3,
      "source": ["facebook_group", "competitor_migration"],
      "created_after": "2026-01-01",
      "created_before": "2026-03-31"
    }
  */
  
  -- Message Sequence (Drip Campaign)
  messages JSONB NOT NULL DEFAULT '[]',
  /*
    مصفوفة من الرسائل المتتالية:
    [
      {
        "sequence": 1,
        "delay_hours": 0,            -- 0 = فوراً
        "channel": "whatsapp",       -- القناة
        "template_id": "acq_welcome_v1",
        "content_ar": "نص الرسالة بالعربي مع {{placeholders}}",
        "media_url": null,           -- رابط صورة/فيديو (اختياري)
        "stop_if_responded": true,   -- توقف إذا رد العميل
        "stop_if_stage_changed": true -- توقف إذا تغيرت مرحلته
      },
      {
        "sequence": 2,
        "delay_hours": 48,
        "channel": "whatsapp",
        "template_id": "acq_followup_v1",
        "content_ar": "...",
        "stop_if_responded": true
      },
      {
        "sequence": 3,
        "delay_hours": 120,
        "channel": "sms",            -- يمكن تغيير القناة في كل رسالة
        "template_id": "acq_sms_offer_v1",
        "content_ar": "...",
        "stop_if_responded": true
      }
    ]
    
    Placeholders المتاحة:
    {{name}}           — اسم العميل
    {{first_name}}     — الاسم الأول
    {{category_ar}}    — اسم الفئة بالعربي
    {{city}}           — المدينة
    {{listings_count}} — عدد إعلاناته
    {{join_url}}       — رابط التسجيل الشخصي
    {{referral_url}}   — رابط الإحالة
    {{app_url}}        — رابط التطبيق
    {{promo_code}}     — كود الخصم
    {{agent_name}}     — اسم الموظف المعين
  */
  
  -- Schedule & Limits (الجدولة والحدود)
  status TEXT DEFAULT 'draft',
    -- 'draft'     — مسودة
    -- 'scheduled' — مجدولة
    -- 'active'    — نشطة (يتم إرسالها)
    -- 'paused'    — متوقفة مؤقتاً
    -- 'completed' — مكتملة
    -- 'archived'  — مؤرشفة
  
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Anti-Spam Limits (حدود ذكية)
  daily_send_limit INTEGER DEFAULT 500,
  hourly_send_limit INTEGER DEFAULT 50,
  send_window_start TIME DEFAULT '09:00',   -- لا ترسل قبل 9 صباحاً
  send_window_end TIME DEFAULT '21:00',     -- لا ترسل بعد 9 مساءً
  send_timezone TEXT DEFAULT 'Africa/Cairo',
  min_gap_between_messages_seconds INTEGER DEFAULT 15,  -- فاصل بين الرسائل
  max_messages_per_customer_per_week INTEGER DEFAULT 3,  -- حد أقصى لكل عميل
  
  -- A/B Testing (اختبار A/B)
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_variants JSONB,  -- نسخ مختلفة من الرسائل لاختبار أيها أفضل
  
  -- Results (النتائج — تُحدّث تلقائياً)
  stats JSONB DEFAULT '{
    "targeted": 0,
    "queued": 0,
    "sent": 0,
    "delivered": 0,
    "read": 0,
    "responded": 0,
    "positive_responses": 0,
    "negative_responses": 0,
    "converted": 0,
    "unsubscribed": 0,
    "failed": 0,
    "blocked": 0,
    "response_rate_pct": 0,
    "conversion_rate_pct": 0,
    "cost_egp": 0,
    "cost_per_acquisition_egp": 0,
    "revenue_generated_egp": 0,
    "roi_pct": 0
  }',
  
  -- Meta
  created_by UUID REFERENCES crm_agents(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════════
-- TABLE 4: crm_agents — فريق خدمة العملاء
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  user_id UUID,               -- REFERENCES auth.users(id)
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  employee_id TEXT,            -- رقم الموظف الداخلي
  
  -- Role & Permissions
  role TEXT NOT NULL DEFAULT 'agent',
    -- 'super_admin' — المؤسس (ممدوح) — كل الصلاحيات
    -- 'admin'       — مدير النظام
    -- 'manager'     — مدير فريق
    -- 'senior_agent'— موظف أول
    -- 'agent'       — موظف عادي
    -- 'intern'      — متدرب
  
  permissions JSONB DEFAULT '[]',
  /*
    [
      "view_all_customers",     -- عرض كل العملاء (ليس فقط المعينين)
      "edit_customers",         -- تعديل بيانات العملاء
      "delete_customers",       -- حذف عملاء
      "manage_campaigns",       -- إنشاء/تعديل الحملات
      "send_messages",          -- إرسال رسائل
      "view_analytics",         -- عرض التحليلات
      "export_data",            -- تصدير البيانات
      "manage_agents",          -- إدارة الموظفين
      "manage_promotions",      -- إدارة العروض والولاء
      "manage_subscriptions",   -- إدارة اشتراكات التجار
      "manage_settings",        -- إعدادات النظام
      "impersonate_customer",   -- الدخول كعميل (للدعم)
      "view_revenue",           -- عرض بيانات الإيرادات
      "manage_templates"        -- إدارة قوالب الرسائل
    ]
  */
  
  -- Specialization (التخصص)
  specialties TEXT[] DEFAULT '{}',       -- الفئات المتخصص فيها ['phones', 'electronics']
  assigned_governorates TEXT[] DEFAULT '{}', -- المحافظات المسؤول عنها
  max_customers INTEGER DEFAULT 500,     -- الحد الأقصى للعملاء المعينين
  current_customers_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  last_online_at TIMESTAMPTZ,
  current_status TEXT DEFAULT 'available',
    -- 'available' | 'busy' | 'break' | 'offline'
  
  -- Performance (تُحسب تلقائياً شهرياً)
  performance JSONB DEFAULT '{}',
  /*
    {
      "current_month": {
        "period": "2026-03",
        "customers_acquired": 150,        -- عملاء جدد اكتسبهم
        "customers_activated": 80,        -- عملاء فعّلهم
        "customers_retained": 200,        -- عملاء حافظ عليهم
        "customers_at_risk_saved": 15,    -- عملاء at_risk أنقذهم
        "response_time_avg_minutes": 4.5, -- متوسط وقت الرد
        "first_response_time_avg_min": 2, -- متوسط وقت الرد الأول
        "satisfaction_rating_avg": 4.8,   -- متوسط تقييم الرضا (من 5)
        "conversations_handled": 520,     -- محادثات تعامل معها
        "listings_assisted": 120,         -- إعلانات ساعد في نشرها
        "revenue_generated_egp": 15000,   -- إيراد حققه (عمولات + اشتراكات)
        "commission_collected_egp": 8500, -- عمولات جمعها
        "subscriptions_sold": 5,          -- اشتراكات باعها
        "upsells_completed": 3,           -- ترقيات باقات
        "kpi_composite_score": 87,        -- النقاط المركبة (من 100)
        "rank": 2                         -- ترتيبه بين الموظفين
      },
      "all_time": {
        "total_customers_acquired": 1200,
        "total_revenue_generated_egp": 120000,
        ...
      }
    }
  */
  
  -- KPI Targets (أهداف شهرية)
  monthly_targets JSONB DEFAULT '{
    "customers_to_acquire": 100,
    "customers_to_activate": 50,
    "response_time_max_minutes": 5,
    "satisfaction_min_rating": 4.5,
    "listings_to_assist": 80,
    "revenue_target_egp": 10000
  }',
  
  -- Compensation (العمولات والمكافآت)
  base_salary_egp NUMERIC DEFAULT 0,
  compensation_structure JSONB DEFAULT '{
    "per_acquisition_egp": 5,
    "per_activation_egp": 10,
    "per_listing_assisted_egp": 2,
    "per_retained_customer_egp": 3,
    "per_subscription_sold_pct": 10,
    "per_upsell_completed_egp": 25,
    "monthly_target_bonus_egp": 500,
    "quality_bonus_egp": 200,
    "quality_bonus_min_rating": 4.5,
    "top_performer_bonus_egp": 1000
  }',
  total_earned_egp NUMERIC DEFAULT 0,
  current_month_earned_egp NUMERIC DEFAULT 0,
  
  -- Work Schedule
  work_schedule JSONB DEFAULT '{
    "sunday": {"start": "09:00", "end": "17:00"},
    "monday": {"start": "09:00", "end": "17:00"},
    "tuesday": {"start": "09:00", "end": "17:00"},
    "wednesday": {"start": "09:00", "end": "17:00"},
    "thursday": {"start": "09:00", "end": "17:00"},
    "friday": null,
    "saturday": null
  }',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════════
-- TABLE 5: crm_message_templates — قوالب الرسائل
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_message_templates (
  id TEXT PRIMARY KEY,                  -- e.g., 'acq_welcome_phones_v1'
  
  name TEXT NOT NULL,                   -- اسم القالب
  description TEXT,                     -- وصف الغرض
  channel TEXT NOT NULL,                -- 'whatsapp' | 'sms' | 'email'
  category TEXT,                        -- فئة محددة أو null لكل الفئات
  campaign_type TEXT,                   -- نوع الحملة المناسب
  language TEXT DEFAULT 'ar',
  
  -- Content
  subject TEXT,                         -- عنوان الإيميل (لإيميل فقط)
  body TEXT NOT NULL,                   -- نص الرسالة مع {{placeholders}}
  media_url TEXT,                       -- رابط صورة/فيديو مرفق
  
  -- WhatsApp Business API
  wa_template_name TEXT,                -- اسم القالب المعتمد من Meta
  wa_template_status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  wa_template_category TEXT,            -- 'MARKETING' | 'UTILITY'
  
  -- Performance Tracking
  times_sent INTEGER DEFAULT 0,
  times_delivered INTEGER DEFAULT 0,
  times_read INTEGER DEFAULT 0,
  times_responded INTEGER DEFAULT 0,
  times_converted INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════════
-- TABLE 6: crm_promotions — العروض الترويجية
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_ar TEXT,
  
  promo_type TEXT NOT NULL,
    -- 'discount_commission'   — خصم على العمولة
    -- 'featured_listing'      — إعلان مميز مجاني
    -- 'free_boost'            — رفع مجاني
    -- 'subscription_discount' — خصم على الاشتراك
    -- 'commission_waiver'     — إعفاء من العمولة
    -- 'loyalty_points_bonus'  — نقاط ولاء إضافية
    -- 'verified_badge'        — شارة موثق مجاني
    -- 'priority_support'      — دعم أولوي
    -- 'cashback'              — استرداد نقدي
    -- 'bundle'                — حزمة (أكثر من عرض)
  
  -- Value
  value_type TEXT,            -- 'percentage' | 'fixed_amount' | 'quantity' | 'duration_days'
  value_amount NUMERIC,       -- 50 (%) أو 25 (ج.م) أو 3 (عدد) أو 30 (يوم)
  
  -- Targeting (من يستفيد)
  target_lifecycle_stages TEXT[] DEFAULT '{}',
  target_loyalty_tiers TEXT[] DEFAULT '{}',
  target_categories TEXT[] DEFAULT '{}',
  target_account_types TEXT[] DEFAULT '{}',
  target_subscription_plans TEXT[] DEFAULT '{}',
  min_listings INTEGER DEFAULT 0,
  min_transactions INTEGER DEFAULT 0,
  min_tenure_days INTEGER DEFAULT 0,     -- عدد أيام العضوية الأدنى
  new_customers_only BOOLEAN DEFAULT false,
  
  -- Validity
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  max_redemptions INTEGER,               -- حد أقصى للاستخدام الكلي
  max_per_customer INTEGER DEFAULT 1,    -- حد أقصى لكل عميل
  current_redemptions INTEGER DEFAULT 0,
  promo_code TEXT UNIQUE,                -- كود الخصم (اختياري)
  
  -- Auto-trigger (تلقائي عند حدث)
  auto_trigger BOOLEAN DEFAULT false,
  trigger_event TEXT,
    -- 'first_listing'        — أول إعلان
    -- 'first_sale'           — أول بيع
    -- 'first_exchange'       — أول تبادل
    -- 'first_auction'        — أول مزاد
    -- 'nth_listing'          — الإعلان رقم N
    -- 'first_commission'     — أول عمولة مدفوعة
    -- 'loyalty_upgrade'      — ترقية مستوى الولاء
    -- 'subscription_upgrade' — ترقية الاشتراك
    -- 'birthday'             — عيد ميلاد
    -- 'anniversary'          — ذكرى التسجيل
    -- 'reactivation'         — عودة بعد غياب
    -- 'referral_success'     — إحالة ناجحة
    -- 'at_risk_intervention' — تدخل عند خطر المغادرة
  trigger_conditions JSONB,
  
  -- Display
  banner_image_url TEXT,
  display_priority INTEGER DEFAULT 0,
  show_in_app BOOLEAN DEFAULT true,
  show_in_notification BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════════
-- TABLE 7: crm_loyalty_transactions — حركات نقاط الولاء
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE NOT NULL,
  
  transaction_type TEXT NOT NULL,
    -- 'earned'   — مكتسبة
    -- 'redeemed' — مستبدلة
    -- 'expired'  — منتهية الصلاحية
    -- 'adjusted' — تعديل يدوي
    -- 'bonus'    — مكافأة إضافية
  
  points INTEGER NOT NULL,              -- موجب للمكتسب، سالب للمستبدل
  balance_after INTEGER NOT NULL,       -- الرصيد بعد العملية
  
  reason TEXT NOT NULL,
    -- ══ أسباب الكسب ══
    -- 'listing_posted'      — 5 نقاط
    -- 'sale_completed'      — 20 نقطة
    -- 'purchase_completed'  — 10 نقاط
    -- 'exchange_completed'  — 15 نقطة
    -- 'auction_created'     — 10 نقاط
    -- 'auction_won'         — 25 نقطة
    -- 'referral_sent'       — 10 نقاط (عند الإرسال)
    -- 'referral_activated'  — 50 نقطة (عند تفعيل المُحال)
    -- 'daily_login'         — 1 نقطة
    -- 'profile_completed'   — 25 نقطة (مرة واحدة)
    -- 'review_given'        — 5 نقاط
    -- 'commission_paid'     — 30 نقطة (مكافأة على دفع العمولة)
    -- 'subscription_paid'   — 100 نقطة (مكافأة على الاشتراك)
    -- 'promotion_bonus'     — حسب العرض
    -- 'manual_adjustment'   — تعديل يدوي بواسطة admin
    -- ══ أسباب الاستبدال ══
    -- 'featured_listing'    — 50 نقطة = إعلان مميز (7 أيام)
    -- 'boost_listing'       — 30 نقطة = رفع إعلان (24 ساعة)
    -- 'verified_badge'      — 100 نقطة = شارة موثق (30 يوم)
    -- 'commission_discount' — 200 نقطة = خصم 50% عمولة (30 يوم)
    -- 'priority_support'    — 150 نقطة = دعم أولوي (30 يوم)
  
  reference_type TEXT,       -- 'listing' | 'transaction' | 'referral' | 'promotion' | 'agent'
  reference_id TEXT,         -- ID المرجع
  
  expires_at TIMESTAMPTZ,    -- تاريخ انتهاء الصلاحية (12 شهر افتراضياً)
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loyalty_customer ON crm_loyalty_transactions(customer_id, created_at DESC);


-- ══════════════════════════════════════════════════════════
-- TABLE 8: crm_listing_assists — مساعدة إنشاء الإعلانات
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_listing_assists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) NOT NULL,
  agent_id UUID REFERENCES crm_agents(id),
  
  assist_type TEXT NOT NULL,
    -- 'url_import'       — استيراد من رابط (المعلن يدخل رابط إعلانه)
    -- 'photo_bulk'       — رفع صور جماعي (AI يحلل)
    -- 'text_parse'       — تحليل نص منسوخ
    -- 'catalog_import'   — استيراد كاتالوج Excel/CSV
    -- 'manual_entry'     — إدخال يدوي عبر الفورم
    -- 'guided_wizard'    — معالج خطوة بخطوة
    -- 'agent_assisted'   — موظف ساعد في الإدخال
  
  source_url TEXT,
  source_platform TEXT,
  
  -- Items
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  approved_items INTEGER DEFAULT 0,
  published_items INTEGER DEFAULT 0,
  rejected_items INTEGER DEFAULT 0,
  
  -- Data
  raw_data JSONB,            -- البيانات الخام المستخرجة
  processed_data JSONB,      -- بعد معالجة AI
  
  -- Individual Items
  items JSONB DEFAULT '[]',
  /*
    [
      {
        "seq": 1,
        "original_title": "...",
        "original_price": 85000,
        "original_description": "...",
        "original_images": ["url1", "url2"],
        "original_category": "phones",
        "original_location": "القاهرة الجديدة",
        "ai_suggested_title": "...",
        "ai_suggested_price": 82000,
        "ai_suggested_category": "phones",
        "ai_suggested_condition": "used_like_new",
        "ai_quality_score": 85,
        "final_title": "...",
        "final_price": 85000,
        "status": "published",
        "listing_id": "uuid..."
      },
      ...
    ]
  */
  
  status TEXT DEFAULT 'pending',
    -- 'pending'    — في الانتظار
    -- 'processing' — جاري المعالجة
    -- 'review'     — بانتظار مراجعة المعلن
    -- 'publishing' — جاري النشر
    -- 'completed'  — مكتمل
    -- 'failed'     — فشل
    -- 'cancelled'  — ملغي
  
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);


-- ══════════════════════════════════════════════════════════
-- TABLE 9: crm_activity_log — سجل النشاط (Timeline)
-- كل حدث يخص أي عميل يُسجل هنا
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE NOT NULL,
  
  activity_type TEXT NOT NULL,
    -- ══ Lifecycle ══
    -- 'lifecycle_change'     — تغيير مرحلة (e.g., lead → contacted)
    -- 'score_change'         — تغيير في النقاط
    -- 'loyalty_tier_change'  — تغيير مستوى الولاء
    -- ══ Communication ══
    -- 'message_sent'         — أرسلنا رسالة
    -- 'message_received'     — استلمنا رسالة
    -- 'call_made'            — اتصلنا به
    -- 'call_received'        — اتصل بنا
    -- ══ Campaign ══
    -- 'campaign_enrolled'    — أُدرج في حملة
    -- 'campaign_responded'   — رد على حملة
    -- 'campaign_converted'   — تحول من حملة
    -- ══ Listings ══
    -- 'listing_posted'       — نشر إعلان
    -- 'listing_updated'      — حدث إعلان
    -- 'listing_sold'         — باع منتج
    -- 'listing_expired'      — إعلان انتهى
    -- ══ Transactions ══
    -- 'sale_completed'       — بيع مكتمل
    -- 'purchase_completed'   — شراء مكتمل
    -- 'exchange_completed'   — تبادل مكتمل
    -- 'auction_created'      — أنشأ مزاد
    -- 'auction_won'          — فاز بمزاد
    -- ══ Revenue ══
    -- 'commission_paid'      — دفع عمولة طوعية
    -- 'subscription_started' — بدأ اشتراك
    -- 'subscription_renewed' — جدد اشتراك
    -- 'subscription_upgraded'— رقى اشتراك
    -- 'subscription_cancelled' — ألغى اشتراك
    -- 'addon_purchased'      — شراء خدمة إضافية
    -- ══ Loyalty ══
    -- 'loyalty_earned'       — كسب نقاط
    -- 'loyalty_redeemed'     — استبدل نقاط
    -- 'promotion_applied'    — استخدم عرض
    -- ══ Agent ══
    -- 'agent_assigned'       — تعيين موظف
    -- 'agent_note'           — ملاحظة موظف
    -- ══ Profile ══
    -- 'profile_updated'      — تحديث الملف
    -- 'profile_verified'     — تم التوثيق
    -- ══ Support ══
    -- 'complaint_filed'      — شكوى
    -- 'complaint_resolved'   — حل شكوى
    -- 'review_submitted'     — قدم تقييم
    -- ══ Referral ══
    -- 'referral_sent'        — أرسل إحالة
    -- 'referral_converted'   — إحالته تحولت
    -- ══ App ══
    -- 'app_installed'        — ثبت التطبيق
    -- 'app_opened'           — فتح التطبيق
    -- 'first_search'         — أول بحث
  
  description TEXT,                      -- وصف مختصر بالعربي
  
  metadata JSONB DEFAULT '{}',           -- بيانات إضافية حسب النوع
  /*
    أمثلة:
    lifecycle_change: {"from": "lead", "to": "contacted", "reason": "campaign"}
    commission_paid: {"amount_egp": 150, "transaction_id": "xxx", "payment_method": "instapay"}
    listing_posted: {"listing_id": "xxx", "title": "...", "category": "phones", "price": 85000}
    subscription_started: {"plan": "gold", "billing": "monthly", "amount_egp": 249}
    loyalty_earned: {"points": 20, "reason": "sale_completed", "new_balance": 350}
    score_change: {"health_score": {"from": 65, "to": 78}, "reason": "increased_activity"}
  */
  
  agent_id UUID REFERENCES crm_agents(id),
  is_system BOOLEAN DEFAULT false,       -- true = تلقائي، false = موظف
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_customer ON crm_activity_log(customer_id, created_at DESC);
CREATE INDEX idx_activity_type ON crm_activity_log(activity_type, created_at DESC);


-- ══════════════════════════════════════════════════════════
-- TABLE 10: crm_competitor_sources — مصادر المنافسين
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_competitor_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source_type TEXT NOT NULL,
    -- 'dubizzle_profile'      — حساب معلن على دوبيزل
    -- 'facebook_group'        — جروب فيسبوك بيع وشراء
    -- 'facebook_marketplace'  — فيسبوك ماركتبليس
    -- 'instagram_shop'        — متجر انستجرام
    -- 'whatsapp_group'        — جروب واتساب
    -- 'website'               — موقع إلكتروني
    -- 'physical_store'        — متجر فعلي
    -- 'opensooq'              — أوبن سوق
  
  name TEXT NOT NULL,
  url TEXT,
  
  -- Classification
  category TEXT,
  governorate TEXT,
  city TEXT,
  
  -- Size Estimates
  estimated_sellers INTEGER,
  estimated_active_sellers INTEGER,
  estimated_listings INTEGER,
  estimated_monthly_transactions INTEGER,
  
  -- Activity
  activity_level TEXT,                   -- 'very_active' | 'active' | 'moderate' | 'low' | 'dead'
  posting_frequency TEXT,                -- 'hourly' | 'daily' | 'weekly' | 'monthly'
  
  -- Monitoring & Results
  is_monitored BOOLEAN DEFAULT true,
  monitoring_priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  last_checked_at TIMESTAMPTZ,
  sellers_discovered INTEGER DEFAULT 0,
  sellers_acquired INTEGER DEFAULT 0,    -- فعلاً سجلوا على مكسب
  acquisition_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════════
-- TABLE 11: crm_referrals — نظام الإحالات
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  referrer_id UUID REFERENCES crm_customers(id) NOT NULL,
  referrer_code TEXT NOT NULL,
  
  referred_phone TEXT,
  referred_name TEXT,
  referred_customer_id UUID REFERENCES crm_customers(id),
  
  status TEXT DEFAULT 'pending',
    -- 'pending'    — تم إرسال الدعوة
    -- 'clicked'    — ضغط على الرابط
    -- 'signed_up'  — سجل حساب
    -- 'activated'  — نشر أول إعلان (= إحالة ناجحة)
    -- 'rewarded'   — تم منح المكافأة
    -- 'expired'    — انتهت الصلاحية (30 يوم)
  
  -- Rewards
  referrer_reward_type TEXT,    -- 'loyalty_points' | 'featured_listing' | 'commission_waiver'
  referrer_reward_amount NUMERIC,
  referrer_reward_granted BOOLEAN DEFAULT false,
  referred_reward_type TEXT,     -- مكافأة المُحال أيضاً
  referred_reward_granted BOOLEAN DEFAULT false,
  
  channel TEXT,                  -- 'whatsapp' | 'link' | 'sms' | 'qr_code'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ
);


-- ══════════════════════════════════════════════════════════
-- TABLE 12: crm_daily_metrics — مقاييس يومية (محسوبة مسبقاً)
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  
  -- ══ Acquisition ══
  new_leads INTEGER DEFAULT 0,
  new_qualified INTEGER DEFAULT 0,
  new_contacted INTEGER DEFAULT 0,
  new_interested INTEGER DEFAULT 0,
  new_onboarding INTEGER DEFAULT 0,
  new_activated INTEGER DEFAULT 0,
  acquisition_conversion_rate NUMERIC(5,2),  -- activated/leads %
  
  -- ══ Engagement ══
  daily_active_users INTEGER DEFAULT 0,
  monthly_active_users INTEGER DEFAULT 0,
  listings_posted INTEGER DEFAULT 0,
  listings_sold INTEGER DEFAULT 0,
  exchanges_completed INTEGER DEFAULT 0,
  auctions_completed INTEGER DEFAULT 0,
  messages_exchanged INTEGER DEFAULT 0,
  
  -- ══ Revenue ══
  commission_revenue_egp NUMERIC DEFAULT 0,
  commission_transactions INTEGER DEFAULT 0,
  avg_commission_egp NUMERIC DEFAULT 0,
  subscription_revenue_egp NUMERIC DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  subscription_upgrades INTEGER DEFAULT 0,
  addon_revenue_egp NUMERIC DEFAULT 0,
  total_revenue_egp NUMERIC DEFAULT 0,
  total_gmv_egp NUMERIC DEFAULT 0,
  take_rate_pct NUMERIC(5,3),     -- total_revenue / total_gmv
  
  -- ══ Retention ══
  churned INTEGER DEFAULT 0,
  at_risk INTEGER DEFAULT 0,
  reactivated INTEGER DEFAULT 0,
  retention_rate NUMERIC(5,2),
  
  -- ══ Campaigns ══
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_responded INTEGER DEFAULT 0,
  campaign_cost_egp NUMERIC DEFAULT 0,
  
  -- ══ CS Team ══
  avg_response_time_minutes NUMERIC DEFAULT 0,
  avg_satisfaction_rating NUMERIC(3,1),
  complaints_filed INTEGER DEFAULT 0,
  complaints_resolved INTEGER DEFAULT 0,
  
  -- ══ Loyalty ══
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  tier_upgrades INTEGER DEFAULT 0,
  promotions_redeemed INTEGER DEFAULT 0,
  
  -- ══ Breakdowns (JSONB for flexibility) ══
  by_category JSONB DEFAULT '{}',
  by_governorate JSONB DEFAULT '{}',
  by_source JSONB DEFAULT '{}',
  by_agent JSONB DEFAULT '{}',
  by_lifecycle_stage JSONB DEFAULT '{}',
  by_account_type JSONB DEFAULT '{}',
  by_subscription_plan JSONB DEFAULT '{}',
  
  -- ══ Investor Metrics ══
  cac_egp NUMERIC,                -- Cost of Acquisition
  ltv_egp NUMERIC,                -- Lifetime Value (rolling 12 months)
  ltv_cac_ratio NUMERIC,
  arpu_egp NUMERIC,               -- Average Revenue Per User
  nps_score INTEGER,               -- Net Promoter Score (-100 to 100)
  
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════════
-- TABLE 13: crm_subscription_history — تاريخ الاشتراكات
-- ══════════════════════════════════════════════════════════
CREATE TABLE crm_subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES crm_customers(id) NOT NULL,
  
  action TEXT NOT NULL,           -- 'started' | 'renewed' | 'upgraded' | 'downgraded' | 'cancelled' | 'expired'
  plan_from TEXT,                 -- الباقة القديمة
  plan_to TEXT,                   -- الباقة الجديدة
  billing TEXT,                   -- 'monthly' | 'annual'
  amount_egp NUMERIC NOT NULL,
  payment_method TEXT,            -- 'instapay' | 'fawry' | 'vodafone_cash' | 'card'
  payment_reference TEXT,
  
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  agent_id UUID REFERENCES crm_agents(id), -- الموظف الذي أتم البيع (للعمولة)
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sub_history_customer ON crm_subscription_history(customer_id, created_at DESC);
```


---

## 🔴 MODULE 1: Discovery Engine — التوصيف التفصيلي

### الغرض:
بناء قاعدة بيانات عملاء محتملين ضخمة من 8 مصادر مختلفة. الهدف: 1,440 عميل محتمل/يوم (عميل/دقيقة).

### الصفحات المطلوبة:

#### صفحة /admin/crm/discovery
لوحة تحكم تعرض: إجمالي المكتشفين اليوم/الأسبوع/الشهر + توزيع حسب المصدر (pie chart) + آخر 20 عميل محتمل + أزرار: [CSV Import] [Quick Add] [URL Import]

#### صفحة /admin/crm/discovery/bulk-import
استيراد CSV/Excel يحتوي على: اسم، هاتف، فئة، مدينة، مصدر، ملاحظات. يقرأ الملف ويعرض Preview قبل الاستيراد. يكشف التكرارات تلقائياً. يحسب Score لكل عميل بعد الاستيراد.

#### صفحة /admin/crm/discovery/competitor-sources  
إدارة مصادر المنافسين (جروبات فيسبوك، حسابات دوبيزل، etc). لكل مصدر: اسم + رابط + فئة + محافظة + عدد البائعين المقدر + مستوى النشاط. يتتبع كم بائع اكتشفنا وكم تحول لعميل.

#### صفحات /join و /join/{category}
12 صفحة هبوط (واحدة لكل فئة) + صفحة عامة. كل صفحة: عنوان جذاب بالعربية + 3 مزايا + نموذج تسجيل سريع (اسم + هاتف) + CTA واضح.
Mobile-First — 80%+ من الزوار من الموبايل.

---

## ⚡ MODULE 2: Scoring & Enrichment — التوصيف التفصيلي

### الغرض:
تقييم تلقائي لكل عميل بـ 5 مقاييس يُحدّث يومياً.

### Edge Function: calculate-customer-scores

```javascript
// يعمل على كل عميل lifecycle_stage != 'blacklisted'
// يُشغّل: 1) عند إضافة عميل جديد، 2) عند تحديث بياناته، 3) يومياً كـ batch

function calculateAllScores(customer) {
  const acquisition = calcAcquisition(customer);   // 0-100
  const engagement = calcEngagement(customer);     // 0-100
  const value = calcValue(customer);               // 0-100
  const churnRisk = calcChurnRisk(customer);       // 0-100
  
  // Health Score = weighted composite
  const health = Math.round(
    (acquisition * 0.15) +    // 15% — أهمية الاكتساب
    (engagement * 0.35) +     // 35% — التفاعل هو الأهم
    (value * 0.30) +          // 30% — القيمة المالية
    ((100 - churnRisk) * 0.20) // 20% — عكس خطر المغادرة
  );
  
  return { acquisition, engagement, value, churnRisk, health };
}

// ═══ Acquisition Score ═══
// مدى أهمية اكتساب هذا العميل (يُستخدم قبل التسجيل)
function calcAcquisition(c) {
  let s = 0;
  // عدد الإعلانات المقدرة (0-25)
  if (c.estimated_competitor_listings >= 50) s += 25;
  else if (c.estimated_competitor_listings >= 20) s += 20;
  else if (c.estimated_competitor_listings >= 10) s += 15;
  else if (c.estimated_competitor_listings >= 5) s += 10;
  else s += 5;
  // نوع النشاط (0-20)
  const biz = {chain:20, wholesaler:18, store:15, manufacturer:15, individual:8};
  s += biz[c.account_type] || 5;
  // موثق على منافس (0-15)
  if (c.competitor_profiles && Object.values(c.competitor_profiles).some(p => p.verified)) s += 15;
  // فئة (0-20) — موبايلات وإلكترونيات أولوية
  const cat = {phones:20, electronics:18, vehicles:15, furniture:12, fashion:12, properties:10, kids:8, sports:8, pets:6, services:5, jobs:4, other:3};
  s += cat[c.primary_category] || 3;
  // موقع (0-10) — القاهرة والإسكندرية أولوية
  const loc = {cairo:10, alexandria:10, giza:9, qalyubia:7, sharqia:6, dakahlia:6, gharbia:5, monufia:5, beheira:4};
  s += loc[c.governorate] || 3;
  // متعدد الفئات (0-10)
  s += Math.min((c.secondary_categories?.length || 0) * 3, 10);
  return Math.min(s, 100);
}

// ═══ Engagement Score ═══
// مدى نشاط العميل وتفاعله (بعد التسجيل)
function calcEngagement(c) {
  let s = 0;
  // إعلانات نشطة (0-25)
  if (c.active_listings >= 20) s += 25;
  else if (c.active_listings >= 10) s += 20;
  else if (c.active_listings >= 5) s += 15;
  else if (c.active_listings >= 1) s += 8;
  // آخر نشاط (0-25)
  const days = c.days_since_last_active || 999;
  if (days <= 1) s += 25;
  else if (days <= 3) s += 20;
  else if (days <= 7) s += 15;
  else if (days <= 14) s += 8;
  else if (days <= 30) s += 3;
  // سرعة الرد (0-20)
  const rt = c.avg_response_time_minutes || 999;
  if (rt <= 5) s += 20;
  else if (rt <= 15) s += 15;
  else if (rt <= 60) s += 10;
  else if (rt <= 240) s += 5;
  // استخدام الميزات (0-20)
  if (c.total_auctions_created > 0) s += 7;
  if (c.total_exchanges > 0) s += 7;
  if ((c.total_sales + c.total_purchases) > 0) s += 6;
  // جودة الإعلانات (0-10)
  if (c.avg_listing_quality_score >= 80) s += 10;
  else if (c.avg_listing_quality_score >= 60) s += 5;
  return Math.min(s, 100);
}

// ═══ Value Score ═══
// القيمة المالية للعميل (إيراد فعلي ومتوقع)
function calcValue(c) {
  let s = 0;
  // إجمالي GMV (0-25)
  if (c.total_gmv_egp >= 500000) s += 25;
  else if (c.total_gmv_egp >= 100000) s += 20;
  else if (c.total_gmv_egp >= 50000) s += 15;
  else if (c.total_gmv_egp >= 10000) s += 10;
  else if (c.total_gmv_egp >= 1000) s += 5;
  // عمولة مدفوعة (0-25) — مؤشر على الولاء والاستعداد للدفع
  if (c.total_commission_paid_egp >= 500) s += 25;
  else if (c.total_commission_paid_egp >= 200) s += 20;
  else if (c.total_commission_paid_egp >= 50) s += 15;
  else if (c.total_commission_paid_egp >= 10) s += 10;
  if (c.is_commission_supporter) s += 5; // bonus
  // اشتراك مدفوع (0-20) — للتجار
  if (c.subscription_plan === 'platinum') s += 20;
  else if (c.subscription_plan === 'gold') s += 15;
  else if (c.subscription_plan === 'silver') s += 10;
  // خدمات إضافية (0-15)
  if (c.total_addons_paid_egp >= 200) s += 15;
  else if (c.total_addons_paid_egp >= 50) s += 10;
  else if (c.total_addons_paid_egp > 0) s += 5;
  // إحالات ناجحة (0-10)
  // كل إحالة فعّلت = 5 نقاط (max 10)
  return Math.min(s, 100);
}

// ═══ Churn Risk Score ═══
// خطر مغادرة العميل (كلما ارتفع = أخطر)
function calcChurnRisk(c) {
  let r = 0;
  // عدم النشاط (0-40)
  const days = c.days_since_last_active || 999;
  if (days >= 60) r += 40;
  else if (days >= 30) r += 30;
  else if (days >= 14) r += 20;
  else if (days >= 7) r += 10;
  // لا صفقات مكتملة (0-20)
  if ((c.total_sales + c.total_purchases + c.total_exchanges) === 0) r += 20;
  // انخفاض النشاط (0-15)
  // TODO: قارن نشاط هذا الشهر بالشهر الماضي
  // إذا انخفض 50%+: r += 15
  // إعلانات منتهية بلا تجديد (0-15)
  if (c.active_listings === 0 && c.total_listings > 0) r += 15;
  // اشتراك قارب على الانتهاء بلا تجديد (0-10)
  // TODO: check subscription_expires_at
  return Math.min(r, 100);
}
```

### Auto-Lifecycle Updates (تحديث مرحلة الحياة تلقائياً):

```
يومياً عبر Cron Job:
- days_since_last_active >= 60 AND lifecycle = 'active' → lifecycle = 'churned'
- days_since_last_active >= 30 AND lifecycle = 'active' → lifecycle = 'dormant'
- days_since_last_active >= 14 AND lifecycle = 'active' → lifecycle = 'at_risk'
- active_listings >= 10 AND total_sales >= 5 AND lifecycle = 'active' → lifecycle = 'power_user'
- total referrals >= 3 AND is_commission_supporter AND lifecycle IN ('active','power_user') → lifecycle = 'champion'

عند حدث:
- أول إعلان → lifecycle = 'activated'
- أول دخول بعد 30+ يوم → lifecycle = 'reactivated'
- طلب إلغاء اشتراك أو حظر → lifecycle = 'blacklisted'
```

---

## 📨 MODULE 3: Outreach Engine — التوصيف التفصيلي

### الغرض:
إرسال رسائل دعوة جماعية آلية عبر واتساب + SMS + إيميل بنظام Drip Campaign ذكي.

### قوالب الرسائل المطلوبة (أنشئها كلها في crm_message_templates):

#### حملات الاكتساب (acquisition):

```
ID: acq_welcome_generic_v1
Channel: whatsapp
Body:
السلام عليكم {{name}} 🟢

أنا من فريق "مكسب" — أول تطبيق مصري للبيع والشراء والتبادل والمزادات.

شفنا نشاطك في {{category_ar}} وعجبنا أسلوبك المحترف. عندنا فرصة مميزة ليك:

✅ انشر إعلاناتك مجاناً بالكامل
✅ ميزة المزادات — بيع بأعلى سعر
✅ ميزة التبادل المباشر
✅ واتساب مدمج للتواصل السريع
✅ عمولة اختيارية 1% بس (مش إجبارية)

سجل من هنا في دقيقة: {{join_url}}

أو رد على الرسالة دي ونساعدك 🙌
---
ID: acq_followup_v1
Channel: whatsapp
Delay: 48 hours
Body:
أهلاً {{name}} 👋

بخصوص دعوتنا ليك لتطبيق مكسب:

الميزة الأهم ليك: إعلاناتك هتوصل لمشترين جداد مش موجودين على المنصات التانية.

فريقنا يقدر يساعدك تنقل كل إعلاناتك من {{source_platform}} لمكسب في دقايق — مجاناً.

لو عندك أي سؤال أنا هنا.
سجل من هنا: {{join_url}}
---
ID: acq_offer_v1
Channel: whatsapp
Delay: 120 hours (5 days)
Body:
مساء الخير {{name}} ✨

عرض خاص ومحدود لأول 100 تاجر في {{category_ar}} في {{city}}:

⭐ حساب تاجر موثق مجاني مدى الحياة
⭐ إعلاناتك تظهر في الأول 3 شهور
⭐ نساعدك تنقل كل إعلاناتك مجاناً
⭐ 100 نقطة ولاء هدية (= إعلانين مميزين)

العرض متاح لفترة محدودة.
سجل الآن: {{join_url}}
---
ID: acq_sms_short_v1
Channel: sms
Body (max 160 chars):
مكسب — بيع واشتري بأمان. مجاني + مزادات + تبادل. سجل: {{join_url}}
---
ID: acq_phones_v1
Channel: whatsapp
Category: phones
Body:
السلام عليكم {{name}} 📱

أنا من فريق "مكسب" — عندنا قسم موبايلات قوي جداً.

ليه مكسب أحسن ليك كتاجر موبايلات:
📱 ميزة المزادات — بيع بأعلى سعر ممكن
🔄 ميزة التبادل — Trade-in مباشر مع المشترين
💰 صفر عمولة إجبارية (اختيارية 1% بس)
🔒 نظام ضمان للمشتري

عندك حوالي {{listings_count}} إعلان — نقدر ننقلهم ليك في دقايق.
ابدأ من هنا: {{join_url}}
```

#### حملات التفعيل (activation):

```
ID: act_welcome_v1
Channel: whatsapp
Trigger: عند التسجيل
Body:
مبروك التسجيل في مكسب {{name}} 🎉🟢

أنت من أول المستخدمين — وده معناه إنك هتاخد كل المزايا دي:
✅ حسابك موثق مجاناً
✅ أول إعلان مميز هدية
✅ 25 نقطة ولاء ترحيبية

خطوة واحدة وتكون جاهز: انشر أول إعلان!
من هنا: {{first_listing_url}}

لو محتاج مساعدة، {{agent_name}} موجود لخدمتك 🙌
---
ID: act_remind_24h_v1
Channel: whatsapp
Delay: 24 hours after signup
Condition: لم ينشر إعلان بعد
Body:
{{name}} 👋

إعلانك الأول في انتظارك!

نقدر نساعدك بـ 3 طرق:
1️⃣ ابعتلنا صورة المنتج وهننشره ليك
2️⃣ ابعتلنا رابط إعلانك القديم وهننقله
3️⃣ استخدم المعالج السهل: {{first_listing_url}}

إيه الأسهل ليك؟
```

#### حملات الاحتفاظ (retention):

```
ID: ret_at_risk_v1
Channel: whatsapp
Trigger: lifecycle changed to 'at_risk'
Body:
وحشتنا يا {{name}} 😊

عندك {{active_listings}} إعلان نشط — مشترين جداد بيشوفوهم كل يوم.

لاحظنا إنك مش داخل من فترة. لو في حاجة مش عاجباك أو محتاج مساعدة، كلمنا ونصلحها فوراً.

ارجع شوف إعلاناتك: {{app_url}}
---
ID: ret_offer_14d_v1
Channel: whatsapp
Trigger: 14 days inactive
Body:
{{name}} 🎁

عندنا عرض خاص ليك:
إعلان مميز مجاني + 50 نقطة ولاء لو نشرت إعلان جديد النهاردة!

ابدأ: {{new_listing_url}}

العرض صالح 48 ساعة فقط.
```

#### حملات الإيرادات:

```
ID: rev_commission_encourage_v1
Channel: in_app_notification
Trigger: بعد إتمام صفقة
Body:
🎉 مبروك! تمت الصفقة بنجاح.

مكسب تطبيق مجاني بالكامل.
لو الصفقة عجبتك، ساهم بعمولة بسيطة تساعدنا نكبر ونخدمك أحسن 🙏

العمولة المقترحة: {{suggested_commission}} جنيه (1%)

[✅ ادفع {{suggested_commission}} جنيه]
[💚 ادفع مبلغ تاني: ___]
[⏭️ لاحقاً]

داعمين مكسب بياخدوا شارة 💚 + أولوية في الظهور + 30 نقطة ولاء
---
ID: rev_upsell_silver_v1
Channel: whatsapp
Target: merchants on free plan with 8+ listings
Body:
{{name}} 👋

لاحظنا إن عندك {{active_listings}} إعلان نشط — ده أكتر من الحد المجاني (10).

باقة مكسب الفضية (99 ج.م/شهر) هتديك:
📦 50 إعلان نشط
⭐ 3 إعلانات مميزة/شهر
🏅 شارة تاجر موثق
📊 إحصائيات أساسية

جرب أول شهر بخصم 50%: {{upgrade_url}}
```

### Queue Processor (معالج طابور الإرسال):

أنشئ Edge Function أو Cron Job: process-message-queue
يعمل كل دقيقة.

```
الخوارزمية:
1. SELECT from crm_conversations WHERE status = 'queued' AND scheduled_at <= now()
   ORDER BY priority DESC, scheduled_at ASC LIMIT 50

2. لكل رسالة:
   a. تحقق: العميل ليس do_not_contact
   b. تحقق: لم يتجاوز max_messages_per_customer_per_week
   c. تحقق: الوقت ضمن send_window (09:00-21:00 Cairo)
   d. تحقق: لم يتجاوز hourly_send_limit للحملة
   e. تحقق: لم يتجاوز daily_send_limit للحملة
   f. استبدل {{placeholders}} بالبيانات الفعلية
   g. أرسل عبر القناة (WhatsApp API / Twilio SMS / Resend Email)
   h. حدّث status = 'sent' + sent_at = now()
   i. سجل في crm_activity_log
   j. انتظر min_gap_between_messages_seconds (عشوائي 15-30 ثانية)

3. إذا فشل الإرسال:
   a. retry_count += 1
   b. إذا retry_count >= max_retries: status = 'failed'
   c. إذا لا: أعد الجدولة بعد ساعة

4. إذا رد العميل (عبر Webhook):
   a. حلل الرد بـ AI (sentiment + intent)
   b. إذا positive: حدّث lifecycle → 'interested' + أرسل رابط تسجيل
   c. إذا negative/stop: أضف do_not_contact = true
   d. إذا question: أنشئ مهمة للموظف المعين
   e. أوقف بقية رسائل الحملة لهذا العميل (stop_if_responded)
```

---

## 🚪 MODULE 4: Onboarding Portal — التوصيف التفصيلي

### Registration Wizard (5 خطوات):

```
الخطوة 1: الهاتف
- حقل رقم الهاتف (01xxxxxxxxx)
- زر "أرسل كود التحقق"
- OTP عبر واتساب (أو SMS كبديل)
- التحقق من عدم وجود حساب سابق

الخطوة 2: البيانات الأساسية
- الاسم الكامل
- نوع الحساب: [فرد] [متجر/تاجر]
- إذا تاجر: اسم المتجر + وصف مختصر

الخطوة 3: الفئة والموقع
- اختر فئتك الرئيسية (من 12) — أيقونات كبيرة
- اختر فئات إضافية (اختياري)
- اختر المحافظة → المدينة → المنطقة

الخطوة 4: استيراد الإعلانات (اختياري — يمكن تخطيها)
- "هل عندك إعلانات على منصة تانية؟"
- [أيوا — ساعدني أنقلهم] → /onboarding/import
- [لا — أبدأ من الصفر] → الخطوة 5

الخطوة 5: أول إعلان + ترحيب
- نموذج نشر إعلان مبسط: صورة + عنوان + سعر + فئة
- "مبروك! 🎉 إعلانك الأول على مكسب!"
- "+25 نقطة ولاء ترحيبية"
- "شارك مكسب مع أصحابك واكسب 50 نقطة لكل إحالة"
```

---

## 📋 MODULE 5: Listing Assistant — التوصيف التفصيلي

### 6 طرق لإنشاء/استيراد الإعلانات:

#### 1. URL Import (استيراد بالرابط)
المعلن يدخل رابط إعلانه على دوبيزل/فيسبوك. النظام (server-side) يقرأ الصفحة العامة ويستخرج: عنوان، سعر، وصف، صور، موقع، فئة. المعلن يراجع ويعدل ثم ينشر.
**ملاحظة قانونية**: يتم فقط بطلب المعلن نفسه — ليس scraping جماعي.

#### 2. Photo Bulk Upload (رفع صور جماعي)
المعلن يرفع 1-20 صورة. لكل صورة، AI (Claude API) يحلل ويستخرج: عنوان مقترح، فئة، حالة، ماركة، سعر مقترح، وصف. المعلن يراجع كل إعلان ويعدل ثم ينشر.

#### 3. Text Paste (نسخ نص)
المعلن ينسخ نص إعلانه من أي منصة ويلصقه. AI يحلل النص ويهيكل البيانات. المعلن يراجع ويضيف صور ثم ينشر.

#### 4. Catalog Import (كاتالوج Excel/CSV)
للتجار — يرفع ملف Excel فيه عمود لكل حقل (عنوان، سعر، وصف، فئة، حالة، رابط صورة). النظام يقرأ الملف ويعرض Preview. المعلن يراجع ويعدل ثم "نشر الكل".

#### 5. Guided Wizard (معالج خطوة بخطوة)
للمستخدمين الجدد: خطوة 1: صور المنتج. خطوة 2: AI يقترح عنوان وفئة. خطوة 3: السعر (مع اقتراح AI). خطوة 4: الوصف والتفاصيل. خطوة 5: الموقع والتواصل. خطوة 6: مراجعة ونشر.

#### 6. Agent-Assisted (بمساعدة موظف)
الموظف يساعد العميل في إدخال الإعلان عبر المحادثة. العميل يرسل صور ومعلومات، الموظف ينشئ الإعلان نيابة عنه. يُحسب كـ listing_assist في أداء الموظف.

---

## 💎 MODULE 6: Customer Care — التوصيف التفصيلي

### Unified Inbox (/admin/crm/inbox):
3 أعمدة: قائمة المحادثات (يسار) | المحادثة المفتوحة (وسط) | بيانات العميل (يمين).
القائمة مرتبة: VIP أولاً → غير مقروءة → حسب الأحدث.
كل محادثة تعرض: اسم العميل + القناة (أيقونة) + آخر رسالة + وقت + عدد غير مقروء.
بيانات العميل على اليمين: ملخص سريع + Scores + آخر نشاط + Timeline.
ردود سريعة (Quick Replies): أزرار لأكثر الردود استخداماً.
اقتراح AI: عند فتح محادثة واردة، AI يقترح رد مناسب.

### Customer 360° View (/admin/crm/customers/{id}):
كل شيء عن العميل في صفحة واحدة:
- Header: اسم + نوع + شارات + Scores + حالة
- Tabs: [بيانات] [إعلانات] [صفقات] [محادثات] [نشاط] [ولاء] [اشتراك]
- Tab بيانات: كل الحقول مع إمكانية التعديل
- Tab إعلانات: قائمة إعلاناته النشطة والمنتهية
- Tab صفقات: تاريخ البيع والشراء والتبادل
- Tab محادثات: كل الرسائل عبر كل القنوات
- Tab نشاط: Timeline كامل (crm_activity_log)
- Tab ولاء: النقاط + المستوى + تاريخ المعاملات
- Tab اشتراك: (للتجار) الباقة الحالية + تاريخ الاشتراكات + فواتير

---

## 🎁 MODULE 7: Revenue & Loyalty — التوصيف التفصيلي

### تكامل نموذج الإيرادات مع CRM:

#### العمولة الطوعية (للأفراد):
```
عند إتمام صفقة:
1. حساب العمولة المقترحة: Math.min(Math.max(amount * 0.01, 10), 200)
2. عرض شاشة الدفع الطوعي (4 خيارات: ادفع المقترح / مبلغ آخر / لاحقاً / لا شكراً)
3. إذا دفع:
   - سجل في crm_activity_log (commission_paid)
   - حدّث total_commission_paid_egp
   - حدّث is_commission_supporter = true
   - أضف 30 نقطة ولاء
   - فعّل شارة "داعم مكسب 💚"
   - CRM يتتبع: commission_payment_rate لكل عميل
4. إذا لم يدفع:
   - لا عقوبة — التطبيق يعمل بنفس الطريقة
   - CRM يسجل: الصفقة بدون عمولة (للتحليل)
```

#### اشتراكات التجار:
```
CRM يتتبع:
- subscription_plan + billing + expires_at
- subscription_history (كل تغيير)
- تنبيهات قبل انتهاء الاشتراك (7 أيام + يوم واحد)
- حملات upsell تلقائية (free → silver → gold → platinum)
- الموظف الذي باع الاشتراك يحصل على عمولة 10%

Upsell Logic:
- فرد لديه 8+ إعلانات → عرض باقة فضية
- فضي لديه 40+ إعلان → عرض باقة ذهبية
- ذهبي لديه 150+ إعلان → عرض باقة بلاتينية
```

#### الخدمات الإضافية:
```
CRM يتتبع كل عملية شراء:
- Featured Listing (15 ج.م)
- Boost (5 ج.م)
- Republish (3 ج.م)
- Verified Badge (25 ج.م/شهر)
- Market Report (50 ج.م)

كل عملية = نقاط ولاء + تسجيل في activity_log
```

### Loyalty Tiers بالتفصيل:
```
Bronze (0-99 نقطة):
  المزايا: لا شيء إضافي — المستوى الافتراضي

Silver (100-499 نقطة):
  المزايا:
  - 1 إعلان مميز مجاني/شهر
  - شارة فضية 🥈 على الملف
  - خصم 10% على Featured و Boost
  - أولوية في ظهور الإعلانات (+5%)

Gold (500-1,999 نقطة):
  المزايا:
  - 3 إعلانات مميزة مجانية/شهر
  - شارة ذهبية 🥇
  - خصم 25% على Featured و Boost
  - أولوية في الظهور (+15%)
  - إحصائيات متقدمة مجاناً

Platinum (2,000-9,999 نقطة):
  المزايا:
  - إعلانات مميزة غير محدودة
  - شارة بلاتينية 💎
  - خصم 50% على العمولة الطوعية
  - أولوية مطلقة في الظهور (+30%)
  - دعم أولوي (رد خلال ساعة)
  - تقارير سوق مجانية

Diamond (10,000+ نقطة):
  المزايا:
  - كل مزايا Platinum
  - شارة ماسية ♦️
  - إعفاء كامل من العمولة
  - مدير حساب مخصص
  - ظهور في "أفضل البائعين" على الصفحة الرئيسية
  - دعوة لأحداث مكسب الخاصة
  - API مجاني للتكامل
```

---

## 👨‍💼 MODULE 8: CS Agent Workspace — التوصيف التفصيلي

### صفحة /admin/crm/my-workspace (Dashboard الموظف):
```
أرقامي اليوم: عملاء جدد | محادثات | تفعيلات | إعلانات مساعدة | عمولتي
مهام عاجلة: VIP ينتظر رد | at_risk يحتاج متابعة | جديد يحتاج ترحيب
عملائي: قائمة مرتبة بالأولوية (health_score)
أدائي الشهري: chart يقارن مع الهدف
ترتيبي: بين الموظفين (leaderboard)
```

### KPIs + Compensation بالتفصيل:
```
5 مؤشرات أداء:
1. Acquisition Rate (25%): activated / assigned
   Target: 20%+ | per_acquisition: 5 ج.م | per_activation: 10 ج.م
   
2. Response Time (20%): avg first response time
   Target: < 5 min
   
3. Customer Satisfaction (20%): avg rating
   Target: 4.5+/5 | quality_bonus: 200 ج.م

4. Retention Rate (20%): (active - churned) / active
   Target: 85%+ | per_retained: 3 ج.م

5. Revenue Generated (15%): commission + subscriptions collected
   Target: 10,000 ج.م/month | subscription_commission: 10%

Monthly Bonus: 500 ج.م إذا حقق كل الأهداف
Top Performer: 1,000 ج.م لأفضل موظف
```

### Agent Assignment Algorithm:
```
عند إضافة عميل جديد، يُعيّن للموظف الأنسب:
1. فلتر: الموظفين النشطين + في الوردية + لم يتجاوزوا max_customers
2. فلتر: تخصص الفئة (specialty) إذا متاح
3. فلتر: المحافظة (assigned_governorates) إذا متاح
4. ترتيب: بالأداء (kpi_composite_score) تنازلياً
5. Round-robin بين أفضل 3 موظفين (لتوزيع عادل)
```

---

## 📊 MODULE 9: Analytics Dashboard — التوصيف التفصيلي

### صفحة /admin/crm/analytics (Executive Dashboard):

```
المؤشرات المطلوبة (Investor-Ready):

═══ Unit Economics ═══
CAC (Cost per Acquisition): إجمالي تكلفة التسويق / عدد العملاء الجدد المفعلين
LTV (Lifetime Value): متوسط الإيراد لكل عميل × متوسط عمر العميل بالأشهر
LTV/CAC Ratio: LTV / CAC (الهدف: > 3x)
Payback Period: CAC / ARPU بالأشهر
ARPU (Avg Revenue Per User): إجمالي الإيراد / MAU

═══ Growth ═══
MAU (Monthly Active Users): مستخدمين نشطين خلال 30 يوم
DAU (Daily Active Users): مستخدمين نشطين اليوم
DAU/MAU Ratio: مقياس اللزوجة (الهدف: > 30%)
User Growth Rate: (MAU هذا الشهر - الشهر الماضي) / الشهر الماضي
Listing Growth: إعلانات جديدة/شهر
GMV Growth: نمو إجمالي قيمة الصفقات

═══ Revenue ═══
MRR (Monthly Recurring Revenue): اشتراكات شهرية
ARR (Annual Recurring Revenue): MRR × 12
Commission Revenue: إيراد العمولة الطوعية
Addon Revenue: إيراد الخدمات الإضافية
Total Revenue: MRR + Commission + Addons
Take Rate: Total Revenue / GMV (الهدف: 2-5%)
Revenue Growth: نمو شهري %

═══ Retention ═══
Cohort Analysis: جدول يعرض retention لكل مجموعة (M1, M3, M6, M12)
Churn Rate: عملاء غادروا / إجمالي العملاء النشطين
Net Revenue Retention: (إيراد الشهر الحالي من عملاء الشهر الماضي) / إيراد الشهر الماضي

═══ Marketplace Health ═══
Liquidity: نسبة الإعلانات التي تتحول لصفقة (الهدف: > 15%)
Supply/Demand Ratio: بائعين / مشترين
Avg Time to Sell: متوسط وقت البيع بالأيام
Search-to-Transaction: نسبة البحث للشراء

═══ NPS ═══
Net Promoter Score: من استبيان "هل تنصح بمكسب؟" (0-10)
NPS = %Promoters (9-10) - %Detractors (0-6) → Range: -100 to +100
```

### صفحة /admin/crm/analytics/investor (Investor Report):
تقرير قابل للتصدير كـ PDF يحتوي كل المؤشرات أعلاه + الرسوم البيانية.
يُستخدم في العروض التقديمية للمستثمرين.

---

## 🤖 MODULE 10: AI Engine — التوصيف التفصيلي

### 10 وظائف AI (كلها عبر Claude API):

```
1. Sentiment Analysis: تحليل مشاعر رسائل العملاء الواردة
   Input: نص الرسالة
   Output: sentiment (very_positive → very_negative) + intent

2. Smart Response: اقتراح رد للموظف
   Input: رسالة العميل + بيانات العميل + آخر 5 رسائل
   Output: 3 ردود مقترحة بالعربية المصرية

3. Churn Prediction: تنبؤ بالمغادرة
   Input: بيانات العميل + نشاطه + أنماط المغادرين السابقين
   Output: نسبة خطر (0-100) + أسباب + توصيات

4. Listing Quality Score: تقييم جودة الإعلان
   Input: عنوان + وصف + صور + سعر
   Output: score (0-100) + اقتراحات تحسين

5. Price Suggestion: اقتراح سعر
   Input: فئة + ماركة + حالة + موقع
   Output: سعر مقترح + نطاق سعري + مقارنة بالسوق

6. Auto-Categorization: تصنيف تلقائي
   Input: عنوان + وصف + صورة
   Output: category + subcategory + condition + brand

7. Photo Analysis: تحليل صور المنتج
   Input: صورة (base64)
   Output: عنوان + فئة + حالة + ماركة + سعر مقترح + وصف

8. Spam Detection: كشف إعلانات مزيفة/spam
   Input: إعلان كامل
   Output: is_spam (boolean) + confidence + reasons

9. Customer Segmentation: تقسيم ذكي للعملاء
   Input: بيانات كل العملاء
   Output: مجموعات (segments) مع وصف وتوصيات

10. Best Contact Time: أفضل وقت للتواصل
    Input: تاريخ نشاط العميل + ردوده السابقة
    Output: أفضل يوم + ساعة للتواصل
```

---

## 📁 هيكل الملفات الكامل

```
/app
  /admin/crm
    /dashboard/page.tsx           — لوحة CRM الرئيسية
    /customers
      page.tsx                    — قائمة + بحث + فلاتر
      [id]/page.tsx               — Customer 360° View
    /discovery
      page.tsx                    — محرك الاكتشاف
      bulk-import/page.tsx        — استيراد CSV
      competitor-sources/page.tsx — مصادر المنافسين
    /campaigns
      page.tsx                    — قائمة الحملات
      new/page.tsx                — إنشاء حملة
      [id]/page.tsx               — تفاصيل + نتائج
      templates/page.tsx          — قوالب الرسائل
    /inbox/page.tsx               — صندوق الوارد الموحد
    /promotions/page.tsx          — عروض وخصومات
    /loyalty/page.tsx             — إدارة الولاء
    /agents
      page.tsx                    — إدارة الموظفين
      [id]/page.tsx               — أداء موظف
    /my-workspace/page.tsx        — Dashboard الموظف
    /analytics
      page.tsx                    — Executive Dashboard
      investor/page.tsx           — Investor Report
      funnel/page.tsx             — Pipeline Funnel
      cohorts/page.tsx            — Retention Cohorts
      revenue/page.tsx            — Revenue Analytics
    /settings/page.tsx            — إعدادات CRM
  
  /join
    page.tsx                      — صفحة هبوط عامة
    [category]/page.tsx           — صفحة هبوط بالفئة (12)
    r/[code]/page.tsx             — صفحة هبوط بالإحالة
  
  /onboarding
    page.tsx                      — Registration Wizard
    import/page.tsx               — أداة استيراد الإعلانات
    first-listing/page.tsx        — نشر أول إعلان

/supabase/functions
  calculate-customer-scores/index.ts — حساب الـ 5 scores
  process-message-queue/index.ts     — معالج طابور الإرسال
  whatsapp-webhook/index.ts          — استقبال ردود واتساب
  analyze-customer-response/index.ts — AI تحليل الردود
  parse-listing-url/index.ts         — استخراج بيانات من رابط
  analyze-listing-photos/index.ts    — AI تحليل صور
  assign-customer-to-agent/index.ts  — تعيين ذكي
  monitor-customer-health/index.ts   — مراقبة صحية يومية
  calculate-agent-kpis/index.ts      — حساب أداء الموظفين شهرياً
  aggregate-daily-metrics/index.ts   — تجميع المقاييس اليومية
  send-daily-report/index.ts         — تقرير يومي واتساب
  auto-lifecycle-update/index.ts     — تحديث دورة الحياة تلقائياً

/lib
  channels/whatsapp.ts      — WhatsApp Cloud API
  channels/sms.ts           — Twilio SMS
  channels/email.ts         — Resend Email
  scoring.ts                — خوارزميات التقييم
  loyalty.ts                — نظام الولاء والنقاط
  commission.ts             — حساب العمولة الطوعية
  subscription.ts           — إدارة اشتراكات التجار
  ai/sentiment.ts           — تحليل المشاعر
  ai/listing-analyzer.ts    — تحليل الإعلانات
  ai/response-suggester.ts  — اقتراح الردود
  templates.ts              — معالجة قوالب الرسائل
  phone-utils.ts            — تنسيق أرقام مصرية

/migrations
  001_create_crm_core_tables.sql
  002_create_crm_support_tables.sql
  003_create_indexes.sql
  004_create_triggers.sql
  005_seed_message_templates.sql
  006_seed_competitor_sources.sql
  007_seed_promotions.sql
  008_create_rls_policies.sql
  009_create_views.sql
```

---

## 🚀 ترتيب التنفيذ — 6 Sprints (12 أسبوع)

### Sprint 1 (أسبوع 1-2): قاعدة البيانات + Customer Core
```
☐ إنشاء كل الجداول (13 جدول)
☐ إنشاء Indexes و Triggers
☐ RLS Policies
☐ صفحة قائمة العملاء /admin/crm/customers (بحث + فلاتر + ترقيم)
☐ Customer 360° View /admin/crm/customers/{id}
☐ Quick Add Form
☐ CSV/Excel Import
☐ Scoring Algorithm (Edge Function)
☐ Auto-Lifecycle Updates (Cron Job)
```

### Sprint 2 (أسبوع 3-4): Discovery + Outreach
```
☐ Discovery Dashboard /admin/crm/discovery
☐ Competitor Sources Management
☐ Bulk Import Tool
☐ Campaign Management /admin/crm/campaigns
☐ Campaign Creation Wizard
☐ كل قوالب الرسائل (seed data)
☐ Queue Processor (Edge Function)
☐ WhatsApp Business API Integration (lib/channels/whatsapp.ts)
☐ Webhook Handler
☐ Auto-Response AI
☐ SMS Integration (Twilio)
☐ Email Integration (Resend)
```

### Sprint 3 (أسبوع 5-6): Onboarding + Listing Assistant
```
☐ Landing Pages /join + /join/{category} (12 صفحة)
☐ Referral Landing /join/r/{code}
☐ Registration Wizard (5 خطوات)
☐ OTP via WhatsApp
☐ Listing Import Tool (6 methods)
☐ URL Parser (Edge Function)
☐ AI Photo Analysis (Claude API)
☐ Catalog Import (Excel/CSV)
☐ Guided Wizard
☐ Bulk Publishing
☐ Agent-Assisted Listing
```

### Sprint 4 (أسبوع 7-8): Retention + Revenue + Loyalty
```
☐ Unified Inbox /admin/crm/inbox
☐ Customer Health Monitoring (Cron)
☐ Commission Flow (voluntary commission UI + tracking)
☐ Subscription Management (merchant plans)
☐ Addon Purchases
☐ Loyalty System (tiers + points + redemption)
☐ Promotions Engine /admin/crm/promotions
☐ Auto-triggered promotions
☐ Retention campaigns (at_risk + dormant)
☐ Referral System + Tracking
```

### Sprint 5 (أسبوع 9-10): Agent Workspace + AI
```
☐ Agent Management /admin/crm/agents
☐ Agent Workspace /admin/crm/my-workspace
☐ KPI Calculation (monthly Cron)
☐ Compensation Calculation
☐ Leaderboard
☐ Smart Assignment Algorithm
☐ AI Sentiment Analysis
☐ Smart Response Suggestions
☐ Churn Prediction
☐ Listing Quality Score
☐ Price Suggestion
```

### Sprint 6 (أسبوع 11-12): Analytics + Investor + Polish
```
☐ Executive Dashboard /admin/crm/analytics
☐ Revenue Analytics /admin/crm/analytics/revenue
☐ Funnel View /admin/crm/analytics/funnel
☐ Cohort Analysis /admin/crm/analytics/cohorts
☐ Investor Report /admin/crm/analytics/investor (PDF export)
☐ Daily Metrics Aggregator (Cron)
☐ Daily Report via WhatsApp
☐ NPS Survey system
☐ Settings page
☐ Final testing + optimization
```

---

ابدأ بـ Sprint 1 الآن. أنشئ الجداول أولاً ثم الصفحات. يلا! 🟢
