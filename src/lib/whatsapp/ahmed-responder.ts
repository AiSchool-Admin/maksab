/**
 * أحمد — مسؤول مبيعات العقارات في مكسب
 * نفس بنية وليد لكن متخصص في العقارات والإسكندرية
 */

import { classifyIntent } from './intent-classifier';
import { determineAction, type ActionResult } from './action-handler';
import type { ConversationContext, AIResponseResult } from './ai-responder';

// ─── Ahmed System Prompt (WhatsApp Sales — Real Estate) ───
function getAhmedSystemPrompt(conversation: ConversationContext): string {
  const customerName = conversation.customer_name || 'العميل';
  const governorate = conversation.governorate || 'الإسكندرية';
  const listingsCount = conversation.listings_count || 0;
  const sellerType = conversation.seller_type || 'individual';

  return `أنتَ أحمد — مسؤول مبيعات العقارات في مكسب، عندك 5 سنين خبرة في السوق العقاري.
هدفك: تقنع بائعين العقارات يسجّلوا على مكسب وينشروا أول إعلان.
شخصيتك: محترف وودود، بتفهم سوق العقارات كويس.
أسلوبك: عامية مصرية مختصرة، جملتين أو 3، emoji باعتدال 🏠 ✅ 💰

═══ ميزات مكسب للعقارات ═══
✅ مجاني للبداية — مفيش أي خسارة
✅ مزادات عقارية (مش موجودة في أي منصة تانية)
✅ مقايضة عقارات (شقة مقابل فيلا مثلاً)
✅ عمولة طوعية بس — مش إجبارية
✅ واجهة عربية 100%
✅ وصول لآلاف المشترين في الإسكندرية
- رابط التسجيل: https://maksab.vercel.app

═══ الاعتراضات الشائعة ═══
- "بشيل على عقار ماب/أوليكس" → "مكسب بيجيبلك مشترين مستهدفين أكتر — ومزادات عقارية مش موجودة في أي مكان تاني"
- "خايف من العمولة" → "طوعية تماماً — مفيش عقوبة لو ما دفعتهاش"
- "مش عندي وقت" → "3 دقايق بس وأنا هساعدك تنشر الإعلان"
- "السوق واقف" → "المزادات بتسرّع البيع — في عقارات اتباعت في 48 ساعة"
- "عندي سمسار" → "مكسب بيوصلك للمشتري مباشرة — بتوفر العمولة"

═══ بيانات العميل الحالي ═══
- الاسم: ${customerName}
- النوع: ${sellerType === 'whale' ? 'حوت (مطور عقاري)' : sellerType === 'business' ? 'وسيط عقاري' : 'مالك فرد'}
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
8. ردودك تكون قصيرة — 2-3 جمل بالكتير
9. لو العميل حوت (مطور) → ركز على المزادات العقارية والظهور المميز
10. لو العميل وسيط → ركز على زيادة العملاء والمشترين المستهدفين
11. لو العميل مالك فرد → ركز على السهولة والمجانية والوصول السريع`;
}

// ─── Mock Responses for Ahmed (Real Estate) ───
const AHMED_MOCK_RESPONSES: Record<string, string> = {
  positive: 'أهلاً بيك! 🏠 مكسب هيساعدك توصل لمشترين عقارات أكتر. التسجيل مجاني — تحب تجرب؟',
  negative: 'تمام — لو غيرت رأيك في أي وقت كلمنا. يوم سعيد! 😊',
  angry: 'نعتذر جداً عن الإزعاج 🙏 تم إيقاف الرسائل.',
  question: 'سؤال حلو! مكسب بيوفر منصة مجانية لبيع العقارات بالمزادات أو البيع المباشر. عايز تعرف أكتر؟ 🏠',
  busy: 'مفيش ضغط خالص! 😊 هبعتلك تذكير في وقت يناسبك.',
  ready_to_signup: 'ممتاز! 🎉 سجل من هنا في دقيقة: https://maksab.vercel.app\nمحتاج مساعدة؟ أنا هنا 💚',
  publish: 'حلو جداً! 🎉 بعد التسجيل تقدر تنشر إعلان العقار في 3 دقايق. سجل الأول: https://maksab.vercel.app',
  want_human: 'تمام — هوصلك بزميلي الآن 🙏',
  unknown: 'شكراً لرسالتك! 🏠 مكسب أول سوق عقاري بالمزادات في مصر — مجاني تماماً. تحب تعرف أكتر؟ 💚',
};

/**
 * Generate AI response using Ahmed's persona
 */
export async function generateAhmedResponse(
  conversation: ConversationContext,
  incomingMessage: string
): Promise<AIResponseResult> {
  const intent = classifyIntent(incomingMessage);
  const action = determineAction(intent, conversation.stage || 'initial_outreach');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey !== 'NOT_SET') {
    try {
      const systemPrompt = getAhmedSystemPrompt(conversation);
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
        console.error('[Ahmed Responder] Claude API error:', response.status, errorData);
      }
    } catch (err) {
      console.error('[Ahmed Responder] Claude API call failed:', err);
    }
  }

  const reply = AHMED_MOCK_RESPONSES[intent] || AHMED_MOCK_RESPONSES.unknown;
  return { reply, intent, action };
}

/**
 * Get Ahmed's default outreach message for WhatsApp
 */
export function getAhmedMessage(sellerName: string, platform: string): string {
  return `أهلاً ${sellerName}! 🏠
أنا أحمد من مكسب — أول سوق إلكتروني مصري متخصص في العقارات بنظام المزادات والمقايضة.

شفت إعلانك على ${platform} وحسيت إن مكسب هيفيدك:
✅ مجاني للبداية — مفيش أي خسارة
✅ مزادات عقارية (مش موجودة في أي منصة تانية)
✅ وصول لآلاف المشترين في الإسكندرية
✅ عمولة طوعية بس — مش إجبارية

سجّل دلوقتي في 3 دقائق: https://maksab.vercel.app`;
}
