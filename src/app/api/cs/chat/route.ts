/**
 * User-facing CS Chat API
 * GET  — Get user's active conversation + messages
 * POST — Create conversation or send message
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";

const SARA_PROMPT = `
أنتِ سارة — موظفة خدمة العملاء الأولى في مكسب.
عندك 10 سنين خبرة في منصات التجارة الإلكترونية المصرية.
اشتغلتِ قبل كده في Jumia وOLX مصر قبل ما تيجي مكسب.
══════════════════════════════════════
طريقة تفكيرك (مش بس شخصيتك)
══════════════════════════════════════
قبل ما تردي على أي رسالة — بتسأل نفسك:
1. العميل ده بيسأل عن إيه بالظبط؟
2. في حاجة وراء السؤال ده مش قالهاش؟
3. إيه اللي هيخليه يرضى ويكمل مع مكسب؟
لما عميل جديد بيسألك عن الأسعار:
- مش بتقوله القائمة كلها فوراً
- بتسأل: "بتبيع منتجات كتير ولا بتبيع بشكل فردي أحياناً؟"
- بعدين بتقوله الباقة المناسبة بالظبط ليه
لما عميل زعلان:
- أول جملة دايماً تعترف بإحساسه — مش تبرر
- "أنا فاهمة ده محبط" قبل أي حل
- لو في غلطة من مكسب — تقوليها بصراحة
لما المشكلة تقنية:
- بتسأل خطوة خطوة مش بتطلب screenshots من الأول
- "بتحصل المشكلة دي لما بتعمل إيه بالظبط؟"
- لو مش قادرة تحلها في 3 رسائل → بتحول فوراً
══════════════════════════════════════
خبرتك العملية — حالات شايفاها كتير
══════════════════════════════════════
✦ عميل بيسأل عن الأسعار وهو في الحقيقة خايف مش مصدق
  → مش بتبيعيله فوراً — بتطمنيه: "الباقة المجانية تبدأ بيها وشوف"
✦ عميل بيقول "الموقع مش شغال"
  → أول سؤال: "بتفتحيه على موبايل ولا كمبيوتر؟ وأي browser؟"
✦ عميل جديد مش عارف يبدأ منين
  → مش بتديه كل الخطوات دفعة واحدة
  → بتسأل: "عايز تبيع ولا تشتري؟" وبتبدأ من هناك
✦ عميل بيسأل نفس السؤال بأساليب مختلفة
  → ده معناه إن إجابتك الأولى مش وضّحت
  → "أنا شايفة إن جوابي مكنش واضح — خليني أقولك بطريقة تانية"
✦ عميل عنده شكوى على بائع تاني
  → مش شغلتك تحكمي — شغلتك تسمعي وتوثقي وتحولي
  → "شكراً إنك بلغتنا — ده بيساعدنا نحمي الكل"
══════════════════════════════════════
أسلوب الكلام — بالأمثلة
══════════════════════════════════════
✅ صح:
"كام منتج عندك تقريباً؟ عشان أقدر أقولك أنسب خيار"
"ده حصل امتى بالظبط؟ وظهر أي رسالة خطأ؟"
"فاهمة — الموضوع ده بيتحل بسهولة. خطوة واحدة بس"
"أنا مش متأكدة 100% من ده — هتأكدلك وارد عليك"
❌ غلط:
"بالطبع يسعدني مساعدتك!"
"سؤالك ممتاز!"
"أهلاً بيك في مكسب!" (في نص المحادثة)
"للأسف مش في صلاحياتي" (من غير بديل)
══════════════════════════════════════
معلومات مكسب الكاملة
══════════════════════════════════════
[المنصة]
مكسب = بيع مباشر + مزادات + مقايضة
الميزة التنافسية: المزادات والمقايضة مش موجودين في Dubizzle
[الباقات]
الأفراد: عمولة طوعية 1% (10ج-200ج) — مش إجبارية
التجار:
- مجاني: 10 إعلانات
- Silver  199ج/شهر: 50 إعلان
- Gold   499ج/شهر: 200 إعلان + شارة موثق
- Diamond 999ج/شهر: غير محدود + صفحة متجر
إضافات: بوست 15ج | مميز 25ج/أسبوع
[الفئات — 12]
سيارات | عقارات | موبايلات | فاشون | خردة
ذهب وفضة | لاكشري | أجهزة | أثاث | هوايات | عُدد | خدمات
[التسجيل]
موبايل + SMS كود — فرد أو تاجر
══════════════════════════════════════
متى بتحوّلي لموظف بشري
══════════════════════════════════════
فوراً بدون تفكير:
- احتيال أو نصب
- مشكلة دفع أو خصم
- حساب اتحذف
- تهديد أو موقف قانوني
- العميل طلب موظف بشري صراحة
بعد 3 محاولات فاشلة:
- مشكلة تقنية مش قادرة تحليها
لما بتحوّلي:
"فاهمة — الموضوع ده محتاج متخصص.
هحوّلك دلوقتي لزميلي وهيكلمك في أقل من ساعة."
══════════════════════════════════════
قاعدة ذهبية واحدة
══════════════════════════════════════
كل محادثة هدفها إن العميل يقفل الشات وهو حاسس
إن في حد بني آدم فاهمه — مش روبوت جاوبه.
`;

// Retry function for Anthropic API (handles 529 Overloaded)
async function callClaudeWithRetry(body: object, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[SARA-RETRY] Attempt ${attempt}/${maxRetries} — API Key exists: ${!!process.env.ANTHROPIC_API_KEY}, prefix: ${process.env.ANTHROPIC_API_KEY?.slice(0, 8)}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log(`[SARA-RETRY] Status: ${response.status}`);
    console.log(`[SARA-RETRY] Body: ${JSON.stringify(data)}`);
    // Success
    if (response.ok) return data;
    // Overloaded → wait and retry
    if (response.status === 529 || response.status === 503) {
      console.log(`[SARA-CS] Attempt ${attempt} overloaded — waiting...`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 2000)); // 2s, 4s, 6s
        continue;
      }
    }
    // Other error → stop immediately
    console.error('[SARA-CS] API Error:', data);
    throw new Error(data.error?.message ?? 'API Error');
  }
  throw new Error('Max retries reached');
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1) return true;
  return false;
}

async function getCSSettings(sb: ReturnType<typeof getServiceClient>) {
  const { data, error } = await sb.from("cs_settings").select("*");

  if (error) {
    console.error("[CS-SETTINGS] Error fetching cs_settings:", error.message);
  }

  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  console.log("[CS-SETTINGS] Raw DB values:", JSON.stringify(settings));

  // If table is empty, use safe defaults (AI enabled)
  const isEmpty = Object.keys(settings).length === 0;
  if (isEmpty) {
    console.warn("[CS-SETTINGS] cs_settings table is EMPTY — using defaults with AI enabled");
  }

  const parsed = {
    ai_enabled: isEmpty ? true : toBool(settings.ai_enabled),
    ai_auto_greet: isEmpty ? true : toBool(settings.ai_auto_greet),
    ai_auto_transfer: isEmpty ? true : toBool(settings.ai_auto_transfer),
    ai_handle_complaints: toBool(settings.ai_handle_complaints),
    ai_max_messages: Number(settings.ai_max_messages) || 3,
    ai_transfer_delay_seconds: Number(settings.ai_transfer_delay_seconds) || 30,
    working_hours_start: String(settings.working_hours_start || "09:00").replace(/^"|"$/g, ""),
    working_hours_end: String(settings.working_hours_end || "17:00").replace(/^"|"$/g, ""),
    outside_hours_ai_only: isEmpty ? true : toBool(settings.outside_hours_ai_only),
  };

  console.log("[CS-SETTINGS] Parsed settings:", JSON.stringify(parsed));
  return parsed;
}

export async function GET(req: NextRequest) {
  // TEST: GET /api/cs/chat?test=1
  const testParam = req.nextUrl.searchParams.get('test');
  if (testParam === '1') {
    try {
      const testRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? 'MISSING',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'قول اهلا' }]
        })
      });
      const testData = await testRes.json();
      return NextResponse.json({
        status: testRes.status,
        apiKeyExists: !!process.env.ANTHROPIC_API_KEY,
        apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 8) ?? 'NOT_FOUND',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('API')),
        rawValue: process.env['ANTHROPIC_API_KEY'] ? 'EXISTS' : 'MISSING',
        response: testData
      });
    } catch (testErr: any) {
      return NextResponse.json({
        error: testErr.message,
        apiKeyExists: !!process.env.ANTHROPIC_API_KEY,
        apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 8) ?? 'NOT_FOUND',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('API')),
        rawValue: process.env['ANTHROPIC_API_KEY'] ? 'EXISTS' : 'MISSING',
      });
    }
  }

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const sb = getServiceClient();

    // Get active conversation for user
    const { data: conv } = await sb
      .from("cs_conversations")
      .select("*")
      .eq("user_id", session.userId)
      .in("status", ["open", "ai_handling", "waiting_agent", "agent_handling"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    // Get messages
    const { data: messages } = await sb
      .from("cs_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      conversation: conv,
      messages: messages || [],
    });
  } catch (error) {
    console.error("CS chat GET error:", error);
    return NextResponse.json({ conversation: null, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const sb = getServiceClient();
    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      // Start a new conversation
      const { category, message } = body;

      // Get user info
      const { data: user } = await sb
        .from("profiles")
        .select("display_name, phone")
        .eq("id", session.userId)
        .maybeSingle();

      // Check for existing active conversation
      const { data: existing } = await sb
        .from("cs_conversations")
        .select("id")
        .eq("user_id", session.userId)
        .in("status", ["open", "ai_handling", "waiting_agent", "agent_handling"])
        .maybeSingle();

      let conversationId = existing?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: conv, error: convError } = await sb
          .from("cs_conversations")
          .insert({
            user_id: session.userId,
            user_name: user?.display_name || null,
            user_phone: user?.phone || null,
            category: category || "general",
            status: "open",
          })
          .select()
          .single();

        if (convError) {
          return NextResponse.json({ error: convError.message }, { status: 500 });
        }
        conversationId = conv.id;

        // Get CS settings
        const csSettings = await getCSSettings(sb);

        // Send AI greeting if enabled
        if (csSettings.ai_enabled && csSettings.ai_auto_greet) {
          await sb.from("cs_messages").insert({
            conversation_id: conversationId,
            sender_type: "ai",
            sender_name: "سارة",
            message: "أهلاً بيك في مكسب! 💚 أنا سارة، المساعدة الذكية. إزاي أقدر أساعدك؟",
            message_type: "text",
          });

          await sb
            .from("cs_conversations")
            .update({ status: "ai_handling", ai_handled: true })
            .eq("id", conversationId);
        }
      }

      // Send user's message if provided
      if (message) {
        console.log("[CS-CHAT] START action — saving user message:", message);
        const { error: msgInsertErr } = await sb.from("cs_messages").insert({
          conversation_id: conversationId,
          sender_type: "user",
          sender_id: session.userId,
          sender_name: user?.display_name || "مستخدم",
          message,
          message_type: "text",
        });

        if (msgInsertErr) {
          console.error("[CS-CHAT] Error saving user message:", msgInsertErr.message);
        } else {
          // ═══ AI RESPONSE — Claude API for START action ═══
          try {
            console.log('[CS-AI-INLINE-START] Starting...');

            const { data: startSettingsRows } = await sb
              .from('cs_settings')
              .select('key, value');

            const startSettings: Record<string, string> = {};
            (startSettingsRows || []).forEach((s: any) => { startSettings[s.key] = s.value; });

            const startAiEnabled = startSettings.ai_enabled === 'true';
            console.log('[CS-AI-INLINE-START] aiEnabled:', startAiEnabled);

            if (startAiEnabled) {
              const cleanMessages = [{ role: 'user' as const, content: message }];

              let aiResponse: string;
              try {
                const aiData = await callClaudeWithRetry({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 400,
                  system: SARA_PROMPT,
                  messages: cleanMessages
                });

                aiResponse = aiData.content?.[0]?.text
                  ?? 'لحظة — في ضغط على الخدمة دلوقتي. جرب تاني بعد ثانية.';
              } catch {
                aiResponse = 'في ضغط على الخدمة دلوقتي. جرب تاني بعد شوية 🙏';
              }

              console.log('[CS-AI-INLINE-START] Response length:', aiResponse.length);

              const { error: aiStartErr } = await sb.from('cs_messages').insert({
                conversation_id: conversationId,
                sender_type: 'ai',
                sender_name: 'سارة',
                message: aiResponse,
                message_type: 'text',
              });

              if (aiStartErr) {
                console.error('[CS-AI-INLINE-START] Insert error:', aiStartErr.message);
              } else {
                console.log('[CS-AI-INLINE-START] ✅ AI response saved!');
                await sb.from('cs_conversations').update({
                  status: 'ai_handling',
                  ai_handled: true,
                }).eq('id', conversationId);
              }
            }
          } catch (aiStartCrash: any) {
            console.error('[CS-AI-INLINE-START] CRASH:', aiStartCrash.message);
          }
        }
      }

      // Return conversation + messages
      const { data: messages } = await sb
        .from("cs_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      const { data: conv } = await sb
        .from("cs_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      return NextResponse.json({
        conversation: conv,
        messages: messages || [],
      });
    }

    if (action === "send") {
      const { conversation_id, message } = body;
      if (!conversation_id || !message) {
        return NextResponse.json({ error: "مطلوب" }, { status: 400 });
      }

      // Verify user owns this conversation
      const { data: conv } = await sb
        .from("cs_conversations")
        .select("user_id")
        .eq("id", conversation_id)
        .single();

      if (!conv || conv.user_id !== session.userId) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }

      // Get user info
      const { data: user } = await sb
        .from("profiles")
        .select("display_name")
        .eq("id", session.userId)
        .maybeSingle();

      // Insert user message
      console.log("[CS-CHAT] SEND action — saving user message:", message, "conv:", conversation_id);
      const { data: msg, error } = await sb
        .from("cs_messages")
        .insert({
          conversation_id,
          sender_type: "user",
          sender_id: session.userId,
          sender_name: user?.display_name || "مستخدم",
          message,
          message_type: "text",
        })
        .select()
        .single();

      if (error) {
        console.error("[CS-CHAT] Error saving user message:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // ═══ AI RESPONSE — Claude API (with retry) ═══
      try {
        console.log('[CS-AI-INLINE] Starting...');

        // 1. جلب الإعدادات
        const { data: settingsRows } = await sb
          .from('cs_settings')
          .select('key, value');

        const settings: Record<string, string> = {};
        (settingsRows || []).forEach((s: any) => { settings[s.key] = s.value; });

        const aiEnabled = settings.ai_enabled === 'true';
        console.log('[CS-AI-INLINE] aiEnabled:', aiEnabled);

        if (aiEnabled) {
          // Fetch last 10 messages for context
          const { data: historyRows } = await sb
            .from('cs_messages')
            .select('message, sender_type')
            .eq('conversation_id', conversation_id)
            .order('created_at', { ascending: false })
            .limit(10);
          const conversationHistory = (historyRows || []).reverse();
          console.log('[CS-AI-INLINE] History:', conversationHistory.length, 'messages');

          // Build messages array for Claude API
          const cleanMessages = conversationHistory.map((m: any) => ({
            role: m.sender_type === 'user' ? 'user' as const : 'assistant' as const,
            content: m.message,
          }));

          let aiResponse: string;
          try {
            const aiData = await callClaudeWithRetry({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 400,
              system: SARA_PROMPT,
              messages: cleanMessages
            });

            aiResponse = aiData.content?.[0]?.text
              ?? 'لحظة — في ضغط على الخدمة دلوقتي. جرب تاني بعد ثانية.';
          } catch {
            aiResponse = 'في ضغط على الخدمة دلوقتي. جرب تاني بعد شوية 🙏';
          }

          console.log('[CS-AI-INLINE] Response length:', aiResponse.length);

          // 3. حفظ رد AI
          const { error: aiInsertError } = await sb.from('cs_messages').insert({
            conversation_id: conversation_id,
            sender_type: 'ai',
            sender_name: 'سارة',
            message: aiResponse,
            message_type: 'text',
          });

          if (aiInsertError) {
            console.error('[CS-AI-INLINE] Insert error:', aiInsertError.message);
          } else {
            console.log('[CS-AI-INLINE] ✅ AI response saved!');

            // 4. تحديث المحادثة
            const { count: updatedCount } = await sb
              .from('cs_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conversation_id);
            await sb.from('cs_conversations').update({
              status: 'ai_handling',
              ai_handled: true,
              messages_count: updatedCount || 0,
            }).eq('id', conversation_id);
          }
        }
      } catch (aiErr: any) {
        console.error('[CS-AI-INLINE] CRASH:', aiErr.message);
      }

      // ═══ جلب كل الرسائل (بما فيها رد AI) ═══
      const { data: allMessages } = await sb
        .from("cs_messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true });

      const { data: updatedConv } = await sb
        .from("cs_conversations")
        .select("*")
        .eq("id", conversation_id)
        .single();

      return NextResponse.json({
        success: true,
        message: msg,
        messages: allMessages || [],
        conversation: updatedConv,
      });
    }

    if (action === "rate") {
      const { conversation_id, rating, feedback } = body;
      if (!conversation_id || !rating) {
        return NextResponse.json({ error: "مطلوب" }, { status: 400 });
      }

      const { error } = await sb
        .from("cs_conversations")
        .update({
          csat_rating: rating,
          csat_feedback: feedback || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation_id)
        .eq("user_id", session.userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error('[SARA-FINAL-ERROR]', error.message, error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
