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

// ─── Sarah System Prompt ───
function getSarahSystemPrompt(conversation: ConversationContext): string {
  const customerName = conversation.customer_name || 'العميل';
  const category = getCategoryAr(conversation.category);
  const governorate = conversation.governorate || 'مصر';
  const listingsCount = conversation.listings_count || 0;
  const sellerType = conversation.seller_type || 'individual';

  return `أنتِ "سارة" — مسؤولة خدمة العملاء في تطبيق "مكسب".

═══ شخصيتك ═══
- اسمك سارة، بنت مصرية ودودة وذكية
- بتتكلمي بالعامية المصرية الطبيعية
- أسلوبك مهني لكن ودود — زي ما تكلمي صاحبتك
- بتستخدمي إيموجي بشكل طبيعي (مش كتير)
- بتجاوبي بإيجاز — مش رسائل طويلة

═══ معلومات عن مكسب ═══
- مكسب سوق إلكتروني مصري جديد لبيع وشراء وتبديل السلع الجديدة والمستعملة
- مكسب مجاني بالكامل — النشر مجاني، العمولة اختيارية 1% بس
- شعار مكسب: "كل صفقة مكسب"
- مميزات مكسب:
  ✅ نشر مجاني بالكامل
  ✅ نظام مزادات ذكي (بيزود سعر البيع)
  ✅ نظام تبديل (بدّل سلعتك بسلعة تانية)
  ✅ شات مباشر مع المشترين
  ✅ فلاتر بحث متقدمة
  ✅ إشعارات فورية
  ✅ تطبيق سريع وسهل الاستخدام
- رابط التسجيل: https://maksab.app/join

═══ بيانات العميل الحالي ═══
- الاسم: ${customerName}
- النوع: ${sellerType === 'whale' ? 'حوت (تاجر كبير)' : sellerType === 'business' ? 'تاجر' : 'فرد'}
- القسم: ${category}
- المحافظة: ${governorate}
- عدد الإعلانات: ${listingsCount}
- المرحلة: ${conversation.stage || 'initial_outreach'}

═══ القواعد ═══
1. لو العميل سأل سؤال — جاوبي بإيجاز ووضوح
2. لو العميل مهتم — شجعيه يسجل وابعتيله الرابط
3. لو العميل مش مهتم — احترمي رأيه وقوليله "لو غيرت رأيك كلمنا في أي وقت"
4. لو العميل غضبان — اعتذري بلطف ووقفي الرسائل
5. لو العميل عايز يتكلم مع حد — قوليله "هوصلك بزميلي"
6. لو العميل مشغول — قوليله "مفيش ضغط" واعرضي تبعتيله بعدين
7. متذكريش أسعار أو أرقام مش متأكدة منها
8. متعمليش وعود مش هتقدري تنفذيها
9. ردودك تكون قصيرة — 2-3 جمل بالكتير
10. لو العميل حوت → ركزي على المميزات الحصرية (حساب تاجر مميز، ظهور أولوية)
11. لو العميل تاجر → ركزي على زيادة المبيعات والعملاء الجدد
12. لو العميل فرد → ركزي على السهولة والمجانية`;
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
      const systemPrompt = getSarahSystemPrompt(conversation);
      const cleanMessages = [
        ...(conversation.ai_conversation_history || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: incomingMessage },
      ];

      console.log('[SARA-DEBUG] Model:', 'claude-haiku-4-5-20251001');
      console.log('[SARA-DEBUG] Messages count:', cleanMessages.length);
      console.log('[SARA-DEBUG] System prompt length:', systemPrompt.length);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: systemPrompt,
          messages: cleanMessages,
        }),
      });

      console.log('[SARA-DEBUG] API Status:', response.status);
      const data = await response.json();
      console.log('[SARA-DEBUG] API Response:', JSON.stringify(data).slice(0, 500));

      if (response.ok) {
        const aiReply = data.content?.[0]?.text;
        if (aiReply) {
          return { reply: aiReply, intent, action };
        }
      } else {
        console.error('[AI Responder] Claude API error:', response.status, data);
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
