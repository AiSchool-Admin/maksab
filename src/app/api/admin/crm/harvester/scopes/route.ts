/**
 * AHE Scopes CRUD API
 * GET  — قائمة النطاقات
 * POST — إنشاء نطاق جديد
 * PUT  — تحديث نطاق
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest, getServiceClient } from "@/lib/crm/auth";

export async function GET(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const supabase = getServiceClient();

  try {
    const { data: scopes, error } = await supabase
      .from("ahe_scopes")
      .select("*")
      .order("priority", { ascending: false })
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get category and governorate mappings for the wizard
    const [{ data: categories }, { data: governorates }] = await Promise.all([
      supabase
        .from("ahe_category_mappings")
        .select("*")
        .eq("is_active", true)
        .order("maksab_category_ar"),
      supabase
        .from("ahe_governorate_mappings")
        .select("*")
        .eq("is_active", true)
        .order("estimated_daily_listings", { ascending: false }),
    ]);

    return NextResponse.json({
      scopes: scopes || [],
      categories: categories || [],
      governorates: governorates || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const supabase = getServiceClient();

  try {
    const body = await req.json();

    const {
      name,
      code,
      source_platform,
      maksab_category,
      governorate,
      city,
      base_url,
      harvest_interval_minutes,
      max_pages_per_harvest,
      priority,
      delay_between_requests_ms,
      detail_fetch_enabled,
    } = body;

    if (!name || !code || !source_platform || !maksab_category || !governorate || !base_url) {
      return NextResponse.json(
        { error: "الحقول المطلوبة: name, code, source_platform, maksab_category, governorate, base_url" },
        { status: 400 }
      );
    }

    const { data: scope, error } = await supabase
      .from("ahe_scopes")
      .insert({
        name,
        code,
        source_platform,
        maksab_category,
        governorate,
        city: city || null,
        base_url,
        harvest_interval_minutes: harvest_interval_minutes || 60,
        max_pages_per_harvest: max_pages_per_harvest || 5,
        priority: priority || 5,
        delay_between_requests_ms: delay_between_requests_ms || 5000,
        detail_fetch_enabled: detail_fetch_enabled !== false,
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scope, message: "تم إنشاء النطاق" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  const supabase = getServiceClient();

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
    }

    // Only allow updating safe fields
    const allowedFields = [
      "name",
      "harvest_interval_minutes",
      "max_pages_per_harvest",
      "delay_between_requests_ms",
      "detail_fetch_enabled",
      "detail_delay_between_requests_ms",
      "priority",
      "listing_max_age_days",
      "listing_not_seen_hours",
    ];

    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }
    safeUpdates.updated_at = new Date().toISOString();

    const { data: scope, error } = await supabase
      .from("ahe_scopes")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scope, message: "تم تحديث النطاق" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
