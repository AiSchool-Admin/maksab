// Channel integration types for CRM outreach
// Supports WhatsApp, SMS, Email channels

export type ChannelType = 'whatsapp' | 'sms' | 'email' | 'in_app';

export interface SendMessageRequest {
  to: string; // Phone number or email address
  content: string;
  mediaUrl?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResult {
  success: boolean;
  externalMessageId?: string;
  error?: string;
  cost?: number; // Cost in EGP
}

export interface ChannelProvider {
  channel: ChannelType;
  send(request: SendMessageRequest): Promise<SendMessageResult>;
  getDeliveryStatus?(externalMessageId: string): Promise<string>;
}

// Placeholder replacements for campaign messages
export interface MessagePlaceholders {
  name?: string;
  first_name?: string;
  phone?: string;
  category_ar?: string;
  city?: string;
  listings_count?: string;
  active_listings?: string;
  join_url?: string;
  referral_url?: string;
  app_url?: string;
  promo_code?: string;
  agent_name?: string;
  source_platform?: string;
  suggested_commission?: string;
  first_listing_url?: string;
  new_listing_url?: string;
  upgrade_url?: string;
}

/**
 * Replace {{placeholder}} variables in a message template
 */
export function applyPlaceholders(
  template: string,
  placeholders: MessagePlaceholders
): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    if (value !== undefined && value !== null) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
  }
  return result;
}
