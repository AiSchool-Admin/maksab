import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateAllScores } from "@/lib/crm/scoring";
import type { CrmCustomer } from "@/types/crm";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

interface ImportRow {
  full_name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  account_type?: string;
  governorate?: string;
  city?: string;
  primary_category?: string;
  source?: string;
  source_detail?: string;
  source_platform?: string;
  estimated_competitor_listings?: number;
  tags?: string;
  internal_notes?: string;
  business_name?: string;
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();
  const rows: ImportRow[] = body.rows || [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للاستيراد" }, { status: 400 });
  }

  if (rows.length > 1000) {
    return NextResponse.json({ error: "الحد الأقصى 1000 صف في المرة الواحدة" }, { status: 400 });
  }

  const phoneRegex = /^01[0125]\d{8}$/;
  const results = {
    total: rows.length,
    imported: 0,
    duplicates: 0,
    errors: 0,
    details: [] as { row: number; phone: string; status: string; error?: string }[],
  };

  // Get existing phones in bulk
  const phones = rows.map(r => r.phone?.replace(/[\s-]/g, '')).filter(Boolean);
  const { data: existingCustomers } = await supabase
    .from("crm_customers")
    .select("phone")
    .in("phone", phones);

  const existingPhones = new Set((existingCustomers || []).map(c => c.phone));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const phone = (row.phone || '').replace(/[\s-]/g, '');

    if (!row.full_name || !phone) {
      results.errors++;
      results.details.push({ row: i + 1, phone, status: "error", error: "الاسم والهاتف مطلوبان" });
      continue;
    }

    if (!phoneRegex.test(phone)) {
      results.errors++;
      results.details.push({ row: i + 1, phone, status: "error", error: "رقم هاتف غير صحيح" });
      continue;
    }

    if (existingPhones.has(phone)) {
      results.duplicates++;
      results.details.push({ row: i + 1, phone, status: "duplicate" });
      continue;
    }

    const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const { error } = await supabase.from("crm_customers").insert({
      full_name: row.full_name,
      phone,
      whatsapp: row.whatsapp || phone,
      email: row.email || null,
      account_type: row.account_type || "individual",
      role: "both",
      governorate: row.governorate || null,
      city: row.city || null,
      primary_category: row.primary_category || null,
      source: row.source || "import_csv",
      source_detail: row.source_detail || null,
      source_platform: row.source_platform || null,
      estimated_competitor_listings: row.estimated_competitor_listings || 0,
      tags,
      internal_notes: row.internal_notes || null,
      business_name: row.business_name || null,
      lifecycle_stage: "lead",
      lifecycle_history: [{ stage: "lead", at: new Date().toISOString() }],
    });

    if (error) {
      results.errors++;
      results.details.push({ row: i + 1, phone, status: "error", error: error.message });
    } else {
      results.imported++;
      results.details.push({ row: i + 1, phone, status: "imported" });
      existingPhones.add(phone); // Prevent duplicates within same batch
    }
  }

  return NextResponse.json(results);
}
