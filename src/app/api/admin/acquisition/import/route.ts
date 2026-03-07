/**
 * POST /api/admin/acquisition/import
 *
 * Bulk import leads via API (alternative to CLI script).
 * Accepts JSON array of leads.
 * Admin-only endpoint.
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

const PHONE_REGEX = /^01[0125]\d{8}$/;
const VALID_SOURCES = [
  "olx", "facebook", "marketplace", "manual", "referral",
  "instagram", "tiktok", "whatsapp_group", "store_visit",
];

interface LeadInput {
  phone: string;
  name?: string;
  source?: string;
  source_profile_url?: string;
  categories?: string[];
  active_ads_count?: number;
  seller_score?: number;
  seller_tier?: string;
  governorate?: string;
  city?: string;
  notes?: string;
}

function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)\.+]/g, "");
  let normalized = cleaned;
  if (normalized.startsWith("+2")) normalized = normalized.slice(2);
  if (normalized.startsWith("002")) normalized = normalized.slice(3);
  if (normalized.startsWith("2") && normalized.length === 12)
    normalized = normalized.slice(1);
  return PHONE_REGEX.test(normalized) ? normalized : null;
}

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
    const leads: LeadInput[] = Array.isArray(body)
      ? body
      : body.sellers || body.leads || [];

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "لا توجد بيانات للإدخال" },
        { status: 400 }
      );
    }

    if (leads.length > 500) {
      return NextResponse.json(
        { error: "الحد الأقصى 500 سجل في المرة الواحدة" },
        { status: 400 }
      );
    }

    const batchId = `api_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${Date.now().toString(36)}`;

    let imported = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;
    const errors: Array<{ phone: string; reason: string }> = [];

    // Get existing phones for dedup
    const allPhones = leads
      .map((l) => normalizePhone(l.phone))
      .filter(Boolean) as string[];

    const existingPhones = new Set<string>();
    for (let i = 0; i < allPhones.length; i += 100) {
      const batch = allPhones.slice(i, i + 100);
      const { data } = await supabase
        .from("acquisition_leads")
        .select("phone")
        .in("phone", batch);
      if (data) data.forEach((d: { phone: string }) => existingPhones.add(d.phone));
    }

    // Process leads
    const validRows: Record<string, unknown>[] = [];

    for (const lead of leads) {
      const phone = normalizePhone(lead.phone);
      if (!phone) {
        skippedInvalid++;
        errors.push({ phone: lead.phone, reason: "رقم غير صالح" });
        continue;
      }

      if (existingPhones.has(phone)) {
        skippedDuplicate++;
        continue;
      }

      const source = (lead.source || "manual").toLowerCase();
      if (!VALID_SOURCES.includes(source)) {
        skippedInvalid++;
        errors.push({ phone, reason: `مصدر غير معروف: ${lead.source}` });
        continue;
      }

      existingPhones.add(phone); // Prevent duplicates within batch

      validRows.push({
        phone,
        name: lead.name || null,
        source,
        source_profile_url: lead.source_profile_url || null,
        categories: lead.categories || [],
        active_ads_count: Math.max(lead.active_ads_count || 0, 0),
        seller_score: Math.min(Math.max(lead.seller_score || 0, 0), 50),
        seller_tier: lead.seller_tier || "bronze",
        governorate: lead.governorate || null,
        city: lead.city || null,
        notes: lead.notes || null,
        status: "new",
        batch_id: batchId,
        imported_by: "api-import",
      });
    }

    // Insert in batches of 50
    for (let i = 0; i < validRows.length; i += 50) {
      const batch = validRows.slice(i, i + 50);
      const { error } = await supabase.from("acquisition_leads").insert(batch);

      if (error) {
        // Try one by one
        for (const row of batch) {
          const { error: singleErr } = await supabase
            .from("acquisition_leads")
            .insert(row);
          if (singleErr) {
            errors.push({
              phone: row.phone as string,
              reason: singleErr.message,
            });
          } else {
            imported++;
          }
        }
      } else {
        imported += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      batchId,
      total: leads.length,
      imported,
      skippedInvalid,
      skippedDuplicate,
      errors: errors.slice(0, 50), // Limit error details
    });
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
}
