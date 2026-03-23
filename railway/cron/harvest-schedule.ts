/**
 * جدول الحصاد — Harvest Schedule (Dynamic, DB-driven)
 *
 * يجيب النطاقات ديناميكياً من ahe_scopes في DB
 * يدعم كل المحافظات (الإسكندرية، القاهرة، إلخ)
 *
 * الاستراتيجية:
 * ┌────────────────────────────────────────────────────────────┐
 * │ أولوية 1 — المصادر الأساسية: كل ساعتين                    │
 * │   Dubizzle, AqarMap, هتلاقي                               │
 * ├────────────────────────────────────────────────────────────┤
 * │ أولوية 2 — المصادر الثانوية: كل 3 ساعات                   │
 * │   OpenSooq, PropertyFinder, ContactCars                   │
 * ├────────────────────────────────────────────────────────────┤
 * │ أولوية 3 — المصادر الإضافية: كل 4 ساعات                   │
 * │   OLX, سمسار مصر                                          │
 * └────────────────────────────────────────────────────────────┘
 *
 * قواعد التشغيل:
 * - حد أقصى 3 نطاقات بالتوازي
 * - 3 فشل متتالي → إيقاف تلقائي + تنبيه
 * - النطاقات تُجلب ديناميكياً من DB (لا hardcoded)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VERCEL_HARVEST_URL = process.env.VERCEL_HARVEST_URL || "";

/** Maximum concurrent harvest jobs */
const MAX_CONCURRENT_HARVESTS = 3;

/** Auto-pause after this many consecutive failures */
const MAX_CONSECUTIVE_FAILURES = 3;

function getSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface AheScope {
  id: string;
  name: string;
  code: string;
  source_platform: string;
  maksab_category: string;
  governorate: string;
  priority: number;
  is_active: boolean;
  is_paused: boolean;
  harvest_interval_minutes: number;
  next_harvest_at: string | null;
  server_fetch_blocked: boolean;
  consecutive_failures: number;
}

interface ScheduleResult {
  total_scopes: number;
  scopes_run: number;
  scopes_skipped: number;
  scopes_auto_paused: number;
  jobs_created: string[];
  errors: string[];
  duration_seconds: number;
}

/**
 * Get active scopes ready for harvest — dynamic from DB
 * Respects priority, interval, and pause state
 */
async function getReadyScopes(
  supabase: SupabaseClient,
  options: {
    priority?: number;
    governorate?: string;
    limit?: number;
  } = {}
): Promise<AheScope[]> {
  const now = new Date().toISOString();

  let query = supabase
    .from("ahe_scopes")
    .select("*")
    .eq("is_active", true)
    .eq("is_paused", false)
    .or(`next_harvest_at.is.null,next_harvest_at.lte.${now}`)
    .or("server_fetch_blocked.eq.false,server_fetch_blocked.is.null")
    .order("priority", { ascending: true })
    .order("next_harvest_at", { ascending: true, nullsFirst: true });

  if (options.priority !== undefined) {
    query = query.eq("priority", options.priority);
  }
  if (options.governorate) {
    query = query.eq("governorate", options.governorate);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[SCHEDULE] Error fetching scopes:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Auto-pause scopes with too many consecutive failures
 */
async function autoPauseFailingScopes(supabase: SupabaseClient): Promise<string[]> {
  const { data: failingScopes } = await supabase
    .from("ahe_scopes")
    .select("id, code, consecutive_failures")
    .eq("is_active", true)
    .eq("is_paused", false)
    .gte("consecutive_failures", MAX_CONSECUTIVE_FAILURES);

  if (!failingScopes?.length) return [];

  const pausedCodes: string[] = [];

  for (const scope of failingScopes) {
    const { error } = await supabase
      .from("ahe_scopes")
      .update({ is_paused: true })
      .eq("id", scope.id);

    if (!error) {
      pausedCodes.push(scope.code);
      console.warn(
        `[SCHEDULE] ⚠️ Auto-paused ${scope.code} — ${scope.consecutive_failures} consecutive failures`
      );
    }
  }

  return pausedCodes;
}

/**
 * Trigger a harvest for a specific scope
 * Creates a job in ahe_harvest_jobs and delegates to Vercel
 */
async function triggerHarvest(
  supabase: SupabaseClient,
  scope: AheScope
): Promise<string | null> {
  try {
    const now = new Date();
    const targetFrom = new Date(now.getTime() - scope.harvest_interval_minutes * 60 * 1000);

    const { data: job, error: jobError } = await supabase
      .from("ahe_harvest_jobs")
      .insert({
        scope_id: scope.id,
        target_from: targetFrom.toISOString(),
        target_to: now.toISOString(),
        status: "pending",
        pages_fetched: 0,
        pages_total: null,
        listings_fetched: 0,
        listings_total: 0,
        listings_new: 0,
        listings_duplicate: 0,
        sellers_total: 0,
        sellers_new: 0,
        phones_extracted: 0,
        auto_queued: 0,
        errors: [],
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error(`[SCHEDULE] Failed to create job for ${scope.code}:`, jobError?.message);
      return null;
    }

    console.log(`[SCHEDULE] 📋 Created job ${job.id} for ${scope.code}`);

    // Delegate to Vercel if configured
    if (VERCEL_HARVEST_URL) {
      try {
        const res = await fetch(VERCEL_HARVEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope_code: scope.code,
            job_id: job.id,
          }),
        });

        if (!res.ok) {
          console.warn(`[SCHEDULE] Vercel trigger returned ${res.status} for ${scope.code}`);
        }
      } catch (e) {
        console.warn(`[SCHEDULE] Vercel trigger failed for ${scope.code}:`, e);
      }
    }

    // Update next_harvest_at
    await supabase
      .from("ahe_scopes")
      .update({
        next_harvest_at: new Date(now.getTime() + scope.harvest_interval_minutes * 60 * 1000).toISOString(),
      })
      .eq("id", scope.id);

    return job.id;
  } catch (error) {
    console.error(`[SCHEDULE] Trigger error for ${scope.code}:`, error);
    return null;
  }
}

