/**
 * WhatsApp Notification Service — Send transactional notifications via WhatsApp.
 *
 * Uses WhatsApp Cloud API (Meta Graph API v21.0).
 * Sends text messages within service window (24h after user's last interaction),
 * or template messages for first-time outreach.
 *
 * Server-side only.
 */

const GRAPH_API_URL = "https://graph.facebook.com/v21.0";

interface WhatsAppResult {
  success: boolean;
  error?: string;
}

/**
 * Send a WhatsApp text message to a phone number.
 * Works within 24h service window of user's last interaction.
 */
export async function sendWhatsAppText(
  phone: string,
  message: string,
): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "WhatsApp not configured" };
  }

  // Clean phone number — ensure Egyptian format with country code
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("2") ? cleanPhone : `2${cleanPhone}`;

  try {
    const response = await fetch(
      `${GRAPH_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: fullPhone,
          type: "text",
          text: { body: message },
        }),
      },
    );

    if (response.ok) {
      return { success: true };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;

    // Error 131047 = "Re-engagement message" = outside 24h window
    // Error 131049 = "This message was not delivered"
    // In these cases, try template fallback
    const errorCode = errorData?.error?.code;
    if (errorCode === 131047 || errorCode === 131049 || response.status === 400) {
      // Try template fallback
      return sendWhatsAppTemplate(fullPhone, message);
    }

    console.error("[WhatsApp Notif] Send failed:", errorMsg);
    return { success: false, error: errorMsg };
  } catch (err) {
    console.error("[WhatsApp Notif] Network error:", err);
    return { success: false, error: "Network error" };
  }
}

/**
 * Send a WhatsApp template message (for outside service window).
 * Uses a generic utility template — user must create this in Meta Business Manager.
 */
async function sendWhatsAppTemplate(
  fullPhone: string,
  message: string,
): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_NOTIFICATION_TEMPLATE || "maksab_notification";

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    // Truncate message for template parameter (max 1024 chars)
    const truncated = message.length > 200 ? message.slice(0, 197) + "..." : message;

    const response = await fetch(
      `${GRAPH_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: fullPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "ar" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: truncated }],
              },
            ],
          },
        }),
      },
    );

    if (response.ok) {
      return { success: true };
    }

    // Template might not exist yet — this is expected
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
    console.warn("[WhatsApp Notif] Template send failed:", errorMsg);
    return { success: false, error: errorMsg };
  } catch {
    return { success: false, error: "Network error" };
  }
}

// ── Notification-specific message formatters ────────────

/**
 * Send chat notification via WhatsApp.
 */
export async function sendWhatsAppChatNotification(
  recipientPhone: string,
  senderName: string,
  messagePreview: string,
  adTitle?: string,
): Promise<WhatsAppResult> {
  const lines = [`رسالة جديدة من ${senderName} على مكسب`];
  if (adTitle) lines.push(`بخصوص: ${adTitle}`);
  lines.push(`"${messagePreview}"`);
  lines.push("افتح التطبيق للرد");

  return sendWhatsAppText(recipientPhone, lines.join("\n"));
}

/**
 * Send auction bid notification via WhatsApp.
 */
export async function sendWhatsAppAuctionNotification(
  recipientPhone: string,
  type: "new_bid" | "outbid" | "auction_ended" | "buy_now",
  adTitle: string,
  amount: number,
  bidderName?: string,
): Promise<WhatsAppResult> {
  const formattedAmount = amount.toLocaleString("en-US");
  let message = "";

  switch (type) {
    case "new_bid":
      message = `مزايدة جديدة على "${adTitle}"\n${bidderName || "مشتري"} زايد بـ ${formattedAmount} جنيه\nافتح مكسب لمتابعة المزاد`;
      break;
    case "outbid":
      message = `حد زايد عليك!\nالمبلغ الجديد على "${adTitle}": ${formattedAmount} جنيه\nزايد تاني على مكسب`;
      break;
    case "auction_ended":
      message = `المزاد انتهى!\n"${adTitle}" انتهى بمبلغ ${formattedAmount} جنيه\nافتح مكسب للتفاصيل`;
      break;
    case "buy_now":
      message = `تم الشراء الفوري!\n"${adTitle}" اتباع بـ ${formattedAmount} جنيه\nافتح مكسب للتفاصيل`;
      break;
  }

  return sendWhatsAppText(recipientPhone, message);
}

/**
 * Send price offer notification via WhatsApp.
 */
export async function sendWhatsAppOfferNotification(
  recipientPhone: string,
  type: "new_offer" | "accepted" | "rejected" | "countered",
  adTitle: string,
  amount: number,
  senderName: string,
  counterAmount?: number,
): Promise<WhatsAppResult> {
  const formattedAmount = amount.toLocaleString("en-US");
  let message = "";

  switch (type) {
    case "new_offer":
      message = `عرض سعر جديد!\n${senderName} قدّم عرض ${formattedAmount} جنيه على "${adTitle}"\nافتح مكسب للرد`;
      break;
    case "accepted":
      message = `تم قبول عرضك!\nالبائع قبل عرضك ${formattedAmount} جنيه على "${adTitle}"\nمبروك!`;
      break;
    case "rejected":
      message = `تم رفض عرضك\nعرضك ${formattedAmount} جنيه على "${adTitle}" اترفض\nممكن تقدم عرض تاني على مكسب`;
      break;
    case "countered": {
      const counterFormatted = (counterAmount || 0).toLocaleString("en-US");
      message = `عرض مضاد!\nالبائع قدّم عرض مضاد ${counterFormatted} جنيه على "${adTitle}"\nافتح مكسب للرد`;
      break;
    }
  }

  return sendWhatsAppText(recipientPhone, message);
}

/**
 * Send new matching ad notification via WhatsApp.
 */
export async function sendWhatsAppMatchNotification(
  recipientPhone: string,
  adTitle: string,
  saleType: string,
  reason?: string,
): Promise<WhatsAppResult> {
  const saleLabel = saleType === "auction" ? "مزاد" : saleType === "exchange" ? "تبديل" : "بيع نقدي";
  const lines = [`إعلان جديد يطابق بحثك على مكسب!`, `${adTitle} — ${saleLabel}`];
  if (reason) lines.push(`بناءً على بحثك عن "${reason}"`);
  lines.push("افتح مكسب للتفاصيل");

  return sendWhatsAppText(recipientPhone, lines.join("\n"));
}
