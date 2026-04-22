/**
 * Marketplace Reset — مسح آمن للبيانات المحصودة + إيقاف Railway
 *
 * يمسح الحصاد والإعلانات المنشورة بس محافظ على الإعدادات (scopes, categories, tokens).
 * افتراضياً بيوقّف حصاد Railway أثناء الاختبار (scopes.is_paused = true).
 *
 * الاستخدام:
 *   GET /api/admin/marketplace/reset?mode=preview
 *       → يطلع تقرير بس (مش هيمسح)
 *   GET /api/admin/marketplace/reset?mode=wipe&confirm=YES_RESET_ALL_DATA
 *       → يمسح فعلاً + يوقّف Railway harvester
 *   GET /api/admin/marketplace/reset?mode=wipe&confirm=YES_RESET_ALL_DATA&include_users=true
 *       → نفس الحاجة + يمسح auth users المعتمدة من publish
 *   GET /api/admin/marketplace/reset?mode=wipe&confirm=YES_RESET_ALL_DATA&pause_scopes=false
 *       → يمسح من غير ما يوقّف Railway (مش مستحسن)
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
  "acquisition_queue",
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

/**
 * Tables with composite primary keys (no `id` column).
 * For these, we use a different filter column to satisfy PostgREST's
 * "delete must have a filter" safety requirement.
 */
const TABLE_FILTER_COL: Record<string, string> = {
  favorites: "user_id",
  user_interest_profiles: "user_id",
};

async function wipeTable(supabase: SupabaseClient, table: string): Promise<{ deleted: number; error?: string }> {
  try {
    const filterCol = TABLE_FILTER_COL[table] || "id";
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .not(filterCol, "is", null);

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
  const pauseScopes = searchParams.get("pause_scopes") !== "false"; // default true

  const supabase = getSupabase();

  // ─── Resume-harvesting mode: un-pause all scopes (handled before wipe branch) ───
  if (mode === "resume-harvesting") {
    const { data: resumed } = await supabase
      .from("ahe_scopes")
      .update({
        is_paused: false,
        pause_reason: null,
        next_harvest_at: new Date().toISOString(),
      })
      .eq("is_paused", true)
      .select("id, code");
    return NextResponse.json({
      mode: "resume-harvesting",
      duration_ms: Date.now() - startTime,
      scopes_resumed: (resumed || []).length,
      scope_codes: (resumed || []).map((s) => s.code),
      note: "Railway هيبدأ يحصد تاني من ~دقيقة",
    });
  }

  // ─── Preview mode: count everything, delete nothing ───
  if (mode !== "wipe") {
    const counts: Record<string, number> = {};
    for (const table of [...TABLES_DEFAULT, ...TABLES_PRESERVED]) {
      counts[table] = await countTable(supabase, table);
    }

    // Count active scopes (these are what Railway picks up)
    let activeScopes = 0, pausedScopes = 0;
    try {
      const { count: active } = await supabase
        .from("ahe_scopes")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("is_paused", false);
      const { count: paused } = await supabase
        .from("ahe_scopes")
        .select("id", { count: "exact", head: true })
        .eq("is_paused", true);
      activeScopes = active ?? 0;
      pausedScopes = paused ?? 0;
    } catch { /* ignore */ }

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
      railway_harvester_scopes: {
        currently_active: activeScopes,
        currently_paused: pausedScopes,
        note: activeScopes > 0
          ? "⚠️ Railway بيحصد على " + activeScopes + " scope دلوقتي. wipe mode هيوقفهم تلقائياً."
          : "✓ Railway موقوف حالياً.",
      },
      how_to_execute: {
        wipe_data_and_pause_railway: `/api/admin/marketplace/reset?mode=wipe&confirm=${CONFIRM_PHRASE}`,
        wipe_data_and_users: `/api/admin/marketplace/reset?mode=wipe&confirm=${CONFIRM_PHRASE}&include_users=true`,
        wipe_data_but_keep_railway_running: `/api/admin/marketplace/reset?mode=wipe&confirm=${CONFIRM_PHRASE}&pause_scopes=false`,
        resume_railway_later: `/api/admin/marketplace/reset?mode=resume-harvesting`,
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

  // Wipe in dependency-safe order (children before parents):
  //   - ahe_listings references ahe_sellers, ahe_scopes, ahe_harvest_jobs
  //   - acquisition_queue references ahe_sellers (must wipe BEFORE sellers)
  //   - messages references conversations
  //   - auction_bids, favorites reference ads
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
    "acquisition_queue", // depends on ahe_sellers — wipe BEFORE
    "ahe_sellers",
    "ahe_harvest_jobs",
  ];

  for (const table of wipeOrder) {
    results[table] = await wipeTable(supabase, table);
  }

  // Reset scope counters + optionally pause Railway harvester.
  // Column names match ahe_scopes schema in migration 00039.
  let scopesReset = 0;
  let scopesPaused = 0;
  try {
    const resetPayload: Record<string, unknown> = {
      total_harvests: 0,
      total_listings_found: 0,
      total_sellers_found: 0,
      total_phones_extracted: 0,
      last_harvest_at: null,
      last_harvest_job_id: null,
      last_harvest_new_listings: 0,
      last_harvest_new_sellers: 0,
      consecutive_failures: 0,
      avg_new_listings_per_harvest: 0,
    };

    if (pauseScopes) {
      resetPayload.is_paused = true;
      resetPayload.pause_reason = "Paused for bookmarklet testing (auto-reset)";
      // Push next run far into the future too, just in case
      resetPayload.next_harvest_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      resetPayload.next_harvest_at = new Date().toISOString();
    }

    const { data: updated } = await supabase
      .from("ahe_scopes")
      .update(resetPayload)
      .not("id", "is", null)
      .select("id, is_paused");
    scopesReset = (updated || []).length;
    scopesPaused = (updated || []).filter((s) => s.is_paused).length;
  } catch { /* ignore — schema may differ */ }

  // Optionally wipe auto-created auth users
  let usersResult: { deleted: number; error?: string } | null = null;
  if (includeUsers) {
    usersResult = await deleteAutoCreatedUsers(supabase);
  }

  return NextResponse.json({
    mode: "wipe",
    duration_ms: Date.now() - startTime,
    tables_wiped: results,
    scopes_reset: scopesReset,
    scopes_paused: scopesPaused,
    railway_status: pauseScopes
      ? "⏸️ Railway موقوف. شغّل reset?mode=resume-harvesting لما تخلص الاختبار."
      : "▶️ Railway لسه شغّال. هيحصد تلقائياً.",
    auto_users_deleted: usersResult,
    preserved_tables: TABLES_PRESERVED,
    next_step: "افتح سيت مدعوم (dubizzle/semsarmasr/opensooq/aqarmap) واضغط bookmarklet v11",
  });
}
