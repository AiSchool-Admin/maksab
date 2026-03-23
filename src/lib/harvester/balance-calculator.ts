/**
 * Market Balance Calculator — حاسبة توازن السوق
 * المرحلة 2 من آلية التوازن الأمثل
 *
 * ⚠️ هذه الدالة لا تعدّل AHE أبداً — فقط تحسب وتنبّه
 */

import { SupabaseClient } from "@supabase/supabase-js";

const CATEGORIES = [
  "phones",
  "vehicles",
  "properties",
  "electronics",
  "furniture",
  "fashion",
  "home_appliances",
  "hobbies",
  "services",
  "gold_jewelry",
  "scrap",
  "luxury",
  // Arabic category names used by newer scopes
  "سيارات",
  "عقارات",
];

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
  // Arabic category names
  سيارات: 0.2,
  عقارات: 0.1,
};

const CATEGORY_AR: Record<string, string> = {
  phones: "موبايلات",
  vehicles: "سيارات",
  properties: "عقارات",
  electronics: "إلكترونيات",
  furniture: "أثاث",
  fashion: "أزياء",
  home_appliances: "أجهزة منزلية",
  hobbies: "هوايات",
  services: "خدمات",
  gold_jewelry: "ذهب ومجوهرات",
  scrap: "خُردة",
  luxury: "سلع فاخرة",
  // Arabic keys map to themselves
  سيارات: "سيارات",
  عقارات: "عقارات",
};

export interface BalanceResult {
  category: string;
  category_ar: string;
  supply: number;
  demand: number;
  ratio: number;
  target: number;
  status: string;
  action: string;
}

export async function calculateMarketBalance(
  supabase: SupabaseClient
): Promise<BalanceResult[]> {
  const results: BalanceResult[] = [];

  for (const cat of CATEGORIES) {
    // Count active listings (non-duplicate)
    const { count: supply } = await supabase
      .from("ahe_listings")
      .select("id", { count: "exact", head: true })
      .eq("maksab_category", cat)
      .eq("is_duplicate", false);

    // Count active buyers (non-duplicate, in active pipeline stages)
    const { count: demand } = await supabase
      .from("bhe_buyers")
      .select("id", { count: "exact", head: true })
      .eq("category", cat)
      .eq("is_duplicate", false)
      .in("pipeline_status", ["discovered", "phone_found", "matched"]);

    const target = TARGET_RATIOS[cat] || 0.33;
    const supplyN = supply || 0;
    const demandN = demand || 0;
    const ratio =
      demandN > 0 ? supplyN / demandN : supplyN > 0 ? 999 : 0;

    // Assess balance status — only for BHE direction + alerts
    let status: string;
    let action: string;

    if (!supplyN && !demandN) {
      status = "no_data";
      action = "maintain";
    } else if (ratio > target * 5) {
      status = "critical_buyers";
      action = "urgent_bhe_needed";
    } else if (ratio > target * 2) {
      status = "needs_buyers";
      action = "increase_bhe_priority";
    } else if (ratio < target * 0.3 && demandN > 10) {
      status = "needs_sellers";
      action = "maintain"; // AHE already at max
    } else {
      status = "balanced";
      action = "maintain";
    }

    // Upsert market_balance
    await supabase.from("market_balance").upsert(
      {
        category: cat,
        governorate: null,
        active_listings: supplyN,
        active_buyers: demandN,
        supply_demand_ratio: ratio,
        target_ratio: target,
        balance_status: status,
        recommended_action: action,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "category,governorate" }
    );

    // Send alerts
    if (status === "critical_buyers") {
      await supabase.from("admin_notifications").insert({
        type: "balance_alert",
        title: `🔴 ${CATEGORY_AR[cat]} — محتاجة مشترين عاجل!`,
        body: `عدد الإعلانات: ${supplyN} | عدد المشترين: ${demandN} | النسبة: ${ratio.toFixed(1)}:1 | المطلوب: ${(1 / target).toFixed(0)}:1\n\nالإجراء: افتح Paste&Parse وحصّد مشترين من جروبات فيسبوك لفئة ${CATEGORY_AR[cat]}`,
        action_url: "/admin/sales/buyer-harvest/paste",
        priority: "urgent",
      });
    } else if (status === "needs_buyers") {
      // Only alert once per day per category
      const { data: existing } = await supabase
        .from("admin_notifications")
        .select("id")
        .eq("type", "balance_alert")
        .ilike("title", `%${CATEGORY_AR[cat]}%`)
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        )
        .limit(1);

      if (!existing?.length) {
        await supabase.from("admin_notifications").insert({
          type: "balance_alert",
          title: `🟡 ${CATEGORY_AR[cat]} — محتاجة مشترين أكتر`,
          body: `عدد الإعلانات: ${supplyN} | عدد المشترين: ${demandN}\n\nكثّف حصاد المشترين من جروبات فيسبوك`,
          action_url: "/admin/sales/buyer-harvest/paste",
          priority: "high",
        });
      }
    }

    results.push({
      category: cat,
      category_ar: CATEGORY_AR[cat] || cat,
      supply: supplyN,
      demand: demandN,
      ratio,
      target,
      status,
      action,
    });
  }

  return results;
}
