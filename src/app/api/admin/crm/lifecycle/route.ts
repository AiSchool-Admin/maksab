import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";
import { determineLifecycleStage, calculateAllScores } from "@/lib/crm/scoring";
import type { CrmCustomer, LifecycleStage } from "@/types/crm";

// POST: Run auto-lifecycle updates for all customers (paginated, no limit)
export async function POST(_req: NextRequest) {
  const supabase = getServiceClient();

  let lifecycleUpdated = 0;
  let scoresUpdated = 0;
  let totalProcessed = 0;
  let lastId: string | null = null;
  const PAGE_SIZE = 200;

  // Process all customers using cursor-based pagination (no hard limit)
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
        // First page failed — tables may not exist
        return NextResponse.json({ total_customers: 0, scores_updated: 0, lifecycle_updated: 0 });
      }
      break;
    }

    if (!customers || customers.length === 0) break;

    for (const customer of customers as CrmCustomer[]) {
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
        const history = Array.isArray(customer.lifecycle_history) ? [...customer.lifecycle_history] : [];
        history.push({ stage: newStage as LifecycleStage, at: new Date().toISOString() });

        await supabase
          .from("crm_customers")
          .update({
            lifecycle_stage: newStage,
            lifecycle_changed_at: new Date().toISOString(),
            lifecycle_history: history,
          })
          .eq("id", customer.id);

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

    totalProcessed += customers.length;
    lastId = customers[customers.length - 1].id;

    if (customers.length < PAGE_SIZE) break;
  }

  return NextResponse.json({
    total_customers: totalProcessed,
    scores_updated: scoresUpdated,
    lifecycle_updated: lifecycleUpdated,
  });
}