/**
 * Main scheduler — dynamic, DB-driven
 * Fetches ALL ready scopes (any governorate), respects concurrency limit
 */
export async function runHarvestSchedule(): Promise<ScheduleResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const errors: string[] = [];
  const jobIds: string[] = [];
  let scopesRun = 0;
  let scopesSkipped = 0;

  console.log(`[SCHEDULE] 🕐 Running harvest schedule at ${new Date().toISOString()}`);

  // Step 1: Auto-pause failing scopes
  const pausedScopes = await autoPauseFailingScopes(supabase);
  if (pausedScopes.length > 0) {
    console.warn(`[SCHEDULE] ⚠️ Auto-paused ${pausedScopes.length} scopes: ${pausedScopes.join(", ")}`);
    errors.push(`Auto-paused: ${pausedScopes.join(", ")}`);
  }

  // Step 2: Get all ready scopes (dynamic — from DB, any governorate)
  const readyScopes = await getReadyScopes(supabase, {
    limit: MAX_CONCURRENT_HARVESTS * 2, // fetch extra in case some fail
  });

  console.log(`[SCHEDULE] 📌 Ready scopes: ${readyScopes.length}`);

  if (readyScopes.length === 0) {
    const duration = (Date.now() - startTime) / 1000;
    return {
      total_scopes: 0,
      scopes_run: 0,
      scopes_skipped: 0,
      scopes_auto_paused: pausedScopes.length,
      jobs_created: [],
      errors,
      duration_seconds: duration,
    };
  }

  // Step 3: Run up to MAX_CONCURRENT_HARVESTS in parallel
  const batch = readyScopes.slice(0, MAX_CONCURRENT_HARVESTS);
  scopesSkipped = readyScopes.length - batch.length;

  const results = await Promise.allSettled(
    batch.map((scope) => triggerHarvest(supabase, scope))
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      jobIds.push(result.value);
      scopesRun++;
    } else if (result.status === "rejected") {
      errors.push(String(result.reason));
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log(
    `[SCHEDULE] ✅ Schedule complete: ${scopesRun} run, ${scopesSkipped} skipped, ${pausedScopes.length} auto-paused, ${jobIds.length} jobs in ${duration.toFixed(1)}s`
  );

  return {
    total_scopes: readyScopes.length,
    scopes_run: scopesRun,
    scopes_skipped: scopesSkipped,
    scopes_auto_paused: pausedScopes.length,
    jobs_created: jobIds,
    errors,
    duration_seconds: duration,
  };
}

/**
 * Get schedule status — what scopes are active and when they'll run next
 */
export async function getScheduleStatus(): Promise<{
  next_primary: string;
  next_secondary: string;
  next_tertiary: string;
  active_scopes: { priority: number; count: number; category: string; governorate: string }[];
  paused_scopes: number;
  failing_scopes: number;
}> {
  const supabase = getSupabase();
  const now = new Date();

  // Get all active scopes (any governorate)
  const { data: scopes } = await supabase
    .from("ahe_scopes")
    .select("priority, maksab_category, governorate, is_paused, consecutive_failures")
    .eq("is_active", true);

  const allScopes = scopes || [];

  const byGroup = allScopes
    .filter((s) => !s.is_paused)
    .reduce(
      (acc, s) => {
        const key = `${s.priority}-${s.maksab_category}-${s.governorate}`;
        if (!acc[key]) acc[key] = { priority: s.priority, count: 0, category: s.maksab_category, governorate: s.governorate };
        acc[key].count++;
        return acc;
      },
      {} as Record<string, { priority: number; count: number; category: string; governorate: string }>
    );

  const nextHour = (h: number) => {
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    while (next.getHours() % h !== 0 || next <= now) {
      next.setHours(next.getHours() + 1);
    }
    return next.toISOString();
  };

  return {
    next_primary: nextHour(2),
    next_secondary: nextHour(3),
    next_tertiary: nextHour(4),
    active_scopes: Object.values(byGroup),
    paused_scopes: allScopes.filter((s) => s.is_paused).length,
    failing_scopes: allScopes.filter((s) => (s.consecutive_failures || 0) >= MAX_CONSECUTIVE_FAILURES).length,
  };
}
