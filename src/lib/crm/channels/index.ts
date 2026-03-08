// Channel integrations index
// Routes messages to the correct provider based on channel type

import type { ChannelProvider, ChannelType, SendMessageRequest, SendMessageResult } from './types';
import { WhatsAppProvider } from './whatsapp';
import { SmsProvider } from './sms';
import { EmailProvider } from './email';

export { applyPlaceholders } from './types';
export type { ChannelType, SendMessageRequest, SendMessageResult, MessagePlaceholders } from './types';

// Singleton instances
const providers: Partial<Record<ChannelType, ChannelProvider>> = {};

function getProvider(channel: ChannelType): ChannelProvider {
  if (!providers[channel]) {
    switch (channel) {
      case 'whatsapp':
        providers[channel] = new WhatsAppProvider();
        break;
      case 'sms':
        providers[channel] = new SmsProvider();
        break;
      case 'email':
        providers[channel] = new EmailProvider();
        break;
      case 'in_app':
        // In-app messages are stored directly, no external provider needed
        providers[channel] = {
          channel: 'in_app',
          async send(request: SendMessageRequest): Promise<SendMessageResult> {
            console.log(`[InApp] Message to ${request.to}: ${request.content.substring(0, 50)}...`);
            return {
              success: true,
              externalMessageId: `inapp_${Date.now()}`,
              cost: 0,
            };
          },
        };
        break;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }
  return providers[channel]!;
}

/**
 * Send a message through the specified channel
 */
export async function sendMessage(
  channel: ChannelType,
  request: SendMessageRequest
): Promise<SendMessageResult> {
  const provider = getProvider(channel);
  return provider.send(request);
}

/**
 * Get delivery status from external provider
 */
export async function getDeliveryStatus(
  channel: ChannelType,
  externalMessageId: string
): Promise<string> {
  const provider = getProvider(channel);
  if (provider.getDeliveryStatus) {
    return provider.getDeliveryStatus(externalMessageId);
  }
  return 'sent';
}
