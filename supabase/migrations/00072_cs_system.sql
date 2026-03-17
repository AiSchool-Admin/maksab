-- ═══════════════════════════════════════════
-- Customer Service System — Tables & Seed
-- ═══════════════════════════════════════════

-- CS Conversations
CREATE TABLE IF NOT EXISTS cs_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_phone TEXT,
  subject TEXT,
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'ai_handling', 'waiting_agent', 'agent_handling', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  category TEXT DEFAULT 'general'
    CHECK (category IN ('general', 'registration', 'listing', 'payment', 'complaint', 'technical', 'fraud')),
  assigned_agent_id UUID,
  assigned_agent_name TEXT,
  ai_handled BOOLEAN DEFAULT false,
  ai_resolved BOOLEAN DEFAULT false,
  ai_message_count INTEGER DEFAULT 0,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  csat_rating INTEGER CHECK (csat_rating IS NULL OR (csat_rating >= 1 AND csat_rating <= 5)),
  csat_feedback TEXT,
  messages_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_conversations_status ON cs_conversations(status);
CREATE INDEX IF NOT EXISTS idx_cs_conversations_agent ON cs_conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_cs_conversations_user ON cs_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_conversations_priority ON cs_conversations(priority, status);
CREATE INDEX IF NOT EXISTS idx_cs_conversations_updated ON cs_conversations(updated_at DESC);

-- CS Messages
CREATE TABLE IF NOT EXISTS cs_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES cs_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL
    CHECK (sender_type IN ('user', 'agent', 'ai', 'system')),
  sender_id UUID,
  sender_name TEXT,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'template', 'action')),
  template_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_messages_conversation ON cs_messages(conversation_id, created_at);

-- CS Templates
CREATE TABLE IF NOT EXISTS cs_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category TEXT DEFAULT 'general'
    CHECK (category IN ('greeting', 'registration', 'listing', 'payment', 'technical', 'complaint', 'followup', 'closing', 'general')),
  message_text TEXT NOT NULL,
  shortcut TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CS Settings (key-value store)
CREATE TABLE IF NOT EXISTS cs_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Enable Realtime
-- ═══════════════════════════════════════════
DO $$
BEGIN
  -- Enable realtime for cs_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cs_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cs_messages;
  END IF;

  -- Enable realtime for cs_conversations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cs_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cs_conversations;
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- Seed: Default Templates
-- ═══════════════════════════════════════════
INSERT INTO cs_templates (name, name_ar, category, message_text, shortcut) VALUES
  ('greeting', 'ترحيب', 'greeting', 'أهلاً بيك في مكسب! 💚 أنا {{agent_name}} — إزاي أقدر أساعدك؟', '/أهلاً'),
  ('registration_steps', 'خطوات التسجيل', 'registration', E'عشان تسجّل على مكسب:\n1. اضغط "انشئ حساب" 📱\n2. اختار فرد أو تاجر 🏪\n3. دخّل رقمك 📞\n4. فعّل بالكود ✅\n\nلو عندك مشكلة قولي وأنا أساعدك! 😊', '/تسجيل'),
  ('listing_steps', 'خطوات نشر إعلان', 'listing', E'عشان تنشر إعلان:\n1. اضغط "انشر إعلانك" ➕\n2. اختار الفئة 📂\n3. أضف صور واضحة 📸\n4. اكتب وصف مفصّل ✏️\n5. حدد السعر 💰\n6. اضغط "نشر" 🚀', '/إعلان'),
  ('payment_info', 'معلومات الدفع', 'payment', E'مكسب عمولته طوعية — مش إجبارية! 💚\n\nباقات التجار:\n🥈 Silver: 199 ج/شهر (50 إعلان)\n🥇 Gold: 499 ج/شهر (200 إعلان)\n💎 Diamond: 999 ج/شهر (بلا حدود)\n\nطرق الدفع: فودافون كاش | فوري | إنستاباي', '/دفع'),
  ('technical_collect', 'جمع معلومات تقنية', 'technical', E'فاهم إن فيه مشكلة تقنية 🔧\nعشان أقدر أساعدك محتاج:\n1. إيه اللي حصل بالظبط؟\n2. على أي صفحة كنت؟\n3. نوع الجهاز (موبايل/كمبيوتر)؟\n4. screenshot لو ممكن 📸', '/تقنية'),
  ('complaint_ack', 'تأكيد شكوى', 'complaint', E'فاهم إن فيه مشكلة — وآسفين جداً! 😔\nشكوتك مهمة جداً عندنا.\n\nمحتاج منك:\n1. تفاصيل المشكلة\n2. رقم الإعلان أو اسم البائع/المشتري\n3. أي صور أو إثبات\n\nهنراجع الشكوى فوراً ونرد عليك 🙏', '/شكوى'),
  ('fraud_alert', 'تحذير احتيال', 'complaint', E'⚠️ شكراً إنك بلّغت!\nفريقنا هيراجع الحساب/الإعلان فوراً.\nلو اتضرريت مادياً:\n→ ابلّغ الشرطة (مباحث الإنترنت: 108)\n→ احتفظ بكل الإثباتات\nإحنا هنساعدك في كل خطوة 💪', '/احتيال'),
  ('transfer_agent', 'تحويل لموظف', 'general', E'هحوّلك لزميلي {{agent_name}} — متخصص في {{category}}.\nهيرد عليك في أقل من 5 دقائق! ⏱️', '/تحويل'),
  ('resolved_thanks', 'شكر بعد الحل', 'closing', E'تمام — مبسوط إني قدرت أساعدك! 😊💚\n\nلو عندك أي سؤال تاني في أي وقت — إحنا هنا!\n\nممكن تقيّم الخدمة؟ ⭐⭐⭐⭐⭐\nرأيك بيساعدنا نتحسن 🙏', '/شكراً'),
  ('closing_no_response', 'إغلاق بدون رد', 'closing', E'أهلاً — لاحظنا إنك ما رديتش من فترة.\nهنقفل المحادثة دي — لو محتاج أي حاجة افتح محادثة جديدة!\n\nمكسب هنا عشانك 💚', '/إغلاق')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- Seed: Default CS Settings
-- ═══════════════════════════════════════════
INSERT INTO cs_settings (key, value) VALUES
  ('ai_enabled', 'true'::jsonb),
  ('ai_auto_greet', 'true'::jsonb),
  ('ai_auto_transfer', 'true'::jsonb),
  ('ai_handle_complaints', 'false'::jsonb),
  ('ai_max_messages', '3'::jsonb),
  ('ai_transfer_delay_seconds', '30'::jsonb),
  ('working_hours_start', '"09:00"'::jsonb),
  ('working_hours_end', '"17:00"'::jsonb),
  ('outside_hours_ai_only', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════
-- Function: Auto-update conversation on new message
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_cs_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cs_conversations SET
    messages_count = messages_count + 1,
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message, 100),
    updated_at = now(),
    first_response_at = CASE
      WHEN first_response_at IS NULL AND NEW.sender_type IN ('agent', 'ai')
      THEN NEW.created_at
      ELSE first_response_at
    END,
    ai_message_count = CASE
      WHEN NEW.sender_type = 'ai' THEN ai_message_count + 1
      ELSE ai_message_count
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cs_message_insert ON cs_messages;
CREATE TRIGGER trg_cs_message_insert
  AFTER INSERT ON cs_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_cs_conversation_on_message();
