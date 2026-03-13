import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseBuyerPost, parseMultiplePosts, detectCategory } from "@/lib/buyer-harvester/parser";
import { classifyBuyer } from "@/lib/buyer-harvester/classifier";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface ParsedResult {
  buyer_name: string | null;
  buyer_phone: string | null;
  product_wanted: string | null;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  governorate: string | null;
  condition_wanted: string | null;
  buyer_tier: string;
  buyer_score: number;
  matches_count: number;
  original_text: string;
}

/**
 * POST /api/admin/sales/buyer-harvest/parse
 * Parse raw text (from Facebook group paste) to extract buyers.
 * Uses Claude API if ANTHROPIC_API_KEY available, otherwise regex fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, source, groupName, save } = await req.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "النص قصير جداً" }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let results: ParsedResult[];

    if (anthropicKey) {
      // Use Claude API for smart parsing
      results = await parseWithClaude(text, anthropicKey);
    } else {
      // Regex fallback
      results = parseWithRegex(text, source || "facebook_group", groupName);
    }

    // Classify each buyer
    for (const r of results) {
      const classification = classifyBuyer({
        buyer_phone: r.buyer_phone,
        product_wanted: r.product_wanted,
        budget_min: r.budget_min,
        budget_max: r.budget_max,
        governorate: r.governorate,
        condition_wanted: r.condition_wanted,
        source: source || "facebook_group",
        category: r.category,
      });
      r.buyer_tier = classification.tier;
      r.buyer_score = classification.score;
    }

    // Find matches for each buyer
    const supabase = getSupabase();
    for (const r of results) {
      try {
        let query = supabase
          .from("ahe_listings")
          .select("id", { count: "exact", head: true })
          .eq("is_duplicate", false);

        if (r.category) query = query.eq("category", r.category);
        if (r.budget_max) query = query.lte("price", r.budget_max);

        const { count } = await query;
        r.matches_count = count || 0;
      } catch {
        r.matches_count = 0;
      }
    }

    // Save if requested
    if (save) {
      const saved = await saveBuyers(results, source || "facebook_group", groupName);
      return NextResponse.json({ buyers: results, saved });
    }

    return NextResponse.json({ buyers: results });
  } catch (err: any) {
    console.error("[BHE Parse] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function parseWithClaude(text: string, apiKey: string): Promise<ParsedResult[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: `أنت محلل بيانات. استخرج كل طلبات الشراء ("مطلوب") من النص.
لكل طلب استخرج: الاسم، الرقم (01XXXXXXXXX)، المنتج المطلوب، الميزانية، الموقع/المحافظة، الحالة (جديد/مستعمل).
ارجع JSON array فقط بدون أي نص إضافي.
المفاتيح: name, phone, product, budget_min, budget_max, location, condition, category
الفئات المتاحة: phones, vehicles, properties, electronics, furniture, gold, appliances, general`,
      messages: [{ role: "user", content: text.substring(0, 8000) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "[]";

  // Extract JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return parseWithRegex(text, "facebook_group");

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((item: any) => ({
      buyer_name: item.name || null,
      buyer_phone: item.phone || null,
      product_wanted: item.product || null,
      category: item.category || detectCategory(item.product || ""),
      budget_min: item.budget_min || item.budget || null,
      budget_max: item.budget_max || item.budget || null,
      governorate: item.location || null,
      condition_wanted: item.condition || null,
      buyer_tier: "unknown",
      buyer_score: 0,
      matches_count: 0,
      original_text: "",
    }));
  } catch {
    return parseWithRegex(text, "facebook_group");
  }
}

function parseWithRegex(
  text: string,
  source: string,
  groupName?: string
): ParsedResult[] {
  const buyers = parseMultiplePosts(text, source, groupName);
  return buyers.map((b) => ({
    buyer_name: b.buyer_name,
    buyer_phone: b.buyer_phone,
    product_wanted: b.product_wanted,
    category: b.category,
    budget_min: b.budget_min,
    budget_max: b.budget_max,
    governorate: b.governorate,
    condition_wanted: b.condition_wanted,
    buyer_tier: "unknown",
    buyer_score: 0,
    matches_count: 0,
    original_text: b.original_text,
  }));
}

async function saveBuyers(
  buyers: ParsedResult[],
  source: string,
  groupName?: string
): Promise<number> {
  const supabase = getSupabase();
  let saved = 0;

  for (const buyer of buyers) {
    const classification = classifyBuyer({
      buyer_phone: buyer.buyer_phone,
      product_wanted: buyer.product_wanted,
      budget_min: buyer.budget_min,
      budget_max: buyer.budget_max,
      governorate: buyer.governorate,
      condition_wanted: buyer.condition_wanted,
      source,
      category: buyer.category,
    });

    const { error } = await supabase.from("bhe_buyers").insert({
      source,
      source_group_name: groupName || null,
      source_platform: source === "facebook_group" ? "facebook" : source,
      buyer_name: buyer.buyer_name,
      buyer_phone: buyer.buyer_phone,
      product_wanted: buyer.product_wanted,
      category: buyer.category,
      condition_wanted: buyer.condition_wanted,
      budget_min: buyer.budget_min,
      budget_max: buyer.budget_max,
      governorate: buyer.governorate,
      original_text: buyer.original_text,
      buyer_tier: classification.tier,
      buyer_score: classification.score,
      estimated_purchase_value: classification.estimated_purchase_value,
      pipeline_status: buyer.buyer_phone ? "phone_found" : "discovered",
      harvested_at: new Date().toISOString(),
    });

    if (!error) saved++;
  }

  // Update daily metrics
  try {
    await supabase.rpc("increment_or_insert", {
      // Fallback: direct upsert
    });
  } catch {
    // Metrics update is best-effort
  }

  return saved;
}
