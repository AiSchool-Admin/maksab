/**
 * Scope Generator — إنشاء كل النطاقات تلقائياً
 * يدعم كل المنصات: dubizzle + opensooq + hatla2ee + aqarmap + ...
 */

import { SupabaseClient } from "@supabase/supabase-js";

// Map Arabic category names to their English equivalents
const CATEGORY_NORMALIZE: Record<string, string> = {
  سيارات: "vehicles",
  عقارات: "properties",
  موبايلات: "phones",
  إلكترونيات: "electronics",
  أثاث: "furniture",
  أزياء: "fashion",
  "أجهزة منزلية": "home_appliances",
  هوايات: "hobbies",
  خدمات: "services",
  "ذهب ومجوهرات": "gold_jewelry",
  خردة: "scrap",
  "سلع فاخرة": "luxury",
};

function normalizeCategory(cat: string): string {
  return CATEGORY_NORMALIZE[cat] || cat;
}

const HIGH_DEMAND = ["phones", "vehicles", "properties", "electronics"];
const MED_DEMAND = ["furniture", "fashion", "home_appliances"];

const TARGET_RATIOS: Record<string, number> = {
  phones: 0.33,
  vehicles: 0.2,
  properties: 0.1,
  electronics: 0.33,
  furniture: 0.25,
  fashion: 0.33,
  home_appliances: 0.33,
  hobbies: 0.33,
  services: 0.5,
  gold_jewelry: 0.25,
  scrap: 0.5,
  luxury: 0.2,
};

// Platform short codes for scope code generation
const PLATFORM_CODES: Record<string, string> = {
  dubizzle: "dub",
  opensooq: "osq",
  hatla2ee: "hat",
  aqarmap: "aqr",
  contactcars: "ccr",
  carsemsar: "csm",
  propertyfinder: "pf",
  yallamotor: "ylm",
  bezaat: "bzt",
  soq24: "sq24",
  cairolink: "clk",
  sooqmsr: "smsr",
  dowwr: "dwwr",
};

// Platform Arabic names for scope naming
const PLATFORM_NAMES_AR: Record<string, string> = {
  dubizzle: "دوبيزل",
  opensooq: "السوق المفتوح",
  hatla2ee: "هتلاقي",
  aqarmap: "عقارماب",
  contactcars: "كونتاكت كارز",
  carsemsar: "كارسمسار",
  propertyfinder: "بروبرتي فايندر",
  yallamotor: "يلا موتور",
  bezaat: "بيزات",
  soq24: "سوق24",
  cairolink: "كايرو لينك",
  sooqmsr: "سوق مصر",
  dowwr: "دوّر",
};

interface ScopeConfig {
  interval: number;
  maxPages: number;
  priority: number;
}

function getScopeConfig(govTier: string, catDemand: string): ScopeConfig {
  const key = `${govTier}_${catDemand}`;
  const configs: Record<string, ScopeConfig> = {
    A_high: { interval: 30, maxPages: 5, priority: 10 },
    A_med: { interval: 60, maxPages: 3, priority: 8 },
    A_low: { interval: 120, maxPages: 2, priority: 6 },
    B_high: { interval: 60, maxPages: 3, priority: 7 },
    B_med: { interval: 120, maxPages: 2, priority: 5 },
    B_low: { interval: 360, maxPages: 2, priority: 3 },
    C_high: { interval: 120, maxPages: 2, priority: 4 },
    C_med: { interval: 360, maxPages: 2, priority: 2 },
  };
  return configs[key] || { interval: 1440, maxPages: 1, priority: 1 };
}

function getCatDemand(category: string): string {
  const normalized = normalizeCategory(category);
  if (HIGH_DEMAND.includes(normalized)) return "high";
  if (MED_DEMAND.includes(normalized)) return "med";
  return "low";
}

