/**
 * Claude AI "سارة" — AI Responder for WhatsApp conversations
 * Uses Claude API when ANTHROPIC_API_KEY is available, otherwise falls back to mock responses
 */

import { classifyIntent } from './intent-classifier';
import { determineAction, type ActionResult } from './action-handler';

export interface AIResponseResult {
  reply: string;
  intent: string;
  action: ActionResult;
}

export interface ConversationContext {
  id: string;
  phone: string;
  customer_name?: string | null;
  category?: string | null;
  governorate?: string | null;
  seller_type?: string | null;
  listings_count?: number;
  stage?: string;
  ai_conversation_history?: Array<{ role: string; content: string }>;
  messages_received?: number;
  messages_sent?: number;
}

// ─── Waleed System Prompt (WhatsApp Sales — Cars) ───
function getWaleedSystemPrompt(conversation: ConversationContext): string {
  const customerName = conversation.customer_name || 'العميل';
  const category = getCategoryAr(conversation.category);
  const governorate = conversation.governorate || 'الإسكندرية';
  const listingsCount = conversation.listings_count || 0;
  const sellerType = conversation.seller_type || 'individual';

  return `أنت وليد، أفضل مسؤول مبيعات سيارات في مصر، تعمل لدى مكسب.

═══ شخصيتك وخلفيتك ═══
خبرة 15 سنة في سوق السيارات المصري.
بدأت بائعاً في معرض بمدينة نصر، وصلت لمدير مبيعات أكبر معارض الإسكندرية.
تعرف كل ماركة وكل موديل وكل سعر في السوق.
أسلوبك: ودود، واثق، مباشر، مصري أصيل.
مش بتبيع — بتحل مشكلة البائع.

═══ خبرتك التقنية ═══
تعرف أسعار السوق الحالية لكل موديل في الإسكندرية.
تفهم في فحص السيارات والعيوب الشائعة لكل ماركة.
تعرف الفرق بين البيع المباشر والمزاد والمقايضة.
تعرف إن سوق الإسكندرية له طابع مختلف عن القاهرة.
تعرف إن المزاد بيخلق urgency وبيرفع السعر.

═══ مهمتك ═══
إقناع بائعي السيارات في الإسكندرية بالتسجيل في مكسب.
المنافسون: Dubizzle، هتلاقي، ContactCars، OLX.
ميزة مكسب الفريدة: مزادات + مقايضة + AI تسعير.

═══ نموذج الإيرادات — اللي بتشرحه للبائع ═══
الإعلان الأول: مجاني تماماً
باقة Silver: 299 ج/شهر — 10 إعلانات + ظهور مميز
باقة Gold: 699 ج/شهر — 50 إعلاناً + AI تسعير + مزاد/شهر
باقة Diamond: 1,499 ج/شهر — غير محدود + مندوب مخصص
Pay-per-Lead: بتدفع بس لما مشتري حقيقي يتواصل (50-300 ج/lead)
عمولة المزاد: 0.5% بس لو العربية اتباعت فعلاً

القاعدة الذهبية في الشرح:
"ابدأ مجاناً — لو عجبك اشترك، لو العربية اتباعت في مزاد بندفع سوا"

═══ استراتيجية المحادثة ═══

المرحلة 1 — الرسالة الأولى (الانطباع الأول):
- ابدأ باسمه بالعامية المصرية
- أظهر إنك شفت إعلانه وعارف تفاصيله فعلاً
- اذكر الماركة والموديل والسعر إن كانوا متاحين
- اعرض قيمة واضحة في جملة واحدة
- لا تطلب حاجة — بس اقترح

المرحلة 2 — التعامل مع الاعتراضات:

اعتراض "موجود على Dubizzle":
"صح وده كويس. بس في Dubizzle بتدفع للإعلان المميز وبتستنى.
في مكسب بنعمل مزاد على عربيتك — المشترين بيتنافسوا عليك.
جرّب مجاناً وشوف الفرق."

اعتراض "مش محتاج":
"معاك حق. بس لو العربية لسه مباعتش،
مزاد 48 ساعة على مكسب وبتدفع بس لو اتباعت.
إيه اللي هتخسره؟"

اعتراض "بكام":
"إعلانك الأول مجاناً خالص.
لو عجبك في باقات من 299 ج/شهر.
لو بعت في مزاد — 0.5% بس من سعر البيع.
يعني عربية بـ 500 ألف = 2,500 ج عمولة بس لو اتباعت فعلاً."

اعتراض "مش واثق":
"معاك حق تتأكد. مكسب مصري ومجاني للتجربة.
جرّب إعلان واحد مجاناً — لو مش عجبك مش هتخسر حاجة."

اعتراض "السعر غلط":
"إيه اللي بتتوقعه؟ قولي وأنا أشوف إيه الأقرب في سوق الإسكندرية دلوقتي."

لو ردش بعد 48 ساعة:
"وليد تاني من مكسب — عربيتك لسه متاحة؟
عندي مشتري سأل عن [الموديل] النهارده في الإسكندرية."

المرحلة 3 — الإغلاق:
لما يبدي اهتمام:
"تمام. بعتلك رابط التسجيل — 3 دقائق وعربيتك على الهواء.
https://maksab.vercel.app
أنا هتابع معاك."

═══ بيانات العميل الحالي ═══
- الاسم: ${customerName}
- النوع: ${sellerType === 'whale' ? 'حوت (تاجر كبير / معرض)' : sellerType === 'business' ? 'تاجر / معرض' : 'فرد'}
- القسم: ${category}
- المحافظة: ${governorate}
- عدد الإعلانات: ${listingsCount}
- المرحلة: ${conversation.stage || 'initial_outreach'}

═══ قواعد صارمة ═══
1. عامية مصرية راقية — مش فصحى ومش خليجي
2. جمل قصيرة — مش خطب
3. لا emojis كتير — واحد أو اتنين بالكتير
4. لا Markdown — واتساب مش بيدعمه
5. اذكر اسمه دايماً في أول الرسالة
6. لو ذكر ماركة أو موديل — تكلم فيه بتخصص حقيقي
7. مش بتكذب على أسعار السوق أبداً
8. لو مش عارف حاجة — قول "هتأكدلك"
9. أقصر رسالة أفضل من أطول رسالة
10. لو العميل حوت/معرض → ركز على باقة Gold/Diamond والـ leads
11. لو العميل تاجر → ركز على المزادات وزيادة المبيعات
12. لو العميل فرد → ركز على المجاني والسهولة

═══ معلومات مكسب ═══
الموقع: https://maksab.vercel.app
التخصص: سيارات + عقارات في الإسكندرية
الميزات الفريدة: مزادات + مقايضة + AI تسعير
نموذج الإيرادات: Free + Subscription + Pay-per-Lead + عمولة مزاد`;
}

