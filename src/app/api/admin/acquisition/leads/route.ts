/**
 * /api/admin/acquisition/leads
 *
 * GET  — List leads with filtering and pagination
 * POST — Create a new lead manually
 * PATCH — Update lead status
 *
 * Admin-only endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth/require-auth";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin" || data?.role === "super_admin";
}

// ── GET — List leads ─────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (!(await isAdmin(auth.userId))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const supabase = getServiceClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const tier = searchParams.get("tier");
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("acquisition_leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (source) query = query.eq("source", source);
  if (tier) query = query.eq("seller_tier", tier);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,notes.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// ── POST — Create lead ──────────────────────────────

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (!(await isAdmin(auth.userId))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const supabase = getServiceClient();

  try {
    const body = await request.json();
    const { phone, name, source, categories, seller_tier, governorate, city, notes } =
      body;

    if (!phone) {
      return NextResponse.json(
        { error: "رقم الهاتف مطلوب" },
        { status: 400 }
      );
    }

    // Validate phone
    const cleaned = phone.replace(/[\s\-\(\)\.+]/g, "");
    let normalized = cleaned;
    if (normalized.startsWith("+2")) normalized = normalized.slice(2);
    if (normalized.startsWith("002")) normalized = normalized.slice(3);

    if (!/^01[0125]\d{8}$/.test(normalized)) {
      return NextResponse.json(
        { error: "رقم هاتف غير صالح" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("acquisition_leads")
      .insert({
        phone: normalized,
        name: name || null,
        source: source || "manual",
        categories: categories || [],
        seller_tier: seller_tier || "bronze",
        seller_score: 0,
        governorate: governorate || null,
        city: city || null,
        notes: notes || null,
        status: "new",
        imported_by: "admin-api",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "الرقم ده موجود بالفعل في النظام" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
}

// ── PATCH — Update lead status ───────────────────────

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.userId) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (!(await isAdmin(auth.userId))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const supabase = getServiceClient();

  try {
    const body = await request.json();
    const { id, status: newStatus, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "معرف الـ lead مطلوب" }, { status: 400 });
    }

    const validStatuses = [
      "new",
      "contacted",
      "interested",
      "registered",
      "active_seller",
      "declined",
      "blacklist",
    ];

    if (newStatus && !validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (newStatus) {
      updates.status = newStatus;
      if (newStatus === "contacted") updates.contacted_at = new Date().toISOString();
    }
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from("acquisition_leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: data });
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
}
