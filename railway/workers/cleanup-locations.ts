/**
 * Data Cleanup Worker — Verify existing listings' locations
 *
 * For each listing with generic city ('الإسكندرية') or null city,
 * fetch the original detail page and extract the REAL location.
 * If the real governorate doesn't match → mark as rejected.
 *
 * Run manually: npx tsx workers/cleanup-locations.ts
 * Or trigger via: GET /cleanup-locations on Railway server
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ar-EG,ar;q=0.9,en;q=0.7",
};

const GOVERNORATE_MAP: Record<string, string> = {
  "القاهرة": "cairo", "الجيزة": "giza", "الإسكندرية": "alexandria",
  "الدقهلية": "dakahlia", "البحيرة": "beheira", "المنوفية": "monufia",
  "الغربية": "gharbia", "الشرقية": "sharqia", "القليوبية": "qalyubia",
  "بورسعيد": "port_said", "السويس": "suez", "الإسماعيلية": "ismailia",
  "المعادي": "cairo", "المعادى": "cairo", "مدينة نصر": "cairo",
  "التجمع": "cairo", "الشيخ زايد": "giza", "الهرم": "giza",
  "المهندسين": "giza", "الدقي": "giza", "الدقى": "giza",
};

function normalizeGov(gov: string): string {
  const trimmed = gov.trim();
  if (GOVERNORATE_MAP[trimmed]) return GOVERNORATE_MAP[trimmed];
  if (trimmed.includes("اسكندري") || trimmed.includes("الإسكندرية")) return "alexandria";
  if (trimmed.includes("القاهر")) return "cairo";
  if (trimmed.includes("الجيز")) return "giza";
  return trimmed.toLowerCase();
}

async function fetchDetailLocation(url: string): Promise<{
  area: string | null;
  governorate: string | null;
  raw: string | null;
}> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { area: null, governorate: null, raw: null };

    const html = await res.text();

    // Extract text around "الموقع" keyword
    const locSection = html.match(/الموقع[\s\S]{0,500}/);

    // Pattern: Arabic location with comma separator
    const textMatch = html.match(
      /الموقع[\s\S]{0,200}?([\u0600-\u06FF][\u0600-\u06FF\u0020\-_\.]{2,40})\s*[،,]\s*([\u0600-\u06FF][\u0600-\u06FF\u0020]{2,25})/
    );

    if (textMatch) {
      return {
        area: textMatch[1].trim(),
        governorate: textMatch[2].trim(),
        raw: locSection?.[0]?.substring(0, 100) || null,
      };
    }

    return { area: null, governorate: null, raw: locSection?.[0]?.substring(0, 100) || null };
  } catch (err) {
    return { area: null, governorate: null, raw: `error: ${(err as Error).message}` };
  }
}

async function run() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get listings that need verification:
  // - Not already rejected
  // - Not duplicate
  // - Have a source_listing_url (can be verified)
  // - city is generic (الإسكندرية or null) — specific cities like سموحة are likely correct
  const { data: listings, error } = await sb
    .from("ahe_listings")
    .select("id, title, source_listing_url, city, governorate, source_platform")
    .eq("is_duplicate", false)
    .neq("migration_status", "rejected")
    .not("source_listing_url", "is", null)
    .or("city.eq.الإسكندرية,city.is.null")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[Cleanup] Query error:", error.message);
    return;
  }

  console.log(`[Cleanup] Found ${listings?.length || 0} listings to verify`);

  let verified = 0;
  let rejected = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const listing of listings || []) {
    // Only check dubizzle/semsarmasr — other platforms have better location data
    if (!["dubizzle", "semsarmasr"].includes(listing.source_platform || "")) {
      skipped++;
      continue;
    }

    console.log(`[${verified + rejected + 1}/${listings!.length}] Checking: "${listing.title?.substring(0, 50)}"`);

    const detailLoc = await fetchDetailLocation(listing.source_listing_url);

    if (detailLoc.governorate) {
      const normalizedGov = normalizeGov(detailLoc.governorate);

      if (normalizedGov !== "alexandria") {
        // NOT Alexandria — reject
        console.log(`  ❌ REJECT: ${detailLoc.area}, ${detailLoc.governorate} (${normalizedGov})`);
        await sb.from("ahe_listings").update({
          is_duplicate: true,
          migration_status: "rejected",
        }).eq("id", listing.id);
        rejected++;
      } else {
        // Confirmed Alexandria — update with specific city
        if (detailLoc.area && detailLoc.area !== listing.city) {
          await sb.from("ahe_listings").update({
            city: detailLoc.area.replace(/\s+/g, "_"),
          }).eq("id", listing.id);
          updated++;
        }
        verified++;
        console.log(`  ✅ OK: ${detailLoc.area}, ${detailLoc.governorate}`);
      }
    } else {
      console.log(`  ⚠️ Could not extract location from detail page (raw: ${detailLoc.raw?.substring(0, 60)})`);
      errors++;
    }

    // Rate limit: 3 seconds between requests
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`\n[Cleanup] Complete:`);
  console.log(`  ✅ Verified (Alexandria): ${verified}`);
  console.log(`  ❌ Rejected (non-Alexandria): ${rejected}`);
  console.log(`  📝 Updated city: ${updated}`);
  console.log(`  ⏭️ Skipped (non-dubizzle): ${skipped}`);
  console.log(`  ⚠️ Errors: ${errors}`);
  console.log(`  📊 Total processed: ${verified + rejected + skipped + errors}`);
}

run().catch(console.error);
