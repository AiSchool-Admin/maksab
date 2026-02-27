/**
 * POST /api/notifications/on-message
 *
 * Triggered after a chat message is sent.
 * Creates an in-app notification + push notification for the recipient.
 * Requires authentication via session token.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import { notifyChatMessage } from "@/lib/notifications/smart-notifications";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication — only logged-in users can trigger notifications
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const body = await request.json();
    const {
      conversation_id,
      sender_name,
      recipient_id,
      message_content,
      ad_id,
    } = body;

    // Use authenticated user ID as sender — prevent spoofing
    const sender_id = session.userId;

    if (!conversation_id || !recipient_id) {
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
