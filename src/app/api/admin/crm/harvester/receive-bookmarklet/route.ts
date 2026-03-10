/**
 * API — استقبال بيانات الـ Bookmarklet
 * POST: يستقبل الإعلانات من bookmarklet الموظف → dedup + store
 * GET: يرجع آخر الإرساليات
 *
 * Security:
 *   - Auth: كل bookmarklet فيه token فريد للموظف
 *   - CORS: dubizzle.com.eg فقط (+ same-origin للاختبار)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractPhone } from "@/lib/crm/harvester/parsers/phone-extractor";
import { mapLocation } from "@/lib/crm/harvester/parsers/location-mapper";

export const maxDuration = 30;

// ── Allowed origins for CORS ──
const ALLOWED_ORIGINS = [
  "https://www.dubizzle.com.eg",
  "https://dubizzle.com.eg",
];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
  );
}

/**
 * Build CORS headers — only allows dubizzle.com.eg + same-origin
 */
function corsHeaders(req?: NextRequest): Record<string, string> {
  const origin = req?.headers.get("origin") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Allow dubizzle origins + our own app origin (for test button)
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) || (appUrl && origin === appUrl);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bookmarklet-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/**
 * Validate bookmarklet token — returns employee info or null
 */
async function validateToken(
  req: NextRequest,
  supabase: ReturnType<typeof getServiceClient>
): Promise<{ id: string; employee_name: string; scope_code: string | null } | null> {
  // Token can come from header or query param (bookmarklet uses header)
  const token =
    req.headers.get("x-bookmarklet-token") ||
    req.nextUrl.searchParams.get("token");

  if (!token) return null;

  const { data } = await supabase
    .from("ahe_bookmarklet_tokens")
    .select("id, employee_name, scope_code")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  // Update last_used_at and total_submissions (fire-and-forget)
  supabase
    .from("ahe_bookmarklet_tokens")
    .update({
      last_used_at: new Date().toISOString(),
      total_submissions: data.id, // placeholder — real increment below
    })
    .eq("id", data.id)
    .then(); // just to not leave dangling promise

  // Use RPC-style increment
  try {
    await supabase.rpc("increment_bookmarklet_submissions", { p_token_id: data.id });
  } catch {
    // If RPC doesn't exist, do manual update
    await supabase
      .from("ahe_bookmarklet_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

/**
 * Smart scope matching from URL
 * dubizzle.com.eg/.../mobile-phones/alexandria/ → phones + alexandria
 */
async function matchScopeFromUrl(
  pageUrl: string,
  explicitScopeCode: string | null,
  supabase: ReturnType<typeof getServiceClient>
): Promise<string | null> {
  // 1. If explicit scope_code provided, use it directly
  if (explicitScopeCode) {
    const { data } = await supabase
      .from("ahe_scopes")
      .select("id")
      .eq("code", explicitScopeCode)
      .eq("is_active", true)
      .maybeSingle();
    if (data) return data.id;
  }

  // 2. Auto-detect from URL
  if (!pageUrl) return null;

  try {
    const url = new URL(pageUrl);
    const pathParts = url.pathname.toLowerCase().split("/").filter(Boolean);

    // Get all active scopes with their mappings
    const { data: scopes } = await supabase
      .from("ahe_scopes")
      .select("id, code, source_platform, maksab_category, governorate, city, base_url")
      .eq("is_active", true)
      .limit(100);

    if (!scopes || scopes.length === 0) return null;

    // Get category and governorate mappings
    const { data: catMappings } = await supabase
      .from("ahe_category_mappings")
      .select("maksab_category, source_category_slug");

    const { data: govMappings } = await supabase
      .from("ahe_governorate_mappings")
      .select("maksab_governorate, source_location_slug");

    // Extract category from URL path
    let detectedCategory: string | null = null;
    if (catMappings) {
      for (const cm of catMappings) {
        if (cm.source_category_slug && pathParts.some((p) => p.includes(cm.source_category_slug))) {
          detectedCategory = cm.maksab_category;
          break;
        }
      }
    }

    // Extract governorate from URL path
    let detectedGovernorate: string | null = null;
    if (govMappings) {
      for (const gm of govMappings) {
        if (gm.source_location_slug && pathParts.some((p) => p.includes(gm.source_location_slug))) {
          detectedGovernorate = gm.maksab_governorate;
          break;
        }
      }
    }

    // Find best matching scope
    let bestScope: string | null = null;
    let bestScore = 0;

    for (const scope of scopes) {
      let score = 0;

      // Match by base_url (strongest signal)
      if (scope.base_url && pageUrl.startsWith(scope.base_url)) {
        score += 10;
      }

      // Match by category
      if (detectedCategory && scope.maksab_category === detectedCategory) {
        score += 5;
      }

      // Match by governorate
      if (detectedGovernorate && scope.governorate === detectedGovernorate) {
        score += 3;
      }

      // Platform match
      if (pageUrl.includes("dubizzle") && scope.source_platform === "dubizzle") {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestScope = scope.id;
      }
    }

    return bestScope;
  } catch {
    return null;
  }
}

interface BookmarkletListing {
  url: string;
  title: string;
  price: number | null;
  location: string;
  thumbnailUrl: string | null;
  dateText: string;
  sellerName: string | null;
  sellerProfileUrl?: string | null;
  isVerified?: boolean;
  isBusiness?: boolean;
  isFeatured?: boolean;
  supportsExchange?: boolean;
  isNegotiable?: boolean;
  category?: string | null;
  description?: string;
}

interface BookmarkletPayload {
  url: string;
  listings: BookmarkletListing[];
  timestamp: string;
  source: string;
  scope_code?: string; // Explicit scope code from bookmarklet
}

// GET — return recent bookmarklet results
export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);

  try {
    const supabase = getServiceClient();

    // Get recent bookmarklet-sourced listings count by timestamp
    const { data } = await supabase
      .from("ahe_listings")
      .select("created_at, is_duplicate")
      .eq("source_platform", "dubizzle_bookmarklet")
      .order("created_at", { ascending: false })
      .limit(100);

    // Group by approximate batch (within 30 seconds)
    const batches: Array<{
      received: number;
      new: number;
      duplicate: number;
      errors: string[];
      timestamp: string;
    }> = [];

    if (data && data.length > 0) {
      let currentBatch = { received: 0, new: 0, duplicate: 0, errors: [] as string[], timestamp: data[0].created_at };
      let lastTime = new Date(data[0].created_at).getTime();

      for (const item of data) {
        const itemTime = new Date(item.created_at).getTime();
        if (lastTime - itemTime > 30000) {
          if (currentBatch.received > 0) batches.push(currentBatch);
          currentBatch = { received: 0, new: 0, duplicate: 0, errors: [], timestamp: item.created_at };
        }
        currentBatch.received++;
        if (item.is_duplicate) {
          currentBatch.duplicate++;
        } else {
          currentBatch.new++;
        }
        lastTime = itemTime;
      }
      if (currentBatch.received > 0) batches.push(currentBatch);
    }

    return NextResponse.json({ results: batches.slice(0, 10) }, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers }
    );
  }
}

