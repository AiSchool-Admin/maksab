-- WhatsApp Conversations table
-- Tracks all outreach conversations with sellers/customers

CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer/Seller link
  customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES ahe_sellers(id) ON DELETE SET NULL,
  phone VARCHAR(15) NOT NULL,
  customer_name TEXT,

  -- Context
  category VARCHAR(50),
  governorate VARCHAR(50),
  seller_type VARCHAR(20) CHECK (seller_type IN ('whale', 'business', 'individual')),
  listings_count INTEGER DEFAULT 0,

  -- Conversation state
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'waiting', 'scheduled', 'completed', 'escalated', 'opted_out')
  ),
  stage VARCHAR(30) NOT NULL DEFAULT 'initial_outreach' CHECK (
    stage IN ('initial_outreach', 'conversation', 'signup', 'onboarding', 'active_user')
  ),

  -- Message counters
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_direction VARCHAR(10) CHECK (last_message_direction IN ('outbound', 'inbound')),

  -- AI context
  ai_conversation_history JSONB DEFAULT '[]',
  ai_last_intent TEXT,
  ai_sentiment VARCHAR(20),

  -- Scheduling
  next_action TEXT,
  next_action_at TIMESTAMPTZ,

  -- Escalation
  escalated_to UUID,
  escalation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON wa_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status ON wa_conversations(status);
CREATE INDEX IF NOT EXISTS idx_wa_conv_next_action ON wa_conversations(next_action_at)
  WHERE next_action_at IS NOT NULL AND status IN ('waiting', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_wa_conv_seller ON wa_conversations(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_conv_stage ON wa_conversations(stage);
CREATE INDEX IF NOT EXISTS idx_wa_conv_created ON wa_conversations(created_at DESC);

-- RLS
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to wa_conversations" ON wa_conversations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
