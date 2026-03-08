// CRM Queue Processor — معالج طابور الإرسال
// Processes queued messages from crm_conversations
// Should be called via cron job (every minute) or Edge Function

import { createClient } from '@supabase/supabase-js';
import { sendMessage, applyPlaceholders } from './channels';
import type { ChannelType, MessagePlaceholders } from './channels';

const BATCH_SIZE = 50;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maksab.app';

interface QueuedMessage {
  id: string;
  customer_id: string;
  channel: ChannelType;
  content: string;
  template_id: string | null;
  campaign_id: string | null;
  scheduled_at: string | null;
  retry_count: number;
  max_retries: number;
  crm_customers: {
    full_name: string;
    phone: string;
    whatsapp: string | null;
    email: string | null;
    primary_category: string | null;
    city: string | null;
    governorate: string | null;
    active_listings: number;
    total_listings: number;
    do_not_contact: boolean;
    marketing_consent: boolean;
    source_platform: string | null;
    referral_code: string | null;
    assigned_agent_id: string | null;
  };
}

interface CampaignLimits {
  daily_send_limit: number;
  hourly_send_limit: number;
  send_window_start: string;
  send_window_end: string;
  max_messages_per_customer_per_week: number;
  min_gap_between_messages_seconds: number;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

/**
 * Process queued messages — main entry point
 * Called by cron job or API route
 */
export async function processMessageQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const supabase = getServiceClient();
  const stats = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  // 1. Fetch queued messages that are ready to send
  const { data: messages, error } = await supabase
    .from('crm_conversations')
    .select(`
      id, customer_id, channel, content, template_id, campaign_id,
      scheduled_at, retry_count, max_retries,
      crm_customers (
        full_name, phone, whatsapp, email, primary_category,
        city, governorate, active_listings, total_listings,
        do_not_contact, marketing_consent, source_platform,
        referral_code, assigned_agent_id
      )
    `)
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !messages || messages.length === 0) {
    return stats;
  }

  // 2. Get campaign limits if needed
  const campaignIds = [...new Set(messages.filter(m => m.campaign_id).map(m => m.campaign_id!))];
  const campaignLimits: Record<string, CampaignLimits> = {};

  if (campaignIds.length > 0) {
    const { data: campaigns } = await supabase
      .from('crm_campaigns')
      .select('id, daily_send_limit, hourly_send_limit, send_window_start, send_window_end, max_messages_per_customer_per_week, min_gap_between_messages_seconds')
      .in('id', campaignIds);

    if (campaigns) {
      for (const c of campaigns) {
        campaignLimits[c.id] = c;
      }
    }
  }

  // 3. Process each message
  for (const msg of messages as unknown as QueuedMessage[]) {
    stats.processed++;
    const customer = msg.crm_customers;

    // Safety checks
    if (!customer) {
      await markFailed(supabase, msg.id, 'عميل غير موجود');
      stats.failed++;
      continue;
    }

    if (customer.do_not_contact) {
      await markFailed(supabase, msg.id, 'العميل مسجل كـ "لا تتواصل"');
      stats.skipped++;
      continue;
    }

    if (!customer.marketing_consent && msg.campaign_id) {
      await markFailed(supabase, msg.id, 'العميل لم يوافق على التسويق');
      stats.skipped++;
      continue;
    }

    // Check send window (Cairo timezone, 09:00-21:00)
    if (msg.campaign_id) {
      const limits = campaignLimits[msg.campaign_id];
      if (limits && !isWithinSendWindow(limits.send_window_start, limits.send_window_end)) {
        stats.skipped++;
        continue; // Will be retried next cycle
      }
    }

    // Resolve recipient address
    const recipientAddress = getRecipientAddress(msg.channel, customer);
    if (!recipientAddress) {
      await markFailed(supabase, msg.id, `لا يوجد عنوان ${msg.channel} للعميل`);
      stats.failed++;
      continue;
    }

    // Apply placeholders to content
    const placeholders: MessagePlaceholders = {
      name: customer.full_name,
      first_name: customer.full_name?.split(' ')[0],
      phone: customer.phone,
      category_ar: getCategoryArabic(customer.primary_category),
      city: customer.city || customer.governorate || '',
      listings_count: String(customer.total_listings || 0),
      active_listings: String(customer.active_listings || 0),
      join_url: `${APP_URL}/join`,
      app_url: APP_URL,
      source_platform: customer.source_platform || '',
    };

    const finalContent = msg.content ? applyPlaceholders(msg.content, placeholders) : '';

    // Send the message
    try {
      const result = await sendMessage(msg.channel, {
        to: recipientAddress,
        content: finalContent,
        templateId: msg.template_id || undefined,
      });

      if (result.success) {
        // Mark as sent
        await supabase
          .from('crm_conversations')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_message_id: result.externalMessageId || null,
          })
          .eq('id', msg.id);

        // Update campaign stats
        if (msg.campaign_id) {
          await supabase.rpc('increment_campaign_stat', {
            p_campaign_id: msg.campaign_id,
            p_stat_key: 'sent',
          }).then(() => {});
        }

        // Log activity
        await supabase.from('crm_activity_log').insert({
          customer_id: msg.customer_id,
          activity_type: 'message_sent',
          description: `تم إرسال رسالة عبر ${msg.channel}`,
          metadata: {
            channel: msg.channel,
            message_preview: finalContent.substring(0, 100),
            campaign_id: msg.campaign_id,
          },
          is_system: true,
        });

        stats.sent++;
      } else {
        // Handle failure
        const newRetryCount = msg.retry_count + 1;
        if (newRetryCount >= msg.max_retries) {
          await markFailed(supabase, msg.id, result.error || 'فشل الإرسال');
          stats.failed++;
        } else {
          // Reschedule for retry (1 hour later)
          await supabase
            .from('crm_conversations')
            .update({
              retry_count: newRetryCount,
              scheduled_at: new Date(Date.now() + 3600000).toISOString(),
              error_message: result.error,
            })
            .eq('id', msg.id);
          stats.failed++;
        }
      }
    } catch (err) {
      await markFailed(supabase, msg.id, err instanceof Error ? err.message : 'خطأ غير متوقع');
      stats.failed++;
    }

    // Small delay between messages to avoid rate limiting
    await delay(randomBetween(500, 2000));
  }

  return stats;
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
  errorMessage: string
) {
  await supabase
    .from('crm_conversations')
    .update({
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', messageId);
}

function getRecipientAddress(
  channel: ChannelType,
  customer: QueuedMessage['crm_customers']
): string | null {
  switch (channel) {
    case 'whatsapp':
      return customer.whatsapp || customer.phone;
    case 'sms':
      return customer.phone;
    case 'email':
      return customer.email;
    case 'in_app':
      return customer.phone; // Not really used for delivery
    default:
      return null;
  }
}

function isWithinSendWindow(start: string, end: string): boolean {
  // Get current hour in Cairo timezone
  const cairoTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  const cairoHour = new Date(cairoTime).getHours();
  const cairoMinute = new Date(cairoTime).getMinutes();
  const currentMinutes = cairoHour * 60 + cairoMinute;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

const CATEGORY_ARABIC: Record<string, string> = {
  phones: 'الموبايلات',
  electronics: 'الإلكترونيات',
  cars: 'السيارات',
  vehicles: 'السيارات',
  real_estate: 'العقارات',
  properties: 'العقارات',
  furniture: 'الأثاث',
  fashion: 'الموضة',
  gold: 'الذهب والفضة',
  scrap: 'الخردة',
  luxury: 'السلع الفاخرة',
  home_appliances: 'الأجهزة المنزلية',
  hobbies: 'الهوايات',
  tools: 'العدد والأدوات',
  services: 'الخدمات',
  kids: 'مستلزمات الأطفال',
  sports: 'الرياضة',
  pets: 'الحيوانات',
  jobs: 'الوظائف',
};

function getCategoryArabic(category: string | null): string {
  if (!category) return '';
  return CATEGORY_ARABIC[category] || category;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
