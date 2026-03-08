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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  const { data: customer, error } = await supabase
    .from("crm_customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
  }

  // Fetch activity log
  const { data: activities } = await supabase
    .from("crm_activity_log")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch conversations
  const { data: conversations } = await supabase
    .from("crm_conversations")
    .select("*")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    customer,
    activities: activities || [],
    conversations: conversations || [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  const body = await req.json();

  // If lifecycle_stage is changing, update history
  if (body.lifecycle_stage) {
    const { data: current } = await supabase
      .from("crm_customers")
      .select("lifecycle_stage, lifecycle_history")
      .eq("id", id)
      .single();

    if (current && current.lifecycle_stage !== body.lifecycle_stage) {
      const history = Array.isArray(current.lifecycle_history) ? current.lifecycle_history : [];
      history.push({ stage: body.lifecycle_stage, at: new Date().toISOString() });
      body.lifecycle_history = history;
      body.lifecycle_changed_at = new Date().toISOString();

      // Log activity
      await supabase.from("crm_activity_log").insert({
        customer_id: id,
        activity_type: "lifecycle_change",
        description: `تغيير المرحلة من ${current.lifecycle_stage} إلى ${body.lifecycle_stage}`,
        metadata: { from: current.lifecycle_stage, to: body.lifecycle_stage },
        is_system: false,
      });
    }
  }

  const { data, error } = await supabase
    .from("crm_customers")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("crm_customers")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
