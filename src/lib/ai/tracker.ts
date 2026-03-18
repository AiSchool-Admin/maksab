/**
 * AI Interaction Tracker
 * Tracks all AI agent interactions (Sara/Waleed/Mazen/Nora) — non-blocking, fire-and-forget.
 */

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function trackInteraction(data: {
  agent: 'sara' | 'waleed' | 'mazen' | 'nora';
  source: string;
  user_message?: string;
  ai_response: string;
  model_used: string;
  tokens_used?: number;
  response_time_ms?: number;
  conversation_id?: string;
  user_id?: string;
  user_phone?: string;
  city?: string;
  category?: string;
  metadata?: object;
}): Promise<string | null> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return null;

    const { data: record } = await supabase
      .from('ai_interactions')
      .insert({ ...data, outcome: 'pending' })
      .select('id')
      .single();
    return record?.id ?? null;
  } catch (err) {
    console.error('[AI-TRACKER] Failed (non-critical):', err);
    return null;
  }
}

export async function updateOutcome(id: string, outcome: string): Promise<void> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return;
    await supabase.from('ai_interactions').update({ outcome }).eq('id', id);
  } catch {
    // Non-critical — silently fail
  }
}

export async function createAlert(data: {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  listing_id?: string;
  user_id?: string;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return;
    await supabase.from('admin_alerts').insert(data);
  } catch {
    // Non-critical — silently fail
  }
}
