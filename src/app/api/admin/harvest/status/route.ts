/**
 * GET /api/admin/harvest/status?scope=DUB-CAR-ALEX
 * فحص حالة نطاق حصاد معين — يرجع تفاصيل شاملة
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const scopeCode = req.nextUrl.searchParams.get("scope");

  if (!scopeCode) {
    return NextResponse.json(
      { error: "مطلوب تحديد كود النطاق — ?scope=DUB-CAR-ALEX" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  try {
    // 1. Get scope details
    const { data: scope, error: scopeError } = await supabase
      .from("ahe_scopes")
      .select("*")
      .eq("code", scopeCode)
      .single();

    if (scopeError || !scope) {
      return NextResponse.json(
        { error: `النطاق "${scopeCode}" غير موجود` },
        { status: 404 }
      );
    }

    // 2. Get sellers count with phone for this platform+governorate
    const [sellersWithPhoneRes, sellersTotalRes, lastJobRes] = await Promise.all([
      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("source_platform", scope.source_platform)
        .ilike("primary_governorate", `%${scope.governorate?.replace("ال", "")}%`)
        .not("phone", "is", null),

      supabase
        .from("ahe_sellers")
        .select("id", { count: "exact", head: true })
        .eq("source_platform", scope.source_platform)
        .ilike("primary_governorate", `%${scope.governorate?.replace("ال", "")}%`),

      supabase
        .from("ahe_harvest_jobs")
        .select("*")
        .eq("scope_id", scope.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Determine status
    let status: "healthy" | "paused" | "failing" = "healthy";
    if (scope.is_paused || !scope.is_active) {
      status = "paused";
    } else if ((scope.consecutive_failures || 0) >= 3) {
      status = "failing";
    }

    return NextResponse.json({
      scope: scope.code,
      platform: scope.source_platform,
      category: scope.maksab_category,
      governorate: scope.governorate,
      priority: scope.priority,
      harvest_interval_minutes: scope.harvest_interval_minutes,
      last_harvest_at: scope.last_harvest_at || null,
      total_listings: scope.total_listings_found || 0,
      total_sellers: sellersTotalRes.count || 0,
      sellers_with_phone: sellersWithPhoneRes.count || 0,
      last_harvest_new_listings: scope.last_harvest_new_listings || 0,
      last_harvest_new_sellers: scope.last_harvest_new_sellers || 0,
      consecutive_failures: scope.consecutive_failures || 0,
      server_fetch_blocked: scope.server_fetch_blocked || false,
      status,
      last_job: lastJobRes.data
        ? {
            id: lastJobRes.data.id,
            status: lastJobRes.data.status,
            listings_new: lastJobRes.data.listings_new,
            sellers_new: lastJobRes.data.sellers_new,
            phones_extracted: lastJobRes.data.phones_extracted,
            duration_seconds: lastJobRes.data.duration_seconds,
            created_at: lastJobRes.data.created_at,
            errors: lastJobRes.data.errors,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطأ في فحص النطاق",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
