/**
 * AHE Scheduler API
 * POST — يفحص النطاقات الجاهزة وينشئ عمليات حصاد
 * يُستدعى كل دقيقة من Railway cron أو Vercel cron
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  // Verify scheduler secret (for cron jobs)
  const authHeader = req.headers.get("authorization");
  const schedulerSecret = process.env.AHE_SCHEDULER_SECRET;

  if (schedulerSecret && authHeader !== `Bearer ${schedulerSecret}`) {
    // Fall back to admin auth
    const { validateAdminRequest } = await import("@/lib/crm/auth");
    const authError = await validateAdminRequest(req);
    if (authError) return authError;
  }

  try {
    // 1. Check engine status
    const { data: engine } = await supabase
      .from("ahe_engine_status")
      .select("*")
      .eq("id", 1)
      .single();

    if (!engine || engine.status !== "running") {
      return NextResponse.json({
        message: "المحرك غير مشغّل",
        status: engine?.status || "unknown",
      });
    }

    // 2. Check rate limits
    // Reset hourly counter if hour has passed
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

    if (engine.current_requests_this_hour >= engine.global_max_requests_per_hour) {
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

    // 3. Find ready scopes
    const availableSlots = engine.global_max_concurrent_jobs - engine.running_jobs_count;

    const { data: readyScopes } = await supabase
      .from("ahe_scopes")
      .select("*")
      .eq("is_active", true)
      .eq("is_paused", false)
      .or(`next_harvest_at.is.null,next_harvest_at.lte.${now.toISOString()}`)
      .order("priority", { ascending: false })
      .order("next_harvest_at", { ascending: true })
      .limit(availableSlots);

    if (!readyScopes?.length) {
      return NextResponse.json({
        message: "لا توجد نطاقات جاهزة للحصاد",
        available_slots: availableSlots,
      });
    }

    // 4. Create harvest jobs
    const jobIds: string[] = [];

    for (const scope of readyScopes) {
      const targetFrom = scope.last_harvest_at
        ? new Date(scope.last_harvest_at)
        : new Date(Date.now() - scope.harvest_interval_minutes * 60000);

      const { data: job } = await supabase
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

      if (job) {
        jobIds.push(job.id);

        // Update next harvest time
        await supabase
          .from("ahe_scopes")
          .update({
            next_harvest_at: new Date(
              Date.now() + scope.harvest_interval_minutes * 60000
            ).toISOString(),
          })
          .eq("id", scope.id);

        // Trigger harvest asynchronously
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        fetch(`${baseUrl}/api/admin/crm/harvester/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader || "",
          },
          body: JSON.stringify({ job_id: job.id }),
        }).catch((err) =>
          console.error(`Harvest trigger failed for scope ${scope.code}:`, err)
        );
      }
    }

    return NextResponse.json({
      message: "تم إنشاء عمليات حصاد",
      jobs_created: jobIds.length,
      job_ids: jobIds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ في المجدول", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
