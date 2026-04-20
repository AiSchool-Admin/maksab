/**
 * مكسب Puppeteer Harvester — Railway
 *
 * Headless browser harvester for WAF-blocked platforms:
 *   - semsarmasr (عقارات)
 *   - hatla2ee (سيارات)
 *   - contactcars (سيارات)
 *   - carsemsar (سيارات)
 *
 * Endpoints:
 *   GET  /health              — Health check
 *   GET  /harvest?scope_code= — Harvest a specific scope
 *   GET  /cron/harvest        — Auto-harvest all ready blocked scopes
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import puppeteer, { Browser, Page } from "puppeteer";

const PORT = parseInt(process.env.PORT || "3001", 10);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

const BLOCKED_PLATFORMS = ["semsarmasr", "carsemsar", "hatla2ee", "contactcars"];

const MAX_PAGES_PER_SCOPE = 20; // will stop early when old listings found
const MAX_AGE_DAYS = 30;
const DELAY_BETWEEN_PAGES = 3000;
const DELAY_BETWEEN_SCOPES = 5000;

// Parse relative Arabic dates: "منذ 3 ساعات" → days ago
function parseAgeInDays(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim();
  if (/الآن|لسه|just now/i.test(t)) return 0;
  const numMatch = t.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1]) : 1;
  if (/دقيق|minute/i.test(t)) return num / (60 * 24);
  if (/ساع|hour/i.test(t)) return num / 24;
  if (/أمس|امبارح|yesterday/i.test(t)) return 1;
  if (/يوم|day/i.test(t)) return num;
  if (/أسبوع|week/i.test(t)) return num * 7;
  if (/شهر|month/i.test(t)) return num * 30;
  if (/سنة|year/i.test(t)) return num * 365;
  return null;
}

function getSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Platform-specific extractors ────────────────────────────

interface ExtractedListing {
  url: string;
  title: string;
  description: string;
  price: number | null;
  location: string;
  area: string;
  city: string;
  thumbnailUrl: string | null;
  sellerPhone: string | null;
  sellerName: string | null;
  externalId: string | null;
  dateText: string | null;
}

async function extractSemsarMasr(page: Page): Promise<ExtractedListing[]> {
  return page.evaluate(() => {
    const results: any[] = [];

    // Extract phones from inline JSON in page source
    const phoneMap: Record<string, string> = {};
    const nameMap: Record<string, string> = {};
    const html = document.documentElement.innerHTML;
    const jsonRe = /'AdID':'(\d+)','name':'([^']*)','AdTitle':'([^']*)','IntlPhone':'([^']*)','AdPhone':'([^']*)'/g;
    let m: RegExpExecArray | null;
    while ((m = jsonRe.exec(html)) !== null) {
      const adId = m[1];
      const name = m[2]?.trim();
      const intlPhone = m[4]?.trim();
      const adPhone = m[5]?.trim();
      const phone = (intlPhone || adPhone || "").replace(/[^\d+]/g, "");
      if (phone && phone.length >= 10) phoneMap[adId] = phone;
      if (name) nameMap[adId] = name;
    }

    const cards = document.querySelectorAll("div.ListDesStyle, div.ListCont");
    cards.forEach((card) => {
      const dataId = card.getAttribute("data-id") || "";
      const linkEl = card.querySelector(".AdTitleStyle h2 a") as HTMLAnchorElement;
      if (!linkEl) return;
      const fullUrl = linkEl.href || linkEl.getAttribute("href") || "";
      if (!fullUrl) return;
      const url = fullUrl.split("?")[0];
      const title = (linkEl.textContent || "").trim() || linkEl.getAttribute("title") || "";
      if (!title) return;

      const descEl = card.querySelector(".AdDesc");
      const desc = descEl ? (descEl.textContent || "").trim() : "";

      const locEl = card.querySelector(".ListingLocation");
      const locText = locEl ? (locEl.textContent || "").trim() : "";
      const locParts = locText.split("-").map((s) => s.trim());
      const area = locParts[0] || "";
      const city = locParts.length > 1 ? locParts[locParts.length - 1] : "";

      const imgEl = card.querySelector(".ThumbCont img") as HTMLImageElement;
      let img = imgEl ? imgEl.getAttribute("src") || imgEl.src || "" : "";
      if (img.startsWith("//")) img = "https:" + img;

      const priceEl = card.querySelector(".Price") || card.querySelector("#cellPriceMob");
      const priceText = priceEl ? priceEl.textContent || "" : "";
      const pm = priceText.match(/([\d,]+)/);
      const price = pm ? parseInt(pm[1].replace(/,/g, "")) : null;

      // Phone from inline JSON
      const adIdFromUrl = url.match(/\/3akarat\/(\d+)/);
      const adIdKey = adIdFromUrl ? adIdFromUrl[1] : dataId;
      let phone = phoneMap[adIdKey] || null;
      if (phone) {
        phone = phone.replace(/^\+?2/, "");
        if (!phone.startsWith("0")) phone = "0" + phone;
      }

      // Extract date text: semsarmasr shows dates like "منذ 3 أيام"
      const dateEl = card.querySelector(".ListingDate, [class*='date']");
      const dateText = dateEl ? (dateEl.textContent || "").trim() : "";

      results.push({
        url,
        title,
        description: desc,
        price,
        location: locText,
        area,
        city,
        thumbnailUrl: img || null,
        sellerPhone: phone,
        sellerName: nameMap[adIdKey] || null,
        externalId: adIdKey,
        dateText: dateText || null,
      });
    });

    return results;
  });
}

async function extractHatla2ee(page: Page): Promise<ExtractedListing[]> {
  return page.evaluate(() => {
    const results: any[] = [];
    const cards = document.querySelectorAll(".newCarListUnit_wrapper, .listingCard, [class*='listing-card']");
    cards.forEach((card) => {
      const linkEl = card.querySelector("a[href*='/car/']") as HTMLAnchorElement;
      if (!linkEl) return;
      const url = (linkEl.href || "").split("?")[0];
      const title = (card.querySelector("h2, h3, .title, [class*='title']") as HTMLElement)?.textContent?.trim() || "";
      if (!title) return;

      const priceEl = card.querySelector("[class*='price'], .price");
      const priceText = priceEl?.textContent || "";
      const pm = priceText.match(/([\d,]+)/);
      const price = pm ? parseInt(pm[1].replace(/,/g, "")) : null;

      const locEl = card.querySelector("[class*='location'], .location, .city");
      const locText = locEl ? (locEl.textContent || "").trim() : "";

      const imgEl = card.querySelector("img") as HTMLImageElement;
      const img = imgEl ? imgEl.src || imgEl.getAttribute("data-src") || "" : "";

      const text = card.textContent || "";
      const ph = text.match(/(?:\+?201|01)[0-25]\d{8}/);

      const dateEl = card.querySelector("[class*='date'], [class*='time']");
      const dateText = dateEl ? (dateEl.textContent || "").trim() : "";

      results.push({
        url,
        title,
        description: "",
        price,
        location: locText,
        area: "",
        city: locText,
        thumbnailUrl: img || null,
        sellerPhone: ph ? ph[0].replace(/^\+?2/, "") : null,
        sellerName: null,
        externalId: null,
        dateText: dateText || null,
      });
    });
    return results;
  });
}

async function extractContactCars(page: Page): Promise<ExtractedListing[]> {
  return page.evaluate(() => {
    const results: any[] = [];
    const cards = document.querySelectorAll(".car-card, .listing-item, [class*='car-card'], article");
    cards.forEach((card) => {
      const linkEl = card.querySelector("a[href]") as HTMLAnchorElement;
      if (!linkEl) return;
      const url = (linkEl.href || "").split("?")[0];
      const title = (card.querySelector("h2, h3, .title, [class*='title']") as HTMLElement)?.textContent?.trim() || "";
      if (!title) return;

      const priceEl = card.querySelector("[class*='price'], .price");
      const priceText = priceEl?.textContent || "";
      const pm = priceText.match(/([\d,]+)/);
      const price = pm ? parseInt(pm[1].replace(/,/g, "")) : null;

      const locEl = card.querySelector("[class*='location'], .location");
      const locText = locEl ? (locEl.textContent || "").trim() : "";

      const imgEl = card.querySelector("img") as HTMLImageElement;
      const img = imgEl ? imgEl.src || imgEl.getAttribute("data-src") || "" : "";

      const dateEl = card.querySelector("[class*='date'], [class*='time']");
      const dateText = dateEl ? (dateEl.textContent || "").trim() : "";

      results.push({
        url,
        title,
        description: "",
        price,
        location: locText,
        area: "",
        city: locText,
        thumbnailUrl: img || null,
        sellerPhone: null,
        sellerName: null,
        externalId: null,
        dateText: dateText || null,
      });
    });
    return results;
  });
}

// ─── Alexandria filter ───────────────────────────────────────

const ALEX_AREAS = [
  "سموحة", "سيدي بشر", "المنتزه", "لوران", "ستانلي", "كليوباترا", "جناكليس",
  "محرم بك", "سيدي جابر", "المعمورة", "العصافرة", "الإبراهيمية", "رشدي",
  "ميامي", "المندرة", "العامرية", "كينج مريوط", "أبيس", "جليم", "كفر عبدو",
  "النخيل", "كامب شيزار", "سبورتنج", "الشاطبي", "بولكلي", "فلمنج", "العجمي",
  "البيطاش", "برج العرب", "السيوف", "صواري", "مروج", "بالم هيلز", "المنشية",
  "محطة الرمل", "القباري", "الدخيلة", "الهانوفيل", "أبو تلات", "زيزينيا",
  "سان ستيفانو", "وابور المياة", "باكوس", "الحضرة", "المكس", "بحري", "سابا باشا",
];

function isAlexandria(item: ExtractedListing): boolean {
  const loc = `${item.city} ${item.area} ${item.location} ${item.title} ${item.description}`.toLowerCase();
  if (loc.includes("الإسكندرية") || loc.includes("الاسكندرية") || loc.includes("اسكندرية") || loc.includes("alexandria")) return true;
  for (const a of ALEX_AREAS) {
    if (loc.includes(a)) return true;
  }
  return false;
}

function filterByGovernorate(items: ExtractedListing[], governorate: string): ExtractedListing[] {
  if (governorate === "الإسكندرية") return items.filter(isAlexandria);
  return items;
}

// ─── Location mapper ─────────────────────────────────────────

function mapLocation(locText: string): { governorate: string | null; city: string | null; area: string | null } {
  const lower = locText.toLowerCase();
  if (lower.includes("الإسكندرية") || lower.includes("الاسكندرية") || lower.includes("alexandria")) {
    const parts = locText.split(/[-,]/).map((s) => s.trim());
    return { governorate: "alexandria", city: parts[0] || null, area: parts[0] || null };
  }
  if (lower.includes("القاهرة") || lower.includes("cairo")) return { governorate: "cairo", city: null, area: null };
  if (lower.includes("الجيزة") || lower.includes("giza")) return { governorate: "giza", city: null, area: null };
  return { governorate: null, city: null, area: null };
}

// ─── Browser management ──────────────────────────────────────

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;
  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
      "--disable-extensions",
      "--lang=ar-EG",
    ],
  });
  return browserInstance;
}

async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

// ─── Pagination helpers ──────────────────────────────────────

function getPageUrl(baseUrl: string, page: number): string {
  const u = new URL(baseUrl);
  u.searchParams.set("s", String(page));
  return u.toString();
}

// ─── Main harvest function ───────────────────────────────────

interface HarvestResult {
  scope_code: string;
  platform: string;
  pages_fetched: number;
  total_extracted: number;
  after_filter: number;
  new_count: number;
  duplicate_count: number;
  phones_found: number;
  errors: string[];
  duration_ms: number;
}

async function harvestScope(supabase: SupabaseClient, scopeId: string, scopeCode: string, platform: string, baseUrl: string, governorate: string): Promise<HarvestResult> {
  const start = Date.now();
  const result: HarvestResult = {
    scope_code: scopeCode,
    platform,
    pages_fetched: 0,
    total_extracted: 0,
    after_filter: 0,
    new_count: 0,
    duplicate_count: 0,
    phones_found: 0,
    errors: [],
    duration_ms: 0,
  };

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8" });
    await page.setViewport({ width: 1280, height: 800 });

    const allListings: ExtractedListing[] = [];
    const seenUrls = new Set<string>();

    for (let pg = 1; pg <= MAX_PAGES_PER_SCOPE; pg++) {
      const url = pg === 1 ? baseUrl : getPageUrl(baseUrl, pg);
      console.log(`[${scopeCode}] Page ${pg}: ${url}`);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await delay(2000);

        let listings: ExtractedListing[] = [];
        switch (platform) {
          case "semsarmasr":
          case "carsemsar":
            listings = await extractSemsarMasr(page);
            break;
          case "hatla2ee":
            listings = await extractHatla2ee(page);
            break;
          case "contactcars":
            listings = await extractContactCars(page);
            break;
        }

        if (listings.length === 0) {
          console.log(`[${scopeCode}] Page ${pg}: empty — stopping`);
          break;
        }

        // Age check: stop when >50% of listings are older than MAX_AGE_DAYS
        let fresh = 0, stale = 0, unknown = 0;
        const freshListings: ExtractedListing[] = [];
        for (const l of listings) {
          const ageDays = parseAgeInDays(l.dateText);
          if (ageDays === null) { unknown++; freshListings.push(l); }
          else if (ageDays <= MAX_AGE_DAYS) { fresh++; freshListings.push(l); }
          else { stale++; }
        }
        const totalKnown = fresh + stale;
        const reachedArchive = totalKnown >= 5 && stale / totalKnown >= 0.5;

        let newOnPage = 0;
        for (const l of freshListings) {
          if (!seenUrls.has(l.url)) {
            seenUrls.add(l.url);
            allListings.push(l);
            newOnPage++;
          }
        }

        result.pages_fetched++;
        console.log(`[${scopeCode}] Page ${pg}: ${listings.length} total, ${fresh} fresh, ${stale} stale >${MAX_AGE_DAYS}d, ${newOnPage} new`);

        if (reachedArchive) {
          console.log(`[${scopeCode}] Page ${pg}: majority stale (${stale}/${totalKnown}) — reached archive, stopping`);
          break;
        }

        if (pg < MAX_PAGES_PER_SCOPE) await delay(DELAY_BETWEEN_PAGES);
      } catch (err: any) {
        result.errors.push(`Page ${pg}: ${err.message}`);
        console.error(`[${scopeCode}] Page ${pg} error:`, err.message);
        break;
      }
    }

    result.total_extracted = allListings.length;

    // Filter by governorate
    const filtered = filterByGovernorate(allListings, governorate);
    result.after_filter = filtered.length;

    // Save to DB
    for (const listing of filtered) {
      try {
        const cleanUrl = listing.url.split("?")[0];

        // Dedup check
        const { data: existingRows } = await supabase
          .from("ahe_listings")
          .select("id")
          .eq("source_listing_url", cleanUrl)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          await supabase
            .from("ahe_listings")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", existingRows[0].id);
          result.duplicate_count++;
          continue;
        }

        const loc = mapLocation(listing.location);
        const phone = listing.sellerPhone?.replace(/^\+?2/, "") || null;
        const normalizedPhone = phone && phone.length >= 10 ? (phone.startsWith("0") ? phone : "0" + phone) : null;

        // Upsert seller
        let sellerId: string | null = null;
        if (normalizedPhone || listing.sellerName) {
          const { data: existingSeller } = normalizedPhone
            ? await supabase.from("ahe_sellers").select("id").eq("phone", normalizedPhone).limit(1)
            : { data: [] };

          if (existingSeller && existingSeller.length > 0) {
            sellerId = existingSeller[0].id;
          } else {
            const { data: newSeller } = await supabase
              .from("ahe_sellers")
              .insert({
                phone: normalizedPhone,
                name: listing.sellerName,
                source_platform: platform,
                primary_governorate: loc.governorate || null,
                total_listings_seen: 1,
                priority_score: normalizedPhone ? 25 : 0,
                pipeline_status: normalizedPhone ? "phone_found" : "discovered",
              })
              .select("id")
              .single();
            if (newSeller) sellerId = newSeller.id;
          }
        }

        await supabase.from("ahe_listings").insert({
          scope_id: scopeId,
          source_platform: platform,
          source_listing_url: cleanUrl,
          title: listing.title,
          description: listing.description || null,
          price: listing.price,
          thumbnail_url: listing.thumbnailUrl,
          main_image_url: listing.thumbnailUrl,
          all_image_urls: listing.thumbnailUrl ? [listing.thumbnailUrl] : [],
          source_location: listing.location,
          governorate: loc.governorate,
          city: loc.city,
          area: loc.area,
          ahe_seller_id: sellerId,
          extracted_phone: normalizedPhone,
          phone_source: normalizedPhone ? "puppeteer_inline" : null,
        });

        result.new_count++;
        if (normalizedPhone) result.phones_found++;
      } catch (err: any) {
        result.errors.push(`Save ${listing.url}: ${err.message}`);
      }
    }

    // Update scope
    await supabase
      .from("ahe_scopes")
      .update({
        last_harvest_at: new Date().toISOString(),
        next_harvest_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        server_fetch_blocked: false,
        last_harvest_new_listings: result.new_count,
      })
      .eq("id", scopeId);

  } catch (err: any) {
    result.errors.push(err.message);
  } finally {
    await page.close().catch(() => {});
  }

  result.duration_ms = Date.now() - start;
  return result;
}

// ─── Cron: harvest all ready blocked scopes ──────────────────

async function cronHarvest(): Promise<HarvestResult[]> {
  const supabase = getSupabase();
  const results: HarvestResult[] = [];

  const { data: scopes } = await supabase
    .from("ahe_scopes")
    .select("id, code, source_platform, base_url, governorate")
    .in("source_platform", BLOCKED_PLATFORMS)
    .eq("is_active", true)
    .eq("is_paused", false)
    .lte("next_harvest_at", new Date().toISOString())
    .order("next_harvest_at", { ascending: true })
    .limit(10);

  if (!scopes || scopes.length === 0) {
    console.log("[Cron] No ready scopes for blocked platforms");
    return results;
  }

  console.log(`[Cron] Found ${scopes.length} ready scopes`);

  for (const scope of scopes) {
    console.log(`[Cron] Harvesting ${scope.code}...`);
    const result = await harvestScope(
      supabase,
      scope.id,
      scope.code,
      scope.source_platform,
      scope.base_url,
      scope.governorate || ""
    );
    results.push(result);
    console.log(`[Cron] ${scope.code}: ${result.new_count} new, ${result.duplicate_count} dup, ${result.phones_found} phones`);

    if (scopes.indexOf(scope) < scopes.length - 1) {
      await delay(DELAY_BETWEEN_SCOPES);
    }
  }

  await closeBrowser();
  return results;
}

// ─── HTTP Server ─────────────────────────────────────────────

function parseUrl(req: IncomingMessage): URL {
  return new URL(req.url || "/", `http://localhost:${PORT}`);
}

function json(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

const server = createServer(async (req, res) => {
  const url = parseUrl(req);
  const path = url.pathname;

  if (path === "/health") {
    return json(res, { status: "ok", service: "puppeteer-harvester", platforms: BLOCKED_PLATFORMS });
  }

  if (path === "/harvest") {
    const scopeCode = url.searchParams.get("scope_code");
    if (!scopeCode) return json(res, { error: "scope_code required" }, 400);

    const supabase = getSupabase();
    const { data: scope } = await supabase
      .from("ahe_scopes")
      .select("id, code, source_platform, base_url, governorate")
      .eq("code", scopeCode)
      .single();

    if (!scope) return json(res, { error: "Scope not found" }, 404);
    if (!BLOCKED_PLATFORMS.includes(scope.source_platform)) {
      return json(res, { error: `Platform ${scope.source_platform} is not a blocked platform` }, 400);
    }

    const result = await harvestScope(supabase, scope.id, scope.code, scope.source_platform, scope.base_url, scope.governorate || "");
    await closeBrowser();
    return json(res, result);
  }

  if (path === "/cron/harvest") {
    const auth = req.headers.authorization;
    if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
      return json(res, { error: "Unauthorized" }, 401);
    }

    const results = await cronHarvest();
    const summary = {
      scopes_harvested: results.length,
      total_new: results.reduce((s, r) => s + r.new_count, 0),
      total_duplicate: results.reduce((s, r) => s + r.duplicate_count, 0),
      total_phones: results.reduce((s, r) => s + r.phones_found, 0),
      results,
    };
    return json(res, summary);
  }

  json(res, {
    service: "puppeteer-harvester",
    endpoints: [
      "GET /health",
      "GET /harvest?scope_code=SEM-PROP-ALEX",
      "GET /cron/harvest",
    ],
  });
});

server.listen(PORT, () => {
  console.log(`🤖 Puppeteer Harvester running on port ${PORT}`);
  console.log(`📋 Platforms: ${BLOCKED_PLATFORMS.join(", ")}`);
});
