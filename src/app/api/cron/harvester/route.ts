/**
 * Cron Job — مجدول محرك الحصاد
 * يُستدعى كل 10 دقائق بواسطة Vercel Cron
 * يفحص النطاقات الجاهزة وينشئ عمليات حصاد
 * يتخطى النطاقات المحظورة (server_fetch_blocked = true)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // 4. Find ready scopes
    const availableSlots =
      engine.global_max_concurrent_jobs - engine.running_jobs_count;

    const { data: readyScopes } = await supabase
      .from("ahe_scopes")
      .select("*")
      .eq("is_active", true)
      .eq("is_paused", false)
      .or("server_fetch_blocked.eq.false,server_fetch_blocked.is.null")
      .or(
        `next_harvest_at.is.null,next_harvest_at.lte.${now.toISOString()}`
      )
      .order("priority", { ascending: false })
      .order("next_harvest_at", { ascending: true })
      .limit(availableSlots);

    if (!readyScopes?.length) {
      return NextResponse.json({
        message: "لا توجد نطاقات جاهزة للحصاد",
        debug: {
          engine_status: engine.status,
          scopes_found: 0,
        },
      });
    }

    // 5. Create harvest jobs and trigger them
    const jobIds: string[] = [];

    for (const scope of readyScopes) {
      const targetFrom = scope.last_harvest_at
        ? new Date(scope.last_harvest_at)
        : new Date(
            Date.now() - scope.harvest_interval_minutes * 60000
          );

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

        // Trigger harvest asynchronously via internal API
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        fetch(`${baseUrl}/api/admin/crm/harvester/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ job_id: job.id }),
        }).catch((err) =>
          console.error(
            `Harvest trigger failed for scope ${scope.code}:`,
            err
          )
        );
      }
    }

    return NextResponse.json({
      message: "تم إنشاء عمليات حصاد",
      jobs_created: jobIds.length,
      job_ids: jobIds,
      scopes: readyScopes.map((s: any) => s.code),
      debug: {
        engine_status: engine.status,
        scopes_found: readyScopes.length,
      },
    });
  } catch (error) {
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
