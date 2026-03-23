/**
 * جدول حصاد الإسكندرية — Alexandria Harvest Schedule
 *
 * الجدول اليومي:
 * ┌────────────────────────────────────────────────────────────┐
 * │ كل ساعتين — المصادر الأساسية (أولوية 1)                   │
 * │   Dubizzle سيارات + عقارات الإسكندرية                     │
 * │   AqarMap عقارات الإسكندرية                                │
 * │   هتلاقي سيارات الإسكندرية                                │
 * ├────────────────────────────────────────────────────────────┤
 * │ كل 3 ساعات — المصادر الثانوية (أولوية 2)                  │
 * │   OpenSooq سيارات + عقارات                                │
 * │   PropertyFinder عقارات                                    │
 * │   ContactCars سيارات                                      │
 * ├────────────────────────────────────────────────────────────┤
 * │ كل 4 ساعات — المصادر الإضافية (أولوية 3)                  │
 * │   OLX سيارات                                              │
 * │   سمسار مصر عقارات                                        │
 * └────────────────────────────────────────────────────────────┘
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VERCEL_HARVEST_URL = process.env.VERCEL_HARVEST_URL || "";

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
  harvest_interval_minutes: number;
  next_harvest_at: string | null;
  server_fetch_blocked: boolean;
}

interface ScheduleResult {
  total_scopes: number;
  scopes_run: number;
  scopes_skipped: number;
  jobs_created: string[];
  errors: string[];
  duration_seconds: number;
}

/**
 * Get active scopes filtered by priority
 */
async function getActiveScopes(
  supabase: SupabaseClient,
  options: {
    priority?: number;
    category?: string;
    governorate?: string;
  } = {}
): Promise<AheScope[]> {
  let query = supabase
    .from("ahe_scopes")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (options.priority !== undefined) {
    query = query.eq("priority", options.priority);
  }
  if (options.category) {
    query = query.eq("maksab_category", options.category);
  }
  if (options.governorate) {
    query = query.eq("governorate", options.governorate);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[SCHEDULE] Error fetching scopes:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Check if a scope is ready for harvest based on its interval
 */
function isScopeReady(scope: AheScope): boolean {
  if (scope.server_fetch_blocked) return false;
  if (!scope.next_harvest_at) return true;
  return new Date(scope.next_harvest_at) <= new Date();
}

/**
 * Trigger a harvest for a specific scope
 * Creates a job in ahe_harvest_jobs and delegates to the appropriate worker
 */
async function triggerHarvest(
  supabase: SupabaseClient,
  scope: AheScope
): Promise<string | null> {
  try {
    // Create harvest job
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

    // Delegate to Vercel if needed
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
 * Main scheduler — runs the appropriate scopes based on time
 */
export async function runHarvestSchedule(): Promise<ScheduleResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const now = new Date();
  const hour = now.getHours();
  const errors: string[] = [];
  const jobIds: string[] = [];
  let scopesRun = 0;
  let scopesSkipped = 0;

  console.log(`[SCHEDULE] 🕐 Running harvest schedule at ${now.toISOString()} (hour: ${hour})`);

  // Always run primary scopes (priority 1) — every 2 hours
  const primaryScopes = await getActiveScopes(supabase, {
    priority: 1,
    governorate: "الإسكندرية",
  });

  console.log(`[SCHEDULE] 📌 Primary scopes: ${primaryScopes.length}`);
  for (const scope of primaryScopes) {
    if (isScopeReady(scope)) {
      const jobId = await triggerHarvest(supabase, scope);
      if (jobId) {
        jobIds.push(jobId);
        scopesRun++;
      }
    } else {
      scopesSkipped++;
    }
  }

  // Secondary scopes (priority 2) — every 3 hours
  if (hour % 3 === 0) {
    const secondaryScopes = await getActiveScopes(supabase, {
      priority: 2,
      governorate: "الإسكندرية",
    });

    console.log(`[SCHEDULE] 📌 Secondary scopes: ${secondaryScopes.length}`);
    for (const scope of secondaryScopes) {
      if (isScopeReady(scope)) {
        const jobId = await triggerHarvest(supabase, scope);
        if (jobId) {
          jobIds.push(jobId);
          scopesRun++;
        }
      } else {
        scopesSkipped++;
      }
    }
  }

  // Tertiary scopes (priority 3) — every 4 hours
  if (hour % 4 === 0) {
    const tertiaryScopes = await getActiveScopes(supabase, {
      priority: 3,
      governorate: "الإسكندرية",
    });

    console.log(`[SCHEDULE] 📌 Tertiary scopes: ${tertiaryScopes.length}`);
    for (const scope of tertiaryScopes) {
      if (isScopeReady(scope)) {
        const jobId = await triggerHarvest(supabase, scope);
        if (jobId) {
          jobIds.push(jobId);
          scopesRun++;
        }
      } else {
        scopesSkipped++;
      }
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const totalScopes = primaryScopes.length + (hour % 3 === 0 ? (await getActiveScopes(supabase, { priority: 2, governorate: "الإسكندرية" })).length : 0);

  console.log(`[SCHEDULE] ✅ Schedule complete: ${scopesRun} run, ${scopesSkipped} skipped, ${jobIds.length} jobs created in ${duration.toFixed(1)}s`);

  return {
    total_scopes: scopesRun + scopesSkipped,
    scopes_run: scopesRun,
    scopes_skipped: scopesSkipped,
    jobs_created: jobIds,
    errors,
    duration_seconds: duration,
  };
}

/**
 * Get schedule status — what will run next
 */
export async function getScheduleStatus(): Promise<{
  next_primary: string;
  next_secondary: string;
  next_tertiary: string;
  active_scopes: { priority: number; count: number; category: string }[];
}> {
  const supabase = getSupabase();
  const now = new Date();
  const hour = now.getHours();

  const scopes = await getActiveScopes(supabase, { governorate: "الإسكندرية" });

  const byPriority = scopes.reduce(
    (acc, s) => {
      const key = `${s.priority}-${s.maksab_category}`;
      if (!acc[key]) acc[key] = { priority: s.priority, count: 0, category: s.maksab_category };
      acc[key].count++;
      return acc;
    },
    {} as Record<string, { priority: number; count: number; category: string }>
  );

  // Calculate next run times
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
    active_scopes: Object.values(byPriority),
  };
}
