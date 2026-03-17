// ═══════════════════════════════════════════
// Customer Service System Types
// ═══════════════════════════════════════════

export type CSConversationStatus =
  | "open"
  | "ai_handling"
  | "waiting_agent"
  | "agent_handling"
  | "resolved"
  | "closed";

export type CSPriority = "urgent" | "high" | "normal" | "low";

export type CSCategory =
  | "general"
  | "registration"
  | "listing"
  | "payment"
  | "complaint"
  | "technical"
  | "fraud";

export type CSSenderType = "user" | "agent" | "ai" | "system";

export type CSMessageType = "text" | "image" | "template" | "action";

export type CSTemplateCategory =
  | "greeting"
  | "registration"
  | "listing"
  | "payment"
  | "technical"
  | "complaint"
  | "followup"
  | "closing"
  | "general";

export interface CSConversation {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_phone: string | null;
  subject: string | null;
  status: CSConversationStatus;
  priority: CSPriority;
  category: CSCategory;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  ai_handled: boolean;
  ai_resolved: boolean;
  ai_message_count: number;
  first_response_at: string | null;
  resolved_at: string | null;
  csat_rating: number | null;
  csat_feedback: string | null;
  messages_count: number;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface CSMessage {
  id: string;
  conversation_id: string;
  sender_type: CSSenderType;
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  message_type: CSMessageType;
  template_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CSTemplate {
  id: string;
  name: string;
  name_ar: string;
  category: CSTemplateCategory;
  message_text: string;
  shortcut: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CSSettings {
  ai_enabled: boolean;
  ai_auto_greet: boolean;
  ai_auto_transfer: boolean;
  ai_handle_complaints: boolean;
  ai_max_messages: number;
  ai_transfer_delay_seconds: number;
  working_hours_start: string;
  working_hours_end: string;
  outside_hours_ai_only: boolean;
}

// Sara AI Intent Detection
export type CSIntent =
  | "greeting"
  | "registration"
  | "listing"
  | "payment"
  | "technical"
  | "complaint"
  | "search"
  | "unknown";

export const CS_INTENT_PATTERNS: Record<CSIntent, RegExp> = {
  greeting: /مرحبا|السلام|[اأ]هلا|هاي|هاى|هايي|hi|hello|صباح|مساء|[اإ]زيك|[اإ]زاي|يا هلا/i,
  registration: /تسجيل|سج[لّ]|اسجل|حساب|اشترك|sign up|رقم|موبايل|انشئ/i,
  listing: /[اإ]علان|نشر|انشر|[اأ]ضيف|حذف|عد[لّ]|صور|سعر/i,
  payment: /دفع|فلوس|عمولة|اشتراك|باقة|فودافون|[اإ]نستاباي|فوري/i,
  technical: /مش شغال|خط[اأ]|error|bug|مشكلة تقنية|بطي[ءئ]|مش بيفتح|مش بيشتغل/i,
  complaint: /شكوى|شكوي|نصب|احتيال|مزيف|سرقة|بلاغ|مضروب/i,
  search: /ابحث|دو[رّ]|فين|عايز اشتري|عايز [اأ]بيع|بدور/i,
  unknown: /./,
};

export const CS_AI_RESPONSES: Record<Exclude<CSIntent, "unknown">, string> = {
  greeting: "أهلاً بيك في مكسب! 💚 إزاي أقدر أساعدك؟",
  registration:
    "عشان تسجّل:\n1. اضغط \"انشئ حساب\"\n2. اختار فرد أو تاجر\n3. دخّل رقمك\n4. فعّل بالكود\n\nلو عندك مشكلة قولي إيه بالظبط 😊",
  listing:
    "عشان تنشر إعلان:\n1. اضغط \"انشر إعلانك\"\n2. اختار الفئة\n3. أضف صور + وصف + سعر\n4. اضغط \"نشر\"\n\nعايز مساعدة في خطوة معينة؟",
  payment:
    "مكسب عمولته طوعية! مش إجبارية.\nباقات التجار:\n🥈 Silver: 199 ج/شهر\n🥇 Gold: 499 ج/شهر\n💎 Diamond: 999 ج/شهر\n\nعايز تفاصيل أكتر؟",
  technical:
    "فاهم — خليني أساعدك! 🔧\nممكن تقولي:\n1. إيه اللي حصل بالظبط؟\n2. على أي صفحة؟\n3. screenshot لو ممكن\n\nأو أحوّلك لزميلي المتخصص؟",
  complaint:
    "⚠️ فاهم إن فيه مشكلة — آسفين جداً!\nهحوّلك لزميلي المتخصص فوراً.\nممكن تقولي التفاصيل؟",
  search:
    "ابحث عن أي حاجة على مكسب:\n🔍 افتح الصفحة الرئيسية\n📂 اختار الفئة\n📍 حدد المكان\n\nأو قولي بتدوّر على إيه وأنا أساعدك! 😊",
};

// Status display config
export const CS_STATUS_CONFIG: Record<
  CSConversationStatus,
  { label: string; dot: string; bg: string }
> = {
  open: { label: "جديدة", dot: "bg-red-500", bg: "bg-red-50 text-red-700" },
  ai_handling: {
    label: "سارة AI",
    dot: "bg-yellow-400",
    bg: "bg-yellow-50 text-yellow-700",
  },
  waiting_agent: {
    label: "منتظرة موظف",
    dot: "bg-orange-400",
    bg: "bg-orange-50 text-orange-700",
  },
  agent_handling: {
    label: "موظف بيرد",
    dot: "bg-blue-500",
    bg: "bg-blue-50 text-blue-700",
  },
  resolved: {
    label: "محلولة",
    dot: "bg-green-500",
    bg: "bg-green-50 text-green-700",
  },
  closed: {
    label: "مغلقة",
    dot: "bg-gray-400",
    bg: "bg-gray-50 text-gray-600",
  },
};

export const CS_PRIORITY_CONFIG: Record<
  CSPriority,
  { label: string; color: string }
> = {
  urgent: { label: "عاجل", color: "bg-red-100 text-red-700" },
  high: { label: "مرتفع", color: "bg-orange-100 text-orange-700" },
  normal: { label: "عادي", color: "bg-blue-100 text-blue-700" },
  low: { label: "منخفض", color: "bg-gray-100 text-gray-600" },
};

export const CS_CATEGORY_CONFIG: Record<
  CSCategory,
  { label: string; icon: string }
> = {
  general: { label: "عام", icon: "💬" },
  registration: { label: "تسجيل", icon: "📱" },
  listing: { label: "إعلانات", icon: "📦" },
  payment: { label: "دفع", icon: "💰" },
  complaint: { label: "شكوى", icon: "⚠️" },
  technical: { label: "تقني", icon: "🔧" },
  fraud: { label: "احتيال", icon: "🚨" },
};
