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

// POST: Recalculate scores for specific customers or all
export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();
  const customerIds: string[] = body.customer_ids || [];

  let query = supabase
    .from("crm_customers")
    .select("*")
    .neq("lifecycle_stage", "blacklisted");

  if (customerIds.length > 0) {
    query = query.in("id", customerIds);
  }

  const { data: customers, error } = await query.limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  for (const customer of (customers || [])) {
    const scores = calculateAllScores(customer as CrmCustomer);
    const { error: updateError } = await supabase
      .from("crm_customers")
      .update({
        ...scores,
        scores_updated_at: new Date().toISOString(),
      })
      .eq("id", customer.id);

    if (!updateError) updated++;
  }

  return NextResponse.json({
    total: customers?.length || 0,
    updated,
  });
}
