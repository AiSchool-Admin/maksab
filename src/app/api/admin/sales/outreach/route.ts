import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase config");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CATEGORY_AR: Record<string, string> = {
  phones: "موبايل", vehicles: "عربية", cars: "عربية",
  properties: "شقة", real_estate: "شقة",
  electronics: "جهاز", furniture: "أثاث", fashion: "ملابس",
  gold: "ذهب", luxury: "منتج فاخر", appliances: "جهاز",
  hobbies: "منتج", tools: "عدة", services: "خدمة", scrap: "خردة",
};

function fillTemplate(template: string, seller: any): string {
  let name = seller.name || "يا باشا";
  // Add space between "وكالة" and following name if missing
  name = name.replace(/^وكالة(?=[A-Za-z\u0621-\u064A])/, 'وكالة ');
  const category = seller.primary_category || "إعلانات";
  const catLabel = CATEGORY_AR[category] || "منتج";
  const relatedCount = seller.total_listings_seen ? Math.max(seller.total_listings_seen * 10, 50) : 50;
  const product = seller.primary_category || "إعلانك";

  return template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{product\}\}/g, product)
    .replace(/\{\{category\}\}/g, category)
    .replace(/\{\{category_ar\}\}/g, catLabel)
    .replace(/\{\{count\}\}/g, String(relatedCount));
}

