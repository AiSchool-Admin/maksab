import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const GOV_SLUG_MAP: Record<string, string> = {
  "القاهرة": "cairo", "الجيزة": "giza", "الإسكندرية": "alexandria",
  "القليوبية": "qalyubia", "الشرقية": "sharqia", "الدقهلية": "dakahlia",
  "البحيرة": "beheira", "الغربية": "gharbia", "المنوفية": "menoufia",
  "كفر الشيخ": "kafr_el_sheikh", "دمياط": "damietta", "بورسعيد": "port_said",
  "الإسماعيلية": "ismailia", "السويس": "suez", "شمال سيناء": "north_sinai",
  "جنوب سيناء": "south_sinai", "الفيوم": "fayoum", "بني سويف": "beni_suef",
  "المنيا": "minya", "أسيوط": "assiut", "سوهاج": "sohag",
  "قنا": "qena", "الأقصر": "luxor", "أسوان": "aswan",
  "البحر الأحمر": "red_sea", "الوادي الجديد": "new_valley", "مطروح": "matrouh",
};
function toGovSlug(gov: string): string { return GOV_SLUG_MAP[gov] || gov.toLowerCase(); }

const SALES_TEMPLATES = {
  free_offer: (sellerName: string, category: string) =>
    `مرحباً${sellerName ? " " + sellerName : ""} 🎉\n\nعرض خاص من مكسب!\n\n🆓 اشتراك مجاني لمدة شهر:\n` +
    `✅ نشر ${category === "vehicles" ? "3 إعلانات سيارات" : "5 إعلانات عقارات"}\n` +
    `✅ ظهور مميز في نتائج البحث\n` +
    `✅ رسائل مباشرة من المشترين\n` +
    `✅ إحصائيات المشاهدات\n\n` +
    `سجّل دلوقتي: https://maksab.vercel.app\n\n` +
    `العرض لفترة محدودة!`,

  paid_offer: (sellerName: string, category: string) =>
    `مرحباً${sellerName ? " " + sellerName : ""} 💎\n\nباقة مكسب الاحترافية:\n\n` +
    `🏆 الباقة الذهبية — 199 جنيه/شهر:\n` +
    `✅ إعلانات بلا حدود\n` +
    `✅ ظهور أول في البحث\n` +
    `✅ شارة "بائع موثوق" ✓\n` +
    `✅ تقارير أداء أسبوعية\n` +
    `✅ دعم فني أولوية\n\n` +
    `جرّب مجاناً أسبوع: https://maksab.vercel.app\n\n` +
    `استثمر في مبيعاتك!`,
};

export async function POST(req: NextRequest) {
  const { governorate } = await req.json();
  if (!governorate) {
    return NextResponse.json({ success: false, error: "governorate required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const govSlug = toGovSlug(governorate);

  // Get contacted sellers who haven't received an offer yet
  const { data: sellers } = await supabase
    .from("ahe_sellers")
    .select("id, phone, name, primary_category, pipeline_status, total_listings_seen, priority_score")
    .or(`primary_governorate.eq.${govSlug},primary_governorate.eq.${governorate}`)
    .not("phone", "is", null)
    .in("pipeline_status", ["contacted", "engaged"])
    .order("priority_score", { ascending: false })
    .limit(50);

  if (!sellers || sellers.length === 0) {
    return NextResponse.json({
      success: true,
      offers_sent: 0,
      free_offers: 0,
      paid_offers: 0,
      already_offered: 0,
      message: "لا يوجد بائعين جاهزين للعروض — ابدأ بالتسويق أولاً",
    });
  }

  let freeOffers = 0;
  let paidOffers = 0;
  let errors = 0;

  for (const seller of sellers) {
    try {
      const category = seller.primary_category === "vehicles" ? "vehicles" : "properties";
      const isHighValue = (seller.priority_score || 0) >= 50 || (seller.total_listings_seen || 0) >= 3;
      const template = isHighValue
        ? SALES_TEMPLATES.paid_offer(seller.name || "", category)
        : SALES_TEMPLATES.free_offer(seller.name || "", category);

      // Send via WAHA or SMS
      const wahaUrl = process.env.WAHA_API_URL;
      let sent = false;

      if (wahaUrl) {
        try {
          const phone = seller.phone.startsWith("0") ? "2" + seller.phone : seller.phone;
          const res = await fetch(`${wahaUrl}/api/sendText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: `${phone}@c.us`,
              text: template,
              session: "default",
            }),
          });
          sent = res.ok;
        } catch {
          // fallback below
        }
      }

      if (!sent) {
        sent = await sendSms(seller.phone, template);
      }

      if (sent) {
        if (isHighValue) paidOffers++;
        else freeOffers++;

        await supabase
          .from("ahe_sellers")
          .update({
            pipeline_status: "negotiating",
            last_outreach_at: new Date().toISOString(),
          })
          .eq("id", seller.id);
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    success: true,
    offers_sent: freeOffers + paidOffers,
    free_offers: freeOffers,
    paid_offers: paidOffers,
    errors,
    already_offered: 0,
    message: `تم إرسال ${freeOffers + paidOffers} عرض`,
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
