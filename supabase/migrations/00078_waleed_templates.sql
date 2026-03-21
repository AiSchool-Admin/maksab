-- Waleed templates: editable message library for Waleed's outreach
CREATE TABLE IF NOT EXISTS waleed_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  platform TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0
);

-- Insert default template
INSERT INTO waleed_templates (name, content, platform) VALUES (
  'رسالة وليد الافتراضية',
  'أهلاً {{name}}! 👋
أنا وليد من مكسب — أول سوق إلكتروني مصري بالبيع المباشر والمزادات والمقايضة.
شفت إعلاناتك على {{platform}} وحسيت إن مكسب هيفيدك:
✅ مجاني للبداية — مفيش أي خسارة
✅ مزادات ومقايضة (مش موجودين في OLX)
✅ عمولة طوعية بس — مش إجبارية
لو عايز تعرف أكتر أو تسجّل: https://maksab.vercel.app
تقدر تسجّل دلوقتي في 3 دقائق بس 😊',
  'all'
);
