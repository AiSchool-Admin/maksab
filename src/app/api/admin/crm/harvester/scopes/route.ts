/**
 * AHE Scopes CRUD API
 * GET  — قائمة النطاقات
 * POST — إنشاء نطاق جديد
 * PUT  — تحديث نطاق
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function GET(req: NextRequest) {
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
    const [{ data: categories }, { data: governorates }, { data: subcategories }] = await Promise.all([
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
      supabase
        .from("ahe_subcategory_mappings")
        .select("*")
        .eq("is_active", true)
        .order("display_order"),
    ]);

    return NextResponse.json({
      scopes: scopes || [],
      categories: categories || [],
      governorates: governorates || [],
      subcategories: subcategories || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
      // Phase 3: Advanced Parameters
      subcategory,
      subcategory_ar,
      price_min,
      price_max,
      product_condition,
      target_seller_type,
      target_listing_type,
      scope_group,
      description,
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
        // Phase 3
        subcategory: subcategory || null,
        subcategory_ar: subcategory_ar || null,
        price_min: price_min || null,
        price_max: price_max || null,
        product_condition: product_condition || null,
        target_seller_type: target_seller_type || "all",
        target_listing_type: target_listing_type || "all",
        scope_group: scope_group || "general",
        description: description || null,
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
      // Phase 3
      "subcategory",
      "subcategory_ar",
      "price_min",
      "price_max",
      "product_condition",
      "target_seller_type",
      "target_listing_type",
      "scope_group",
      "description",
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
