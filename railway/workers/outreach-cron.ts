/**
 * Outreach Automation Worker
 *
 * Automates the 3-message acquisition pipeline:
 *
 * Message 1 (Day 0): First contact — "شفنا إعلاناتك..."
 *   Triggers when: pipeline_status = 'phone_found' AND outreach_count = 0
 *   After send: pipeline_status → 'contacted_1'
 *
 * Message 2 (Day 2): Consent link — "فريقنا جاهز يسجلك..."
 *   Triggers when: pipeline_status = 'contacted_1' AND last_outreach_at < 48h ago
 *   After send: pipeline_status → 'contacted_2'
 *
 * Message 3 (auto-register): After consent or 36h timeout
 *   Triggers when: pipeline_status = 'contacted_2' AND last_outreach_at < 36h ago
 *   Action: Auto-register seller + migrate listings + send magic link
 *   After send: pipeline_status → 'registered'
 *
 * Runs every 5 minutes. Max 50 messages per run (to stay within 250/day limit).
 *
 * WhatsApp Template Names (must be approved in Meta Business):
 *   - maksab_outreach_1: First contact message
 *   - maksab_outreach_2: Consent link message
 *   - maksab_outreach_3: Registration complete + magic link
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VERCEL_URL = process.env.VERCEL_URL || "https://maksab.vercel.app";

// WhatsApp API config
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_API_VERSION = "v21.0";

// Limits
const MAX_PER_RUN = 50;
const RUN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Hours to wait between messages
const WAIT_MSG2_HOURS = 48;
const WAIT_MSG3_HOURS = 36;

// Category emoji for messages
const CAT_EMOJI: Record<string, string> = {
  vehicles: "🚗", cars: "🚗", "سيارات": "🚗",
  properties: "🏠", real_estate: "🏠", "عقارات": "🏠",
};

function getSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "2" + cleaned;
  if (!cleaned.startsWith("2")) cleaned = "2" + cleaned;
  return cleaned;
}

// ─── WhatsApp Send Functions ────────────────────────────────────

async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.log(`[Outreach] Simulated template "${templateName}" → ${to} params=${JSON.stringify(params)}`);
    return { success: true, messageId: `sim_${Date.now()}` };
  }

  const phone = formatPhoneForWhatsApp(to);
  const components: Record<string, unknown>[] = [];

  if (params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map((p) => ({ type: "text", text: p })),
    });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "ar" },
            ...(components.length > 0 ? { components } : {}),
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.error?.message || `HTTP ${res.status}`;
      console.error(`[Outreach] WhatsApp error for ${to}:`, errMsg);
      return { success: false, error: errMsg };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Network error";
    console.error(`[Outreach] Network error for ${to}:`, errMsg);
    return { success: false, error: errMsg };
  }
}

// ─── Message 1: First Contact ────────────────────────────────────

async function processMessage1(sb: SupabaseClient): Promise<number> {
  // Find sellers ready for first contact
  const { data: sellers, error } = await sb
    .from("ahe_sellers")
    .select("id, name, phone, primary_category, source_platform, total_listings_seen")
    .or("pipeline_status.eq.phone_found,pipeline_status.is.null")
    .not("phone", "is", null)
    .eq("primary_governorate", "الإسكندرية")
    .order("whale_score", { ascending: false })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("[Outreach] Message 1 query error:", error.message);
    return 0;
  }

  if (!sellers?.length) return 0;

  let sent = 0;
  for (const seller of sellers) {
    if (sent >= MAX_PER_RUN) break;

    const name = seller.name || "يا باشا";
    const platform = seller.source_platform || "الإنترنت";
    const emoji = CAT_EMOJI[seller.primary_category] || "📦";

    // Template params: {{1}} = name, {{2}} = platform+emoji
    const params = [name, `${platform} ${emoji}`];

    const result = await sendWhatsAppTemplate(seller.phone, "maksab_outreach_1", params);

    if (result.success) {
      // Update pipeline status
      await sb.from("ahe_sellers").update({
        pipeline_status: "contacted_1",
        last_outreach_at: new Date().toISOString(),
        first_outreach_at: new Date().toISOString(),
        last_outreach_template: "maksab_outreach_1",
        outreach_count: (seller as Record<string, unknown>).outreach_count
          ? Number((seller as Record<string, unknown>).outreach_count) + 1
          : 1,
        updated_at: new Date().toISOString(),
      }).eq("id", seller.id);

      // Log
      await sb.from("outreach_logs").insert({
        seller_id: seller.id,
        action: "sent",
        channel: "whatsapp_api",
        agent_name: "system",
        notes: "Message 1: First contact (automated)",
        external_message_id: result.messageId || null,
      });

      sent++;
      console.log(`[Outreach] MSG1 sent to ${seller.name || seller.phone}`);
    } else {
      // Log failure
      await sb.from("outreach_logs").insert({
        seller_id: seller.id,
        action: "failed",
        channel: "whatsapp_api",
        agent_name: "system",
        notes: `Message 1 failed: ${result.error}`,
      });
    }

    // Rate limit: 1 second between messages
    await sleep(1000);
  }

  return sent;
}

// ─── Message 2: Consent Link (48h after MSG1) ────────────────────

async function processMessage2(sb: SupabaseClient): Promise<number> {
  const cutoff = hoursAgo(WAIT_MSG2_HOURS);

  const { data: sellers, error } = await sb
    .from("ahe_sellers")
    .select("id, name, phone, primary_category")
    .eq("pipeline_status", "contacted_1")
    .lt("last_outreach_at", cutoff)
    .not("phone", "is", null)
    .order("whale_score", { ascending: false })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("[Outreach] Message 2 query error:", error.message);
    return 0;
  }

  if (!sellers?.length) return 0;

  let sent = 0;
  for (const seller of sellers) {
    if (sent >= MAX_PER_RUN) break;

    const name = seller.name || "يا باشا";
    // Determine ref based on category
    const ref = ["vehicles", "cars", "سيارات"].includes(seller.primary_category)
      ? "waleed" : "ahmed";
    const consentUrl = `${VERCEL_URL}/consent?seller=${seller.id}&ref=${ref}`;

    // Template params: {{1}} = name, {{2}} = consent URL
    const params = [name, consentUrl];

    const result = await sendWhatsAppTemplate(seller.phone, "maksab_outreach_2", params);

    if (result.success) {
      await sb.from("ahe_sellers").update({
        pipeline_status: "contacted_2",
        last_outreach_at: new Date().toISOString(),
        last_outreach_template: "maksab_outreach_2",
        updated_at: new Date().toISOString(),
      }).eq("id", seller.id);

      await sb.rpc("increment_outreach_count", { p_seller_id: seller.id }).catch(() => {});

      await sb.from("outreach_logs").insert({
        seller_id: seller.id,
        action: "sent",
        channel: "whatsapp_api",
        agent_name: "system",
        notes: "Message 2: Consent link (automated)",
        external_message_id: result.messageId || null,
      });

      sent++;
      console.log(`[Outreach] MSG2 sent to ${seller.name || seller.phone}`);
    } else {
      await sb.from("outreach_logs").insert({
        seller_id: seller.id,
        action: "failed",
        channel: "whatsapp_api",
        agent_name: "system",
        notes: `Message 2 failed: ${result.error}`,
      });
    }

    await sleep(1000);
  }

  return sent;
}

// ─── Message 3: Auto-Register + Magic Link (36h after MSG2) ──────

async function processMessage3(sb: SupabaseClient): Promise<number> {
  const cutoff = hoursAgo(WAIT_MSG3_HOURS);

  // Find sellers who were sent MSG2 but haven't given consent (not yet registered)
  const { data: sellers, error } = await sb
    .from("ahe_sellers")
    .select("id, name, phone, primary_category")
    .eq("pipeline_status", "contacted_2")
    .lt("last_outreach_at", cutoff)
    .not("phone", "is", null)
    .order("whale_score", { ascending: false })
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("[Outreach] Message 3 query error:", error.message);
    return 0;
  }

  if (!sellers?.length) return 0;

  let sent = 0;
  for (const seller of sellers) {
    if (sent >= MAX_PER_RUN) break;

    // Auto-register the seller via the consent API
    try {
      const ref = ["vehicles", "cars", "سيارات"].includes(seller.primary_category)
        ? "waleed" : "ahmed";

      const registerRes = await fetch(`${VERCEL_URL}/api/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: seller.id, ref }),
      });

      if (!registerRes.ok) {
        const errBody = await registerRes.json().catch(() => ({}));
        console.error(`[Outreach] Auto-register failed for ${seller.id}:`, errBody.error || registerRes.status);

        // Still update status to avoid retrying forever
        await sb.from("ahe_sellers").update({
          pipeline_status: "registered",
          updated_at: new Date().toISOString(),
        }).eq("id", seller.id);
      }
    } catch (regErr) {
      console.error(`[Outreach] Auto-register error for ${seller.id}:`, regErr);
    }

    // Build magic link
    const phone = seller.phone.startsWith("0") ? seller.phone : `0${seller.phone}`;
    const ref = ["vehicles", "cars", "سيارات"].includes(seller.primary_category)
      ? "waleed" : "ahmed";
    const joinUrl = `${VERCEL_URL}/join?phone=${phone}&seller=${seller.id}&ref=${ref}`;

    // Template params: {{1}} = magic link URL
    const params = [joinUrl];

    const result = await sendWhatsAppTemplate(seller.phone, "maksab_outreach_3", params);

    if (result.success) {
      await sb.from("ahe_sellers").update({
        pipeline_status: "registered",
        last_outreach_at: new Date().toISOString(),
        last_outreach_template: "maksab_outreach_3",
        updated_at: new Date().toISOString(),
      }).eq("id", seller.id);

      await sb.rpc("increment_outreach_count", { p_seller_id: seller.id }).catch(() => {});

      await sb.from("outreach_logs").insert({
        seller_id: seller.id,
        action: "sent",
        channel: "whatsapp_api",
        agent_name: "system",
        notes: "Message 3: Auto-register + Magic link (automated)",
        external_message_id: result.messageId || null,
      });

      sent++;
      console.log(`[Outreach] MSG3 sent to ${seller.name || seller.phone} — auto-registered!`);
    } else {
      await sb.from("outreach_logs").insert({
        seller_id: seller.id,
        action: "failed",
        channel: "whatsapp_api",
        agent_name: "system",
        notes: `Message 3 failed: ${result.error}`,
      });
    }

    await sleep(1500); // Slightly longer pause for registration
  }

  return sent;
}

// ─── Main Cron Loop ──────────────────────────────────────────────

async function runOutreachCycle() {
  console.log("[Outreach] Starting outreach cycle...");
  const sb = getSupabase();

  try {
    // Process in order: MSG3 first (finish pipeline), then MSG2, then MSG1 (new contacts)
    const msg3Count = await processMessage3(sb);
    const msg2Count = await processMessage2(sb);

    // Remaining budget for MSG1
    const remaining = MAX_PER_RUN - msg3Count - msg2Count;
    const msg1Count = remaining > 0 ? await processMessage1(sb) : 0;

    const total = msg1Count + msg2Count + msg3Count;
    if (total > 0) {
      console.log(`[Outreach] Cycle complete: MSG1=${msg1Count}, MSG2=${msg2Count}, MSG3=${msg3Count}, Total=${total}`);
    } else {
      console.log("[Outreach] Cycle complete: no messages to send");
    }
  } catch (err) {
    console.error("[Outreach] Cycle error:", err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Start Worker ────────────────────────────────────────────────

const OUTREACH_ENABLED = process.env.OUTREACH_ENABLED !== "false";

if (!OUTREACH_ENABLED) {
  console.log("[Outreach] Worker DISABLED (set OUTREACH_ENABLED=true to enable)");
} else {
  console.log("[Outreach] Worker started. Running every 5 minutes.");
  console.log(`[Outreach] WhatsApp configured: ${!!(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN)}`);
  runOutreachCycle();
  setInterval(runOutreachCycle, RUN_INTERVAL_MS);
}
