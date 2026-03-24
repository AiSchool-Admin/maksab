/**
 * Cron Job — مجدول محرك الحصاد
 * يُستدعى كل 10 دقائق بواسطة Vercel Cron
 *
 * الاستراتيجية الجديدة:
 * 1. ينشئ jobs لكل النطاقات الجاهزة
 * 2. يشغّل أول job مباشرة (await — مش fire-and-forget)
 * 3. يبلّغ Railway Worker عن باقي الـ jobs
 * 4. لو مفيش Railway → يشغّل job واحد بس (حدود Vercel 60 ثانية)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runHarvestJob } from "@/lib/crm/harvester/engine";

export const maxDuration = 60; // Vercel Hobby plan max
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
  );
}

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  try {
    // 1. Check engine status
    const { data: engine, error: engineError } = await supabase
      .from("ahe_engine_status")
      .select("*")
      .eq("id", 1)
      .single();

    if (engineError || !engine) {
      return NextResponse.json({
        message: "جداول المحرك غير موجودة أو خطأ",
        error: engineError?.message,
      });
    }

    if (engine.status !== "running") {
      return NextResponse.json({
        message: "المحرك غير مشغّل",
        status: engine.status,
      });
    }

    // 2. Reset hourly counter if hour has passed
    const hourStart = new Date(engine.hour_started_at);
    const now = new Date();
    if (now.getTime() - hourStart.getTime() > 3600000) {
      try {
        await supabase.rpc("reset_hourly_request_counter");
      } catch {
        await supabase
          .from("ahe_engine_status")
          .update({
            current_requests_this_hour: 0,
            hour_started_at: now.toISOString(),
          })
          .eq("id", 1);
      }
    }

    // 3. Check rate limits
    if (
      engine.current_requests_this_hour >= engine.global_max_requests_per_hour
    ) {
      return NextResponse.json({
        message: "تم الوصول للحد الأقصى من الطلبات هذه الساعة",
        current: engine.current_requests_this_hour,
        max: engine.global_max_requests_per_hour,
      });
    }

    if (engine.running_jobs_count >= engine.global_max_concurrent_jobs) {
      return NextResponse.json({
        message: "العدد الأقصى من العمليات المتزامنة قيد التشغيل",
        running: engine.running_jobs_count,
        max: engine.global_max_concurrent_jobs,
      });
    }

    // 4. Cleanup stale pending jobs — any job pending > 10 min is stuck
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabase
      .from("ahe_harvest_jobs")
      .select("id, scope_id")
      .eq("status", "pending")
      .lt("created_at", staleThreshold);

    if (staleJobs?.length) {
      console.log(`[CRON] 🧹 Found ${staleJobs.length} stale pending jobs — marking as failed`);
      await supabase
        .from("ahe_harvest_jobs")
        .update({
          status: "failed",
          errors: ["Stale: pending > 10 دقائق بدون تشغيل — أعيد جدولته"],
          completed_at: now.toISOString(),
        })
        .eq("status", "pending")
        .lt("created_at", staleThreshold);
    }

    // 5. Find ready scopes
    const availableSlots =
      engine.global_max_concurrent_jobs - engine.running_jobs_count;

    const MVP_MODE = process.env.MVP_MODE === "true";

    let scopeQuery = supabase
      .from("ahe_scopes")
      .select("*")
      .eq("is_active", true)
      .eq("is_paused", false)
      .or("server_fetch_blocked.eq.false,server_fetch_blocked.is.null")
      .or(
        `next_harvest_at.is.null,next_harvest_at.lte.${now.toISOString()}`
      );

    // MVP mode: الإسكندرية فقط — سيارات وعقارات
    if (MVP_MODE) {
      scopeQuery = scopeQuery
        .eq("governorate", "الإسكندرية")
        .in("maksab_category", ["سيارات", "عقارات"]);
      console.log("[CRON] 🎯 MVP Mode: الإسكندرية فقط — سيارات + عقارات");
    }

    const { data: readyScopes } = await scopeQuery
      .order("priority", { ascending: true })
      .order("next_harvest_at", { ascending: true, nullsFirst: false })
      .limit(Math.max(availableSlots, 20));

    // Debug: log what we found
    console.log(`[CRON] Engine: ${engine.status} | slots: ${availableSlots} | ready: ${readyScopes?.length || 0}`);
    if (readyScopes?.length) {
      for (const s of readyScopes) {
        console.log(`[CRON] → ${s.code} | pri=${s.priority} | ${s.maksab_category} | ${s.source_platform} | gov: ${s.governorate} | next: ${s.next_harvest_at}`);
      }
    }

    // Fetch ALL active scopes for debug (categories + platforms breakdown)
    const { data: allScopes } = await supabase
      .from("ahe_scopes")
      .select("code, maksab_category, source_platform, is_active, is_paused, server_fetch_blocked, next_harvest_at, governorate")
      .eq("is_active", true);

    const scopeDebug = (allScopes || []).map((s: any) => ({
      code: s.code,
      category: s.maksab_category,
      platform: s.source_platform,
      gov: s.governorate,
      paused: s.is_paused,
      blocked: s.server_fetch_blocked,
      next: s.next_harvest_at,
    }));

    const categories = [...new Set((allScopes || []).map((s: any) => s.maksab_category))];
    const platforms = [...new Set((allScopes || []).map((s: any) => s.source_platform))];
    console.log(`[CRON] All active scopes: ${allScopes?.length || 0} | categories: ${categories.join(", ")} | platforms: ${platforms.join(", ")}`);

    if (!readyScopes?.length) {
      return NextResponse.json({
        message: "لا توجد نطاقات جاهزة للحصاد",
        debug: {
          engine_status: engine.status,
          available_slots: availableSlots,
          scopes_found: 0,
          all_active_scopes_count: allScopes?.length || 0,
          categories,
          platforms,
          all_active_scopes: scopeDebug,
          stale_jobs_cleaned: staleJobs?.length || 0,
        },
      });
    }

    // 6. Create harvest jobs for ALL ready scopes
    const jobIds: string[] = [];
    const jobDetails: { id: string; scope_code: string; category: string; platform: string }[] = [];

    for (const scope of readyScopes) {
      const targetFrom = scope.last_harvest_at
        ? new Date(scope.last_harvest_at)
        : new Date(
            Date.now() - scope.harvest_interval_minutes * 60000
          );

      const { data: job, error: jobError } = await supabase
        .from("ahe_harvest_jobs")
        .insert({
          scope_id: scope.id,
          target_from: targetFrom.toISOString(),
          target_to: now.toISOString(),
          status: "pending",
          current_step: "في الانتظار",
        })
        .select()
        .single();

      if (jobError) {
        console.error(`[CRON] ❌ Job creation failed for ${scope.code}: ${jobError.message}`);
        continue;
      }

      if (job) {
        console.log(`[CRON] ✅ Job created: ${job.id} for ${scope.code} (${scope.maksab_category} / ${scope.source_platform})`);
        jobIds.push(job.id);
        jobDetails.push({
          id: job.id,
          scope_code: scope.code,
          category: scope.maksab_category,
          platform: scope.source_platform,
        });

        // Update next harvest time immediately
        await supabase
          .from("ahe_scopes")
          .update({
            next_harvest_at: new Date(
              Date.now() + scope.harvest_interval_minutes * 60000
            ).toISOString(),
          })
          .eq("id", scope.id);
      }
    }

    // 7. Execute jobs — strategy depends on available infrastructure
    const railwayUrl = process.env.RAILWAY_WORKER_URL;
    const executionResults: { job_id: string; scope: string; method: string; success?: boolean; error?: string }[] = [];

    if (railwayUrl) {
      // Railway available — delegate ALL jobs to Railway (it has longer timeouts)
      console.log(`[CRON] 📡 Railway available — delegating ${jobIds.length} jobs to ${railwayUrl}`);

      for (const detail of jobDetails) {
        try {
          const res = await fetch(`${railwayUrl}/process-job`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: detail.id }),
            signal: AbortSignal.timeout(5000), // 5s timeout for trigger
          });
          executionResults.push({
            job_id: detail.id,
            scope: detail.scope_code,
            method: "railway",
            success: res.ok,
          });
        } catch (err) {
          console.error(`[CRON] Railway trigger failed for ${detail.scope_code}:`, err);
          executionResults.push({
            job_id: detail.id,
            scope: detail.scope_code,
            method: "railway_failed",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Fallback: run first failed job directly if Railway failed
      const failedJobs = executionResults.filter(r => !r.success);
      if (failedJobs.length > 0 && failedJobs.length === jobIds.length) {
        // ALL Railway calls failed — run first job directly
        console.log(`[CRON] ⚠️ All Railway triggers failed — running first job directly`);
        try {
          const result = await runHarvestJob(jobIds[0]);
          executionResults.push({
            job_id: jobIds[0],
            scope: jobDetails[0].scope_code,
            method: "direct_fallback",
            success: result.success,
          });
        } catch (err) {
          console.error(`[CRON] Direct fallback also failed:`, err);
        }
      }
    } else {
      // No Railway — run first job directly via await (not fire-and-forget!)
      // Only run ONE job since Vercel has 60s limit
      console.log(`[CRON] 🏃 No Railway — running first job directly: ${jobDetails[0]?.scope_code}`);

      if (jobIds.length > 0) {
        try {
          const result = await runHarvestJob(jobIds[0]);
          executionResults.push({
            job_id: jobIds[0],
            scope: jobDetails[0].scope_code,
            method: "direct",
            success: result.success,
          });
          console.log(`[CRON] ✅ Direct execution: ${result.success ? "success" : "failed"} — new: ${result.listings_new}, phones: ${result.phones_extracted}`);
        } catch (err) {
          console.error(`[CRON] Direct execution failed:`, err);
          executionResults.push({
            job_id: jobIds[0],
            scope: jobDetails[0].scope_code,
            method: "direct_failed",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // For remaining jobs (2+), try fire-and-forget to /run API as a best effort
      if (jobIds.length > 1) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        for (let i = 1; i < jobIds.length; i++) {
          console.log(`[CRON] 🔄 Queuing remaining job ${jobDetails[i].scope_code} via /run API (best-effort)`);
          fetch(`${baseUrl}/api/admin/crm/harvester/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: jobIds[i] }),
          }).catch((err) =>
            console.error(`[CRON] Run trigger failed for ${jobDetails[i].scope_code}:`, err)
          );
          executionResults.push({
            job_id: jobIds[i],
            scope: jobDetails[i].scope_code,
            method: "fire_and_forget",
          });
        }
      }
    }

    return NextResponse.json({
      message: `تم إنشاء ${jobIds.length} عملية حصاد`,
      jobs_created: jobIds.length,
      job_ids: jobIds,
      execution: executionResults,
      scopes: readyScopes.map((s: any) => ({
        code: s.code,
        category: s.maksab_category,
        platform: s.source_platform,
        governorate: s.governorate,
      })),
      debug: {
        engine_status: engine.status,
        available_slots: availableSlots,
        scopes_found: readyScopes.length,
        all_active_scopes_count: allScopes?.length || 0,
        categories,
        platforms,
        stale_jobs_cleaned: staleJobs?.length || 0,
        railway_configured: !!railwayUrl,
        all_active_scopes: scopeDebug,
      },
    });
  } catch (error) {
    console.error(`[CRON] ❌ Fatal error:`, error);
    return NextResponse.json(
      {
        error: "خطأ في المجدول",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
