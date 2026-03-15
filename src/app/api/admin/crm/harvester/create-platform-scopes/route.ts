/**
 * Batch Create Platform Scopes
 * POST /api/admin/crm/harvester/create-platform-scopes
 *
 * Creates scopes for OpenSooq + Aqarmap across main governorates
 * Body: { platform: "opensooq" | "aqarmap", dry_run?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface ScopeDefinition {
  code: string;
  name: string;
  source_platform: string;
  maksab_category: string;
  governorate: string;
  city: string | null;
  base_url: string;
  priority: number;
  harvest_interval_minutes: number;
  max_pages_per_harvest: number;
  detail_fetch_enabled: boolean;
}

// ═══ OpenSooq Scopes ═══
const OPENSOOQ_GOVERNORATES = [
  { slug: "cairo", name: "القاهرة", gov: "cairo" },
  { slug: "alexandria", name: "الإسكندرية", gov: "alexandria" },
  { slug: "giza", name: "الجيزة", gov: "giza" },
];

const OPENSOOQ_CATEGORIES = [
  { slug: "cars-vehicles", name: "سيارات", cat: "vehicles", priority: 8 },
  { slug: "properties-for-sale", name: "عقارات بيع", cat: "properties", priority: 7 },
  { slug: "properties-for-rent", name: "عقارات إيجار", cat: "properties", priority: 6 },
  { slug: "mobiles-tablets", name: "موبايلات", cat: "phones", priority: 7 },
  { slug: "electronics", name: "إلكترونيات", cat: "electronics", priority: 5 },
  { slug: "home-furniture", name: "أثاث", cat: "furniture", priority: 5 },
  { slug: "fashion-beauty", name: "موضة", cat: "fashion", priority: 4 },
  { slug: "services", name: "خدمات", cat: "services", priority: 3 },
  { slug: "animals-birds", name: "حيوانات", cat: "hobbies", priority: 3 },
  { slug: "kids-baby", name: "أطفال", cat: "fashion", priority: 3 },
  { slug: "sports-fitness", name: "رياضة", cat: "hobbies", priority: 3 },
  { slug: "industrial", name: "صناعي", cat: "tools", priority: 3 },
];

function buildOpenSooqScopes(): ScopeDefinition[] {
  const scopes: ScopeDefinition[] = [];
  for (const gov of OPENSOOQ_GOVERNORATES) {
    for (const cat of OPENSOOQ_CATEGORIES) {
      scopes.push({
        code: `opensooq_${cat.slug.replace(/-/g, '_')}_${gov.slug}`,
        name: `OpenSooq ${cat.name} ${gov.name}`,
        source_platform: "opensooq",
        maksab_category: cat.cat,
        governorate: gov.gov,
        city: null,
        base_url: `https://eg.opensooq.com/ar/${gov.slug}/${cat.slug}`,
        priority: cat.priority,
        harvest_interval_minutes: 120,
        max_pages_per_harvest: 1,
        detail_fetch_enabled: false, // Vercel — no detail fetch
      });
    }
  }
  return scopes;
}

// ═══ Aqarmap Scopes ═══
const AQARMAP_CITIES = [
  { slug: "giza", name: "الجيزة", gov: "giza" },
  { slug: "new-cairo", name: "التجمع", gov: "cairo", city: "new_cairo" },
  { slug: "6th-of-october-city", name: "أكتوبر", gov: "giza", city: "6_october" },
  { slug: "sheikh-zayed", name: "الشيخ زايد", gov: "giza", city: "sheikh_zayed" },
  { slug: "maadi", name: "المعادي", gov: "cairo", city: "maadi" },
  { slug: "nasr-city", name: "مدينة نصر", gov: "cairo", city: "nasr_city" },
  { slug: "heliopolis", name: "مصر الجديدة", gov: "cairo", city: "heliopolis" },
];

const AQARMAP_TYPES = [
  { slug: "apartment", type: "sale", prefix: "for-sale", name: "شقق بيع", priority: 7 },
  { slug: "apartment", type: "rent", prefix: "for-rent", name: "شقق إيجار", priority: 6 },
  { slug: "villa", type: "sale", prefix: "for-sale", name: "فلل بيع", priority: 5 },
];

function buildAqarmapScopes(): ScopeDefinition[] {
  const scopes: ScopeDefinition[] = [];
  for (const city of AQARMAP_CITIES) {
    for (const type of AQARMAP_TYPES) {
      scopes.push({
        code: `aqarmap_${type.type}_${type.slug === "villa" ? "villa_" : ""}${city.slug.replace(/-/g, '_')}`,
        name: `Aqarmap ${type.name} ${city.name}`,
        source_platform: "aqarmap",
        maksab_category: "properties",
        governorate: city.gov,
        city: city.city || null,
        base_url: `https://aqarmap.com.eg/en/${type.prefix}/${type.slug}/${city.slug}/`,
        priority: type.priority,
        harvest_interval_minutes: 120,
        max_pages_per_harvest: 1,
        detail_fetch_enabled: false,
      });
    }
  }
  return scopes;
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    const body = await req.json();
    const platform = body.platform as string;
    const dryRun = body.dry_run === true;

    let scopes: ScopeDefinition[];
    if (platform === "opensooq") {
      scopes = buildOpenSooqScopes();
    } else if (platform === "aqarmap") {
      scopes = buildAqarmapScopes();
    } else if (platform === "all") {
      scopes = [...buildOpenSooqScopes(), ...buildAqarmapScopes()];
    } else {
      return NextResponse.json({
        error: `Platform "${platform}" not supported. Use: opensooq, aqarmap, all`,
      }, { status: 400 });
    }

    if (dryRun) {
      return NextResponse.json({
        dry_run: true,
        platform,
        scopes_count: scopes.length,
        scopes: scopes.map(s => ({ code: s.code, name: s.name, url: s.base_url })),
      });
    }

    // Check existing scopes
    const { data: existingScopes } = await supabase
      .from("ahe_scopes")
      .select("code")
      .in("code", scopes.map(s => s.code));

    const existingCodes = new Set((existingScopes || []).map(s => s.code));
    const newScopes = scopes.filter(s => !existingCodes.has(s.code));

    if (newScopes.length === 0) {
      return NextResponse.json({
        message: "All scopes already exist",
        existing_count: existingCodes.size,
        new_count: 0,
      });
    }

    // Insert new scopes
    const { data: inserted, error: insertErr } = await supabase
      .from("ahe_scopes")
      .insert(newScopes.map(s => ({
        ...s,
        is_active: false,
        delay_between_requests_ms: 5000,
      })))
      .select("code, name");

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      platform,
      created: inserted?.length || 0,
      already_existed: existingCodes.size,
      scopes: inserted,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function GET() {
  // Show what would be created
  const opensooq = buildOpenSooqScopes();
  const aqarmap = buildAqarmapScopes();

  return NextResponse.json({
    usage: "POST with { platform: 'opensooq' | 'aqarmap' | 'all', dry_run?: true }",
    opensooq_scopes: opensooq.length,
    aqarmap_scopes: aqarmap.length,
    total: opensooq.length + aqarmap.length,
    opensooq: opensooq.map(s => ({ code: s.code, url: s.base_url })),
    aqarmap: aqarmap.map(s => ({ code: s.code, url: s.base_url })),
  });
}
