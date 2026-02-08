import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { categoriesConfig } from "@/lib/categories/categories-config";

/**
 * POST /api/ensure-categories
 *
 * Seeds categories and subcategories from the frontend config.
 * Uses service role key (server-side only) to bypass RLS.
 * IDs match exactly with the frontend config — no mismatch.
 *
 * Also cleans up old mismatched subcategory IDs (e.g., cars_passenger → passenger).
 */
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { success: false, error: "NEXT_PUBLIC_SUPABASE_URL not set" },
      { status: 500 },
    );
  }

  // Use service role key to bypass RLS
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceRoleKey || anonKey;
  if (!key) {
    return NextResponse.json(
      { success: false, error: "No Supabase key available" },
      { status: 500 },
    );
  }

  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });

  try {
    // Build seed data from the frontend config — IDs are guaranteed to match
    const categories = categoriesConfig.map((c, i) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      slug: c.slug,
      sort_order: i + 1,
      is_active: true,
    }));

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

    // Collect the correct subcategory IDs from config
    const correctSubIds = new Set(subcategories.map((s) => s.id));

    // Delete OLD mismatched subcategories that have prefixed IDs
    // These block new inserts due to UNIQUE(category_id, slug) constraint
    // Old format: cars_passenger, re_apartments_sale, phones_mobile, etc.
    const oldPrefixes = [
      "cars_", "re_", "phones_", "fashion_", "scrap_",
      "gold_", "luxury_", "app_", "furn_", "hobby_",
      "tools_", "svc_",
    ];

    let deletedOld = 0;
    for (const prefix of oldPrefixes) {
      const { data: oldRows } = await client
        .from("subcategories")
        .select("id")
        .like("id", `${prefix}%`);

      if (oldRows && oldRows.length > 0) {
        // Only delete rows whose IDs are NOT in the correct set
        const toDelete = oldRows
          .map((r) => r.id)
          .filter((id: string) => !correctSubIds.has(id));

        if (toDelete.length > 0) {
          const { error: delErr } = await client
            .from("subcategories")
            .delete()
            .in("id", toDelete);

          if (!delErr) {
            deletedOld += toDelete.length;
          } else {
            console.warn(`[ensure-categories] Failed to delete old ${prefix}* subcategories:`, delErr.message);
          }
        }
      }
    }

    // Seed categories first (subcategories depend on them)
    const { error: catError } = await client
      .from("categories")
      .upsert(categories, { onConflict: "id" });

    if (catError) {
      console.error("[ensure-categories] Category seed error:", catError);
      return NextResponse.json(
        {
          success: false,
          error: catError.message,
          hint: serviceRoleKey
            ? "Seed failed even with service role key — check if categories table exists"
            : "Add SUPABASE_SERVICE_ROLE_KEY to env vars (Supabase Dashboard → Settings → API → service_role key)",
        },
        { status: 500 },
      );
    }

    // Seed subcategories
    const { error: subError } = await client
      .from("subcategories")
      .upsert(subcategories, { onConflict: "id" });

    if (subError) {
      console.error("[ensure-categories] Subcategory seed error:", subError);
      return NextResponse.json(
        { success: false, error: subError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      categories: categories.length,
      subcategories: subcategories.length,
      deletedOldSubcategories: deletedOld,
      usedServiceRole: !!serviceRoleKey,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// Also support GET for easy browser testing
export async function GET() {
  return POST();
}
