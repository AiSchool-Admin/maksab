// SMS Integration via Twilio
// Sends SMS messages to Egyptian phone numbers

import type { ChannelProvider, SendMessageRequest, SendMessageResult } from './types';

export class SmsProvider implements ChannelProvider {
  channel = 'sms' as const;

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
  }

  async send(request: SendMessageRequest): Promise<SendMessageResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      // Simulated send in dev/staging
      console.log(`[SMS] Simulated send to ${request.to}: ${request.content.substring(0, 50)}...`);
      return {
        success: true,
        externalMessageId: `sms_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0.15, // ~0.15 EGP per SMS estimate
      };
    }

    try {
      const phone = this.formatPhoneNumber(request.to);

      // Twilio REST API
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const formData = new URLSearchParams();
      formData.append('To', phone);
      formData.append('From', this.fromNumber);
      formData.append('Body', request.content);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Twilio error: ${response.status}`,
        };
      }

      return {
        success: true,
        externalMessageId: data.sid,
        cost: 0.15,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'SMS send failed',
      };
    }
  }

  async getDeliveryStatus(externalMessageId: string): Promise<string> {
    if (!this.accountSid || !this.authToken) return 'sent';

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${externalMessageId}.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${auth}` },
      });

      const data = await response.json();
      return data.status || 'sent';
    } catch {
      return 'sent';
    }
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '+2' + cleaned;
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+2' + cleaned;
    }
    return cleaned;
  }
}
