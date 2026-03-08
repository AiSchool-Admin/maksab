import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { calculateAllScores } from "@/lib/crm/scoring";
import type { CrmCustomer } from "@/types/crm";

// POST: Recalculate scores for specific customers or all (paginated, no limit)
export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();
  const customerIds: string[] = body.customer_ids || [];

  // If specific IDs provided, just process those
  if (customerIds.length > 0) {
    const { data: customers, error } = await supabase
      .from("crm_customers")
      .select("*")
      .in("id", customerIds);

    if (error || !customers) {
      return NextResponse.json({ updated: 0, total: 0 });
    }

    let updated = 0;
    for (const customer of customers) {
      const scores = calculateAllScores(customer as CrmCustomer);
      const { error: updateError } = await supabase
        .from("crm_customers")
        .update({ ...scores, scores_updated_at: new Date().toISOString() })
        .eq("id", customer.id);
      if (!updateError) updated++;
    }

    return NextResponse.json({ total: customers.length, updated });
  }

  // Process all customers using cursor-based pagination
  let updated = 0;
  let totalProcessed = 0;
  let lastId: string | null = null;
  const PAGE_SIZE = 200;

  while (true) {
    let query = supabase
      .from("crm_customers")
      .select("*")
      .neq("lifecycle_stage", "blacklisted")
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);

    if (lastId) {
      query = query.gt("id", lastId);
    }

    const { data: customers, error } = await query;

    if (error) {
      if (totalProcessed === 0) {
        return NextResponse.json({ total: 0, updated: 0 });
      }
      break;
    }

    if (!customers || customers.length === 0) break;

    for (const customer of customers) {
      const scores = calculateAllScores(customer as CrmCustomer);
      const { error: updateError } = await supabase
        .from("crm_customers")
        .update({ ...scores, scores_updated_at: new Date().toISOString() })
        .eq("id", customer.id);
      if (!updateError) updated++;
    }

    totalProcessed += customers.length;
    lastId = customers[customers.length - 1].id;

    if (customers.length < PAGE_SIZE) break;
  }

  return NextResponse.json({ total: totalProcessed, updated });
}
