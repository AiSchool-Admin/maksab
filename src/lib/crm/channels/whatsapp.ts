// WhatsApp Business API Integration
// Sends messages via WhatsApp Cloud API (Meta)

import type { ChannelProvider, SendMessageRequest, SendMessageResult } from './types';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export class WhatsAppProvider implements ChannelProvider {
  channel = 'whatsapp' as const;

  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  async send(request: SendMessageRequest): Promise<SendMessageResult> {
    if (!this.phoneNumberId || !this.accessToken) {
      // Return simulated success in dev/staging when no credentials
      console.log(`[WhatsApp] Simulated send to ${request.to}: ${request.content.substring(0, 50)}...`);
      return {
        success: true,
        externalMessageId: `wa_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0.05, // ~0.05 EGP per message estimate
      };
    }

    try {
      // Format phone number for WhatsApp (needs country code, no leading 0)
      const phone = this.formatPhoneNumber(request.to);

      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: request.content },
      };

      // If template is specified, use template message instead
      if (request.templateId) {
        payload.type = 'template';
        payload.template = {
          name: request.templateId,
          language: { code: 'ar' },
        };
        delete payload.text;
      }

      const response = await fetch(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `WhatsApp API error: ${response.status}`,
        };
      }

      return {
        success: true,
        externalMessageId: data.messages?.[0]?.id,
        cost: 0.05,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WhatsApp send failed',
      };
    }
  }

  async getDeliveryStatus(externalMessageId: string): Promise<string> {
    // In production, delivery status comes via webhook callbacks
    // This is a placeholder for manual status checks
    console.log(`[WhatsApp] Status check for ${externalMessageId}`);
    return 'sent';
  }

  private formatPhoneNumber(phone: string): string {
    // Egyptian phone: 01xxxxxxxxx → 201xxxxxxxxx
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '2' + cleaned; // Add Egypt country code
    }
    if (!cleaned.startsWith('2')) {
      cleaned = '2' + cleaned;
    }
    return cleaned;
  }
}