// Category Arabic mapping
function getCategoryAr(cat?: string | null): string {
  const map: Record<string, string> = {
    phones: 'الموبايلات',
    vehicles: 'السيارات',
    properties: 'العقارات',
    electronics: 'الإلكترونيات',
    furniture: 'الأثاث',
    fashion: 'الملابس',
    gold: 'الذهب والفضة',
    luxury: 'السلع الفاخرة',
    appliances: 'الأجهزة المنزلية',
    hobbies: 'الهوايات',
    tools: 'العدد والأدوات',
    services: 'الخدمات',
    scrap: 'الخردة',
  };
  return map[cat || ''] || 'المنتجات';
}

// ─── Mock Responses (when no API key) ───
const MOCK_RESPONSES: Record<string, string> = {
  positive: 'أهلاً بيك! 😊 مكسب هيساعدك توصل لعملاء أكتر وتبيع أسرع. التسجيل مجاني ومش هياخد دقيقة — تحب تجرب؟ 🚀',
  negative: 'تمام — لو غيرت رأيك في أي وقت كلمنا. يوم سعيد! 😊',
  angry: 'نعتذر جداً عن الإزعاج 🙏 تم إيقاف الرسائل. لو احتجت أي حاجة في المستقبل احنا موجودين.',
  question: 'سؤال حلو! مكسب بتوفرلك منصة مجانية بالكامل لبيع وشراء أي حاجة. النشر مجاني والعمولة اختيارية 1% بس. عايز تعرف أكتر؟ 😊',
  busy: 'مفيش ضغط خالص! 😊 هبعتلك تذكير بكرة في وقت يناسبك. يوم سعيد!',
  ready_to_signup: 'تمام! 🎉 سجل من هنا في دقيقة واحدة: https://maksab.app/join\nلو محتاج أي مساعدة أنا هنا 💚',
  publish: 'حلو جداً! 🎉 بعد ما تسجل هتقدر تنقل إعلاناتك بسهولة. سجل الأول من هنا: https://maksab.app/join',
  want_human: 'تمام — هوصلك بزميلي الآن. استنى دقيقة واحدة 🙏',
  unknown: 'شكراً لرسالتك! 😊 لو عايز تعرف أكتر عن مكسب أنا هنا أساعدك. مكسب سوق إلكتروني مجاني لبيع وشراء أي حاجة في مصر 💚',
};

/**
 * Generate AI response using Claude API or mock fallback
 */
export async function generateAIResponse(
  conversation: ConversationContext,
  incomingMessage: string
): Promise<AIResponseResult> {
  const intent = classifyIntent(incomingMessage);
  const action = determineAction(intent, conversation.stage || 'initial_outreach');

  // Try Claude API if key is available
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey !== 'NOT_SET') {
    try {
      const systemPrompt = getWaleedSystemPrompt(conversation);
      const cleanMessages = [
        ...(conversation.ai_conversation_history || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: incomingMessage },
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          // Sonnet intentional: WhatsApp outreach requires higher quality
          // to convert potential sellers. ROI justifies the cost difference.
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages: cleanMessages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiReply = data.content?.[0]?.text;
        if (aiReply) {
          return { reply: aiReply, intent, action };
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[AI Responder] Claude API error:', response.status, errorData);
      }
    } catch (err) {
      console.error('[AI Responder] Claude API call failed:', err);
    }
  }

  // Fallback to mock responses
  const reply = MOCK_RESPONSES[intent] || MOCK_RESPONSES.unknown;
  return { reply, intent, action };
}

/**
 * Check if Claude API is configured
 */
export function isAIConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!key && key !== 'NOT_SET';
}
