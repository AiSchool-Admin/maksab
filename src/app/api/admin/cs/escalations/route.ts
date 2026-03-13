import { NextResponse } from "next/server";

export async function GET() {
  const escalations = [
    { id: "esc_1", customerName: "أحمد محمد", phone: "01012345678", type: "whale", whaleScore: 85, reason: "عميل غير راضي — طلب تدخل بشري", priority: "critical", time: "منذ 15 دقيقة", conversationId: "conv_1", channel: "whatsapp" },
    { id: "esc_2", customerName: "محمود سعيد", phone: "01198765432", type: "merchant", whaleScore: 72, reason: "مشكلة في الحساب — تسجيل دخول فاشل", priority: "high", time: "منذ ساعة", conversationId: "conv_6", channel: "whatsapp" },
    { id: "esc_3", customerName: "نادية فاروق", phone: "01534567890", type: "individual", whaleScore: 25, reason: "شكوى من إعلان احتيالي", priority: "medium", time: "منذ ساعتين", conversationId: "conv_7", channel: "chat" },
  ];
  const stats = { total: 8, pending: 3, resolved: 5 };
  return NextResponse.json({ escalations, stats });
}
