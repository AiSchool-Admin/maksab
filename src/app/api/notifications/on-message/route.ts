/**
 * POST /api/notifications/on-message
 *
 * Triggered after a chat message is sent.
 * Creates an in-app notification + push notification for the recipient.
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyChatMessage } from "@/lib/notifications/smart-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversation_id,
      sender_id,
      sender_name,
      recipient_id,
      message_content,
      ad_id,
    } = body;

    if (!conversation_id || !sender_id || !recipient_id) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    await notifyChatMessage({
      conversationId: conversation_id,
      senderId: sender_id,
      senderName: sender_name || "مستخدم",
      recipientId: recipient_id,
      messageContent: message_content || "",
      adId: ad_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("on-message notification error:", err);
    return NextResponse.json({ error: "خطأ في الإشعارات" }, { status: 500 });
  }
}
