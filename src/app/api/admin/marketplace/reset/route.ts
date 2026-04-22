/**
 * Marketplace Reset — مسح آمن للبيانات المحصودة
 *
 * يمسح الحصاد والإعلانات المنشورة بس محافظ على الإعدادات (scopes, categories, tokens, etc.).
 *
 * الاستخدام:
 *   GET /api/admin/marketplace/reset?mode=preview        → يطلع تقرير بس (مش هيمسح)
 *   GET /api/admin/marketplace/reset?mode=wipe&confirm=YES_RESET_ALL_DATA
 *                                                        → يمسح فعلاً
 *   GET /api/admin/marketplace/reset?mode=wipe&confirm=YES_RESET_ALL_DATA&include_users=true
 *                                                        → يمسح كمان حسابات auth المعتمدة من publish
 *
 * Safety: `confirm` لازم يطابق النص بالظبط، ومفيش default.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const CONFIRM_PHRASE = "YES_RESET_ALL_DATA";

// Tables wiped by default (harvested + generated marketplace data)
const TABLES_DEFAULT = [
  "ahe_listings",
  "ahe_sellers",
  "ahe_harvest_jobs",
  "ahe_hourly_metrics",
  "ahe_daily_metrics",
  "user_signals",
  "user_interest_profiles",
  "favorites",
  "messages",
  "conversations",
  "auction_bids",
  "commissions",
  "ads",
];

// Tables preserved — DO NOT touch these
const TABLES_PRESERVED = [
  "ahe_scopes",           // Harvest scope configurations
  "employees",            // Admin accounts
  "employee_bookmarklet_tokens", // Bookmarklet auth tokens
  "categories",           // Seed data
  "subcategories",        // Seed data
  "governorates",         // Seed data
  "cities",               // Seed data
  "ahe_platforms",        // Platform configs
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type SupabaseClient = ReturnType<typeof getSupabase>;

async function countTable(supabase: SupabaseClient, table: string): Promise<number> {
  try {
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return -1; // table doesn't exist
  }
}

async function wipeTable(supabase: SupabaseClient, table: string): Promise<{ deleted: number; error?: string }> {
  try {
    // Delete all rows. We use a filter that always matches (id is not null) because
    // PostgREST requires a filter for safety when calling delete().
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .not("id", "is", null);

    if (error) return { deleted: 0, error: error.message };
    return { deleted: count ?? 0 };
  } catch (e) {
    return { deleted: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function deleteAutoCreatedUsers(supabase: SupabaseClient): Promise<{ deleted: number; error?: string }> {
  try {
    // Auto-created users from publish have user_metadata.source = "harvest_auto_publish"
    // Fetch up to 1000 and delete those matching the flag.
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) return { deleted: 0, error: listErr.message };

    let deleted = 0;
    for (const u of users || []) {
      const source = (u.user_metadata as Record<string, unknown> | null)?.source;
      if (source === "harvest_auto_publish") {
        const { error } = await supabase.auth.admin.deleteUser(u.id);
        if (!error) deleted++;
      }
    }
    return { deleted };
  } catch (e) {
    return { deleted: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "preview";
  const confirm = searchParams.get("confirm") || "";
  const includeUsers = searchParams.get("include_users") === "true";

  const supabase = getSupabase();

  // ─── Preview mode: count everything, delete nothing ───
  if (mode !== "wipe") {
    const counts: Record<string, number> = {};
    for (const table of [...TABLES_DEFAULT, ...TABLES_PRESERVED]) {
      counts[table] = await countTable(supabase, table);
    }

    // Count auto-created auth users (best effort)
    let autoUsers = 0;
    try {
      const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of data?.users || []) {
        const source = (u.user_metadata as Record<string, unknown> | null)?.source;
        if (source === "harvest_auto_publish") autoUsers++;
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      mode: "preview",
      duration_ms: Date.now() - startTime,
      will_delete: Object.fromEntries(TABLES_DEFAULT.map((t) => [t, counts[t] ?? 0])),
      will_preserve: Object.fromEntries(TABLES_PRESERVED.map((t) => [t, counts[t] ?? 0])),
      auto_created_auth_users: autoUsers,
      how_to_execute: {
        wipe_data_only: `/api/admin/marketplace/reset?mode=wipe&confirm=${CONFIRM_PHRASE}`,
        wipe_data_and_users: `/api/admin/marketplace/reset?mode=wipe&confirm=${CONFIRM_PHRASE}&include_users=true`,
      },
    });
  }

  // ─── Wipe mode: requires exact confirmation ───
  if (confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      {
        error: "Confirmation missing or wrong",
        hint: `Add &confirm=${CONFIRM_PHRASE} to the URL to actually wipe data`,
      },
      { status: 400 }
    );
  }

  const results: Record<string, { deleted: number; error?: string }> = {};

  // Wipe in dependency-safe order (children before parents)
  // ahe_listings references ahe_sellers + ahe_scopes + ahe_harvest_jobs
  // messages references conversations
  // auction_bids, favorites reference ads
  const wipeOrder = [
    "user_signals",
    "user_interest_profiles",
    "messages",
    "conversations",
    "auction_bids",
    "favorites",
    "commissions",
    "ads",
    "ahe_hourly_metrics",
    "ahe_daily_metrics",
    "ahe_listings",
    "ahe_sellers",
    "ahe_harvest_jobs",
  ];

  for (const table of wipeOrder) {
    results[table] = await wipeTable(supabase, table);
  }

  // Reset scope counters (preserve scopes but zero out their stats)
  try {
    await supabase
      .from("ahe_scopes")
      .update({
        total_listings_fetched: 0,
        total_listings_new: 0,
        total_phones_extracted: 0,
        last_harvested_at: null,
        next_harvest_at: new Date().toISOString(),
      })
      .not("id", "is", null);
  } catch { /* ignore — columns may not exist */ }

  // Optionally wipe auto-created auth users
  let usersResult: { deleted: number; error?: string } | null = null;
  if (includeUsers) {
    usersResult = await deleteAutoCreatedUsers(supabase);
  }

  return NextResponse.json({
    mode: "wipe",
    duration_ms: Date.now() - startTime,
    tables_wiped: results,
    auto_users_deleted: usersResult,
    preserved_tables: TABLES_PRESERVED,
    next_step: "تقدر تشغل الـ bookmarklet الموحّد لبداية حصاد جديد",
  });
}
