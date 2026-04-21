/**
 * POST /api/admin/marketplace/publish
 *
 * Bulk-publish harvested sellers + listings to the live app:
 * 1. For each ahe_seller with phone → create auth user + profile
 * 2. For each ahe_listing → create ad in 'ads' table
 * 3. Update migration_status
 *
 * Body: { governorate, limit?, platform? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const CATEGORY_MAP: Record<string, string> = {
  vehicles: "cars", سيارات: "cars", cars: "cars",
  properties: "real_estate", عقارات: "real_estate", real_estate: "real_estate",
};

const GOV_MAP: Record<string, string> = {
  alexandria: "الإسكندرية", cairo: "القاهرة", giza: "الجيزة",
};

export async function POST(req: NextRequest) {
  const { governorate, limit = 50, platform } = await req.json();
  if (!governorate) {
    return NextResponse.json({ error: "governorate required" }, { status: 400 });
  }

  const sb = getSupabase();
  const govSlugs = [governorate];
  const govAr = GOV_MAP[governorate] || governorate;
  if (govAr !== governorate) govSlugs.push(govAr);

  // Get sellers with phone who haven't been published yet
  let sellerQuery = sb
    .from("ahe_sellers")
    .select("id, phone, name, source_platform, primary_category, primary_governorate")
    .not("phone", "is", null)
    .in("primary_governorate", govSlugs)
    .not("pipeline_status", "in", '("signed_up","active")')
    .order("priority_score", { ascending: false })
    .limit(limit);

  if (platform) {
    sellerQuery = sellerQuery.eq("source_platform", platform);
  }

  const { data: sellers } = await sellerQuery;

  if (!sellers || sellers.length === 0) {
    return NextResponse.json({
      success: true,
      users_created: 0,
      ads_created: 0,
      message: "لا يوجد بائعين جدد للنشر",
    });
  }

  let usersCreated = 0;
  let adsCreated = 0;
  let errors: string[] = [];

  for (const seller of sellers) {
    try {
      // Check if user already exists with this phone
      const { data: existingProfile } = await sb
        .from("profiles")
        .select("id")
        .eq("phone", seller.phone)
        .limit(1);

      let userId: string;

      if (existingProfile && existingProfile.length > 0) {
        userId = existingProfile[0].id;
      } else {
        // Create auth user with phone
        const email = `${seller.phone}@maksab.app`;
        const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
          email,
          phone: `+2${seller.phone}`,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            display_name: seller.name || "معلن",
            source: "harvest_auto_publish",
          },
        });

        if (authErr || !authUser?.user) {
          errors.push(`Seller ${seller.id}: auth error — ${authErr?.message}`);
          continue;
        }

        userId = authUser.user.id;

        // Create profile
        await sb.from("profiles").upsert({
          id: userId,
          phone: seller.phone,
          display_name: seller.name || "معلن",
          governorate: govAr,
          is_verified: true,
          created_at: new Date().toISOString(),
        });

        usersCreated++;
      }

      // Fetch unmigrated listings for this seller
      const { data: listings } = await sb
        .from("ahe_listings")
        .select("id, title, description, price, is_negotiable, listing_type, specifications, governorate, city, thumbnail_url, all_image_urls, main_image_url, maksab_category, migration_status")
        .eq("ahe_seller_id", seller.id)
        .eq("is_duplicate", false)
        .in("migration_status", ["harvested", "queued"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (listings && listings.length > 0) {
        for (const listing of listings) {
          try {
            const images: string[] = [];
            if (listing.all_image_urls && Array.isArray(listing.all_image_urls)) {
              images.push(...listing.all_image_urls);
            }
            if (images.length === 0 && listing.thumbnail_url) images.push(listing.thumbnail_url);
            if (images.length === 0 && listing.main_image_url) images.push(listing.main_image_url);

            const categoryId = CATEGORY_MAP[listing.maksab_category] || "real_estate";

            const { data: newAd, error: adErr } = await sb
              .from("ads")
              .insert({
                user_id: userId,
                category_id: categoryId,
                title: listing.title || "إعلان",
                description: listing.description || null,
                price: listing.price || null,
                is_negotiable: listing.is_negotiable || false,
                sale_type: "cash",
                category_fields: listing.specifications || {},
                governorate: govAr,
                city: listing.city || null,
                images,
                status: "active",
              })
              .select("id")
              .single();

            if (adErr) {
              errors.push(`Listing ${listing.id}: ${adErr.message}`);
              continue;
            }

            await sb.from("ahe_listings").update({
              migration_status: "migrated",
              maksab_listing_id: newAd.id,
              migrated_at: new Date().toISOString(),
            }).eq("id", listing.id);

            adsCreated++;
          } catch (e: any) {
            errors.push(`Listing ${listing.id}: ${e.message}`);
          }
        }
      }

      // Update seller pipeline
      await sb.from("ahe_sellers").update({
        pipeline_status: "signed_up",
        crm_customer_id: userId,
      }).eq("id", seller.id);

    } catch (e: any) {
      errors.push(`Seller ${seller.id}: ${e.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    sellers_processed: sellers.length,
    users_created: usersCreated,
    ads_created: adsCreated,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
}
