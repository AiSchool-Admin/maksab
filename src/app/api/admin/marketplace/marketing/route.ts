import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const AWARENESS_TEMPLATES = {
  properties: {
    agent: "أحمد",
    message: (sellerName: string) =>
      `السلام عليكم${sellerName ? " " + sellerName : ""} 🏠\n\nمعاك أحمد من مكسب — أكبر سوق عقارات في إسكندرية.\n\nشفنا إعلانك وعايزين نساعدك توصل لعملاء أكتر.\n\nمكسب بيوفرلك:\n✅ ظهور إعلانك لآلاف المشترين\n✅ رسائل مباشرة من المهتمين\n✅ تقييم عادل لسعر عقارك\n\nتحب تجرب مجاناً؟`,
  },
  vehicles: {
    agent: "وليد",
    message: (sellerName: string) =>
      `السلام عليكم${sellerName ? " " + sellerName : ""} 🚗\n\nمعاك وليد من مكسب — سوق السيارات الأول في مصر.\n\nشفنا إعلانك وعايزين نساعدك تبيع أسرع.\n\nمكسب بيوفرلك:\n✅ وصول لآلاف المشترين الجادين\n✅ عرض احترافي لعربيتك\n✅ تقييم سعر السوق\n\nتحب تجرب مجاناً؟`,
  },
};

export async function POST(req: NextRequest) {
  const { governorate } = await req.json();
  if (!governorate) {
    return NextResponse.json({ success: false, error: "governorate required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const govSlugMap: Record<string, string> = {
    "الإسكندرية": "alexandria",
    "القاهرة": "cairo",
    "الجيزة": "giza",
  };
  const govSlug = govSlugMap[governorate] || governorate.toLowerCase();

  // Get sellers with phones who haven't been contacted yet
  const { data: sellers } = await supabase
    .from("ahe_sellers")
    .select("id, phone, name, primary_category, pipeline_status")
    .or(`primary_governorate.eq.${govSlug},primary_governorate.eq.${governorate}`)
    .not("phone", "is", null)
    .in("pipeline_status", ["phone_found", "discovered"])
    .order("priority_score", { ascending: false })
    .limit(50);

  if (!sellers || sellers.length === 0) {
    return NextResponse.json({
      success: true,
      messages_sent: 0,
      whatsapp_sent: 0,
      sms_sent: 0,
      already_contacted: 0,
      message: "لا يوجد بائعين جدد للتواصل",
    });
  }

  let whatsappSent = 0;
  let smsSent = 0;
  let errors = 0;

  for (const seller of sellers) {
    try {
      const category = seller.primary_category === "vehicles" ? "vehicles" : "properties";
      const template = AWARENESS_TEMPLATES[category];
      const messageText = template.message(seller.name || "");

      // Try WAHA WhatsApp first
      const wahaUrl = process.env.WAHA_API_URL;
      if (wahaUrl) {
        try {
          const phone = seller.phone.startsWith("0") ? "2" + seller.phone : seller.phone;
          const waRes = await fetch(`${wahaUrl}/api/sendText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: `${phone}@c.us`,
              text: messageText,
              session: "default",
            }),
          });
          if (waRes.ok) {
            whatsappSent++;
          } else {
            throw new Error("WAHA failed");
          }
        } catch {
          // Fallback to SMS
          const smsRes = await sendSms(seller.phone, messageText);
          if (smsRes) smsSent++;
          else errors++;
        }
      } else {
        const smsRes = await sendSms(seller.phone, messageText);
        if (smsRes) smsSent++;
        else errors++;
      }

      // Update seller status
      await supabase
        .from("ahe_sellers")
        .update({
          pipeline_status: "contacted",
          last_outreach_at: new Date().toISOString(),
          last_outreach_channel: whatsappSent > smsSent ? "whatsapp" : "sms",
        })
        .eq("id", seller.id);

    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    success: true,
    messages_sent: whatsappSent + smsSent,
    whatsapp_sent: whatsappSent,
    sms_sent: smsSent,
    errors,
    already_contacted: 0,
    message: `تم إرسال ${whatsappSent + smsSent} رسالة توعية`,
  });
}

async function sendSms(phone: string, message: string): Promise<boolean> {
  const smsUsername = process.env.SMS_MISR_USERNAME;
  const smsPassword = process.env.SMS_MISR_PASSWORD;
  const smsSender = process.env.SMS_MISR_SENDER || "Maksab";

  if (!smsUsername || !smsPassword) return false;

  try {
    const res = await fetch("https://smsmisr.com/api/SMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Username: smsUsername,
        Password: smsPassword,
        Sender: smsSender,
        To: phone,
        Message: Buffer.from(message).toString("hex"),
        Type: 2,
      }),
    });
    const data = await res.json();
    return data?.code === "1901";
  } catch {
    return false;
  }
}
