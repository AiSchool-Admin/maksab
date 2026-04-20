import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const governorate = req.nextUrl.searchParams.get("governorate") || "الإسكندرية";
  const supabase = getServiceClient();

  const govSlugMap: Record<string, string> = {
    "الإسكندرية": "alexandria",
    "القاهرة": "cairo",
    "الجيزة": "giza",
  };
  const govSlug = govSlugMap[governorate] || governorate.toLowerCase();

  // Sellers stats
  const { count: sellersTotal } = await supabase
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true })
    .or(`primary_governorate.eq.${govSlug},primary_governorate.eq.${governorate}`);

  const { count: sellersWithPhone } = await supabase
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true })
    .or(`primary_governorate.eq.${govSlug},primary_governorate.eq.${governorate}`)
    .not("phone", "is", null);

  const { count: sellersContacted } = await supabase
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true })
    .or(`primary_governorate.eq.${govSlug},primary_governorate.eq.${governorate}`)
    .in("pipeline_status", ["contacted", "engaged", "negotiating", "signed_up", "active"]);

  const { count: sellersSignedUp } = await supabase
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true })
    .or(`primary_governorate.eq.${govSlug},primary_governorate.eq.${governorate}`)
    .in("pipeline_status", ["signed_up", "active"]);

  // Listings stats
  const { count: listingsTotal } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .or(`governorate.eq.${govSlug},governorate.eq.${governorate}`);

  const { count: listingsProperties } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .or(`governorate.eq.${govSlug},governorate.eq.${governorate}`)
    .in("source_platform", ["dubizzle", "propertyfinder", "aqarmap", "semsarmasr", "opensooq"]);

  const { count: listingsVehicles } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .or(`governorate.eq.${govSlug},governorate.eq.${governorate}`)
    .in("source_platform", ["hatla2ee", "contactcars", "carsemsar", "yallamotor"]);

  const { count: phonesExtracted } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true })
    .or(`governorate.eq.${govSlug},governorate.eq.${governorate}`)
    .not("extracted_phone", "is", null);

  // Messages stats
  const { count: messagesSent } = await supabase
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true })
    .or(`primary_governorate.eq.${govSlug},primary_governorate.eq.${governorate}`)
    .not("last_outreach_at", "is", null);

  // Harvest scopes
  const { data: scopes } = await supabase
    .from("ahe_scopes")
    .select("id, is_active, is_paused, last_harvest_at")
    .or(`governorate.eq.${govSlug},governorate.eq.${governorate},governorate.eq.الإسكندرية`);

  const scopesActive = scopes?.filter((s) => s.is_active && !s.is_paused).length || 0;
  const scopesTotal = scopes?.length || 0;
  const lastHarvest = scopes
    ?.filter((s) => s.last_harvest_at)
    .sort((a, b) => new Date(b.last_harvest_at!).getTime() - new Date(a.last_harvest_at!).getTime())[0]?.last_harvest_at || null;

  return NextResponse.json({
    sellers_total: sellersTotal || 0,
    sellers_with_phone: sellersWithPhone || 0,
    sellers_contacted: sellersContacted || 0,
    sellers_signed_up: sellersSignedUp || 0,
    listings_total: listingsTotal || 0,
    listings_properties: listingsProperties || 0,
    listings_vehicles: listingsVehicles || 0,
    phones_extracted: phonesExtracted || 0,
    messages_sent: messagesSent || 0,
    messages_delivered: 0,
    last_harvest_at: lastHarvest,
    harvest_scopes_active: scopesActive,
    harvest_scopes_total: scopesTotal,
  });
}
