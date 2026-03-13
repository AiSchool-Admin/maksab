import { NextResponse } from "next/server";

export async function GET() {
  const conversations = [
    { id: "conv_1", customerName: "أحمد محمد", phone: "01012345678", channel: "whatsapp", type: "whale", whaleScore: 85, lastMessage: "أنا مش راضي عن الخدمة...", time: "منذ 15 دقيقة", status: "escalated", handler: "human", listingCount: 18 },
    { id: "conv_2", customerName: "محمد علي", phone: "01112345678", channel: "whatsapp", type: "individual", whaleScore: 35, lastMessage: "إزاي أنشر إعلان؟", time: "منذ 5 دقائق", status: "active", handler: "ai", listingCount: 3 },
    { id: "conv_3", customerName: "سارة أحمد", phone: "01234567890", channel: "chat", type: "merchant", whaleScore: 60, lastMessage: "شكراً جداً!", time: "منذ ساعة", status: "resolved", handler: "ai", listingCount: 8 },
    { id: "conv_4", customerName: "كريم حسن", phone: "01556789012", channel: "whatsapp", type: "individual", whaleScore: 20, lastMessage: "كام العمولة؟", time: "منذ 30 دقيقة", status: "active", handler: "ai", listingCount: 1 },
    { id: "conv_5", customerName: "ليلى محمود", phone: "01078901234", channel: "email", type: "merchant", whaleScore: 70, lastMessage: "عايزة أعرف عن الباقات", time: "منذ ساعتين", status: "waiting", handler: "ai", listingCount: 12 },
  ];
  const stats = { active: 23, ai: 20, human: 3, waiting: 5, resolved: 45 };
  return NextResponse.json({ conversations, stats });
}