// POST — receive listings from bookmarklet
export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  const supabase = getServiceClient();

  // ── Auth: validate bookmarklet token ──
  const employee = await validateToken(req, supabase);
  if (!employee) {
    return NextResponse.json(
      { error: "توكن غير صالح أو مفقود — تأكد إنك بتستخدم آخر نسخة من الـ Bookmarklet" },
      { status: 401, headers }
    );
  }

  try {
    const body: BookmarkletPayload = await req.json();

    if (!body.listings || !Array.isArray(body.listings) || body.listings.length === 0) {
      return NextResponse.json(
        { error: "لا توجد إعلانات في الطلب" },
        { status: 400, headers }
      );
    }

    let newCount = 0;
    let dupCount = 0;
    const errors: string[] = [];

    // ── Scope matching: explicit scope_code > employee default > auto-detect from URL ──
    const effectiveScopeCode = body.scope_code || employee.scope_code || null;
    const scopeId = await matchScopeFromUrl(body.url || "", effectiveScopeCode, supabase);

    for (const listing of body.listings) {
      if (!listing.url || !listing.title) continue;

      try {
        // Check duplicate
        const { data: existing } = await supabase
          .from("ahe_listings")
          .select("id")
          .eq("source_listing_url", listing.url)
          .eq("is_duplicate", false)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("ahe_listings")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", existing.id);
          dupCount++;
          continue;
        }

        // Map location
        const location = mapLocation(listing.location || "", "dubizzle");

        // Extract phone from description if available
        const phone = listing.description
          ? extractPhone(listing.description)
          : null;

        // Upsert seller if we have info
        let sellerId: string | null = null;
        if (listing.sellerName || listing.sellerProfileUrl || phone) {
          const { data: existingSeller } = listing.sellerProfileUrl
            ? await supabase
                .from("ahe_sellers")
                .select("id")
                .eq("profile_url", listing.sellerProfileUrl)
                .maybeSingle()
            : phone
            ? await supabase
                .from("ahe_sellers")
                .select("id")
                .eq("phone", phone)
                .maybeSingle()
            : { data: null };

          if (existingSeller) {
            sellerId = existingSeller.id;
          } else {
            const { data: newSeller } = await supabase
              .from("ahe_sellers")
              .insert({
                phone: phone,
                profile_url: listing.sellerProfileUrl || null,
                name: listing.sellerName || null,
                source_platform: "dubizzle",
                is_verified: listing.isVerified || false,
                is_business: listing.isBusiness || false,
                primary_category: null,
                primary_governorate: location.governorate || null,
                total_listings_seen: 1,
                priority_score: phone ? 25 : 0,
                pipeline_status: "discovered",
              })
              .select("id")
              .single();
            if (newSeller) sellerId = newSeller.id;
          }
        }

        // Insert listing
        await supabase.from("ahe_listings").insert({
          scope_id: scopeId,
          source_platform: "dubizzle_bookmarklet",
          source_listing_url: listing.url,
          title: listing.title,
          description: listing.description || null,
          price: listing.price,
          is_negotiable: listing.isNegotiable || false,
          supports_exchange: listing.supportsExchange || false,
          is_featured: listing.isFeatured || false,
          thumbnail_url: listing.thumbnailUrl,
          main_image_url: listing.thumbnailUrl,
          all_image_urls: listing.thumbnailUrl ? [listing.thumbnailUrl] : [],
          source_category: listing.category || null,
          source_location: listing.location,
          governorate: location.governorate || null,
          city: location.city || null,
          area: location.area || null,
          source_date_text: listing.dateText || null,
          seller_name: listing.sellerName || null,
          seller_profile_url: listing.sellerProfileUrl || null,
          seller_is_verified: listing.isVerified || false,
          seller_is_business: listing.isBusiness || false,
          ahe_seller_id: sellerId,
          extracted_phone: phone,
          phone_source: phone ? "description" : null,
        });

        newCount++;
      } catch (err) {
        errors.push(
          `${listing.title.substring(0, 30)}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Update daily metrics
    try {
      await supabase.rpc("upsert_ahe_daily_metrics", {
        p_listings_new: newCount,
        p_sellers_new: 0,
        p_phones_extracted: 0,
        p_auto_queued: 0,
      });
    } catch {
      // RPC may not exist
    }

    const result = {
      received: body.listings.length,
      new: newCount,
      duplicate: dupCount,
      errors,
      timestamp: new Date().toISOString(),
      employee: employee.employee_name,
      scope_matched: !!scopeId,
    };

    console.log(
      `[AHE Bookmarklet] 📬 ${employee.employee_name}: ${result.received} listings — ${result.new} new, ${result.duplicate} dup, scope: ${scopeId || "none"}`
    );

    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطأ في معالجة البيانات",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers }
    );
  }
}

// OPTIONS — CORS preflight for bookmarklet cross-origin requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
