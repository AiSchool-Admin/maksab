// AI Response Analysis for CRM
// Analyzes incoming customer messages for sentiment and intent
// Uses simple keyword matching (no external AI API required)

export type Sentiment = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
export type Intent = 'interested' | 'question' | 'complaint' | 'purchase_intent' | 'price_inquiry' | 'how_to' | 'unsubscribe' | 'spam' | 'other';

export interface ResponseAnalysis {
  sentiment: Sentiment;
  intent: Intent;
  suggestedResponse: string | null;
  requiresHuman: boolean;
  shouldStopCampaign: boolean;
  shouldMarkDoNotContact: boolean;
}

// Egyptian Arabic keyword maps
const POSITIVE_KEYWORDS = [
  'تمام', 'حلو', 'ممتاز', 'جميل', 'عظيم', 'رائع', 'شكرا', 'شكراً',
  'ماشي', 'أيوا', 'ايوا', 'اه', 'أه', 'موافق', 'عايز', 'اشتري',
  'ابعتلي', 'ابعتلى', 'عاوز', 'ممكن', 'طيب', 'مهتم', 'حبيبي',
  'كويس', 'جزاك الله', 'بارك', 'الحمد لله', 'يا ريت', 'ياريت',
  'أكيد', 'اكيد', 'بالتأكيد', 'حاضر', 'إن شاء الله', 'ان شاء الله',
];

const NEGATIVE_KEYWORDS = [
  'لا', 'مش عايز', 'مش عاوز', 'مش مهتم', 'بلاش', 'كفاية',
  'وحش', 'سيء', 'مش كويس', 'زفت', 'فاشل', 'نصب', 'نصاب',
];

const STOP_KEYWORDS = [
  'stop', 'وقف', 'اوقف', 'أوقف', 'بلاش رسايل', 'متبعتش', 'متبعتيش',
  'ابعدوا', 'سيبوني', 'unsubscribe', 'الغاء', 'إلغاء', 'الغى', 'إلغى',
  'احذف رقمي', 'امسح رقمي', 'بلاش spam', 'مش عايز رسايل',
];

const QUESTION_KEYWORDS = [
  'إيه', 'ايه', 'ازاي', 'إزاي', 'ليه', 'ليش', 'كام', 'فين',
  'امتى', 'إمتى', 'مين', 'هل', 'يعني', 'ممكن أعرف', '?', '؟',
];

const PRICE_KEYWORDS = [
  'كام', 'سعر', 'ثمن', 'تكلفة', 'فلوس', 'مجاني', 'مجانا', 'مجاناً',
  'عمولة', 'اشتراك', 'باقة', 'خصم', 'عرض',
];

const PURCHASE_KEYWORDS = [
  'اشتري', 'أشتري', 'عايز اشتري', 'هشتري', 'سجلني', 'سجّلني',
  'عايز اسجل', 'عاوز اسجل', 'ازاي اسجل', 'نزلت التطبيق',
  'حملت التطبيق', 'فتحت حساب',
];

export function analyzeResponse(message: string): ResponseAnalysis {
  const text = message.trim().toLowerCase();

  // Check for stop/unsubscribe first (highest priority)
  if (STOP_KEYWORDS.some(k => text.includes(k))) {
    return {
      sentiment: 'negative',
      intent: 'unsubscribe',
      suggestedResponse: 'تم حذف رقمك من القائمة. نعتذر عن الإزعاج. لو غيرت رأيك في أي وقت، تقدر تسجل من التطبيق مباشرة 🙏',
      requiresHuman: false,
      shouldStopCampaign: true,
      shouldMarkDoNotContact: true,
    };
  }

  // Check for purchase intent
  if (PURCHASE_KEYWORDS.some(k => text.includes(k))) {
    return {
      sentiment: 'very_positive',
      intent: 'purchase_intent',
      suggestedResponse: null,
      requiresHuman: true,
      shouldStopCampaign: true,
      shouldMarkDoNotContact: false,
    };
  }

  // Check for price inquiry
  if (PRICE_KEYWORDS.some(k => text.includes(k))) {
    return {
      sentiment: 'neutral',
      intent: 'price_inquiry',
      suggestedResponse: 'مكسب مجاني بالكامل! النشر مجاني، والعمولة اختيارية 1% بس. سجل من هنا: https://maksab.app',
      requiresHuman: false,
      shouldStopCampaign: true,
      shouldMarkDoNotContact: false,
    };
  }

  // Count sentiment signals
  const positiveCount = POSITIVE_KEYWORDS.filter(k => text.includes(k)).length;
  const negativeCount = NEGATIVE_KEYWORDS.filter(k => text.includes(k)).length;
  const isQuestion = QUESTION_KEYWORDS.some(k => text.includes(k));

  // Determine sentiment
  let sentiment: Sentiment;
  if (positiveCount >= 3) sentiment = 'very_positive';
  else if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount >= 3) sentiment = 'very_negative';
  else if (negativeCount > positiveCount) sentiment = 'negative';
  else sentiment = 'neutral';

  // Determine intent
  let intent: Intent;
  if (isQuestion) {
    intent = 'question';
  } else if (positiveCount > 0 && text.length < 30) {
    // Short positive reply like "تمام" or "ماشي"
    intent = 'interested';
  } else if (negativeCount > positiveCount) {
    intent = 'complaint';
  } else {
    intent = 'other';
  }

  // Generate suggested response
  let suggestedResponse: string | null = null;
  if (intent === 'interested') {
    suggestedResponse = 'حلو جداً! 🎉 سجل من هنا في دقيقة واحدة وابدأ انشر إعلاناتك مجاناً: https://maksab.app';
  } else if (intent === 'question') {
    suggestedResponse = null; // Needs human to answer
  }

  return {
    sentiment,
    intent,
    suggestedResponse,
    requiresHuman: intent === 'question' || intent === 'complaint' || intent === 'other',
    shouldStopCampaign: sentiment === 'negative' || sentiment === 'very_negative' || intent === 'interested',
    shouldMarkDoNotContact: false,
  };
}
