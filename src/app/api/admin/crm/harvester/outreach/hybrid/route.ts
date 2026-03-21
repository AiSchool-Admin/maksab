/**
 * Hybrid Outreach API — بدون WhatsApp Business API
 * GET — جلب البائعين الجاهزين للتواصل مع الرسالة المناسبة
 * POST — تحديث حالة البائع (تم الإرسال / تخطي)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import {
  renderTemplate,
  getTemplateVariables,
} from "@/lib/whatsapp/template-engine";

// ─── Template selection logic ───
function pickTemplate(seller: {
  is_whale?: boolean;
  is_business?: boolean;
  primary_category?: string | null;
  detected_account_type?: string | null;
}): { templateId: string; body: string } {
  // Whale
  if (seller.is_whale) {
    return {
      templateId: "acq_welcome_whale_v1",
      body: `السلام عليكم {{first_name}} 👋

أنا من فريق مكسب — أكبر سوق إلكتروني جديد في مصر.

لاحظنا إنك من أكبر المعلنين في قسم {{category_name_ar}} على {{competitor_name}} ({{listings_count}} إعلان 🔥)

عندنا عرض خاص ليك:
✅ حساب تاجر مميز مجاناً
✅ إعلاناتك تتنقل تلقائياً
✅ ظهور أولوية في نتائج البحث
✅ تقارير وتحليلات لإعلاناتك

تحب أعرفك أكتر؟ 🤝`,
    };
  }

  // Phones business
  if (
    seller.primary_category === "phones" &&
    (seller.is_business || seller.detected_account_type === "business")
  ) {
    return {
      templateId: "acq_welcome_phones_v1",
      body: `أهلاً {{first_name}} 👋

شايفين إنك بتبيع موبايلات على {{competitor_name}} 📱

مكسب عنده مميزات خاصة لتجار الموبايلات:
✅ قسم موبايلات متخصص بفلاتر ذكية
✅ نظام مزادات (بيزود سعر البيع 20%)
✅ عملاء جدد من كل مصر

سجّل مجاناً:
{{join_url}}`,
    };
  }

  // Vehicles business
  if (
    seller.primary_category === "vehicles" &&
    (seller.is_business || seller.detected_account_type === "business")
  ) {
    return {
      templateId: "acq_welcome_vehicles_v1",
      body: `أهلاً {{first_name}} 👋

شايفين إنك بتبيع سيارات على {{competitor_name}} 🚗

مكسب عنده مميزات خاصة لتجار السيارات:
✅ فلاتر متخصصة (ماركة، موديل، سنة، كيلومتراج)
✅ نظام مزادات مع حماية ضد التلاعب
✅ وصول لمشترين جدد

سجّل مجاناً:
{{join_url}}`,
    };
  }

  // Business
  if (seller.is_business || seller.detected_account_type === "business") {
    return {
      templateId: "acq_welcome_business_v1",
      body: `أهلاً {{first_name}} 👋

أنا من فريق مكسب — سوق إلكتروني جديد في مصر.

شايفين إنك بتبيع {{category_name_ar}} على {{competitor_name}} وعندك {{listings_count}} إعلان.

مكسب هيوفرلك:
✅ عرض إعلاناتك لعملاء جدد
✅ نظام رسائل ومزادات متطور
✅ بدون عمولة إجبارية

عايز تجرب مجاناً؟ سجّل من هنا:
{{join_url}}`,
    };
  }

  // Individual (default)
  return {
    templateId: "acq_welcome_general_v1",
    body: `أهلاً {{first_name}} 👋

أنا من فريق مكسب — سوق إلكتروني جديد في مصر.

لاحظنا إعلانك على {{competitor_name}} في قسم {{category_name_ar}}.

مكسب مجاني بالكامل وبيوفرلك:
✅ وصول لعملاء جدد
✅ شات مباشر مع المشترين
✅ نظام مزادات ذكي

جرّب مجاناً:
{{join_url}}`,
  };
}

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = req.nextUrl;

  const limit = parseInt(searchParams.get("limit") || "20");
  const category = searchParams.get("category");
  const governorate = searchParams.get("governorate");
  const whalesFirst = searchParams.get("whales_first") !== "false";

  try {
    // Get sellers with phone, not yet contacted, not skipped
    let query = supabase
      .from("ahe_sellers")
      .select("*", { count: "exact" })
      .not("phone", "is", null)
      .in("pipeline_status", ["discovered", "phone_found"])
      .limit(limit);

    if (category) query = query.eq("primary_category", category);
    if (governorate) query = query.eq("primary_governorate", governorate);

    // Always sort: whale → big_fish → regular → small_fish → visitor
    if (whalesFirst) {
      query = query
        .order("whale_score", { ascending: false })
        .order("seller_tier", { ascending: true })
        .order("total_listings_seen", { ascending: false });
    } else {
      query = query.order("total_listings_seen", { ascending: false });
    }

    const { data: sellers, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate rendered message for each seller
    const sellersWithMessages = (sellers || []).map((seller) => {
      const template = pickTemplate(seller);
      const vars = getTemplateVariables(seller, {
        maksab_category: seller.primary_category,
        governorate: seller.primary_governorate,
      });
      const renderedMessage = renderTemplate(template.body, vars);

      return {
        id: seller.id,
        name: seller.name,
        phone: seller.phone,
        primary_category: seller.primary_category,
        primary_governorate: seller.primary_governorate,
        total_listings_seen: seller.total_listings_seen,
        is_whale: seller.is_whale,
        whale_score: seller.whale_score,
        seller_tier: seller.seller_tier || "visitor",
        estimated_monthly_value: seller.estimated_monthly_value || 0,
        is_business: seller.is_business,
        is_verified: seller.is_verified,
        detected_account_type: seller.detected_account_type,
        pipeline_status: seller.pipeline_status,
        profile_url: seller.profile_url,
        template_id: template.templateId,
        rendered_message: renderedMessage,
        whatsapp_url: `https://web.whatsapp.com/send?phone=2${seller.phone}&text=${encodeURIComponent(renderedMessage)}`,
      };
    });

    return NextResponse.json({
      sellers: sellersWithMessages,
      total: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "خطأ في تحميل البائعين" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    const body = await req.json();
    const { seller_id, action } = body as {
      seller_id: string;
      action: "sent" | "skip";
    };

    if (!seller_id || !action) {
      return NextResponse.json(
        { error: "seller_id و action مطلوبين" },
        { status: 400 }
      );
    }

    if (action === "sent") {
      // 1. Update seller pipeline status
      await supabase
        .from("ahe_sellers")
        .update({
          pipeline_status: "contacted",
          first_outreach_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", seller_id);

      // 2. Get seller info for wa_conversation
      const { data: seller } = await supabase
        .from("ahe_sellers")
        .select("*")
        .eq("id", seller_id)
        .single();

      if (seller) {
        // 3. Create or update wa_conversation
        const { data: existing } = await supabase
          .from("wa_conversations")
          .select("id")
          .eq("seller_id", seller_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("wa_conversations")
            .update({
              messages_sent: 1,
              last_message_at: new Date().toISOString(),
              last_message_direction: "outbound",
              status: "waiting",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("wa_conversations").insert({
            seller_id: seller.id,
            phone: seller.phone,
            customer_name: seller.name,
            category: seller.primary_category,
            governorate: seller.primary_governorate,
            seller_type: seller.is_whale
              ? "whale"
              : seller.is_business
                ? "business"
                : "individual",
            listings_count: seller.total_listings_seen || 0,
            stage: "initial_outreach",
            status: "waiting",
            messages_sent: 1,
            last_message_at: new Date().toISOString(),
            last_message_direction: "outbound",
          });
        }

        // 4. Record the message in wa_messages
        const { data: conv } = await supabase
          .from("wa_conversations")
          .select("id")
          .eq("seller_id", seller_id)
          .single();

        if (conv) {
          const template = pickTemplate(seller);
          const vars = getTemplateVariables(seller, {
            maksab_category: seller.primary_category,
            governorate: seller.primary_governorate,
          });

          await supabase.from("wa_messages").insert({
            conversation_id: conv.id,
            direction: "outbound",
            message_type: "template",
            body: renderTemplate(template.body, vars),
            template_id: template.templateId,
            wa_status: "sent",
            cost_egp: 0,
          });
        }
      }

      return NextResponse.json({ success: true, action: "sent" });
    }

    if (action === "skip") {
      // Mark as skipped — keep in discovered but add a note
      await supabase
        .from("ahe_sellers")
        .update({
          pipeline_status: "skipped",
          updated_at: new Date().toISOString(),
        })
        .eq("id", seller_id);

      return NextResponse.json({ success: true, action: "skip" });
    }

    return NextResponse.json({ error: "action غير صالح" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "خطأ في تحديث الحالة" },
      { status: 500 }
    );
  }
}
