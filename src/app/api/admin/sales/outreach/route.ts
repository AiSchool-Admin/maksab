import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase config");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * قالب مزدوج: بائع + مشتري (acq_dual_seller_buyer_v1)
 * كل بائع = مشتري محتمل — الرسالة تخاطبه بالصفتين
 */
function generateOutreachMessage(seller: any): string {
  const name = seller.name ? ` ${seller.name.split(" ")[0]}` : " يا باشا";
  const category = seller.primary_category || "إعلانات";

  const categoryAr: Record<string, string> = {
    phones: "موبايل", vehicles: "عربية", cars: "عربية",
    properties: "شقة", real_estate: "شقة",
    electronics: "جهاز", furniture: "أثاث", fashion: "ملابس",
    gold: "ذهب", luxury: "منتج فاخر", appliances: "جهاز",
    hobbies: "منتج", tools: "عدة", services: "خدمة", scrap: "خردة",
  };
  const catLabel = categoryAr[category] || "منتج";

  const relatedCount = seller.total_listings_seen ? Math.max(seller.total_listings_seen * 10, 50) : 50;
  const product = seller.most_listed_product || "إعلانك";

  return `السلام عليكم${name} 👋
شفنا ${product} بتاعك على دوبيزل.
على مكسب تقدر:
📢 تنشر نفس الإعلان مجاناً — يوصل لآلاف المشترين
🔨 تعمل مزاد — المشترين يتنافسوا وتبيع بأعلى سعر!
💰 عمولة طوعية — مش إجبارية زي دوبيزل

+ لو بتدوّر على ${catLabel} جديد:
🛒 عندنا ${relatedCount}+ إعلان ${catLabel} بأسعار أقل
🔄 أو بدّل ${product} بحاجة أحدث — بدون ما تدفع الفرق كامل!

سجّل مجاناً: https://maksab.app/join
مكسب — اشتري وبيع وبدّل بأمان 💚`;
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // Fetch sellers ready for outreach:
    // - Have a phone number
    // - pipeline_status is 'phone_found' (discovered + phone, not yet contacted)
    // - Ordered by priority_score DESC (whales first)
    const { data: sellers, error } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, priority_score, total_listings_seen, active_listings, primary_governorate, primary_category, pipeline_status, is_business, is_verified, first_outreach_at, buy_probability, buy_probability_score")
      .not("phone", "is", null)
      .in("pipeline_status", ["phone_found", "discovered"])
      .order("buy_probability_score", { ascending: false })
      .order("priority_score", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Outreach fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Only include those with a phone
    const withPhone = (sellers || []).filter((s) => s.phone);

    // Count today's outreach progress
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const { count: sentToday } = await supabase
      .from("ahe_sellers")
      .select("*", { count: "exact", head: true })
      .not("first_outreach_at", "is", null)
      .gte("first_outreach_at", todayISO);

    const WHALE_THRESHOLD = 10; // 10+ listings = whale

    const contacts = withPhone.map((s) => {
      const listingCount = s.total_listings_seen || s.active_listings || 0;
      const isWhale = listingCount >= WHALE_THRESHOLD || s.is_business === true;

      return {
        id: s.id,
        name: s.name || "بائع بدون اسم",
        phone: s.phone,
        score: s.priority_score || 0,
        isWhale,
        listingCount,
        location: s.primary_governorate || "غير محدد",
        category: s.primary_category || "عام",
        status: s.first_outreach_at ? "sent" as const : "pending" as const,
        message: generateOutreachMessage(s),
      };
    });

    // Split into pending (not yet contacted) and sent
    const pendingCount = contacts.filter((c) => c.status === "pending").length;

    return NextResponse.json({
      progress: {
        sent: sentToday || 0,
        skipped: 0,
        remaining: pendingCount,
        target: 50,
      },
      contacts,
    });
  } catch (err: any) {
    console.error("Outreach API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
