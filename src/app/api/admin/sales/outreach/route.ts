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

function generateOutreachMessage(seller: any): string {
  const name = seller.name ? ` أ/ ${seller.name.split(" ")[0]}` : "";
  const count = seller.total_listings_seen || seller.active_listings || 0;
  const category = seller.primary_category || "إعلانات";

  const categoryEmoji: Record<string, string> = {
    cars: "🚗", real_estate: "🏠", phones: "📱", gold: "💰",
    fashion: "👗", scrap: "♻️", luxury: "💎", appliances: "🏠",
    furniture: "🪑", hobbies: "🎮", tools: "🔧", services: "🛠️",
  };
  const emoji = categoryEmoji[category] || "📦";

  const categoryNames: Record<string, string> = {
    cars: "سيارات", real_estate: "عقارات", phones: "موبايلات", gold: "ذهب وفضة",
    fashion: "موضة", scrap: "خردة", luxury: "سلع فاخرة", appliances: "أجهزة منزلية",
    furniture: "أثاث", hobbies: "هوايات", tools: "عدد وأدوات", services: "خدمات",
  };
  const categoryAr = categoryNames[category] || category;

  if (count >= 15) {
    return `السلام عليكم${name} 👋\nأنا من فريق مكسب — أكبر سوق إلكتروني في مصر.\nلاحظنا إن حضرتك عندك ${count} إعلان ${categoryAr} وشغلك ممتاز ماشاء الله.\nعايزين نعرض عليك تجربة مكسب مجاناً — هتوصل لعملاء أكتر بكتير.\nممكن أبعتلك اللينك؟ ${emoji}`;
  }

  return `السلام عليكم${name} 👋\nأنا من فريق مكسب — سوق إلكتروني مصري جديد.\nلاحظنا إعلاناتك في ${categoryAr} وعايزين نساعدك توصل لعملاء أكتر.\nجرّب مكسب مجاناً — سجّل وانشر أول إعلان في دقيقة.\nأبعتلك اللينك؟ ${emoji}`;
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
      .select("id, name, phone, priority_score, total_listings_seen, active_listings, primary_governorate, primary_category, pipeline_status, is_business, first_outreach_at")
      .not("phone", "is", null)
      .in("pipeline_status", ["phone_found", "discovered"])
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
