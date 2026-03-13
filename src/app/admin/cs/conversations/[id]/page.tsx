"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Send,
  Phone,
  Link2,
  ClipboardList,
  CheckCircle2,
  Bot,
  AlertTriangle,
  MapPin,
  Calendar,
  ShoppingBag,
  StickyNote,
  Plus,
  ChevronDown,
  ChevronUp,
  User,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "customer" | "ai" | "agent";
  sender_name: string;
  content: string;
  time: string;
  delivery_status: "sent" | "delivered" | "read";
  intent?: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  whale_score: number;
  type: "whale" | "trader" | "individual";
  governorate: string;
  city: string;
  listing_count: number;
  registered: boolean;
  member_since: string;
  discovery_date: string;
  total_conversations: number;
  notes: string[];
}

const CUSTOMER_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  whale: { label: "حوت", emoji: "\u{1F40B}" },
  trader: { label: "تاجر", emoji: "\u{1F3EA}" },
  individual: { label: "فرد", emoji: "\u{1F464}" },
};

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  question: { label: "سؤال", color: "bg-blue-100 text-blue-700" },
  want_human: { label: "عايز بشري", color: "bg-orange-100 text-orange-700" },
  complaint: { label: "شكوى", color: "bg-red-100 text-red-700" },
  greeting: { label: "تحية", color: "bg-green-100 text-green-700" },
  thanks: { label: "شكر", color: "bg-emerald-100 text-emerald-700" },
  registration: { label: "تسجيل", color: "bg-purple-100 text-purple-700" },
  pricing: { label: "أسعار", color: "bg-yellow-100 text-yellow-700" },
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  sent: "تم الإرسال",
  delivered: "وصلت",
  read: "\u2705 مقروءة",
};

const MOCK_CUSTOMER: CustomerInfo = {
  name: "أحمد محمود",
  phone: "01012345678",
  whale_score: 92,
  type: "whale",
  governorate: "القاهرة",
  city: "مدينة نصر",
  listing_count: 47,
  registered: false,
  member_since: "",
  discovery_date: "5 مارس 2026",
  total_conversations: 3,
  notes: [
    "تاجر سيارات كبير في مدينة نصر",
    "عنده showroom على الرئيسي",
    "مهتم بالباقة الذهبية",
  ],
};

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "customer",
    sender_name: "أحمد محمود",
    content: "السلام عليكم",
    time: "10:30 ص",
    delivery_status: "read",
    intent: "greeting",
  },
  {
    id: "msg-2",
    sender: "ai",
    sender_name: "سارة (AI)",
    content:
      "وعليكم السلام يا أحمد! أهلاً بيك في مكسب \u{1F49A}\nأنا سارة، المساعدة الذكية. إزاي أقدر أساعدك النهارده؟",
    time: "10:30 ص",
    delivery_status: "read",
  },
  {
    id: "msg-3",
    sender: "customer",
    sender_name: "أحمد محمود",
    content: "أنا عندي شوروم سيارات وعايز أعرف إزاي أضيف إعلاناتي عندكم",
    time: "10:31 ص",
    delivery_status: "read",
    intent: "question",
  },
  {
    id: "msg-4",
    sender: "ai",
    sender_name: "سارة (AI)",
    content:
      "ممتاز يا أحمد! مكسب هو المكان الصح لشوروم السيارات \u{1F697}\n\nتقدر تضيف إعلاناتك بسهولة:\n1. سجّل حسابك برقم الموبايل\n2. اضغط \"أضف إعلان\"\n3. اختار قسم السيارات\n4. املا البيانات وارفع الصور\n\nوكمان عندنا باقات خاصة للتجار بمميزات إضافية. تحب أعرفك عليها؟",
    time: "10:32 ص",
    delivery_status: "read",
  },
  {
    id: "msg-5",
    sender: "customer",
    sender_name: "أحمد محمود",
    content: "لا أنا مش فاهم، عايز أكلم حد من الفريق",
    time: "10:33 ص",
    delivery_status: "read",
    intent: "want_human",
  },
  {
    id: "msg-6",
    sender: "ai",
    sender_name: "سارة (AI)",
    content:
      "طبعاً يا أحمد! هحوّلك لأحد زملائي من فريق خدمة العملاء دلوقتي. لحظة واحدة \u{1F64F}",
    time: "10:33 ص",
    delivery_status: "read",
  },
  {
    id: "msg-7",
    sender: "agent",
    sender_name: "خدمة العملاء",
    content:
      "أهلاً يا أحمد! أنا محمد من فريق مكسب. شوفت إنك عندك شوروم سيارات — ده ممتاز! \nتحب أشرحلك عن باقة التجار اللي هتناسبك؟",
    time: "10:35 ص",
    delivery_status: "delivered",
  },
  {
    id: "msg-8",
    sender: "customer",
    sender_name: "أحمد محمود",
    content: "أيوا يا محمد، كلمني عن الباقات والأسعار",
    time: "10:36 ص",
    delivery_status: "read",
    intent: "pricing",
  },
];