// GET: Fetch sellers for outreach with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const tab = searchParams.get("tab") || "new"; // new | followup | interested | stats
    const tier = searchParams.get("tier") || "all";
    const category = searchParams.get("category") || "all";
    const governorate = searchParams.get("governorate") || "all";
    const status = searchParams.get("status") || "all";
    const dailyTarget = parseInt(searchParams.get("dailyTarget") || "50");
    const templateId = searchParams.get("templateId") || null;
    const limit = parseInt(searchParams.get("limit") || "50");

    // Fetch templates
    const { data: templates } = await supabase
      .from("outreach_templates")
      .select("*")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("usage_count", { ascending: false });

    // Count today's outreach progress
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const { count: sentToday } = await supabase
      .from("outreach_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "sent")
      .gte("created_at", todayISO);

    const { count: skippedToday } = await supabase
      .from("outreach_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "skipped")
      .gte("created_at", todayISO);

    if (tab === "stats") {
      return await getStats(supabase, todayISO);
    }

    // Build query based on tab
    let query = supabase
      .from("ahe_sellers")
      .select("id, name, phone, priority_score, whale_score, seller_tier, total_listings_seen, active_listings, primary_governorate, primary_category, pipeline_status, is_business, is_verified, first_outreach_at, last_outreach_at, last_response_at, outreach_count, notes, rejection_reason, skip_reason, last_outreach_template, buy_probability, buy_probability_score")
      .not("phone", "is", null);

    if (tab === "new") {
      // New: not yet contacted
      if (status === "all" || status === "new") {
        query = query.in("pipeline_status", ["phone_found", "discovered"]);
      } else if (status === "contacted") {
        query = query.eq("pipeline_status", "contacted");
      } else if (status === "no_response") {
        query = query.eq("pipeline_status", "contacted")
          .lt("last_outreach_at", new Date(Date.now() - 48 * 3600000).toISOString());
      }
    } else if (tab === "followup") {
      // Follow-up: contacted > 48h ago OR considering > 72h ago, max 3 outreach attempts
      const hours48ago = new Date(Date.now() - 48 * 3600000).toISOString();
      const hours72ago = new Date(Date.now() - 72 * 3600000).toISOString();
      query = query
        .lt("outreach_count", 3)
        .or(`and(pipeline_status.eq.contacted,last_outreach_at.lt.${hours48ago}),and(pipeline_status.eq.considering,last_response_at.lt.${hours72ago})`);
    } else if (tab === "interested") {
      query = query.in("pipeline_status", ["interested", "considering"]);
    }

    // Apply filters
    if (tier !== "all") query = query.eq("seller_tier", tier);
    if (category !== "all") query = query.eq("primary_category", category);
    if (governorate !== "all") query = query.eq("primary_governorate", governorate);

    query = query
      .order("whale_score", { ascending: false })
      .order("buy_probability_score", { ascending: false })
      .limit(limit);

    const { data: sellers, error } = await query;

    if (error) {
      console.error("Outreach fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pick appropriate template
    let selectedTemplate = templates?.find((t: any) => t.id === templateId);
    if (!selectedTemplate && templates?.length) {
      selectedTemplate = templates.find((t: any) => t.is_default) || templates[0];
    }

    const contacts = (sellers || []).map((s: any) => {
      const listingCount = s.total_listings_seen || s.active_listings || 0;
      const whaleScore = s.whale_score || 0;
      const sellerTier = s.seller_tier || "small_fish";

      // Choose tier-appropriate template
      let tplForSeller = selectedTemplate;
      if (!templateId && templates?.length) {
        if (sellerTier === "whale") {
          tplForSeller = templates.find((t: any) => t.target_tier === "whale") || selectedTemplate;
        }
        if (tab === "followup") {
          tplForSeller = templates.find((t: any) => t.name === "followup_48h") || selectedTemplate;
        }
      }

      const message = tplForSeller
        ? fillTemplate(tplForSeller.message_text, s)
        : fillTemplate(
            "السلام عليكم {{name}} 👋\nشفنا {{product}} بتاعك على دوبيزل.\nسجّل مجاناً على مكسب: https://maksab.app/join",
            s
          );

      return {
        id: s.id,
        name: s.name || "بائع بدون اسم",
        phone: s.phone,
        score: whaleScore,
        sellerTier,
        isWhale: sellerTier === "whale" || sellerTier === "big_fish",
        listingCount,
        location: s.primary_governorate || "غير محدد",
        category: s.primary_category || "عام",
        pipelineStatus: s.pipeline_status,
        outreachCount: s.outreach_count || 0,
        lastOutreachAt: s.last_outreach_at,
        lastResponseAt: s.last_response_at,
        notes: s.notes,
        rejectionReason: s.rejection_reason,
        templateId: tplForSeller?.id,
        message,
      };
    });

    // Tier counts for filter badges
    const { data: tierCounts } = await supabase.rpc("get_outreach_tier_counts").maybeSingle();

    return NextResponse.json({
      progress: {
        sent: sentToday || 0,
        skipped: skippedToday || 0,
        remaining: contacts.filter((c: any) => !["contacted", "interested", "rejected", "exhausted"].includes(c.pipelineStatus)).length,
        target: dailyTarget,
      },
      contacts,
      templates: templates || [],
      tierCounts: tierCounts || {},
    });
  } catch (err: any) {
    console.error("Outreach API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Update seller status (sent, skipped, interested, considering, rejected)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { sellerId, action, templateId, notes, reason } = body;

    if (!sellerId || !action) {
      return NextResponse.json({ error: "sellerId and action required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: now };

    switch (action) {
      case "sent":
        updates.pipeline_status = "contacted";
        updates.last_outreach_at = now;
        updates.last_outreach_template = templateId || null;
        // Use raw SQL for increment to avoid race conditions
        break;
      case "skipped":
        updates.pipeline_status = "skipped";
        updates.skip_reason = reason || null;
        break;
      case "interested":
        updates.pipeline_status = "interested";
        updates.last_response_at = now;
        break;
      case "considering":
        updates.pipeline_status = "considering";
        updates.last_response_at = now;
        break;
      case "rejected":
        updates.pipeline_status = "rejected";
        updates.rejection_reason = reason || null;
        updates.last_response_at = now;
        break;
      case "registered":
        updates.pipeline_status = "registered";
        break;
      case "note":
        updates.notes = notes || null;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update seller
    const { error: updateError } = await supabase
      .from("ahe_sellers")
      .update(updates)
      .eq("id", sellerId);

    if (updateError) {
      console.error("Update seller error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Increment outreach_count for sent action
    if (action === "sent") {
      await supabase.rpc("increment_outreach_count", { p_seller_id: sellerId });
    }

    // Log the action
    if (action !== "note") {
      await supabase.from("outreach_logs").insert({
        seller_id: sellerId,
        template_id: templateId || null,
        action,
        notes: notes || reason || null,
      });
    }

    // Increment template usage count
    if (templateId && action === "sent") {
      await supabase.rpc("increment_template_usage", { p_template_id: templateId });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Outreach POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getStats(supabase: any, todayISO: string) {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Today's stats
  const { count: sentToday } = await supabase
    .from("outreach_logs").select("*", { count: "exact", head: true })
    .eq("action", "sent").gte("created_at", todayISO);

  // Week stats
  const { count: sentWeek } = await supabase
    .from("outreach_logs").select("*", { count: "exact", head: true })
    .eq("action", "sent").gte("created_at", weekAgo);

  // Month stats
  const { count: sentMonth } = await supabase
    .from("outreach_logs").select("*", { count: "exact", head: true })
    .eq("action", "sent").gte("created_at", monthAgo);

  // Response rates
  const { count: totalSent } = await supabase
    .from("ahe_sellers").select("*", { count: "exact", head: true })
    .in("pipeline_status", ["contacted", "interested", "considering", "rejected", "registered", "exhausted"]);

  const { count: totalResponded } = await supabase
    .from("ahe_sellers").select("*", { count: "exact", head: true })
    .in("pipeline_status", ["interested", "considering", "rejected", "registered"]);

  const { count: totalInterested } = await supabase
    .from("ahe_sellers").select("*", { count: "exact", head: true })
    .in("pipeline_status", ["interested", "registered"]);

  const { count: totalRegistered } = await supabase
    .from("ahe_sellers").select("*", { count: "exact", head: true })
    .eq("pipeline_status", "registered");

  // Best template
  const { data: bestTemplate } = await supabase
    .from("outreach_templates")
    .select("name_ar, usage_count, response_rate")
    .order("response_rate", { ascending: false })
    .limit(1)
    .maybeSingle();

  // By category counts
  const { data: byCategoryRaw } = await supabase
    .from("ahe_sellers")
    .select("primary_category, pipeline_status")
    .in("pipeline_status", ["contacted", "interested", "considering", "rejected", "registered"]);

  const byCategory: Record<string, { sent: number; interested: number }> = {};
  (byCategoryRaw || []).forEach((s: any) => {
    const cat = s.primary_category || "other";
    if (!byCategory[cat]) byCategory[cat] = { sent: 0, interested: 0 };
    byCategory[cat].sent++;
    if (["interested", "registered"].includes(s.pipeline_status)) {
      byCategory[cat].interested++;
    }
  });

  return NextResponse.json({
    tab: "stats",
    stats: {
      sentToday: sentToday || 0,
      sentWeek: sentWeek || 0,
      sentMonth: sentMonth || 0,
      responseRate: totalSent ? Math.round(((totalResponded || 0) / totalSent) * 100) : 0,
      interestRate: totalSent ? Math.round(((totalInterested || 0) / totalSent) * 100) : 0,
      registrationRate: totalSent ? Math.round(((totalRegistered || 0) / totalSent) * 100) : 0,
      totalSent: totalSent || 0,
      totalResponded: totalResponded || 0,
      totalInterested: totalInterested || 0,
      totalRegistered: totalRegistered || 0,
      bestTemplate,
      byCategory,
    },
  });
}
