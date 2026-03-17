-- ═══════════════════════════════════════════════════════════════
-- نظام التواصل والاستحواذ المتكامل — V2
-- Outreach System V2: Templates + Status Tracking + Follow-ups
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. OUTREACH TEMPLATES ═══
CREATE TABLE IF NOT EXISTS outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  target_type TEXT DEFAULT 'seller',
  target_tier TEXT DEFAULT 'all',
  message_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_templates_admin" ON outreach_templates FOR ALL USING (false);

-- Seed default templates
INSERT INTO outreach_templates (name, name_ar, category, target_type, target_tier, message_text, is_default) VALUES
('dual_seller_buyer', 'رسالة مزدوجة — بائع ومشتري', 'acquisition', 'seller', 'all',
'السلام عليكم {{name}} 👋
شفنا {{product}} بتاعك على دوبيزل.
على مكسب تقدر:
📢 تنشر نفس الإعلان مجاناً — يوصل لآلاف المشترين
🔨 تعمل مزاد — المشترين يتنافسوا وتبيع بأعلى سعر!
💰 عمولة طوعية — مش إجبارية زي دوبيزل

+ لو بتدوّر على حاجة جديدة:
🛒 عندنا {{count}}+ إعلان بأسعار أقل
🔄 أو بدّل بحاجة أحدث!

سجّل مجاناً: https://maksab.app/join
مكسب — اشتري وبيع وبدّل بأمان 💚', true),

('whale_vip', 'رسالة VIP للحيتان', 'acquisition', 'seller', 'whale',
'السلام عليكم {{name}} 👋
أنا ممدوح من مكسب — أكبر سوق مزادات في مصر.
شفنا إعلاناتك على دوبيزل — أنت من أنجح البائعين في {{category_ar}}!

عندنا عرض خاص ليك:
⭐ حساب تاجر مميز مجاناً لمدة 3 شهور
🔨 مزادات حصرية — تبيع بأعلى سعر
📊 Dashboard خاص — تتابع إعلاناتك ومبيعاتك
💚 دعم VIP — أنا شخصياً متابع معاك

تحب أفعّلك الحساب؟ رد عليا وأنا أساعدك 🚀
ممدوح — مؤسس مكسب', false),

('followup_48h', 'متابعة بعد 48 ساعة', 'followup', 'seller', 'all',
'أهلاً {{name}} 🙂
بعتلك رسالة عن مكسب — أكبر سوق مزادات في مصر.
لو عندك أي سؤال أنا موجود!
ميزة مكسب: المزادات تبيع أسرع وبسعر أعلى 🔨
جرّب مجاناً: https://maksab.app/join', false),

('followup_rejected', 'رسالة بعد رفض لطيف', 'followup', 'seller', 'all',
'تمام {{name}} — مفيش مشكلة! 💚
لو يوم من الأيام حبيت تجرب المزادات أو التبديل — إحنا هنا.
أتمنالك التوفيق! 🙏', false),

('buyer_match', 'رسالة مشتري — عندنا اللي بتدور عليه', 'acquisition', 'buyer', 'all',
'أهلاً {{name}}!
شفنا إنك بتدوّر على {{product}}.
عندنا {{count}} إعلان مطابق على مكسب — أسعار أقل!
شوفهم: https://maksab.app/browse/{{category}}
مكسب — لقّي اللي بتدور عليه بأرخص سعر 💚', false);

-- ═══ 2. NEW COLUMNS ON ahe_sellers ═══
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS outreach_count INTEGER DEFAULT 0;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS last_outreach_template TEXT;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS skip_reason TEXT;
ALTER TABLE ahe_sellers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Indexes for follow-up queries
CREATE INDEX IF NOT EXISTS idx_ahe_sellers_outreach_status
  ON ahe_sellers(pipeline_status, last_outreach_at)
  WHERE pipeline_status IN ('contacted', 'considering');

CREATE INDEX IF NOT EXISTS idx_ahe_sellers_outreach_count
  ON ahe_sellers(outreach_count)
  WHERE outreach_count > 0;

-- ═══ 3. OUTREACH LOGS (for statistics) ═══
CREATE TABLE IF NOT EXISTS outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES ahe_sellers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES outreach_templates(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'sent', 'skipped', 'interested', 'considering', 'rejected'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outreach_logs_admin" ON outreach_logs FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_seller ON outreach_logs(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_date ON outreach_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_action ON outreach_logs(action, created_at DESC);

-- ═══ 4. RPC FUNCTIONS ═══

-- Increment outreach count
CREATE OR REPLACE FUNCTION increment_outreach_count(p_seller_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ahe_sellers
  SET outreach_count = COALESCE(outreach_count, 0) + 1,
      updated_at = now()
  WHERE id = p_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE outreach_templates
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get tier counts for filter badges
CREATE OR REPLACE FUNCTION get_outreach_tier_counts()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_object_agg(seller_tier, cnt)
  INTO result
  FROM (
    SELECT seller_tier, COUNT(*) as cnt
    FROM ahe_sellers
    WHERE phone IS NOT NULL
      AND pipeline_status IN ('discovered', 'phone_found')
    GROUP BY seller_tier
  ) sub;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
