-- ══════════════════════════════════════════════
-- Migration 00087: seller_type for templates + new broker/agency templates
-- ══════════════════════════════════════════════

-- 1. Add seller_type to waleed_templates
ALTER TABLE waleed_templates
ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'all';

-- 2. Update existing templates
UPDATE waleed_templates SET seller_type = 'individual'
WHERE name LIKE '%أفراد%' OR name LIKE '%individual%';

UPDATE waleed_templates SET seller_type = 'agency'
WHERE name LIKE '%معارض%' OR name LIKE '%dealer%';

-- 3. New waleed templates for brokers/agencies
INSERT INTO waleed_templates (name, content, platform, seller_type, is_active) VALUES
(
  'سيارات — سمسار صغير',
  E'السلام عليكم {{name}} 👋\nأنا وليد من مكسب\nشفت إعلاناتك على {{platform}} — واضح إنك شاطر في السيارات 🚗\nمكسب بيديك:\n✅ صفحة احترافية لعرض كل إعلاناتك\n✅ مشترين جادين بيتواصلوا معاك مباشرة\n✅ باقة Silver بـ 299 ج/شهر بس\nتحب أشرح أكتر؟',
  'all', 'broker', true
),
(
  'سيارات — وكيل كبير',
  E'السلام عليكم {{name}} 👋\nأنا وليد من مكسب\nشفت معرضكم على {{platform}} — عندكم تشكيلة ممتازة 💪\nمكسب بيقدم لوكلاء السيارات:\n✅ إعلانات غير محدودة\n✅ leads مؤهلين يومياً\n✅ نظام مزادات أونلاين\n✅ تحليلات مبيعات متقدمة\nباقة Gold 699 ج أو Diamond 1499 ج/شهر\nالعائد بيتضاعف خلال أسبوعين\nتحب نعمل demo؟',
  'all', 'agency', true
)
ON CONFLICT DO NOTHING;

-- 4. New ahmed templates for brokers/agencies
INSERT INTO ahmed_templates (name, content, platform, seller_type, is_active) VALUES
(
  'عقارات — سمسار صغير',
  E'السلام عليكم {{name}} 👋\nأنا أحمد من مكسب\nشفت إعلاناتك على {{platform}} في {{district}} 🏠\nمكسب مش بينافسك — بيكمّلك:\n✅ مشترين جادين بيجوا ليك\n✅ نظام عروض أسعار شفاف\n✅ باقة Silver بـ 299 ج/شهر\nعمولتك محفوظة — مكسب بيساعدك تبيع أسرع\nتحب أشرح؟',
  'all', 'agent', true
),
(
  'عقارات — وكيل كبير',
  E'السلام عليكم {{name}} 👋\nأنا أحمد من مكسب\nشفت مجموعة عقاراتكم على {{platform}}\nمكسب للوكالات العقارية الكبيرة:\n✅ صفحة وكالة احترافية\n✅ leads حصرية كل يوم\n✅ مزادات عقارية أونلاين\n✅ تقارير وتحليلات يومية\n✅ مندوب مخصص ليكم\nباقة Diamond 1499 ج/شهر\nROI مضمون خلال شهر\nنتكلم على zoom؟',
  'all', 'agency', true
)
ON CONFLICT DO NOTHING;
