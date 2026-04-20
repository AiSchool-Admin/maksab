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

export async function POST(req: NextRequest) {
  const { governorate } = await req.json();
  if (!governorate) {
    return NextResponse.json({ success: false, error: "governorate required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const govSlug = toGovSlug(governorate);

  // Activate all scopes for this governorate
  const { data: scopes, error } = await supabase
    .from("ahe_scopes")
    .update({
      is_paused: false,
      next_harvest_at: new Date().toISOString(),
      harvest_interval_minutes: 360,
    })
    .or(`governorate.eq.${govSlug},governorate.eq.${governorate},governorate.eq.الإسكندرية`)
    .eq("is_active", true)
    .select("id, code, source_platform");

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const platforms = [...new Set(scopes?.map((s) => s.source_platform) || [])];

  // Trigger immediate harvest for non-blocked scopes
  const nonBlockedScopes = scopes?.filter((s) => !["semsarmasr", "hatla2ee", "contactcars", "carsemsar"].includes(s.source_platform)) || [];

  let triggeredCount = 0;
  for (const scope of nonBlockedScopes.slice(0, 3)) {
    try {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : ""}/api/admin/crm/harvester/harvest-vercel?scope_code=${scope.code}`, {
        method: "GET",
      }).catch(() => {});
      triggeredCount++;
    } catch {
      // fire-and-forget
    }
  }

  return NextResponse.json({
    success: true,
    governorate,
    scopes_activated: scopes?.length || 0,
    platforms,
    scopes_triggered: triggeredCount,
    first_harvest_in: "دقائق",
    message: `تم تفعيل ${scopes?.length || 0} نطاق حصاد في ${governorate}`,
  });
}
