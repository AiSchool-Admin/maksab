/**
 * POST /api/admin/crm/whales/batch-send
 *
 * Manually trigger Ahmed's daily outreach. Pulls the top N sellers in
 * the requested category/governorate that haven't been contacted yet,
 * sends each the standard Ahmed opener via WhatsApp Cloud API, marks
 * them pipeline_status='contacted', and logs the action.
 *
 * Hard caps for MVP safety:
 *   - max N per request: 50 (enforced server-side)
 *   - max N per merchant: 1 (no double-sending to whales we already
 *     reached today)
 *   - skips sellers whose pipeline_status is already
 *     contacted/interested/registered/rejected/needs_human_review
 *
 * Returns a per-seller breakdown so the UI can show which sends worked.
 *
 * GET also supported — returns today's counters (sent / capacity left).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { groupSellersIntoMerchants, type SellerLike } from "@/lib/crm/merchant";
import { getAhmedMessage } from "@/lib/whatsapp/ahmed-responder";

const DAILY_CAP = 50;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function countSentToday(sb: ReturnType<typeof getSupabase>) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count } = await sb
    .from("outreach_logs")
    .select("id", { count: "exact", head: true })
    .like("action", "ahmed:batch_send%")
    .gte("created_at", startOfDay.toISOString());
  return count || 0;
}

export async function GET() {
  try {
    const sb = getSupabase();
    const sentToday = await countSentToday(sb);
    const remaining = Math.max(0, DAILY_CAP - sentToday);
    return NextResponse.json({
      cap: DAILY_CAP,
      sent_today: sentToday,
      remaining_today: remaining,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedN = parseInt(String(body?.n ?? 50), 10);
    const category = String(body?.category || "properties");
    const governorates = (
      body?.governorates ||
      "الإسكندرية,alexandria,الاسكندرية"
    )
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    const sb = getSupabase();
    const sentToday = await countSentToday(sb);
    const remaining = Math.max(0, DAILY_CAP - sentToday);
    if (remaining === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `وصلت لحد اليوم (${DAILY_CAP}). جرب بكره.`,
          sent_today: sentToday,
          cap: DAILY_CAP,
        },
        { status: 429 }
      );
    }

    const requestN = Math.min(Math.max(1, requestedN), remaining, DAILY_CAP);

    // Eligible sellers: have phone, in target category/governorate, not yet
    // engaged. We deliberately filter at the SQL level on the simple cases
    // so we don't pull thousands of rows just to drop them in JS.
    const categoryValues =
      category === "properties"
        ? ["properties", "عقارات"]
        : category === "vehicles"
        ? ["vehicles", "سيارات", "cars", "مركبات"]
        : [category];

    const ENGAGED_STATUSES = [
      "contacted",
      "interested",
      "registered",
      "rejected",
      "not_reachable",
      "needs_human_review",
    ];

    const { data: rawSellers, error } = await sb
      .from("ahe_sellers")
      .select(
        "id, name, phone, source_platform, total_listings_seen, active_listings, primary_governorate, primary_category, pipeline_status, last_outreach_at, outreach_count, whale_score, seller_tier, created_at, merchant_key, merchant_admin_phone"
      )
      .in("primary_category", categoryValues)
      .in("primary_governorate", governorates)
      .not("phone", "is", null)
      .not("pipeline_status", "in", `(${ENGAGED_STATUSES.join(",")})`)
      .order("total_listings_seen", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group into merchants so we don't double-send to a brokerage with
    // 5 phones. Pick the admin phone of each merchant.
    const merchants = groupSellersIntoMerchants(
      (rawSellers || []) as SellerLike[]
    );

    // Take the top N merchants (whales-first ordering)
    const target = merchants.slice(0, requestN);

    // Send via WhatsApp Cloud API
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const cloudApiConfigured = !!(phoneNumberId && accessToken);

    const results: Array<{
      merchant_key: string;
      display_name: string;
      phone: string | null;
      status: "sent" | "skipped" | "failed";
      reason?: string;
    }> = [];

    for (const m of target) {
      if (!m.admin_phone) {
        results.push({
          merchant_key: m.merchant_key,
          display_name: m.display_name,
          phone: null,
          status: "skipped",
          reason: "no admin phone",
        });
        continue;
      }

      const platformLabel =
        ({
          dubizzle: "Dubizzle",
          semsarmasr: "سمسار مصر",
          aqarmap: "AqarMap",
          opensooq: "أوبن سوق",
        } as Record<string, string>)[m.source_platform || ""] ||
        m.source_platform ||
        "إعلانك";

      const message = getAhmedMessage(m.display_name || "حضرتك", platformLabel);

      // International format for Cloud API: must start with country code
      // (no leading +; Egyptian numbers like 01095... → 201095...)
      const cleaned = m.admin_phone.replace(/\D/g, "");
      const intl = cleaned.startsWith("20") ? cleaned : `2${cleaned}`;

      let sendStatus: "sent" | "failed" = "failed";
      let failReason: string | undefined;

      if (cloudApiConfigured) {
        try {
          const resp = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: intl,
                type: "text",
                text: { body: message, preview_url: true },
              }),
            }
          );
          if (resp.ok) {
            sendStatus = "sent";
          } else {
            const err = await resp.json().catch(() => ({}));
            failReason = `${resp.status}: ${err?.error?.message || "send failed"}`;
          }
        } catch (sendErr) {
          failReason =
            sendErr instanceof Error ? sendErr.message : "network error";
        }
      } else {
        failReason = "Cloud API not configured (env vars missing)";
      }

      // Update seller(s) — every phone in the merchant gets pipeline_status
      // bumped to 'contacted' so we don't re-target them tomorrow.
      if (sendStatus === "sent") {
        await sb
          .from("ahe_sellers")
          .update({
            pipeline_status: "contacted",
            last_outreach_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in("id", m.seller_ids);

        // Bump the per-seller outreach_count on the admin row
        const adminSeller = m.phones.find((p) => p.phone === m.admin_phone);
        if (adminSeller) {
          await sb.rpc("increment_outreach_count", {
            p_seller_id: adminSeller.seller_id,
          });
        }
      }

      // Audit log entry
      await sb.from("outreach_logs").insert({
        seller_id: m.seller_ids[0],
        action:
          sendStatus === "sent"
            ? "ahmed:batch_send:sent"
            : "ahmed:batch_send:failed",
        notes: failReason || message.substring(0, 200),
      });

      results.push({
        merchant_key: m.merchant_key,
        display_name: m.display_name,
        phone: m.admin_phone,
        status: sendStatus,
        reason: failReason,
      });
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      skipped,
      remaining_today: Math.max(0, DAILY_CAP - sentToday - sent),
      cap: DAILY_CAP,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
