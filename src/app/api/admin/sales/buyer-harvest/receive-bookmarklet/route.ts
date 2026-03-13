import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseBuyerPost, detectCategory } from "@/lib/buyer-harvester/parser";
import { classifyBuyer } from "@/lib/buyer-harvester/classifier";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/admin/sales/buyer-harvest/receive-bookmarklet
 * Receives buyer data from the Facebook Groups bookmarklet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buyers: rawBuyers, groupName, groupUrl, source } = body;

    if (!rawBuyers || !Array.isArray(rawBuyers) || rawBuyers.length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات مشترين" }, { status: 400 });
    }

    const supabase = getSupabase();
    let saved = 0;
    let newCount = 0;
    let phonesCount = 0;

    for (const raw of rawBuyers) {
      const text = raw.text || "";

      // Parse buyer post
      const parsed = parseBuyerPost(
        {
          text,
          authorName: raw.authorName,
          authorProfileUrl: raw.authorProfileUrl,
          groupName: groupName || raw.groupName,
          url: raw.url || groupUrl,
          timestamp: raw.timestamp,
        },
        "facebook_group"
      );

      if (!parsed) continue;

      // Classify
      const classification = classifyBuyer({
        buyer_phone: parsed.buyer_phone,
        product_wanted: parsed.product_wanted,
        budget_min: parsed.budget_min,
        budget_max: parsed.budget_max,
        governorate: parsed.governorate,
        condition_wanted: parsed.condition_wanted,
        source: "facebook_group",
        category: parsed.category,
      });

      // Insert
      const { error } = await supabase.from("bhe_buyers").insert({
        source: "facebook_group",
        source_url: parsed.source_url,
        source_group_name: parsed.source_group_name,
        source_platform: "facebook",
        buyer_name: parsed.buyer_name,
        buyer_phone: parsed.buyer_phone,
        buyer_profile_url: parsed.buyer_profile_url,
        product_wanted: parsed.product_wanted,
        category: parsed.category,
        subcategory: parsed.subcategory,
        condition_wanted: parsed.condition_wanted,
        budget_min: parsed.budget_min,
        budget_max: parsed.budget_max,
        governorate: parsed.governorate,
        city: parsed.city,
        original_text: parsed.original_text,
        buyer_tier: classification.tier,
        buyer_score: classification.score,
        estimated_purchase_value: classification.estimated_purchase_value,
        pipeline_status: parsed.buyer_phone ? "phone_found" : "discovered",
        posted_at: parsed.posted_at,
        harvested_at: parsed.harvested_at,
      });

      if (!error) {
        saved++;
        newCount++;
        if (parsed.buyer_phone) phonesCount++;
      }
    }

    // Update/create Facebook group record
    if (groupUrl) {
      const { data: existingGroup } = await supabase
        .from("bhe_facebook_groups")
        .select("id, total_harvests, total_buyers_found, total_phones_found")
        .eq("group_url", groupUrl)
        .single();

      if (existingGroup) {
        await supabase
          .from("bhe_facebook_groups")
          .update({
            total_harvests: (existingGroup.total_harvests || 0) + 1,
            total_buyers_found: (existingGroup.total_buyers_found || 0) + saved,
            total_phones_found: (existingGroup.total_phones_found || 0) + phonesCount,
            last_harvest_at: new Date().toISOString(),
          })
          .eq("id", existingGroup.id);
      } else {
        await supabase.from("bhe_facebook_groups").insert({
          group_name: groupName || "Unknown Group",
          group_url: groupUrl,
          total_harvests: 1,
          total_buyers_found: saved,
          total_phones_found: phonesCount,
          last_harvest_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      saved,
      new_count: newCount,
      phones: phonesCount,
      total_received: rawBuyers.length,
    });
  } catch (err: any) {
    console.error("[BHE Bookmarklet] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
