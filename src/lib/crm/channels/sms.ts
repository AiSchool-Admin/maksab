// SMS Misr Integration (Egyptian SMS Provider)
// Docs: https://smsmisr.com/api-documentation/
// Pricing: ~9-15 piastre per SMS (0.09-0.15 EGP)
//
// Required env vars:
//   SMS_MISR_ENVIRONMENT = "1" (production) or "2" (test)
//   SMS_MISR_USERNAME    = your SMS Misr username
//   SMS_MISR_PASSWORD    = your SMS Misr password
//   SMS_MISR_SENDER      = sender name (e.g. "Maksab" — must be pre-approved)
//
// Fallback: Twilio (if configured and SMS Misr not available)

import type { ChannelProvider, SendMessageRequest, SendMessageResult } from './types';

const SMS_MISR_BASE_URL = 'https://smsmisr.com/api/SMS';

export class SmsProvider implements ChannelProvider {
  channel = 'sms' as const;

  // SMS Misr credentials
  private smsMisrEnv: string;
  private smsMisrUsername: string;
  private smsMisrPassword: string;
  private smsMisrSender: string;

  // Twilio credentials (fallback)
  private twilioAccountSid: string;
  private twilioAuthToken: string;
  private twilioFromNumber: string;

  constructor() {
    this.smsMisrEnv = process.env.SMS_MISR_ENVIRONMENT || '1'; // 1 = production
    this.smsMisrUsername = process.env.SMS_MISR_USERNAME || '';
    this.smsMisrPassword = process.env.SMS_MISR_PASSWORD || '';
    this.smsMisrSender = process.env.SMS_MISR_SENDER || 'Maksab';

    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.twilioFromNumber = process.env.TWILIO_FROM_NUMBER || '';
  }

  /** Check which SMS provider is configured */
  getProviderName(): 'sms_misr' | 'twilio' | 'none' {
    if (this.smsMisrUsername && this.smsMisrPassword) return 'sms_misr';
    if (this.twilioAccountSid && this.twilioAuthToken) return 'twilio';
    return 'none';
  }

  async send(request: SendMessageRequest): Promise<SendMessageResult> {
    const provider = this.getProviderName();

    if (provider === 'none') {
      // Simulated send in dev/staging
      console.log(`[SMS] Simulated send to ${request.to}: ${request.content.substring(0, 50)}...`);
      return {
        success: true,
        externalMessageId: `sms_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0.15,
      };
    }

    if (provider === 'sms_misr') {
      return await this.sendViaSMSMisr(request);
    }

    return await this.sendViaTwilio(request);
  }

  /**
   * Send via SMS Misr — cheaper and recommended for Egyptian numbers.
   * Supports Arabic (language=2) and English (language=1).
   */
  private async sendViaSMSMisr(request: SendMessageRequest): Promise<SendMessageResult> {
    try {
      const phone = this.formatForSMSMisr(request.to);

      // Detect language — Arabic if any Arabic chars, else English
      const isArabic = /[\u0600-\u06FF]/.test(request.content);
      const language = isArabic ? '2' : '1';

      const formData = new URLSearchParams();
      formData.append('environment', this.smsMisrEnv);
      formData.append('username', this.smsMisrUsername);
      formData.append('password', this.smsMisrPassword);
      formData.append('sender', this.smsMisrSender);
      formData.append('mobile', phone);
      formData.append('language', language);
      formData.append('message', request.content);

      const response = await fetch(SMS_MISR_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      const data = await response.json();

      // SMS Misr response codes:
      //   1901: Success (message sent)
      //   1902-1908: Various errors
      const code = String(data.code || data.Code || '');
      const smsId = String(data.SMSID || data.smsid || '');

      if (code === '1901') {
        console.log(`[SMS Misr] Sent to ${phone}, SMSID: ${smsId}`);
        return {
          success: true,
          externalMessageId: smsId,
          cost: 0.12, // ~0.12 EGP per SMS on average
        };
      }

      const errorMessages: Record<string, string> = {
        '1902': 'Invalid request',
        '1903': 'Invalid credentials',
        '1904': 'Invalid sender name',
        '1905': 'Invalid mobile number',
        '1906': 'Insufficient balance',
        '1907': 'Invalid message format',
        '1908': 'Spam content detected',
      };

      const errorMsg = errorMessages[code] || `SMS Misr error: ${code}`;
      console.error(`[SMS Misr] Failed to ${phone}:`, errorMsg, data);

      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('[SMS Misr] Network error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'SMS Misr send failed',
      };
    }
  }

  /**
   * Send via Twilio — fallback for international/non-Egyptian numbers.
   */
  private async sendViaTwilio(request: SendMessageRequest): Promise<SendMessageResult> {
    try {
      const phone = this.formatForTwilio(request.to);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      const auth = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');

      const formData = new URLSearchParams();
      formData.append('To', phone);
      formData.append('From', this.twilioFromNumber);
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
        return { success: false, error: data.message || `Twilio error: ${response.status}` };
      }

      return { success: true, externalMessageId: data.sid, cost: 0.50 };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'SMS send failed' };
    }
  }

  async getDeliveryStatus(externalMessageId: string): Promise<string> {
    // SMS Misr doesn't have a delivery status API in the free tier
    // Twilio does — use it if message ID looks like Twilio SID
    if (externalMessageId.startsWith('SM') && this.twilioAccountSid) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages/${externalMessageId}.json`;
        const auth = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');
        const response = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } });
        const data = await response.json();
        return data.status || 'sent';
      } catch {
        return 'sent';
      }
    }
    return 'sent';
  }

  /**
   * Format Egyptian phone number for SMS Misr.
   * SMS Misr expects: 201xxxxxxxxx (country code + number, no +)
   */
  private formatForSMSMisr(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '2' + cleaned; // 01x → 201x
    if (!cleaned.startsWith('2')) cleaned = '2' + cleaned;
    return cleaned;
  }

  /**
   * Format for Twilio (E.164 format: +201xxxxxxxxx)
   */
  private formatForTwilio(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '+2' + cleaned;
    else if (!cleaned.startsWith('+')) cleaned = '+2' + cleaned;
    return cleaned;
  }
}

/** Singleton instance */
let _instance: SmsProvider | null = null;
export function getSmsProvider(): SmsProvider {
  if (!_instance) _instance = new SmsProvider();
  return _instance;
}
