/**
 * GET /api/admin/setup-db
 *
 * Checks which tables exist and seeds data (categories, governorates, etc.).
 * Requires ADMIN_SETUP_SECRET header or env-configured service role key.
 *
 * Also GET /api/admin/setup-db?check=1
 * Just checks table existence (no auth needed).
 */

export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { categoriesConfig } from "@/lib/categories/categories-config";
import { governorates, citiesByGovernorate } from "@/lib/data/governorates";

// Tables to check
const REQUIRED_TABLES = [
  "profiles",
  "categories",
  "subcategories",
  "ads",
  "favorites",
  "conversations",
  "messages",
  "auction_bids",
  "analytics_events",
  "buy_requests",
  "buy_request_matches",
];

async function checkTable(

  client: ReturnType<typeof createClient<any>>,
  tableName: string,
): Promise<boolean> {
  const { error } = await client
    .from(tableName as never)
    .select("*" as never)
    .limit(0);
  return !error;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const checkOnly = url.searchParams.get("check") === "1";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { success: false, error: "Missing Supabase env vars" },
      { status: 500 },
    );
  }

  // For check-only mode, use anon key
  if (checkOnly) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tableStatus: Record<string, boolean> = {};
    for (const table of REQUIRED_TABLES) {
      tableStatus[table] = await checkTable(client, table);
    }

    const missingTables = Object.entries(tableStatus)
      .filter(([, exists]) => !exists)
      .map(([name]) => name);

    return NextResponse.json({
      success: missingTables.length === 0,
      tables: tableStatus,
      missingTables,
      allPresent: missingTables.length === 0,
    });
  }

  // For seeding, authenticate via ADMIN_SETUP_SECRET header (never accept keys in URL)
  const adminSecret = process.env.ADMIN_SETUP_SECRET;
  const providedSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || !providedSecret || providedSecret !== adminSecret) {
    return NextResponse.json(
      { success: false, error: "غير مصرح بيه. ابعت X-Admin-Secret header" },
      { status: 403 },
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { success: false, error: "Service role key مش متوفر في البيئة" },
      { status: 500 },
    );
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, string> = {};

  try {
    // 1. Check table existence first
    const tableStatus: Record<string, boolean> = {};
    for (const table of REQUIRED_TABLES) {
      tableStatus[table] = await checkTable(client, table);
    }

    const missingTables = Object.entries(tableStatus)
      .filter(([, exists]) => !exists)
      .map(([name]) => name);

    if (missingTables.length > 0) {
      results["missing_tables"] = `الجداول دي لسه مش موجودة: ${missingTables.join(", ")}`;
      results["action_needed"] = "شغّل الـ SQL في Supabase SQL Editor الأول (الخطوة 1)";

      return NextResponse.json({
        success: false,
        message: "لازم تعمل الجداول الأول في SQL Editor",
        missingTables,
        results,
      });
    }

    results["tables"] = "كل الجداول موجودة";

    // 2. Seed categories
    const categories = categoriesConfig.map((c, i) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      slug: c.slug,
      sort_order: i + 1,
      is_active: true,
    }));

    const { error: catError } = await client
      .from("categories")
      .upsert(categories, { onConflict: "id" });

    if (catError) {
      results["categories"] = `خطأ: ${catError.message}`;
    } else {
      results["categories"] = `تم تعبئة ${categories.length} قسم`;
    }

    // 3. Seed subcategories
    const subcategories = categoriesConfig.flatMap((c) =>
      c.subcategories.map((s, i) => ({
        id: s.id,
        category_id: c.id,
        name: s.name,
        slug: s.slug,
        sort_order: i + 1,
        is_active: true,
      })),
    );

    const { error: subError } = await client
      .from("subcategories")
      .upsert(subcategories, { onConflict: "id" });

    if (subError) {
      results["subcategories"] = `خطأ: ${subError.message}`;
    } else {
      results["subcategories"] = `تم تعبئة ${subcategories.length} قسم فرعي`;
    }

    // 4. Seed governorates
    const govData = governorates.map((name, i) => ({
      id: i + 1,
      name,
      name_en: null,
    }));

    const { error: govError } = await client
      .from("governorates")
      .upsert(govData, { onConflict: "id" });

    if (govError) {
      results["governorates"] = `خطأ: ${govError.message}`;
    } else {
      results["governorates"] = `تم تعبئة ${govData.length} محافظة`;

      // 5. Seed cities (only if governorates succeeded)
      let cityCount = 0;
      const cityData: { governorate_id: number; name: string; name_en: string | null }[] = [];
      for (let gi = 0; gi < governorates.length; gi++) {
        const govName = governorates[gi];
        const cities = citiesByGovernorate[govName] || [];
        for (const cityName of cities) {
          cityData.push({
            governorate_id: gi + 1,
            name: cityName,
            name_en: null,
          });
          cityCount++;
        }
      }

      if (cityData.length > 0) {
        // Delete existing cities to avoid duplicates (cities don't have stable IDs)
        await client.from("cities").delete().gte("id", 0);

        const { error: cityError } = await client
          .from("cities")
          .insert(cityData);

        if (cityError) {
          results["cities"] = `خطأ: ${cityError.message}`;
        } else {
          results["cities"] = `تم تعبئة ${cityCount} مدينة`;
        }
      }
    }

    // 6. Ensure profiles table has is_admin column
    const { error: adminColError } = await client
      .from("profiles")
      .select("is_admin" as never)
      .limit(1);

    if (adminColError && adminColError.message?.includes("is_admin")) {
      results["is_admin"] = "العمود is_admin مش موجود — شغّل: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;";
    } else {
      results["is_admin"] = "موجود";
    }

    return NextResponse.json({
      success: true,
      message: "تم إعداد كل حاجة بنجاح!",
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        results,
      },
      { status: 500 },
    );
  }
}
