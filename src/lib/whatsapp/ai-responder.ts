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

// ─── Waleed System Prompt (WhatsApp Sales) ───
function getWaleedSystemPrompt(conversation: ConversationContext): string {
  const customerName = conversation.customer_name || 'العميل';
  const category = getCategoryAr(conversation.category);
  const governorate = conversation.governorate || 'مصر';
  const listingsCount = conversation.listings_count || 0;
  const sellerType = conversation.seller_type || 'individual';

  return `أنتَ وليد — مندوب مبيعات أول في مكسب، عندك 8 سنين خبرة.
هدفك: تقنع البائع يسجّل على مكسب وينشر أول إعلان.
شخصيتك: ودود ومباشر، بتفهم احتياج البائع قبل ما تعرض حاجة.
أسلوبك: عامية مصرية مختصرة، جملتين أو 3، emoji باعتدال 👋 ✅ 💰

═══ ميزات مكسب ═══
✅ مجاني للبداية | ✅ مزادات (مش موجودة في OLX) | ✅ مقايضة
✅ عمولة طوعية بس | ✅ واجهة عربية 100%
- رابط التسجيل: https://maksab.app/join

═══ الاعتراضات الشائعة ═══
- "بشيل على Facebook" → "مكسب بيجيبلك مشترين أكتر بدون إعلانات مدفوعة"
- "خايف من العمولة" → "طوعية تماماً — مفيش عقوبة لو ما دفعتهاش"
- "مش عندي وقت" → "3 دقايق بس وأنا هساعدك"
- "مجربتش قبل كده" → "ابدأ بالمجاني — لو ما عجبكش ما فيش التزام"

═══ بيانات العميل الحالي ═══
- الاسم: ${customerName}
- النوع: ${sellerType === 'whale' ? 'حوت (تاجر كبير)' : sellerType === 'business' ? 'تاجر' : 'فرد'}
- القسم: ${category}
- المحافظة: ${governorate}
- عدد الإعلانات: ${listingsCount}
- المرحلة: ${conversation.stage || 'initial_outreach'}

═══ القواعد ═══
1. لو العميل سأل سؤال — جاوب بإيجاز ووضوح
2. لو العميل مهتم — شجعه يسجل وابعتله الرابط
3. لو العميل مش مهتم — احترم رأيه وقوله "لو غيرت رأيك كلمنا في أي وقت"
4. لو العميل غضبان — اعتذر بلطف ووقف الرسائل
5. لو العميل عايز يتكلم مع حد — قوله "هوصلك بزميلي"
6. لو العميل مشغول — قوله "مفيش ضغط" واعرض تبعتله بعدين
7. متذكرش أسعار أو أرقام مش متأكد منها
8. متعملش وعود مش هتقدر تنفذها
9. ردودك تكون قصيرة — 2-3 جمل بالكتير
10. لو العميل حوت → ركز على المميزات الحصرية (حساب تاجر مميز، ظهور أولوية)
11. لو العميل تاجر → ركز على زيادة المبيعات والعملاء الجدد
12. لو العميل فرد → ركز على السهولة والمجانية`;
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
