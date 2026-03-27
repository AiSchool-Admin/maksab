-- ══════════════════════════════════════════════
-- Migration 00089: Add agent column + waleed/ahmed templates to outreach_templates
-- ══════════════════════════════════════════════

-- 1. Add agent column
ALTER TABLE outreach_templates ADD COLUMN IF NOT EXISTS agent TEXT DEFAULT 'general';
CREATE INDEX IF NOT EXISTS idx_outreach_templates_agent ON outreach_templates(agent);

-- 2. Tag existing templates
UPDATE outreach_templates SET agent = 'general' WHERE agent IS NULL;

-- 3. Insert waleed (cars) templates
INSERT INTO outreach_templates
(name, name_ar, category, target_type, target_tier, message_text, agent, is_active, is_default)
VALUES
(
  'cars_individual', 'سيارات — فرد', 'سيارات', 'individual', 'small',
  E'السلام عليكم {{name}} 👋\nشفنا إعلان سيارتك على دوبيزل 🚗\nمكسب منصة إسكندرانية متخصصة في السيارات\nفريقنا يجهزلك الإعلان في دقايق — مجاناً 💚\nيهمك؟',
  'waleed', true, false
),
(
  'cars_broker', 'سيارات — سمسار', 'سيارات', 'broker', 'medium',
  E'السلام عليكم {{name}} 👋\nشايفين إنك بتبيع سيارات كتير في الإسكندرية 💪\nمكسب عندنا باقة للسماسرة\nتعرض أكتر وتوصل لمشترين مباشرة\nأقولك أكتر؟ 🚗',
  'waleed', true, false
),
(
  'cars_agency', 'سيارات — وكالة', 'سيارات', 'agency', 'big',
  E'السلام عليكم {{name}} 👋\nشفنا إعلانات معرضكم على دوبيزل 💪\nمكسب منصة إسكندرانية متخصصة في السيارات\nفريقنا ينقل كل إعلاناتكم في أقل من 10 دقايق\nيهمكم نعمل ده؟ 🏢',
  'waleed', true, false
)
ON CONFLICT DO NOTHING;

-- 4. Insert ahmed (properties) templates
INSERT INTO outreach_templates
(name, name_ar, category, target_type, target_tier, message_text, agent, is_active, is_default)
VALUES
(
  'property_individual', 'عقارات — فرد', 'عقارات', 'individual', 'small',
  E'السلام عليكم {{name}} 👋\nشفنا إعلان عقارك على دوبيزل 🏠\nمكسب منصة إسكندرانية متخصصة في العقارات\nفريقنا يجهزلك الإعلان في دقايق — مجاناً 💚\nيهمك؟',
  'ahmed', true, false
),
(
  'property_broker', 'عقارات — سمسار', 'عقارات', 'broker', 'medium',
  E'السلام عليكم {{name}} 👋\nشايفين إنك بتبيع عقارات كتير في الإسكندرية 💪\nمكسب عندنا باقة للسماسرة\nتعرض أكتر وتوصل لمشترين مباشرة\nأقولك أكتر؟ 🏠',
  'ahmed', true, false
),
(
  'property_agency', 'عقارات — وكالة', 'عقارات', 'agency', 'big',
  E'السلام عليكم {{name}} 👋\nشفنا إعلانات شركتكم على دوبيزل 💪\nمكسب منصة إسكندرانية متخصصة في العقارات\nفريقنا ينقل كل إعلاناتكم في أقل من 10 دقايق\nيهمكم نعمل ده؟ 🏢',
  'ahmed', true, false
)
ON CONFLICT DO NOTHING;
