// WhatsApp Business API Integration
// Sends messages via WhatsApp Cloud API (Meta)

import type { ChannelProvider, SendMessageRequest, SendMessageResult } from './types';

const WHATSAPP_API_VERSION = 'v21.0';
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

/**
 * Template parameter for WhatsApp Cloud API template messages.
 * Each parameter maps to {{1}}, {{2}}, etc. in the template body.
 */
export interface TemplateParameter {
  type: 'text';
  text: string;
}

/**
 * Template component for WhatsApp Cloud API.
 * Supports body parameters and button parameters.
 */
export interface TemplateComponent {
  type: 'body' | 'button' | 'header';
  sub_type?: 'url' | 'quick_reply';
  index?: string;
  parameters: TemplateParameter[];
}

/**
 * Extended send request with template parameter support.
 */
export interface WhatsAppTemplateRequest {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

export class WhatsAppProvider implements ChannelProvider {
  channel = 'whatsapp' as const;

  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  /** Check if real WhatsApp credentials are configured */
  isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken);
  }

  /**
   * Send a text or simple template message (ChannelProvider interface)
   */
  async send(request: SendMessageRequest): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      console.log(`[WhatsApp] Simulated send to ${request.to}: ${request.content.substring(0, 50)}...`);
      return {
        success: true,
        externalMessageId: `wa_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0,
      };
    }

    try {
      const phone = formatPhoneForWhatsApp(request.to);

      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: request.content },
      };

      // If template is specified without parameters, use simple template
      if (request.templateId) {
        payload.type = 'template';
        payload.template = {
          name: request.templateId,
          language: { code: 'ar' },
        };
        delete payload.text;
      }

      return await this.callApi(payload);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WhatsApp send failed',
      };
    }
  }

  /**
   * Send a template message with parameters (e.g. outreach messages with {{1}}, {{2}})
   */
  async sendTemplate(request: WhatsAppTemplateRequest): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      console.log(`[WhatsApp] Simulated template "${request.templateName}" to ${request.to}`);
      return {
        success: true,
        externalMessageId: `wa_sim_tpl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0,
      };
    }

    try {
      const phone = formatPhoneForWhatsApp(request.to);

      const template: Record<string, unknown> = {
        name: request.templateName,
        language: { code: request.languageCode || 'ar' },
      };

      if (request.components && request.components.length > 0) {
        template.components = request.components;
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template,
      };

      return await this.callApi(payload);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WhatsApp template send failed',
      };
    }
  }

  async getDeliveryStatus(externalMessageId: string): Promise<string> {
    console.log(`[WhatsApp] Status check for ${externalMessageId}`);
    return 'sent';
  }

  private async callApi(payload: Record<string, unknown>): Promise<SendMessageResult> {
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
      const errorMsg = data.error?.message || `WhatsApp API error: ${response.status}`;
      console.error('[WhatsApp] API error:', errorMsg, data.error);

      if (response.status === 401) {
        console.error('[WhatsApp] Access token expired! Renew at developers.facebook.com');
      }

      return { success: false, error: errorMsg };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`[WhatsApp] Sent to ${payload.to}, messageId: ${messageId}`);
    return {
      success: true,
      externalMessageId: messageId,
      cost: 0.05,
    };
  }
}

/**
 * Format Egyptian phone number for WhatsApp API.
 * 01xxxxxxxxx → 201xxxxxxxxx
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '2' + cleaned;
  }
  if (!cleaned.startsWith('2')) {
    cleaned = '2' + cleaned;
  }
  return cleaned;
}

/** Singleton instance for direct imports */
let _instance: WhatsAppProvider | null = null;
export function getWhatsAppProvider(): WhatsAppProvider {
  if (!_instance) _instance = new WhatsAppProvider();
  return _instance;
}
