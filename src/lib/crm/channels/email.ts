// Email Integration via Resend
// Sends emails for CRM outreach campaigns

import type { ChannelProvider, SendMessageRequest, SendMessageResult } from './types';

export class EmailProvider implements ChannelProvider {
  channel = 'email' as const;

  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@maksab.app';
  }

  async send(request: SendMessageRequest): Promise<SendMessageResult> {
    if (!this.apiKey) {
      // Simulated send in dev/staging
      console.log(`[Email] Simulated send to ${request.to}: ${request.content.substring(0, 50)}...`);
      return {
        success: true,
        externalMessageId: `email_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0.01, // ~0.01 EGP per email
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: request.to,
          subject: (request.metadata?.subject as string) || 'رسالة من مكسب',
          html: this.wrapInTemplate(request.content),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Resend error: ${response.status}`,
        };
      }

      return {
        success: true,
        externalMessageId: data.id,
        cost: 0.01,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Email send failed',
      };
    }
  }

  /**
   * Wrap plain text content in a basic RTL HTML email template
   */
  private wrapInTemplate(content: string): string {
    const htmlContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; text-align: right; background-color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { color: #1B7A3D; font-size: 24px; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.8; color: #1A1A2E; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">مكسب 🟢</div>
    </div>
    <div class="content">${htmlContent}</div>
    <div class="footer">
      <p>مكسب — كل صفقة مكسب</p>
      <p>لإلغاء الاشتراك، رد على هذا البريد بكلمة "إلغاء"</p>
    </div>
  </div>
</body>
</html>`;
  }
}
