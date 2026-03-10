/**
 * API — استقبال بيانات الـ Bookmarklet
 * POST: يستقبل الإعلانات من bookmarklet الموظف → dedup + store
 * GET: يرجع آخر الإرساليات
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractPhone } from "@/lib/crm/harvester/parsers/phone-extractor";
import { mapLocation } from "@/lib/crm/harvester/parsers/location-mapper";

export const maxDuration = 30;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ""
  );
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
}

// GET — return recent bookmarklet results
export async function GET() {
  // Allow CORS for bookmarklet
  const headers = corsHeaders();

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
  const headers = corsHeaders();

  try {
    const body: BookmarkletPayload = await req.json();

    if (!body.listings || !Array.isArray(body.listings) || body.listings.length === 0) {
      return NextResponse.json(
        { error: "لا توجد إعلانات في الطلب" },
        { status: 400, headers }
      );
    }

    const supabase = getServiceClient();
    let newCount = 0;
    let dupCount = 0;
    const errors: string[] = [];

    // Try to find a matching scope for this URL
    let scopeId: string | null = null;
    if (body.url) {
      const { data: scopes } = await supabase
        .from("ahe_scopes")
        .select("id, source_platform, maksab_category, governorate, city")
        .eq("is_active", true)
        .limit(50);

      if (scopes) {
        for (const scope of scopes) {
          // Simple URL matching
          if (body.url.includes("dubizzle") || body.url.includes("olx")) {
            scopeId = scope.id;
            break;
          }
        }
      }
    }

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
    };

    console.log(
      `[AHE Bookmarklet] 📬 Received ${result.received} listings — ${result.new} new, ${result.duplicate} dup`
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
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
