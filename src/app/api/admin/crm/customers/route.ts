import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

/**
 * Auto-setup CRM tables by calling the setup endpoint internally.
 * Returns true if setup succeeded.
 */
async function autoSetupCrmTables(): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/crm/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data.table_exists === true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const url = req.nextUrl;

  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const search = url.searchParams.get("search") || "";
  const lifecycle = url.searchParams.get("lifecycle") || "";
  const category = url.searchParams.get("category") || "";
  const source = url.searchParams.get("source") || "";
  const governorate = url.searchParams.get("governorate") || "";
  const accountType = url.searchParams.get("account_type") || "";
  const sortBy = url.searchParams.get("sort_by") || "created_at";
  const sortOrder = url.searchParams.get("sort_order") || "desc";

  const offset = (page - 1) * limit;

  let query = supabase
    .from("crm_customers")
    .select("*", { count: "exact" });

  // Apply filters
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,business_name.ilike.%${search}%`);
  }
  if (lifecycle) {
    query = query.eq("lifecycle_stage", lifecycle);
  }
  if (category) {
    query = query.eq("primary_category", category);
  }
  if (source) {
    query = query.eq("source", source);
  }
  if (governorate) {
    query = query.eq("governorate", governorate);
  }
  if (accountType) {
    query = query.eq("account_type", accountType);
  }

  // Apply sorting
  const ascending = sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    // Check if table doesn't exist
    const isTableMissing =
      (error.message.includes("relation") && error.message.includes("does not exist")) ||
      error.code === "42P01" ||
      (error.message.includes("crm_customers") && !error.message.includes("permission"));
    const isPermissionError = error.message.includes("permission denied") || error.code === "42501";

    if (isTableMissing) {
      // Auto-setup CRM tables silently
      const setupOk = await autoSetupCrmTables();
      if (setupOk) {
        // Retry the query after setup
        const retryQuery = supabase
          .from("crm_customers")
          .select("*", { count: "exact" })
          .order(sortBy, { ascending })
          .range(offset, offset + limit - 1);
        const { data: retryData, error: retryError, count: retryCount } = await retryQuery;
        if (!retryError) {
          return NextResponse.json({
            customers: retryData || [],
            total: retryCount || 0,
            page,
            limit,
            total_pages: Math.ceil((retryCount || 0) / limit),
          });
        }
      }
      // If auto-setup failed, return empty result gracefully
      return NextResponse.json({
        customers: [],
        total: 0,
        page,
        limit,
        total_pages: 1,
      });
    }

    if (isPermissionError) {
      // Return empty result gracefully instead of technical error
      return NextResponse.json({
        customers: [],
        total: 0,
        page,
        limit,
        total_pages: 1,
      });
    }

    // Any other error — return empty result
    return NextResponse.json({
      customers: [],
      total: 0,
      page,
      limit,
      total_pages: 1,
    });
  }

  return NextResponse.json({
    customers: data || [],
    total: count || 0,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();

  // Validate required fields
  if (!body.full_name || !body.phone) {
    return NextResponse.json(
      { error: "الاسم ورقم الهاتف مطلوبان" },
      { status: 400 }
    );
  }

  // Validate Egyptian phone
  const phoneRegex = /^01[0125]\d{8}$/;
  if (!phoneRegex.test(body.phone)) {
    return NextResponse.json(
      { error: "رقم هاتف مصري غير صحيح" },
      { status: 400 }
    );
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from("crm_customers")
    .select("id")
    .eq("phone", body.phone)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "رقم الهاتف مسجل بالفعل", existing_id: existing.id },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("crm_customers")
    .insert({
      full_name: body.full_name,
      phone: body.phone,
      whatsapp: body.whatsapp || body.phone,
      email: body.email || null,
      account_type: body.account_type || "individual",
      role: body.role || "both",
      governorate: body.governorate || null,
      city: body.city || null,
      primary_category: body.primary_category || null,
      secondary_categories: body.secondary_categories || [],
      source: body.source || "cs_agent",
      source_detail: body.source_detail || null,
      source_platform: body.source_platform || null,
      estimated_competitor_listings: body.estimated_competitor_listings || 0,
      tags: body.tags || [],
      internal_notes: body.internal_notes || null,
      business_name: body.business_name || null,
      business_name_ar: body.business_name_ar || null,
      lifecycle_stage: "lead",
      lifecycle_history: [{ stage: "lead", at: new Date().toISOString() }],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabase.from("crm_activity_log").insert({
    customer_id: data.id,
    activity_type: "lifecycle_change",
    description: "تم إنشاء العميل",
    metadata: { from: null, to: "lead", source: body.source || "cs_agent" },
    is_system: true,
  });

  return NextResponse.json({ customer: data }, { status: 201 });
}