export async function generateAllScopes(supabase: SupabaseClient): Promise<{
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: { code: string; error: string }[];
  debug: {
    categoriesCount: number;
    governoratesCount: number;
    sampleUrl: string | null;
    sampleScope: string | null;
    platformsProcessed: string[];
  };
}> {
  // Get ALL active platforms (not just dubizzle)
  const { data: activePlatforms } = await supabase
    .from("harvest_platforms")
    .select("id")
    .eq("is_active", true);

  // Also include platforms with testable status for scope generation
  const { data: testablePlatforms } = await supabase
    .from("harvest_platforms")
    .select("id")
    .eq("is_testable", true);

  const platformIds = new Set<string>();
  // Always include dubizzle
  platformIds.add("dubizzle");
  for (const p of activePlatforms || []) platformIds.add(p.id);
  for (const p of testablePlatforms || []) platformIds.add(p.id);

  // Exclude Facebook (manual only)
  platformIds.delete("facebook_marketplace");
  platformIds.delete("facebook_groups");

  const allScopes: Record<string, unknown>[] = [];
  let totalSkipped = 0;
  const allErrors: { code: string; error: string }[] = [];
  const platformsProcessed: string[] = [];

  for (const platformId of platformIds) {
    const { data: categories, error: catError } = await supabase
      .from("ahe_category_mappings")
      .select("*")
      .eq("source_platform", platformId)
      .eq("is_active", true);

    const { data: governorates, error: govError } = await supabase
      .from("ahe_governorate_mappings")
      .select("*")
      .eq("source_platform", platformId)
      .eq("is_active", true);

    if (catError || govError) {
      if (catError) allErrors.push({ code: `${platformId}_CAT`, error: catError.message });
      if (govError) allErrors.push({ code: `${platformId}_GOV`, error: govError.message });
      continue;
    }

    if (!categories?.length || !governorates?.length) {
      continue;
    }

    platformsProcessed.push(platformId);
    const platformCode = PLATFORM_CODES[platformId] || platformId.substring(0, 3);
    const platformNameAr = PLATFORM_NAMES_AR[platformId] || platformId;

    for (const cat of categories) {
      for (const gov of governorates) {
        const govTier = gov.gov_tier || "B";
        const catDemand = getCatDemand(cat.maksab_category);

        // Skip low demand categories in remote governorates
        if (catDemand === "low" && (govTier === "D" || govTier === "C")) {
          totalSkipped++;
          continue;
        }
        if (catDemand === "med" && govTier === "D") {
          totalSkipped++;
          continue;
        }

        const config = getScopeConfig(govTier, catDemand);

        // Build URL
        const baseUrl = (cat.source_url_template || "").replace(
          "{gov}",
          gov.source_url_segment || ""
        );

        if (!baseUrl || baseUrl.includes("{gov}")) {
          totalSkipped++;
          continue;
        }

        const code = `${platformCode}_${cat.maksab_category}_${gov.maksab_governorate}`;

        // Non-dubizzle platforms get slightly lower priority
        const priorityAdjust = platformId === "dubizzle" ? 0 : -1;

        allScopes.push({
          code,
          name: `${cat.maksab_category_ar} — ${gov.maksab_governorate_ar} — ${platformNameAr}`,
          source_platform: platformId,
          maksab_category: cat.maksab_category,
          governorate: gov.maksab_governorate,
          base_url: baseUrl,
          harvest_interval_minutes: config.interval,
          max_pages_per_harvest: config.maxPages,
          priority: Math.max(1, config.priority + priorityAdjust),
          is_active: platformId === "dubizzle" ? govTier !== "D" : false, // New platforms start inactive
          target_supply_demand_ratio: TARGET_RATIOS[normalizeCategory(cat.maksab_category)] || 0.33,
          gov_tier: govTier,
          cat_demand_level: catDemand,
        });
      }
    }
  }

  // Upsert
  let created = 0;
  let updated = 0;

  if (allScopes.length > 0) {
    const { error: testError } = await supabase
      .from("ahe_scopes")
      .select("id")
      .limit(0);

    if (testError) {
      allErrors.push({ code: "TABLE_ACCESS", error: testError.message });
    }
  }

  for (const scope of allScopes) {
    const { data: existing, error: lookupError } = await supabase
      .from("ahe_scopes")
      .select("id")
      .eq("code", scope.code as string)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      if (allErrors.length < 20) {
        allErrors.push({ code: scope.code as string, error: `lookup: ${lookupError.message}` });
      }
      continue;
    }

    if (existing) {
      const { error } = await supabase
        .from("ahe_scopes")
        .update({
          name: scope.name,
          base_url: scope.base_url,
          target_supply_demand_ratio: scope.target_supply_demand_ratio,
          gov_tier: scope.gov_tier,
          cat_demand_level: scope.cat_demand_level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        if (allErrors.length < 20) {
          allErrors.push({ code: scope.code as string, error: `update: ${error.message}` });
        }
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from("ahe_scopes").insert(scope);
      if (error) {
        if (allErrors.length < 20) {
          allErrors.push({ code: scope.code as string, error: `insert: ${error.message}` });
        }
        if (error.message.includes("column") || error.message.includes("undefined")) {
          const { target_supply_demand_ratio, gov_tier, cat_demand_level, ...safeScope } = scope as Record<string, unknown>;
          const { error: retryError } = await supabase.from("ahe_scopes").insert(safeScope);
          if (retryError) {
            if (allErrors.length < 20) {
              allErrors.push({ code: scope.code as string, error: `retry_insert: ${retryError.message}` });
            }
          } else {
            created++;
          }
        }
      } else {
        created++;
      }
    }
  }

  return {
    created,
    updated,
    skipped: totalSkipped,
    total: allScopes.length,
    errors: allErrors,
    debug: {
      categoriesCount: allScopes.length,
      governoratesCount: 0,
      sampleUrl: allScopes[0]?.base_url as string || null,
      sampleScope: allScopes[0] ? JSON.stringify(allScopes[0]) : null,
      platformsProcessed,
    },
  };
}
