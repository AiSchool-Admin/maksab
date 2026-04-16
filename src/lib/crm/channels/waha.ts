// WAHA — Self-hosted WhatsApp HTTP API
// Docs: https://waha.devlike.pro/
// GitHub: https://github.com/devlikeapro/waha
//
// Why WAHA?
// - Free & open source (no Meta restrictions, no templates needed)
// - Send unlimited text/image/document messages
// - Uses regular WhatsApp account (scan QR once)
// - Risk: Meta MAY ban the number if used for spam/aggressive outreach
//
// Required env vars:
//   WAHA_BASE_URL = https://your-waha.up.railway.app (Railway service URL)
//   WAHA_API_KEY  = your shared API key (set in WAHA env vars)
//   WAHA_SESSION  = "default" (or custom session name)

import type { ChannelProvider, SendMessageRequest, SendMessageResult } from './types';

export class WahaProvider implements ChannelProvider {
  channel = 'whatsapp' as const;

  private baseUrl: string;
  private apiKey: string;
  private session: string;

  constructor() {
    this.baseUrl = (process.env.WAHA_BASE_URL || '').replace(/\/$/, '');
    this.apiKey = process.env.WAHA_API_KEY || '';
    this.session = process.env.WAHA_SESSION || 'default';
  }

  /** Check if WAHA is configured */
  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }

  /**
   * Send a free-form text message via WAHA.
   * No templates, no language restrictions, no Meta approval.
   */
  async send(request: SendMessageRequest): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      console.log(`[WAHA] Simulated send to ${request.to}: ${request.content.substring(0, 50)}...`);
      return {
        success: true,
        externalMessageId: `waha_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0, // WAHA itself is free; cost is hosting only
      };
    }

    try {
      const chatId = formatChatId(request.to);

      // WAHA endpoint for sending text messages
      // POST /api/sendText
      const response = await fetch(`${this.baseUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          session: this.session,
          chatId,
          text: request.content,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || data.error || `WAHA API error: ${response.status}`;
        console.error(`[WAHA] Send failed to ${chatId}:`, errorMsg, data);
        return { success: false, error: errorMsg };
      }

      const messageId = data.id?._serialized || data.id || data.messageId || null;
      console.log(`[WAHA] Sent to ${chatId}, messageId: ${messageId}`);

      return {
        success: true,
        externalMessageId: messageId,
        cost: 0,
      };
    } catch (err) {
      console.error('[WAHA] Network error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WAHA send failed',
      };
    }
  }

  /**
   * Send an image with optional caption.
   */
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<SendMessageResult> {
    if (!this.isConfigured()) {
      return {
        success: true,
        externalMessageId: `waha_sim_img_${Date.now()}`,
        cost: 0,
      };
    }

    try {
      const chatId = formatChatId(to);

      const response = await fetch(`${this.baseUrl}/api/sendImage`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: this.session,
          chatId,
          file: { url: imageUrl },
          caption: caption || '',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `WAHA API error: ${response.status}`,
        };
      }

      return {
        success: true,
        externalMessageId: data.id?._serialized || data.id || null,
        cost: 0,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WAHA image send failed',
      };
    }
  }

  /**
   * Get session status (WORKING, SCAN_QR_CODE, FAILED, STOPPED)
   */
  async getSessionStatus(): Promise<string> {
    if (!this.isConfigured()) return 'not_configured';

    try {
      const response = await fetch(`${this.baseUrl}/api/sessions/${this.session}`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return 'error';
      const data = await response.json();
      return data.status || 'unknown';
    } catch {
      return 'error';
    }
  }

  /**
   * Get QR code for first-time pairing.
   * Returns base64 PNG image data.
   */
  async getQRCode(): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/${this.session}/auth/qr`, {
        headers: { 'X-Api-Key': this.apiKey },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.value || data.qr || null;
    } catch {
      return null;
    }
  }
}

/**
 * Format Egyptian phone for WAHA chatId.
 * WAHA expects: 201xxxxxxxxx@c.us
 */
function formatChatId(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '2' + cleaned;
  if (!cleaned.startsWith('2')) cleaned = '2' + cleaned;
  return `${cleaned}@c.us`;
}

/** Singleton instance */
let _instance: WahaProvider | null = null;
export function getWahaProvider(): WahaProvider {
  if (!_instance) _instance = new WahaProvider();
  return _instance;
}
