/**
 * POST /api/listings/migrate — Migrate ahe_listings → ads for a registered seller
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Map maksab_category to ads.category_id
const CATEGORY_MAP: Record<string, string> = {
  vehicles: "cars", سيارات: "cars", cars: "cars",
  properties: "real_estate", عقارات: "real_estate", real_estate: "real_estate",
};

export async function POST(req: NextRequest) {
  try {
    const { seller_id, user_id } = await req.json();

    if (!seller_id || !user_id) {
      return NextResponse.json({ error: "seller_id and user_id required" }, { status: 400 });
    }

    const sb = getSupabase();

    // Verify user exists
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all unmigrated listings for this seller
    const { data: listings, error: fetchErr } = await sb
      .from("ahe_listings")
      .select("*")
      .eq("ahe_seller_id", seller_id)
      .eq("is_duplicate", false)
      .in("migration_status", ["harvested", "queued"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchErr || !listings || listings.length === 0) {
      return NextResponse.json({
        migrated: 0,
        message: listings?.length === 0 ? "لا توجد إعلانات للنقل" : fetchErr?.message,
      });
    }

    let migrated = 0;
    const errors: string[] = [];

    for (const listing of listings) {
      try {
        // Build images array
        const images: string[] = [];
        if (listing.all_image_urls && Array.isArray(listing.all_image_urls)) {
          images.push(...listing.all_image_urls);
        }
        if (images.length === 0 && listing.thumbnail_url) {
          images.push(listing.thumbnail_url);
        }
        if (images.length === 0 && listing.main_image_url) {
          images.push(listing.main_image_url);
        }

        // Map category
        const categoryId = CATEGORY_MAP[listing.maksab_category] || listing.maksab_category || "cars";

        // ads.sale_type is the transaction method (cash/auction/exchange), not rent/sale
        // All harvested listings default to 'cash' (direct sale)
        const saleType = "cash";

        // Build category_fields from specifications
        const categoryFields = listing.specifications || {};

        // Insert into ads
        const { data: newAd, error: insertErr } = await sb
          .from("ads")
          .insert({
            user_id,
            category_id: categoryId,
            title: listing.title || "إعلان محصود",
            description: listing.description || null,
            price: listing.price || null,
            is_negotiable: listing.is_negotiable || false,
            sale_type: saleType,
            listing_type: listing.listing_type || "sale",
            category_fields: categoryFields,
            governorate: listing.governorate || null,
            city: listing.city || null,
            images,
            status: "active",
          })
          .select("id")
          .single();

        if (insertErr) {
          errors.push(`${listing.id}: ${insertErr.message}`);
          continue;
        }

        // Update ahe_listing migration status
        await sb
          .from("ahe_listings")
          .update({
            migration_status: "migrated",
            maksab_listing_id: newAd.id,
            migrated_at: new Date().toISOString(),
          })
          .eq("id", listing.id);

        migrated++;
      } catch (err) {
        errors.push(`${listing.id}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }

    // Log conversion in outreach_logs
    await sb.from("outreach_logs").insert({
      seller_id,
      action: "listings_migrated",
      notes: `${migrated} listings migrated to user ${user_id}`,
    });

    return NextResponse.json({
      migrated,
      total: listings.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[MIGRATE] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
