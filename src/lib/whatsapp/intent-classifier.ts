/**
 * Intent Classifier for WhatsApp AI Responder
 * Classifies incoming messages into intent categories using keyword matching
 */

// Intent keywords map (Arabic + transliteration patterns)
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  positive: [
    /أيوا|ايوا|اه|نعم|تمام|ماشي|حلو|كويس|عايز|اعرف|أعرف|مهتم|يلا|اشترك|سجل|ابدأ|جرب/i,
    /ok|yes|sure|great|interested|cool/i,
  ],
  negative: [
    /لا شكرا|لا مش|مش محتاج|مش عايز|مش مهتم|ماليش|مليش|لأ/i,
    /no thanks|not interested|no/i,
  ],
  angry: [
    /بطل|كفاية|وقف|سبام|ازعاج|إزعاج|مضايقة|هبلغ|بلوك|غلس|زهق/i,
    /spam|stop|block|report|annoying/i,
  ],
  question: [
    /إيه هو|ايه هو|يعني ايه|يعنى ايه|ازاي|إزاي|ليه|بكام|سعر|فلوس|مجان|كم|هل/i,
    /what|how|why|when|price|free/i,
  ],
  busy: [
    /مشغول|بعدين|مش دلوقتي|وقت تاني|بكرة|later|busy/i,
  ],
  ready_to_signup: [
    /سجلني|اشتركني|عايز اسجل|ابعتلي الرابط|ابعتلى اللينك|link|رابط|اشترك/i,
  ],
  publish: [
    /انقل|انشر|إعلان|اعلان|بيع|هنشر|أنشر/i,
  ],
  want_human: [
    /حد تاني|شخص|بني ادم|بنى آدم|مسؤول|مدير|ممثل|agent|human|person/i,
  ],
};

/**
 * Classify the intent of an incoming message
 */
export function classifyIntent(message: string): string {
  const normalized = message.trim();

  // Check each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return intent;
      }
    }
  }

  return 'unknown';
}
