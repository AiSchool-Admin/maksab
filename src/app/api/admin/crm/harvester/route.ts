/**
 * AHE Engine Control API
 * GET  — حالة المحرك والإحصائيات
 * POST — تحكم (تشغيل/إيقاف/إيقاف مؤقت) + تحكم بالنطاقات
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    // Get engine status
    const { data: engineStatus, error: statusError } = await supabase
      .from("ahe_engine_status")
      .select("*")
      .eq("id", 1)
      .single();

    if (statusError) {
      // Check if it's a missing table or RLS/permission issue
      const isAccessDenied = statusError.message?.includes("permission denied")
        || statusError.code === "42501"
        || statusError.code === "PGRST301";
      const isTableMissing = statusError.message?.includes("relation")
        && statusError.message?.includes("does not exist")
        || statusError.message?.includes("schema cache")
        || statusError.code === "42P01"
        || statusError.code === "PGRST204";
      const isNoRows = statusError.code === "PGRST116";

      if (isAccessDenied || isTableMissing || isNoRows) {
        return NextResponse.json(
          {
            error: "تحتاج لإعداد مفتاح الخدمة",
            setup_required: true,
            details: !process.env.SUPABASE_SERVICE_ROLE_KEY
              ? "SUPABASE_SERVICE_ROLE_KEY غير مُعرّف — أضفه في متغيرات البيئة"
              : isTableMissing
                ? "جداول محرك الحصاد غير موجودة — شغّل الـ migration رقم 00039"
                : statusError.message
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: "فشل في جلب حالة المحرك", details: statusError.message },
        { status: 500 }
      );
    }

    // Get today's metrics
    const today = new Date().toISOString().split("T")[0];
    const { data: dailyMetrics } = await supabase
      .from("ahe_daily_metrics")
      .select("*")
      .eq("metric_date", today)
      .maybeSingle();

    // Get ALL scopes (no filter — so we can compute breakdown)
    const { data: scopes } = await supabase
      .from("ahe_scopes")
      .select("*")
      .order("priority", { ascending: false })
      .order("name");

    const allScopes = scopes || [];

    // Compute scopes breakdown
    const scopesBreakdown = {
      total: allScopes.length,
      active: allScopes.filter((s) => s.is_active && !s.is_paused && !s.server_fetch_blocked).length,
      paused: allScopes.filter((s) => s.is_active && s.is_paused).length,
      blocked: allScopes.filter((s) => s.server_fetch_blocked).length,
      inactive: allScopes.filter((s) => !s.is_active).length,
    };

    // Get recent jobs
    const { data: recentJobs } = await supabase
      .from("ahe_harvest_jobs")
      .select("*, ahe_scopes(name, code)")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      engine: engineStatus,
      daily_metrics: dailyMetrics || {
        total_harvests: 0,
        total_listings_new: 0,
        total_sellers_new: 0,
        total_phones_extracted: 0,
        total_auto_queued: 0,
      },
      active_scopes_count: scopesBreakdown.active,
      scopes_breakdown: scopesBreakdown,
      recent_jobs: recentJobs || [],
      scopes: allScopes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ في الخادم", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    const body = await req.json();
    const { action, scope_id, reason } = body;

    const validActions = [
      "start",
      "pause",
      "stop",
      "pause_scope",
      "resume_scope",
      "activate_scope",
      "deactivate_scope",
      "test_scope",
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `إجراء غير صالح: ${action}` },
        { status: 400 }
      );
    }

    switch (action) {
      case "start": {
        await supabase
          .from("ahe_engine_status")
          .update({
            status: "running",
            status_changed_at: new Date().toISOString(),
            status_reason: reason || "تشغيل بواسطة المدير",
            consecutive_errors: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        return NextResponse.json({ message: "تم تشغيل المحرك" });
      }

      case "pause": {
        await supabase
          .from("ahe_engine_status")
          .update({
            status: "paused",
            status_changed_at: new Date().toISOString(),
            status_reason: reason || "إيقاف مؤقت بواسطة المدير",
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        return NextResponse.json({ message: "تم إيقاف المحرك مؤقتاً" });
      }

      case "stop": {
        await supabase
          .from("ahe_engine_status")
          .update({
            status: "stopped",
            status_changed_at: new Date().toISOString(),
            status_reason: reason || "إيقاف كامل بواسطة المدير",
            running_jobs_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);

        return NextResponse.json({ message: "تم إيقاف المحرك" });
      }

      case "pause_scope": {
        if (!scope_id)
          return NextResponse.json({ error: "scope_id مطلوب" }, { status: 400 });

        await supabase
          .from("ahe_scopes")
          .update({
            is_paused: true,
            pause_reason: reason || "إيقاف مؤقت بواسطة المدير",
            updated_at: new Date().toISOString(),
          })
          .eq("id", scope_id);

        return NextResponse.json({ message: "تم إيقاف النطاق مؤقتاً" });
      }

      case "resume_scope": {
        if (!scope_id)
          return NextResponse.json({ error: "scope_id مطلوب" }, { status: 400 });

        await supabase
          .from("ahe_scopes")
          .update({
            is_paused: false,
            pause_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", scope_id);

        return NextResponse.json({ message: "تم استئناف النطاق" });
      }

      case "activate_scope": {
        if (!scope_id)
          return NextResponse.json({ error: "scope_id مطلوب" }, { status: 400 });

        await supabase
          .from("ahe_scopes")
          .update({
            is_active: true,
            is_paused: false,
            pause_reason: null,
            next_harvest_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", scope_id);

        return NextResponse.json({ message: "تم تفعيل النطاق" });
      }

      case "deactivate_scope": {
        if (!scope_id)
          return NextResponse.json({ error: "scope_id مطلوب" }, { status: 400 });

        await supabase
          .from("ahe_scopes")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", scope_id);

        return NextResponse.json({ message: "تم إلغاء تفعيل النطاق" });
      }

      case "test_scope": {
        if (!scope_id)
          return NextResponse.json({ error: "scope_id مطلوب" }, { status: 400 });

        const { data: scope } = await supabase
          .from("ahe_scopes")
          .select("*")
          .eq("id", scope_id)
          .single();

        if (!scope) {
          return NextResponse.json({ error: "النطاق غير موجود" }, { status: 404 });
        }

        // Create a test harvest job
        const { data: testJob } = await supabase
          .from("ahe_harvest_jobs")
          .insert({
            scope_id: scope_id,
            target_from: new Date(
              Date.now() - scope.harvest_interval_minutes * 60000
            ).toISOString(),
            target_to: new Date().toISOString(),
            status: "pending",
            current_step: "في الانتظار",
          })
          .select()
          .single();

        if (!testJob) {
          return NextResponse.json(
            { error: "فشل في إنشاء عملية الاختبار" },
            { status: 500 }
          );
        }

        // Trigger harvest asynchronously via internal API
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        fetch(`${baseUrl}/api/admin/crm/harvester/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("authorization") || "",
          },
          body: JSON.stringify({ job_id: testJob.id }),
        }).catch((err) => console.error("Test harvest trigger failed:", err));

        return NextResponse.json({
          message: "تم إنشاء عملية اختبار",
          job_id: testJob.id,
        });
      }

      default:
        return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ في الخادم", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
