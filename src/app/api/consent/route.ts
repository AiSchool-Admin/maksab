/**
 * GET /api/consent?seller=UUID — Fetch seller data for consent page
 * POST /api/consent — Record consent + auto-register + migrate listings
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

const CAR_CATS = ["vehicles", "سيارات", "cars"];

// Category mapping for ads table
const CATEGORY_MAP: Record<string, string> = {
  vehicles: "cars", سيارات: "cars", cars: "cars",
  properties: "real_estate", عقارات: "real_estate", real_estate: "real_estate",
};

export async function GET(req: NextRequest) {
  const sellerId = new URL(req.url).searchParams.get("seller");
  if (!sellerId) return NextResponse.json({ error: "seller required" }, { status: 400 });

  const sb = getSupabase();

  const { data: seller } = await sb
    .from("ahe_sellers")
    .select("id, name, phone, primary_category, primary_governorate, detected_account_type, total_listings_seen, source_platform")
    .eq("id", sellerId)
    .single();

  if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: listings } = await sb
    .from("ahe_listings")
    .select("id, title, price, thumbnail_url, city")
    .eq("ahe_seller_id", sellerId)
    .eq("is_duplicate", false)
    .order("created_at", { ascending: false })
    .limit(3);

  return NextResponse.json({
    seller: {
      id: seller.id,
      name: seller.name,
      category: seller.primary_category,
      listingsCount: seller.total_listings_seen,
    },
    listings: (listings || []).map(l => ({
      title: l.title,
      price: l.price,
      image: l.thumbnail_url,
      city: l.city,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { seller_id, ref } = await req.json();
    if (!seller_id) return NextResponse.json({ error: "seller_id required" }, { status: 400 });

    const sb = getSupabase();

    // 1. Get seller data
    const { data: seller } = await sb
      .from("ahe_sellers")
      .select("phone, name, primary_category")
      .eq("id", seller_id)
      .single();

    if (!seller?.phone) {
      return NextResponse.json({ error: "Seller has no phone" }, { status: 400 });
    }

    const agentName = CAR_CATS.includes(seller.primary_category) ? "waleed" : "ahmed";

    // 2. Update pipeline to 'consented'
    await sb.from("ahe_sellers").update({
      pipeline_status: "consented",
      updated_at: new Date().toISOString(),
    }).eq("id", seller_id);

    // 3. Log consent
    await sb.from("outreach_logs").insert({
      seller_id,
      action: "consented",
      agent_name: ref || agentName,
      notes: "seller_approved_via_consent_page",
    });

    // 4. Auto-register: Create auth user + profile
    let userId: string | null = null;

    try {
      const phone = seller.phone;
      const virtualEmail = `${phone}@maksab.auth`;

      // Check if user already exists
      const { data: existingProfile } = await sb
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        // Create auth user
        const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
          email: virtualEmail,
          phone: `+2${phone}`,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { phone, display_name: seller.name || "" },
        });

        if (authErr) {
          // User might already exist in auth.users — try to find them
          const { data: { users } } = await sb.auth.admin.listUsers();
          const existing = users?.find(u => u.phone === `+2${phone}` || u.email === virtualEmail);
          if (existing) {
            userId = existing.id;
          } else {
            console.error("[Consent] Auth create error:", authErr.message);
          }
        } else if (authUser?.user) {
          userId = authUser.user.id;

          // Create profile
          await sb.from("profiles").insert({
            id: userId,
            phone,
            display_name: seller.name || null,
          }).select().maybeSingle();
        }
      }
    } catch (err) {
      console.error("[Consent] Registration error:", err);
    }

    // 5. Link seller to user
    if (userId) {
      await sb.from("ahe_sellers").update({
        user_id: userId,
        pipeline_status: "registered",
      }).eq("id", seller_id);

      // 6. Migrate listings: ahe_listings → ads
      const { data: listings } = await sb
        .from("ahe_listings")
        .select("*")
        .eq("ahe_seller_id", seller_id)
        .eq("is_duplicate", false)
        .in("migration_status", ["harvested", "queued"])
        .limit(50);

      let migrated = 0;
      for (const listing of (listings || [])) {
        try {
          const images: string[] = [];
          if (listing.all_image_urls?.length > 0) images.push(...listing.all_image_urls);
          else if (listing.thumbnail_url) images.push(listing.thumbnail_url);

          const categoryId = CATEGORY_MAP[listing.maksab_category] || "cars";

          const { data: newAd } = await sb.from("ads").insert({
            user_id: userId,
            category_id: categoryId,
            title: listing.title || "إعلان",
            description: listing.description || null,
            price: listing.price || null,
            is_negotiable: listing.is_negotiable || false,
            sale_type: "cash",
            listing_type: listing.listing_type || "sale",
            category_fields: listing.specifications || {},
            governorate: listing.governorate || null,
            city: listing.city || null,
            images,
            status: "active",
          }).select("id").single();

          if (newAd) {
            await sb.from("ahe_listings").update({
              migration_status: "migrated",
              maksab_listing_id: newAd.id,
              migrated_at: new Date().toISOString(),
            }).eq("id", listing.id);
            migrated++;
          }
        } catch { /* skip individual listing errors */ }
      }

      // 7. Queue message 3 (account ready)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maksab.vercel.app";
      const magicLink = `${baseUrl}/join?phone=${encodeURIComponent(seller.phone)}&seller=${seller_id}&ref=${agentName}`;

      await sb.from("acquisition_queue").insert({
        seller_id,
        asset_type: CAR_CATS.includes(seller.primary_category) ? "cars" : "properties",
        message_number: 3,
        message_text: `🎉 تم! حسابك جاهز على مكسب\nكتبنا ${migrated} إعلان ليك — ادخل وشوف:\n👉 ${magicLink}`,
        magic_link: magicLink,
        status: "queued",
        mode: "auto",
        agent_name: agentName,
      });

      // Log
      await sb.from("outreach_logs").insert({
        seller_id,
        action: "registered",
        agent_name: agentName,
        notes: `auto_registered_after_consent: ${migrated} listings migrated`,
      });

      return NextResponse.json({
        success: true,
        registered: true,
        user_id: userId,
        listings_migrated: migrated,
      });
    }

    // Registration failed but consent was recorded
    return NextResponse.json({
      success: true,
      registered: false,
      message: "Consent recorded but auto-registration failed",
    });
  } catch (err) {
    console.error("[Consent] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