const QUICK_REPLIES = [
  "أنا هساعدك",
  "هبعتلك رابط",
  "دقيقة واحدة",
  "شكراً",
];

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [replyText, setReplyText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [notes, setNotes] = useState<string[]>(MOCK_CUSTOMER.notes);

  const customer = MOCK_CUSTOMER;
  const typeCfg = CUSTOMER_TYPE_LABELS[customer.type];

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "agent",
      sender_name: "خدمة العملاء",
      content: replyText,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      delivery_status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyText("");
  };

  const handleQuickReply = (text: string) => {
    setReplyText(text);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [...prev, newNote]);
    setNewNote("");
    setShowNoteInput(false);
  };

  const getWhaleIndicator = (score: number) => {
    if (score >= 90) return { label: "\u{1F40B} حوت كبير", color: "text-blue-600 bg-blue-50" };
    if (score >= 70) return { label: "\u{1F42C} حوت متوسط", color: "text-cyan-600 bg-cyan-50" };
    if (score >= 50) return { label: "\u{1F41F} سمكة كبيرة", color: "text-teal-600 bg-teal-50" };
    return { label: "\u{1F420} سمكة صغيرة", color: "text-gray-600 bg-gray-50" };
  };

  const whaleInfo = getWhaleIndicator(customer.whale_score);

  return (
    <div className="space-y-4">
      {/* Back Button & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/cs/conversations"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowRight size={16} />
          رجوع للمحادثات
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Customer Info Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1B7A3D] rounded-full flex items-center justify-center text-white font-bold">
                  {customer.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900">{customer.name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                      {typeCfg.emoji} {typeCfg.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${whaleInfo.color}`}>
                      {whaleInfo.label}
                    </span>
                    {!customer.registered && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">
                        غير مسجّل
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span dir="ltr">{customer.phone}</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {customer.governorate} — {customer.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingBag size={12} />
                      {customer.listing_count} إعلان
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <User size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px] bg-[#FAFAFA]">
            {messages.map((msg) => {
              const isCustomer = msg.sender === "customer";
              const isAI = msg.sender === "ai";
              const isAgent = msg.sender === "agent";

              return (
                <div
                  key={msg.id}
                  className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] ${
                      isCustomer
                        ? "order-1"
                        : "order-1"
                    }`}
                  >
                    {/* Sender label */}
                    <div
                      className={`text-[10px] mb-1 flex items-center gap-1 ${
                        isCustomer ? "text-gray-400" : "text-gray-400 justify-end"
                      }`}
                    >
                      {isAI && <Bot size={10} className="text-purple-500" />}
                      {isAgent && <User size={10} className="text-blue-500" />}
                      <span>{msg.sender_name}</span>
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isCustomer
                          ? "bg-white border border-gray-200 text-gray-900 rounded-tr-md"
                          : isAI
                          ? "bg-purple-50 border border-purple-100 text-gray-900 rounded-tl-md"
                          : "bg-[#1B7A3D] text-white rounded-tl-md"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>

                    {/* Time & delivery status */}
                    <div
                      className={`text-[10px] mt-1 flex items-center gap-2 ${
                        isCustomer ? "text-gray-400" : "text-gray-400 justify-end"
                      }`}
                    >
                      <span>{msg.time}</span>
                      {!isCustomer && (
                        <span>{DELIVERY_STATUS_LABELS[msg.delivery_status]}</span>
                      )}
                    </div>

                    {/* Intent label for customer messages */}
                    {isCustomer && msg.intent && (
                      <div className="mt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-medium ${
                            INTENT_LABELS[msg.intent]?.color || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {INTENT_LABELS[msg.intent]?.label || msg.intent}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Replies */}
          <div className="px-4 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_REPLIES.map((text) => (
                <button
                  key={text}
                  onClick={() => handleQuickReply(text)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Reply Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="اكتب رد..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="px-4 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={16} />
                إرسال
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors">
                <Phone size={14} />
                اتصل
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-medium hover:bg-purple-100 transition-colors">
                <Link2 size={14} />
                رابط تسجيل
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-cyan-50 text-cyan-700 rounded-xl text-xs font-medium hover:bg-cyan-100 transition-colors">
                <ClipboardList size={14} />
                نقل إعلانات
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-medium hover:bg-green-100 transition-colors">
                <CheckCircle2 size={14} />
                إغلاق
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-xl text-xs font-medium hover:bg-yellow-100 transition-colors">
                <Bot size={14} />
                خلّي AI يكمل
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors">
                <AlertTriangle size={14} />
                تصعيد للمدير
              </button>
            </div>
          </div>
        </div>

        {/* Customer Info Sidebar */}
        {sidebarOpen && (
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Score Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">معلومات العميل</h3>

              {/* Whale Score */}
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-[#1B7A3D]">{customer.whale_score}</div>
                <div className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${whaleInfo.color}`}>
                  {whaleInfo.label}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <ShoppingBag size={14} />
                    عدد الإعلانات
                  </span>
                  <span className="font-bold text-gray-900">{customer.listing_count}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <MapPin size={14} />
                    الموقع
                  </span>
                  <span className="font-medium text-gray-900">
                    {customer.governorate} — {customer.city}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Calendar size={14} />
                    تاريخ الاكتشاف
                  </span>
                  <span className="font-medium text-gray-900">{customer.discovery_date}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <MessageSquare size={14} />
                    المحادثات
                  </span>
                  <span className="font-bold text-gray-900">{customer.total_conversations}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">حالة التسجيل</span>
                  {customer.registered ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                      مسجّل \u2705
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600">
                      غير مسجّل
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact History */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">سجل التواصل</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-600">محادثة واتساب</span>
                  <span className="mr-auto text-gray-400">اليوم</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-600">رسالة AI تلقائية</span>
                  <span className="mr-auto text-gray-400">أمس</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-gray-600">اكتشاف من OLX</span>
                  <span className="mr-auto text-gray-400">5 مارس</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <StickyNote size={14} />
                  ملاحظات
                </h3>
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className="text-[#1B7A3D] hover:text-[#145C2E] transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {showNoteInput && (
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddNote();
                    }}
                    placeholder="أضف ملاحظة..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1B7A3D]/20 focus:border-[#1B7A3D] outline-none"
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-2 bg-[#1B7A3D] text-white rounded-lg text-xs hover:bg-[#145C2E] transition-colors"
                  >
                    أضف
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {notes.map((note, i) => (
                  <div
                    key={i}
                    className="p-2 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-gray-700"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
