import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { calculateAllScores } from "@/lib/crm/scoring";
import type { CrmCustomer } from "@/types/crm";

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

  // Prepare valid rows for batch insert
  const validRows: Record<string, unknown>[] = [];
  const validRowIndexes: number[] = [];

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

    // Mark as seen to prevent duplicates within same batch
    existingPhones.add(phone);

    const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const customerData = {
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
    };

    // Calculate scores for new customer
    const scores = calculateAllScores(customerData as unknown as CrmCustomer);

    validRows.push({
      ...customerData,
      ...scores,
      scores_updated_at: new Date().toISOString(),
    });
    validRowIndexes.push(i);
  }

  // Batch insert in chunks of 50
  const BATCH_SIZE = 50;
  for (let b = 0; b < validRows.length; b += BATCH_SIZE) {
    const batch = validRows.slice(b, b + BATCH_SIZE);
    const batchIndexes = validRowIndexes.slice(b, b + BATCH_SIZE);

    const { data: inserted, error } = await supabase
      .from("crm_customers")
      .insert(batch)
      .select("id");

    if (error) {
      // If batch fails, try individual inserts as fallback
      for (let j = 0; j < batch.length; j++) {
        const { error: singleError } = await supabase
          .from("crm_customers")
          .insert(batch[j]);

        const phone = (batch[j].phone as string) || '';
        if (singleError) {
          results.errors++;
          results.details.push({ row: batchIndexes[j] + 1, phone, status: "error", error: singleError.message });
        } else {
          results.imported++;
          results.details.push({ row: batchIndexes[j] + 1, phone, status: "imported" });
        }
      }
    } else {
      // Batch succeeded
      results.imported += (inserted || batch).length;
      for (const idx of batchIndexes) {
        const phone = (rows[idx].phone || '').replace(/[\s-]/g, '');
        results.details.push({ row: idx + 1, phone, status: "imported" });
      }
    }
  }

  return NextResponse.json(results);
}
