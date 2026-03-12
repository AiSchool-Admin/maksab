-- WhatsApp Messages table
-- Individual messages within conversations

CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,

  -- Direction & type
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (
    message_type IN ('text', 'template', 'image', 'document', 'audio', 'video', 'interactive', 'reaction')
  ),

  -- Content
  body TEXT,
  template_id TEXT,
  media_url TEXT,

  -- AI metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_intent TEXT,
  ai_confidence DECIMAL(3,2),

  -- WhatsApp API status
  wa_message_id TEXT,
  wa_status VARCHAR(20) DEFAULT 'pending' CHECK (
    wa_status IN ('pending', 'sent', 'delivered', 'read', 'failed')
  ),

  -- Cost tracking
  cost_egp DECIMAL(6,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON wa_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_wa_id ON wa_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_msg_status ON wa_messages(wa_status) WHERE wa_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wa_msg_created ON wa_messages(created_at DESC);

-- RLS
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to wa_messages" ON wa_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
