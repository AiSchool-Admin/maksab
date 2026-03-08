import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { determineLifecycleStage, calculateAllScores } from "@/lib/crm/scoring";
import type { CrmCustomer, LifecycleStage } from "@/types/crm";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

// POST: Run auto-lifecycle updates for all customers
export async function POST(_req: NextRequest) {
  const supabase = getServiceClient();

  // Fetch all non-blacklisted customers
  const { data: customers, error } = await supabase
    .from("crm_customers")
    .select("*")
    .neq("lifecycle_stage", "blacklisted")
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let lifecycleUpdated = 0;
  let scoresUpdated = 0;

  for (const customer of (customers || []) as CrmCustomer[]) {
    // Calculate scores
    const scores = calculateAllScores(customer);
    await supabase
      .from("crm_customers")
      .update({ ...scores, scores_updated_at: new Date().toISOString() })
      .eq("id", customer.id);
    scoresUpdated++;

    // Check lifecycle change
    const newStage = determineLifecycleStage(customer);
    if (newStage && newStage !== customer.lifecycle_stage) {
      const history = Array.isArray(customer.lifecycle_history) ? customer.lifecycle_history : [];
      history.push({ stage: newStage as LifecycleStage, at: new Date().toISOString() });

      await supabase
        .from("crm_customers")
        .update({
          lifecycle_stage: newStage,
          lifecycle_changed_at: new Date().toISOString(),
          lifecycle_history: history,
        })
        .eq("id", customer.id);

      // Log the change
      await supabase.from("crm_activity_log").insert({
        customer_id: customer.id,
        activity_type: "lifecycle_change",
        description: `تحديث تلقائي: ${customer.lifecycle_stage} → ${newStage}`,
        metadata: { from: customer.lifecycle_stage, to: newStage, reason: "auto_update" },
        is_system: true,
      });

      lifecycleUpdated++;
    }
  }

  return NextResponse.json({
    total_customers: customers?.length || 0,
    scores_updated: scoresUpdated,
    lifecycle_updated: lifecycleUpdated,
  });
}
