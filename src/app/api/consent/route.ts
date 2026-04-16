/**
 * GET /api/consent?seller=UUID — Fetch seller data for consent page
 * POST /api/consent — Record consent + auto-register + migrate listings
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWhatsAppProvider } from "@/lib/crm/channels/whatsapp";
import { getSmsProvider } from "@/lib/crm/channels/sms";

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

      // Check if profile already exists (from previous /join or consent attempt)
      const { data: existingProfile } = await sb
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
        console.error(`[Consent] Found existing profile: ${userId}`);
      }

      // Check ahe_sellers.user_id (might have been set by /join)
      if (!userId) {
        const { data: sellerWithUser } = await sb
          .from("ahe_sellers")
          .select("user_id")
          .eq("id", seller_id)
          .single();
        if (sellerWithUser?.user_id) {
          userId = sellerWithUser.user_id;
          console.error(`[Consent] Found user_id from ahe_sellers: ${userId}`);
        }
      }

      // Create new user if not found
      if (!userId) {
        console.error(`[Consent] Creating new user for phone: ${phone}`);
        const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
          email: virtualEmail,
          phone: `+2${phone}`,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { phone, display_name: seller.name || "" },
        });

        if (authErr) {
          console.error("[Consent] Auth create error:", authErr.message);
          // Try to find existing auth user
          const { data: { users } } = await sb.auth.admin.listUsers();
          const existing = users?.find(u => u.phone === `+2${phone}` || u.email === virtualEmail);
          if (existing) {
            userId = existing.id;
            console.error(`[Consent] Found existing auth user: ${userId}`);
            // Ensure profile exists
            await sb.from("profiles").upsert({
              id: userId,
              phone,
              display_name: seller.name || null,
            }, { onConflict: "id" });
          }
        } else if (authUser?.user) {
          userId = authUser.user.id;
          console.error(`[Consent] Created new user: ${userId}`);
          await sb.from("profiles").upsert({
            id: userId,
            phone,
            display_name: seller.name || null,
          }, { onConflict: "id" });
        }
      }
    } catch (err) {
      console.error("[Consent] Registration error:", err);
    }

    console.error(`[Consent] Final userId: ${userId}, seller_id: ${seller_id}`);

    // 5. Link seller to user
    if (userId) {
      await sb.from("ahe_sellers").update({
        user_id: userId,
        pipeline_status: "registered",
      }).eq("id", seller_id);

      // 6. Migrate listings: ahe_listings → ads
      const { data: listings, error: listErr } = await sb
        .from("ahe_listings")
        .select("*")
        .eq("ahe_seller_id", seller_id)
        .or("is_duplicate.is.null,is_duplicate.eq.false")
        .or("migration_status.is.null,migration_status.eq.harvested,migration_status.eq.queued")
        .limit(50);

      console.error(`[Consent] Listings found: ${listings?.length || 0}, error: ${listErr?.message || "none"}`);

      let migrated = 0;
      for (const listing of (listings || [])) {
        try {
          const images: string[] = [];
          if (listing.all_image_urls?.length > 0) images.push(...listing.all_image_urls);
          else if (listing.thumbnail_url) images.push(listing.thumbnail_url);
          else if (listing.main_image_url) images.push(listing.main_image_url);

          const categoryId = CATEGORY_MAP[listing.maksab_category] || "cars";

          const { data: newAd, error: adErr } = await sb.from("ads").insert({
            user_id: userId,
            category_id: categoryId,
            title: listing.title || "إعلان",
            description: listing.description || null,
            price: listing.price || null,
            is_negotiable: listing.is_negotiable || false,
            sale_type: "cash",
            category_fields: listing.specifications || {},
            governorate: listing.governorate || null,
            city: listing.city || null,
            images,
            status: "active",
          }).select("id").single();

          if (adErr) {
            console.error(`[Consent] Ad insert error for ${listing.id}: ${adErr.message}`);
            continue;
          }

          if (newAd) {
            await sb.from("ahe_listings").update({
              migration_status: "migrated",
              maksab_listing_id: newAd.id,
              migrated_at: new Date().toISOString(),
            }).eq("id", listing.id);
            migrated++;
          }
        } catch (migErr) {
          console.error(`[Consent] Migration error for listing ${listing.id}:`, migErr);
        }
      }

      console.error(`[Consent] Migration complete: ${migrated} listings migrated for seller ${seller_id}`);

      // Ensure pipeline_status = registered (safety net after migration)
      await sb.from("ahe_sellers").update({
        pipeline_status: "registered",
        updated_at: new Date().toISOString(),
      }).eq("id", seller_id);

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
      });

      // 8. Send welcome message — try WhatsApp first, fallback to SMS
      let notifyResult = {
        success: false,
        channel: "none" as "whatsapp" | "sms" | "none",
        messageId: null as string | null,
        error: null as string | null,
      };

      // Try WhatsApp first (if configured)
      try {
        const wa = getWhatsAppProvider();
        if (wa.isConfigured()) {
          const tplResult = await wa.sendTemplate({
            to: seller.phone,
            templateName: "account_ready",
            languageCode: "en",
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: magicLink }],
              },
            ],
          });
          if (tplResult.success) {
            notifyResult = {
              success: true,
              channel: "whatsapp",
              messageId: tplResult.externalMessageId || null,
              error: null,
            };
          } else {
            notifyResult.error = `WA: ${tplResult.error}`;
          }
        }
      } catch (waErr) {
        console.error("[Consent] WhatsApp send error:", waErr);
        notifyResult.error = waErr instanceof Error ? `WA: ${waErr.message}` : "WA: Unknown";
      }

      // Fallback to SMS if WhatsApp failed
      if (!notifyResult.success) {
        try {
          const sms = getSmsProvider();
          if (sms.getProviderName() !== "none") {
            const smsContent = `مكسب: حسابك جاهز ✅\nإعلاناتك على:\n${magicLink}`;
            const smsResult = await sms.send({
              to: seller.phone,
              content: smsContent,
            });
            if (smsResult.success) {
              notifyResult = {
                success: true,
                channel: "sms",
                messageId: smsResult.externalMessageId || null,
                error: null,
              };
            } else {
              notifyResult.error = `${notifyResult.error || ""} | SMS: ${smsResult.error}`;
            }
          }
        } catch (smsErr) {
          console.error("[Consent] SMS send error:", smsErr);
          notifyResult.error = `${notifyResult.error || ""} | SMS: ${smsErr instanceof Error ? smsErr.message : "Unknown"}`;
        }
      }

      // Log the result
      await sb.from("outreach_logs").insert({
        seller_id,
        action: notifyResult.success ? "sent" : "registered",
        agent_name: agentName,
        notes: notifyResult.success
          ? `[${notifyResult.channel.toUpperCase()} SENT ${notifyResult.messageId}] auto_registered + welcome sent: ${migrated} listings migrated`
          : `[NOTIFY FAILED: ${notifyResult.error || "no channel configured"}] auto_registered_after_consent: ${migrated} listings migrated`,
      });

      return NextResponse.json({
        success: true,
        registered: true,
        user_id: userId,
        listings_migrated: migrated,
        notify_channel: notifyResult.channel,
        notify_sent: notifyResult.success,
        notify_error: notifyResult.error,
      });
    }

    // Registration failed but consent was recorded
    console.error(`[Consent] FAILED: userId is null for seller ${seller_id}, phone ${seller.phone}`);
    return NextResponse.json({
      success: true,
      registered: false,
      message: "Consent recorded but auto-registration failed — userId is null",
    });
  } catch (err) {
    console.error("[Consent] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
