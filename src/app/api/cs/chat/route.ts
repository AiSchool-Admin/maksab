/**
 * User-facing CS Chat API
 * GET  — Get user's active conversation + messages
 * POST — Create conversation or send message
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";



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
          // ═══ AI RESPONSE — INLINE for START action ═══
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
              const msgLower = message.toLowerCase();
              let intent = 'unknown';
              let aiResponse = 'أهلاً بيك في مكسب! 💚 إزاي أقدر أساعدك؟';

              if (/مرحبا|السلام|[اأ]هلا|هاي|هاى|hi|hello|صباح|مساء/.test(msgLower)) {
                intent = 'greeting';
                aiResponse = 'أهلاً بيك في مكسب! 💚 إزاي أقدر أساعدك؟\n\nممكن أساعدك في:\n📱 التسجيل\n📢 نشر إعلان\n💰 الأسعار والباقات\n🔧 مشكلة تقنية';
              } else if (/سج[لّ]|اسجل|تسجيل|حساب|اشترك|sign up/.test(msgLower)) {
                intent = 'registration';
                aiResponse = 'عشان تسجّل على مكسب:\n1. اضغط "انشئ حساب" 📱\n2. اختار فرد أو تاجر 🏪\n3. دخّل رقمك 📞\n4. فعّل بالكود ✅\n\nلو عندك مشكلة قولي وأنا أساعدك! 😊';
              } else if (/[اإ]علان|نشر|انشر|[اأ]ضيف|حذف|عد[لّ]/.test(msgLower)) {
                intent = 'listing';
                aiResponse = 'عشان تنشر إعلان:\n1. اضغط "انشر إعلانك" ➕\n2. اختار الفئة 📂\n3. أضف صور واضحة 📸\n4. اكتب وصف مفصّل ✏️\n5. حدد السعر 💰\n6. اضغط "نشر" 🚀';
              } else if (/دفع|فلوس|عمولة|اشتراك|باقة|سعر/.test(msgLower)) {
                intent = 'payment';
                aiResponse = 'مكسب عمولته طوعية — مش إجبارية! 💚\n\nباقات التجار:\n🥈 Silver: 199 ج/شهر\n🥇 Gold: 499 ج/شهر\n💎 Diamond: 999 ج/شهر';
              } else if (/شكوى|نصب|احتيال|مزيف|سرقة/.test(msgLower)) {
                intent = 'complaint';
                aiResponse = '⚠️ فاهم إن فيه مشكلة — آسفين جداً!\nهحوّلك لزميلي المتخصص فوراً.\nممكن تقولي التفاصيل؟';
              } else if (/مش شغال|خطأ|error|bug|مشكلة/.test(msgLower)) {
                intent = 'technical';
                aiResponse = 'فاهم إن فيه مشكلة تقنية 🔧\nمحتاج منك:\n1. إيه اللي حصل بالظبط؟\n2. على أي صفحة؟\n3. screenshot لو ممكن 📸';
              }

              console.log('[CS-AI-INLINE-START] Intent:', intent);

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

      // ═══ AI RESPONSE — INLINE (لا تستخدم handleAIResponse) ═══
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
          // 2. كشف النية
          const msgLower = message.toLowerCase();
          let intent = 'unknown';
          let aiResponse = 'أهلاً بيك في مكسب! 💚 إزاي أقدر أساعدك؟';

          if (/مرحبا|السلام|[اأ]هلا|هاي|هاى|hi|hello|صباح|مساء/.test(msgLower)) {
            intent = 'greeting';
            aiResponse = 'أهلاً بيك في مكسب! 💚 إزاي أقدر أساعدك؟\n\nممكن أساعدك في:\n📱 التسجيل\n📢 نشر إعلان\n💰 الأسعار والباقات\n🔧 مشكلة تقنية';
          } else if (/سج[لّ]|اسجل|تسجيل|حساب|اشترك|sign up/.test(msgLower)) {
            intent = 'registration';
            aiResponse = 'عشان تسجّل على مكسب:\n1. اضغط "انشئ حساب" 📱\n2. اختار فرد أو تاجر 🏪\n3. دخّل رقمك 📞\n4. فعّل بالكود ✅\n\nلو عندك مشكلة قولي وأنا أساعدك! 😊';
          } else if (/[اإ]علان|نشر|انشر|[اأ]ضيف|حذف|عد[لّ]/.test(msgLower)) {
            intent = 'listing';
            aiResponse = 'عشان تنشر إعلان:\n1. اضغط "انشر إعلانك" ➕\n2. اختار الفئة 📂\n3. أضف صور واضحة 📸\n4. اكتب وصف مفصّل ✏️\n5. حدد السعر 💰\n6. اضغط "نشر" 🚀';
          } else if (/دفع|فلوس|عمولة|اشتراك|باقة|سعر/.test(msgLower)) {
            intent = 'payment';
            aiResponse = 'مكسب عمولته طوعية — مش إجبارية! 💚\n\nباقات التجار:\n🥈 Silver: 199 ج/شهر\n🥇 Gold: 499 ج/شهر\n💎 Diamond: 999 ج/شهر';
          } else if (/شكوى|نصب|احتيال|مزيف|سرقة/.test(msgLower)) {
            intent = 'complaint';
            aiResponse = '⚠️ فاهم إن فيه مشكلة — آسفين جداً!\nهحوّلك لزميلي المتخصص فوراً.\nممكن تقولي التفاصيل؟';
          } else if (/مش شغال|خطأ|error|bug|مشكلة/.test(msgLower)) {
            intent = 'technical';
            aiResponse = 'فاهم إن فيه مشكلة تقنية 🔧\nمحتاج منك:\n1. إيه اللي حصل بالظبط؟\n2. على أي صفحة؟\n3. screenshot لو ممكن 📸';
          }

          console.log('[CS-AI-INLINE] Intent:', intent, 'Response length:', aiResponse.length);

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
            await sb.from('cs_conversations').update({
              status: 'ai_handling',
              ai_handled: true,
              messages_count: (await sb.from('cs_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conversation_id)).count || 0,
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
  } catch (error) {
    console.error("CS chat POST error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
