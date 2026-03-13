/**
 * Scope Generator — إنشاء كل النطاقات تلقائياً
 * المرحلة 1.5 من آلية التوازن الأمثل
 */

import { SupabaseClient } from "@supabase/supabase-js";

const HIGH_DEMAND = ["phones", "vehicles", "properties", "electronics"];
const MED_DEMAND = ["furniture", "fashion", "home_appliances"];
const LOW_DEMAND = ["gold_jewelry", "scrap", "luxury", "hobbies", "services"];

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
  if (HIGH_DEMAND.includes(category)) return "high";
  if (MED_DEMAND.includes(category)) return "med";
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
  };
}> {
  const { data: categories, error: catError } = await supabase
    .from("ahe_category_mappings")
    .select("*")
    .eq("source_platform", "dubizzle");

  const { data: governorates, error: govError } = await supabase
    .from("ahe_governorate_mappings")
    .select("*")
    .eq("source_platform", "dubizzle");

  if (catError || govError) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      errors: [
        ...(catError ? [{ code: "FETCH_CATEGORIES", error: catError.message }] : []),
        ...(govError ? [{ code: "FETCH_GOVERNORATES", error: govError.message }] : []),
      ],
      debug: { categoriesCount: 0, governoratesCount: 0, sampleUrl: null, sampleScope: null },
    };
  }

  const scopes: Record<string, any>[] = [];
  let skipped = 0;

  for (const cat of categories || []) {
    for (const gov of governorates || []) {
      const govTier = gov.gov_tier || "B";
      const catDemand = getCatDemand(cat.maksab_category);

      // Skip low demand categories in remote governorates
      if (catDemand === "low" && (govTier === "D" || govTier === "C")) {
        skipped++;
        continue;
      }
      if (catDemand === "med" && govTier === "D") {
        skipped++;
        continue;
      }

      const config = getScopeConfig(govTier, catDemand);

      // Build URL
      const baseUrl = (cat.source_url_template || "").replace(
        "{gov}",
        gov.source_url_segment || ""
      );

      if (!baseUrl || baseUrl.includes("{gov}")) {
        skipped++;
        continue;
      }

      const code = `dub_${cat.maksab_category}_${gov.maksab_governorate}`;

      scopes.push({
        code,
        name: `${cat.maksab_category_ar} — ${gov.maksab_governorate_ar} — دوبيزل`,
        source_platform: "dubizzle",
        maksab_category: cat.maksab_category,
        governorate: gov.maksab_governorate,
        base_url: baseUrl,
        harvest_interval_minutes: config.interval,
        max_pages_per_harvest: config.maxPages,
        priority: config.priority,
        is_active: govTier !== "D",
        target_supply_demand_ratio: TARGET_RATIOS[cat.maksab_category] || 0.33,
        gov_tier: govTier,
        cat_demand_level: catDemand,
      });
    }
  }

  // Upsert with proper error tracking
  let created = 0;
  let updated = 0;
  const errors: { code: string; error: string }[] = [];

  // First, try inserting one scope to detect column issues early
  if (scopes.length > 0) {
    const testScope = scopes[0];
    const { error: testError } = await supabase
      .from("ahe_scopes")
      .select("id")
      .limit(0);

    if (testError) {
      errors.push({ code: "TABLE_ACCESS", error: testError.message });
    }
  }

  for (const scope of scopes) {
    // Check if exists
    const { data: existing, error: lookupError } = await supabase
      .from("ahe_scopes")
      .select("id")
      .eq("code", scope.code)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      if (errors.length < 10) {
        errors.push({ code: scope.code, error: `lookup: ${lookupError.message}` });
      }
      continue;
    }

    if (existing) {
      // Update only the configurable fields, preserve custom settings
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
        if (errors.length < 10) {
          errors.push({ code: scope.code, error: `update: ${error.message}` });
        }
      } else {
        updated++;
      }
    } else {
      // Insert new
      const { error } = await supabase.from("ahe_scopes").insert(scope);
      if (error) {
        if (errors.length < 10) {
          errors.push({ code: scope.code, error: `insert: ${error.message}` });
        }
        // If column error, try without the new columns
        if (error.message.includes("column") || error.message.includes("undefined")) {
          const { target_supply_demand_ratio, gov_tier, cat_demand_level, ...safeScope } = scope;
          const { error: retryError } = await supabase.from("ahe_scopes").insert(safeScope);
          if (retryError) {
            if (errors.length < 10) {
              errors.push({ code: scope.code, error: `retry_insert: ${retryError.message}` });
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
    skipped,
    total: scopes.length,
    errors,
    debug: {
      categoriesCount: (categories || []).length,
      governoratesCount: (governorates || []).length,
      sampleUrl: scopes[0]?.base_url || null,
      sampleScope: scopes[0] ? JSON.stringify(scopes[0]) : null,
    },
  };
}
