/**
 * مكسب Workers Server — Railway
 *
 * Endpoints:
 *   GET|POST /harvest         — Harvest a specific scope (GET ?scope_code=XXX or POST { scope_code })
 *   GET  /harvest/status      — Engine status + scopes overview
 *   GET  /cron/harvest        — Automated: pick ready scopes & harvest them
 *   GET  /health              — Health check
 *
 * Features:
 *   - Cheerio-based article parsing for Dubizzle listings
 *   - Auto-queue new sellers with phones to CRM as leads
 *   - 5s delay between requests for rate limiting
 *
 * Also starts the auction-cron worker in background.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

// ─── Config ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000", 10);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const VERCEL_HARVEST_URL = process.env.VERCEL_HARVEST_URL || ""; // e.g. https://maksab.vercel.app/api/admin/crm/harvester/harvest-vercel

// Platforms that should be harvested via Vercel (Railway IPs blocked by WAF)
// hatla2ee, contactcars, semsarmasr removed — both Vercel AND Railway blocked (403)
// They will try Railway locally first, then fail gracefully
const VERCEL_DELEGATED_PLATFORMS = [
  "opensooq",
  "aqarmap",
  "dowwr",
  "propertyfinder",
  "yallamotor",
  "olx",
];

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
};

// ─── Supabase Client ─────────────────────────────────────────
function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Types ───────────────────────────────────────────────────
interface ParsedListing {
  url: string;
  sourceId: string;
  title: string;
  price: number | null;
  thumbnailUrl: string | null;
  location: string;
  dateText: string;
  sellerName: string | null;
  sellerProfileUrl: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isFeatured: boolean;
  supportsExchange: boolean;
  isNegotiable: boolean;
  extractedPhone: string | null;
  phoneSource: string | null;
}

interface HarvestResult {
  success: boolean;
  scope_code: string;
  pages_fetched: number;
  fetched: number;
  new: number;
  duplicate: number;
  sellers_new: number;
  phones_extracted: number;
  crm_queued: number;
  errors: string[];
  duration_ms: number;
  debug?: Record<string, any>;
}

// ─── Cheerio-based Dubizzle Parser ───────────────────────────
// Mirrors the bookmarklet's article-based extraction strategy

function parseDubizzleHtml(html: string): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];
  const seenUrls = new Set<string>();

  $("article").each(function () {
    const article = $(this);

    // Find the ad link
    const adLink = article.find('a[href*="/ad/"]').first();
    if (!adLink.length) return;

    const href = adLink.attr("href") || "";
    const url = href.startsWith("http")
      ? href
      : `https://www.dubizzle.com.eg${href}`;

    // Extract source ID from URL pattern: ID12345.html
    const idMatch = url.match(/ID(\d+)\.html/);
    if (!idMatch) return;

    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const sourceId = idMatch[1];
    const title = (adLink.attr("title") || adLink.text().trim() || "").trim();
    if (!title || title.length < 3) return;

    // Thumbnail: img with -400x300 pattern
    const img = article.find('img[src*="-400x300"]').first();
    const thumbnailUrl = img.attr("src") || null;

    // Card text for regex extraction
    const cardText = article.text() || "";

    // Price: match digits followed by ج.م
    const priceMatch = cardText.match(/([\d,]+)\s*ج\.م/);
    const price = priceMatch
      ? parseInt(priceMatch[1].replace(/,/g, ""), 10)
      : null;

    // Date text: "منذ X دقائق/ساعات/أيام/..."
    const dateMatch = cardText.match(
      /منذ\s+\d+\s*(دقيقة|دقائق|ساعة|ساعات|يوم|أيام|أسبوع|أسابيع|شهر|أشهر)/
    );
    const dateText = dateMatch ? dateMatch[0].trim() : "";

    // Location extraction (same logic as bookmarklet)
    let location = "";
    const govs =
      "القاهرة|الجيزة|الإسكندرية|الدقهلية|البحيرة|المنوفية|الغربية|كفر الشيخ|الشرقية|القليوبية|الفيوم|بني سويف|المنيا|أسيوط|سوهاج|قنا|الأقصر|أسوان|البحر الأحمر|الوادي الجديد|مطروح|شمال سيناء|جنوب سيناء|بورسعيد|السويس|الإسماعيلية|دمياط";

    // Find the element containing bullet + "منذ" (location is before that)
    let locSrc = cardText;
    let minLen = Infinity;
    article.find("*").each(function () {
      const t = $(this).text() || "";
      if (
        /[•·]/.test(t) &&
        /منذ/.test(t) &&
        t.length < minLen &&
        t.length > 5 &&
        t.length < 150
      ) {
        minLen = t.length;
        locSrc = t;
      }
    });

    const bulletIdx = locSrc.search(/[•·]\s*منذ/);
    if (bulletIdx > -1) {
      const before = locSrc.substring(Math.max(0, bulletIdx - 60), bulletIdx).trim();
      // Try "area، governorate" pattern
      const agRe = new RegExp(
        `([\\u0600-\\u06FF][\\u0600-\\u06FF\\u0020]{0,28})[،,]\\s*(${govs})$`
      );
      const agM = before.match(agRe);
      if (agM) {
        location = `${agM[1].trim()}، ${agM[2]}`;
      } else {
        // Try just governorate
        const gRe = new RegExp(`(${govs})$`);
        const gM = before.match(gRe);
        if (gM) location = gM[1];
      }
    }

    // Flags
    const supportsExchange =
      cardText.includes("متوفر التبادل") || cardText.includes("تبادل");
    const isNegotiable = cardText.includes("قابل للتفاوض");
    const isFeatured =
      cardText.includes("مميز") ||
      cardText.includes("إيليت") ||
      !!article.find('[aria-label="Elite"]').length;
    const isVerified = cardText.includes("موثق");
    const isBusiness = cardText.includes("صاحب عمل");

    // Seller: try multiple extraction methods
    let sellerName: string | null = null;
    let sellerProfileUrl: string | null = null;

    // Method 1: company link
    const companyLink = article.find('a[href*="/companies/"]').first();
    if (companyLink.length) {
      sellerName = companyLink.text().trim() || null;
      sellerProfileUrl = companyLink.attr("href") || null;
    }

    // Method 2: member/profile/user link
    if (!sellerName) {
      const memberLink = article.find('a[href*="/member/"], a[href*="/profile/"], a[href*="/user/"]').first();
      if (memberLink.length) {
        sellerName = memberLink.text().trim() || null;
        sellerProfileUrl = memberLink.attr("href") || null;
      }
    }

    // Method 3: aria-label or data-testid for seller
    if (!sellerName) {
      const sellerEl = article.find('[aria-label*="eller"], [aria-label*="عضو"], [data-testid*="seller"], [data-testid*="user"]').first();
      if (sellerEl.length) {
        sellerName = sellerEl.text().trim() || null;
      }
    }

    // Method 4: REMOVED — seller name now extracted from detail page only

    // Path 3: Extract phone from card text (zero cost — no extra HTTP request)
    let extractedPhone: string | null = null;
    let phoneSource: string | null = null;
    const cardPhoneMatch = cardText.match(/01[0-25]\d{8}/g);
    if (cardPhoneMatch) {
      const candidatePhone = cardPhoneMatch[0];
      // Make sure it's not a price (phones are 11 digits, not followed by ج.م)
      if (candidatePhone.length === 11 && !cardText.includes(candidatePhone + ' ج.م')) {
        extractedPhone = candidatePhone;
        phoneSource = 'card_text';
      }
    }

    // Debug: log first 2 articles' seller extraction
    if (listings.length < 2) {
      console.log(`[Harvest] 🔍 Seller DEBUG article #${listings.length + 1}:`, {
        sellerName: sellerName || "(empty)",
        sellerProfileUrl: sellerProfileUrl || "(empty)",
        isVerified,
        isBusiness,
        companyLink: companyLink.length > 0,
        memberLink: article.find('a[href*="/member/"]').length > 0,
        profileLink: article.find('a[href*="/profile/"]').length > 0,
        userLink: article.find('a[href*="/user/"]').length > 0,
        allLinks: article.find("a").map((_: any, el: any) => cheerio.load(el)("a").attr("href")).get().slice(0, 8),
        textSample: cardText.substring(0, 200),
      });
    }

    listings.push({
      url,
      sourceId,
      title,
      price,
      thumbnailUrl,
      location,
      dateText,
      sellerName,
      sellerProfileUrl: sellerProfileUrl
        ? sellerProfileUrl.startsWith("http")
          ? sellerProfileUrl
          : `https://www.dubizzle.com.eg${sellerProfileUrl}`
        : null,
      isVerified,
      isBusiness,
      isFeatured,
      supportsExchange,
      isNegotiable,
      extractedPhone,
      phoneSource,
    });
  });

  return listings;
}

// ─── Cheerio-based SemsarMasr Parser ────────────────────────
// Extracts listings from .ListCont cards + phone numbers from inline JSON
function parseSemsarMasrHtml(html: string): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];
  const seenIds = new Set<string>();

  // Strategy 0: Extract phone numbers + seller names from inline JSON
  // Format: {'AdID':'3025616','name':'moamen','AdTitle':'...','IntlPhone':'+201212717373','AdPhone':'+201212717373','Image':''}
  const phoneMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};
  const jsonRe = /'AdID':'(\d+)','name':'([^']*)','AdTitle':'([^']*)','IntlPhone':'([^']*)','AdPhone':'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = jsonRe.exec(html)) !== null) {
    const adId = m[1];
    const selName = m[2]?.trim();
    const intlPhone = m[4]?.trim();
    const adPhone = m[5]?.trim();
    const phone = (intlPhone || adPhone || "").replace(/[^\d+]/g, "");
    if (phone && phone.length >= 10) phoneMap[adId] = phone;
    if (selName) nameMap[adId] = selName;
  }
  console.log(`[SemsarMasr Parser] Found ${Object.keys(phoneMap).length} phones from inline JSON`);

  // Strategy 1: .ListCont cards
  const cards = $(".ListCont, .Prem_ListDesStyle, [class*=ListCont]");
  console.log(`[SemsarMasr Parser] Found ${cards.length} cards`);

  cards.each(function () {
    const card = $(this);
    const link = card.find('a[href*="/3akarat/"]').first();
    if (!link.length) return;

    const url = link.attr("href") || "";
    if (!url) return;

    // Extract AdID for dedup and phone lookup
    const adIdMatch = url.match(/\/3akarat\/(\d+)/);
    const adId = adIdMatch ? adIdMatch[1] : null;
    if (adId) {
      if (seenIds.has(adId)) return;
      seenIds.add(adId);
    }

    // Make URL absolute
    const fullUrl = url.startsWith("http") ? url : `https://www.semsarmasr.com${url}`;

    const cardText = card.text() || "";
    const titleEl = card.find(".Intcell, .ListInfo").first();
    let title = titleEl.text()?.trim() || "";
    title = title.replace(/^\d+/, "").trim();
    if (!title || title.length < 5) return;

    // Price
    const priceMatch = cardText.match(/([\d,]+)\s*جنيه/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : null;

    // Thumbnail
    const img = card.find('img[src*=".jpg"], img[src*=".jpeg"], img[src*=".png"], img[src*=".webp"]').first();
    const thumbnail = img.attr("src") || null;

    // Location
    const locMatch = cardText.match(/(الإسكندرية|اسكندرية|سموحة|سيدي بشر|المنتزه|العجمي|رشدي|لوران|ستانلي|جليم|محرم بك|كفر عبد|المعمورة|المندرة|ميامي|العصافرة|بحري|طوسون|العطارين|المنشية)/);
    const location = locMatch ? `${locMatch[1]} — الإسكندرية` : "الإسكندرية";

    // Area
    const areaMatch = cardText.match(/(\d+)\s*(?:م |متر|m²)/);
    const fullTitle = title + (areaMatch ? ` — ${areaMatch[1]}م²` : "");

    // Phone from inline JSON
    const phone = adId && phoneMap[adId] ? phoneMap[adId] : null;
    const sellerName = adId && nameMap[adId] ? nameMap[adId] : null;

    listings.push({
      url: fullUrl,
      sourceId: adId || fullUrl,
      title: fullTitle,
      price,
      thumbnailUrl: thumbnail,
      location,
      dateText: "",
      sellerName,
      sellerProfileUrl: null,
      isVerified: false,
      isBusiness: false,
      isFeatured: cardText.includes("مميز") || cardText.includes("مُميز"),
      supportsExchange: false,
      isNegotiable: cardText.includes("تفاوض"),
      extractedPhone: phone,
      phoneSource: phone ? "inline_json" : null,
    });
  });

  // Strategy 2: Fallback — any /3akarat/ links not in cards
  if (listings.length === 0) {
    $('a[href*="/3akarat/"]').each(function () {
      const a = $(this);
      const aurl = a.attr("href") || "";
      if (!aurl || !/\/3akarat\/\d/.test(aurl)) return;
      const aIdM = aurl.match(/\/3akarat\/(\d+)/);
      const aId = aIdM ? aIdM[1] : null;
      if (aId && seenIds.has(aId)) return;
      if (aId) seenIds.add(aId);

      const fullUrl = aurl.startsWith("http") ? aurl : `https://www.semsarmasr.com${aurl}`;
      const atitle = a.text()?.trim().replace(/^\d+/, "").trim();
      if (!atitle || atitle.length < 5) return;

      const pText = a.parent()?.text() || "";
      const ap = pText.match(/([\d,]+)\s*جنيه/);
      const phone = aId && phoneMap[aId] ? phoneMap[aId] : null;

      listings.push({
        url: fullUrl,
        sourceId: aId || fullUrl,
        title: atitle,
        price: ap ? parseInt(ap[1].replace(/,/g, "")) : null,
        thumbnailUrl: null,
        location: "الإسكندرية",
        dateText: "",
        sellerName: aId && nameMap[aId] ? nameMap[aId] : null,
        sellerProfileUrl: null,
        isVerified: false,
        isBusiness: false,
        isFeatured: false,
        supportsExchange: false,
        isNegotiable: false,
        extractedPhone: phone,
        phoneSource: phone ? "inline_json" : null,
      });
    });
  }

  const withPhone = listings.filter((l) => l.extractedPhone).length;
  console.log(`[SemsarMasr Parser] Extracted ${listings.length} unique listings, ${withPhone} with phone numbers`);
  return listings;
}

// ─── Platform-based Parser Router ───────────────────────────
function parseHtmlForPlatform(html: string, platform: string): ParsedListing[] {
  switch (platform) {
    case "semsarmasr":
    case "carsemsar":
      return parseSemsarMasrHtml(html);
    default:
      return parseDubizzleHtml(html);
  }
}

// ─── Location Mapper (minimal — matches the src/lib version) ──
const GOVERNORATE_MAP: Record<string, string> = {
  القاهرة: "cairo",
  الإسكندرية: "alexandria",
  الاسكندرية: "alexandria",
  اسكندرية: "alexandria",
  الجيزة: "giza",
  القليوبية: "qalyubia",
  الشرقية: "sharqia",
  الدقهلية: "dakahlia",
  الغربية: "gharbia",
  المنوفية: "monufia",
  البحيرة: "beheira",
  "كفر الشيخ": "kafr_el_sheikh",
  دمياط: "damietta",
  بورسعيد: "port_said",
  الإسماعيلية: "ismailia",
  السويس: "suez",
  الفيوم: "fayoum",
  "بني سويف": "beni_suef",
  المنيا: "minya",
  أسيوط: "assiut",
  سوهاج: "sohag",
  قنا: "qena",
  الأقصر: "luxor",
  أسوان: "aswan",
  "البحر الأحمر": "red_sea",
  مطروح: "matrouh",
  "شمال سيناء": "north_sinai",
  "جنوب سيناء": "south_sinai",
  "الوادي الجديد": "new_valley",
};

function mapLocationFromText(text: string): {
  governorate: string | null;
  city: string | null;
} {
  if (!text) return { governorate: null, city: null };
  const lower = text.trim();
  for (const [key, value] of Object.entries(GOVERNORATE_MAP)) {
    if (lower.includes(key)) {
      // Try to extract city (text before the comma)
      const parts = lower.split(/[،,]/);
      const city =
        parts.length > 1 ? parts[0].trim().replace(/\s+/g, "_") : null;
      return { governorate: value, city };
    }
  }
  return { governorate: null, city: null };
}

// ─── Governorate Normalizer ──────────────────────────────────
// Converts any governorate format (Arabic, English, slug) to a canonical slug
// Reuses GOVERNORATE_MAP above + extra English/Arabic variants
const GOV_NORMALIZE_EXTRA: Record<string, string> = {
  alex: "alexandria",
  الاسكندرية: "alexandria",
  اسكندرية: "alexandria",
  الاسماعيلية: "ismailia",
};

function normalizeGovernorate(gov: string | null | undefined): string | null {
  if (!gov) return null;
  const trimmed = gov.trim();
  const lower = trimmed.toLowerCase();

  // Check GOVERNORATE_MAP (Arabic → slug)
  if (GOVERNORATE_MAP[trimmed]) return GOVERNORATE_MAP[trimmed];

  // Check extras (Arabic without ال variants, etc.)
  if (GOV_NORMALIZE_EXTRA[trimmed]) return GOV_NORMALIZE_EXTRA[trimmed];

  // English slug — already normalized if it matches a value in GOVERNORATE_MAP
  const slugValues = new Set(Object.values(GOVERNORATE_MAP));
  if (slugValues.has(lower)) return lower;

  // Extra English match
  if (GOV_NORMALIZE_EXTRA[lower]) return GOV_NORMALIZE_EXTRA[lower];

  // Partial match for English variants (e.g. "Alexandria, Egypt")
  for (const [key, value] of Object.entries(GOV_NORMALIZE_EXTRA)) {
    if (lower.includes(key)) return value;
  }
  for (const [key, value] of Object.entries(GOVERNORATE_MAP)) {
    if (lower.includes(key.toLowerCase())) return value;
  }

  return lower;
}

// ─── Governorate to Arabic ───────────────────────────────────
// Reverse map: slug → Arabic display name (for consistent DB storage)
const SLUG_TO_ARABIC: Record<string, string> = {
  alexandria: "الإسكندرية",
  cairo: "القاهرة",
  giza: "الجيزة",
  qalyubia: "القليوبية",
  sharqia: "الشرقية",
  dakahlia: "الدقهلية",
  gharbia: "الغربية",
  monufia: "المنوفية",
  beheira: "البحيرة",
  kafr_el_sheikh: "كفر الشيخ",
  damietta: "دمياط",
  port_said: "بورسعيد",
  ismailia: "الإسماعيلية",
  suez: "السويس",
  fayoum: "الفيوم",
  beni_suef: "بني سويف",
  minya: "المنيا",
  assiut: "أسيوط",
  sohag: "سوهاج",
  qena: "قنا",
  luxor: "الأقصر",
  aswan: "أسوان",
  red_sea: "البحر الأحمر",
  matrouh: "مطروح",
  north_sinai: "شمال سيناء",
  south_sinai: "جنوب سيناء",
  new_valley: "الوادي الجديد",
};

function governorateToArabic(gov: string | null | undefined): string | null {
  if (!gov) return null;
  const slug = normalizeGovernorate(gov);
  if (slug && SLUG_TO_ARABIC[slug]) return SLUG_TO_ARABIC[slug];
  return gov.trim();
}

// ─── Date Parser ──────────────────────────────────────────────
function parseRelativeDate(text: string): string | null {
  if (!text) return null;
  const now = new Date();
  const numMatch = text.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1]) : 1;

  if (/دقيق|minute/i.test(text)) {
    now.setMinutes(now.getMinutes() - num);
    return now.toISOString();
  }
  if (/ساع|hour/i.test(text)) {
    now.setHours(now.getHours() - num);
    return now.toISOString();
  }
  if (/يوم|أيام|day/i.test(text)) {
    now.setDate(now.getDate() - num);
    return now.toISOString();
  }
  if (/أسبوع|أسابيع|week/i.test(text)) {
    now.setDate(now.getDate() - num * 7);
    return now.toISOString();
  }
  if (/شهر|أشهر|month/i.test(text)) {
    now.setMonth(now.getMonth() - num);
    return now.toISOString();
  }
  return null;
}

// ─── Phone Extractor ──────────────────────────────────────────
function extractPhone(text: string): string | null {
  if (!text) return null;
  let match = text.match(/\+?20\s?1[0-25]\d{8}/g);
  if (match) return normalizePhone(match[0]);
  match = text.match(/01[0-25]\d{8}/g);
  if (match) return normalizePhone(match[0]);
  match = text.match(/01[0-25][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g);
  if (match) return normalizePhone(match[0]);
  return null;
}

function normalizePhone(phone: string): string | null {
  phone = phone.replace(/[\s.\-+]/g, "");
  if (phone.startsWith("20") && phone.length === 12) phone = "0" + phone.slice(2);
  return /^01[0-25]\d{8}$/.test(phone) ? phone : null;
}

// ─── Seller Priority Score ────────────────────────────────────
function calcPriorityScore(data: {
  isVerified: boolean;
  isBusiness: boolean;
  phone: string | null;
}): number {
  let score = 0;
  if (data.isVerified) score += 30;
  if (data.isBusiness) score += 20;
  if (data.phone) score += 25;
  return Math.min(score, 100);
}

// ─── Per-platform headers (stronger for WAF-protected sites) ─
const PLATFORM_HEADERS: Record<string, Record<string, string>> = {
  hatla2ee: {
    ...BROWSER_HEADERS,
    "Referer": "https://www.google.com/",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  },
  aqarmap: {
    ...BROWSER_HEADERS,
    "Referer": "https://www.google.com/",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
  },
  semsarmasr: {
    ...BROWSER_HEADERS,
    "Referer": "https://www.google.com.eg/",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
  },
};

// ─── Fetch a page with platform-specific headers ────────────
async function fetchDubizzlePage(
  url: string,
  timeoutMs = 20000,
  platform?: string
): Promise<{ html: string; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = (platform && PLATFORM_HEADERS[platform]) || BROWSER_HEADERS;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers,
      redirect: "follow",
    });
    const html = await response.text();
    return { html, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Build paginated URL ─────────────────────────────────────
function buildPageUrl(
  baseUrl: string,
  paginationPattern: string,
  page: number
): string {
  if (page === 1) return baseUrl;
  return baseUrl + paginationPattern.replace("{page}", page.toString());
}

// ─── Detail Page Extraction Helper ──────────────────────────
// Shared by harvest detail fetch, smart fill, and enrichment worker
async function fetchAndExtractDetail(
  supabase: SupabaseClient,
  listing: { id: string; source_listing_url: string; ahe_seller_id: string | null; seller_name?: string | null },
  index: number,
  phoneSource: string,
  platform?: string
): Promise<{ phone: string | null; sellerName: string | null }> {
  console.log(`[Detail] Fetching: ${listing.source_listing_url?.substring(0, 80)}`);
  const { html: detailHtml, status: detailStatus } = await fetchDubizzlePage(listing.source_listing_url, 20000, platform);

  if (detailStatus === 403) {
    console.log("[Detail] Blocked (403) — stopping");
    throw new Error("HTTP_403_BLOCKED");
  }

  if (detailStatus !== 200) {
    console.log(`[Detail] HTTP ${detailStatus} — skipping`);
    return { phone: null, sellerName: null };
  }

  const $detail = cheerio.load(detailHtml);

  // ═══ Seller Name Extraction ═══
  let sellerName: string | null = null;
  let sellerProfileUrl: string | null = null;

  // 1. Find "الصفحة الشخصية" link
  const profileLink = $detail('a').filter(function() {
    const text = $detail(this).text();
    return text.includes('الصفحة الشخصية') || text.includes('صفحة الشخصية');
  });
  if (profileLink.length) {
    const href = profileLink.first().attr('href');
    if (href) {
      sellerProfileUrl = href.startsWith('http') ? href : `https://www.dubizzle.com.eg${href}`;
    }
  }

  // 2. Regex: text near "مدرجة من قبل"
  const bodyText = $detail('body').text();
  const sellerMatch = bodyText.match(/مدرجة من قبل[^]*?([\u0600-\u06FFa-zA-Z0-9\s\.'-]{3,40}?)(?:مستخدم موثق|صاحب عمل موثق|عضو منذ)/);
  if (sellerMatch) {
    sellerName = sellerMatch[1].trim();
    sellerName = sellerName
      .replace(/User\s*photo/gi, '')
      .replace(/صورة المستخدم/g, '')
      .replace(/مستخدم خاص/g, '')
      .replace(/مستخدم/g, '')
      .replace(/مدرجة من قبل/g, '')
      .replace(/private user/gi, '')
      .trim();
    if (sellerName.length > 2 && sellerName[0] === sellerName[1]) {
      sellerName = sellerName.substring(1);
    }
    if (sellerName.length < 2) sellerName = null;
  }

  // 3. Fallback: verified badge element
  if (!sellerName) {
    const verifiedEl = $detail('[class*="verified"], [class*="badge"], [alt*="verified"], [alt*="موثق"]');
    if (verifiedEl.length) {
      const parent = verifiedEl.first().parent();
      const siblingText = parent.text().trim();
      sellerName = siblingText
        .replace(/User\s*photo/gi, '')
        .replace(/صورة المستخدم/g, '')
        .replace(/مستخدم موثق/g, '')
        .replace(/صاحب عمل موثق/g, '')
        .replace(/موثق/g, '')
        .replace(/مدرجة من قبل/g, '')
        .trim();
      // Remove duplicate first character
      if (sellerName.length > 2 && sellerName[0] === sellerName[1]) {
        sellerName = sellerName.substring(1);
      }
      if (sellerName.length < 2 || sellerName.length > 40) sellerName = null;
    }
  }

  // Keep existing seller name if we didn't find a new one (but clean it)
  if (!sellerName && listing.seller_name) {
    sellerName = listing.seller_name
      .replace(/User\s*photo/gi, '')
      .replace(/صورة المستخدم/g, '')
      .replace(/مدرجة من قبل/g, '')
      .trim();
    if (sellerName.length > 2 && sellerName[0] === sellerName[1]) {
      sellerName = sellerName.substring(1);
    }
    if (sellerName.length < 2) sellerName = null;
  }

  // ═══ Description Extraction ═══
  let description = '';

  // Primary: find "الوصف" heading and get text after it
  $detail('h2, h3, h4, [class*="heading"]').each(function() {
    const heading = $detail(this).text().trim();
    if (heading === 'الوصف' || heading.includes('الوصف')) {
      let nextEl = $detail(this).next();
      while (nextEl.length && !nextEl.is('h2, h3, h4')) {
        description += nextEl.text() + ' ';
        nextEl = nextEl.next();
      }
    }
  });

  if (!description || description.length < 20) {
    const descTestId = $detail('[data-testid*="description"], [data-testid*="Description"]').text();
    if (descTestId && descTestId.length > description.length) description = descTestId;
  }
  if (!description || description.length < 20) {
    const descContainers = $detail('.description, #description, [class*="description"], [class*="Description"]').text();
    if (descContainers && descContainers.length > description.length) description = descContainers;
  }

  // Fallback: large div with phone keywords
  if (!description || description.length < 20) {
    $detail('div, section').each(function() {
      const text = $detail(this).text().trim();
      if (text.length > 50 && text.length < 2000 && (text.includes('للتواصل') || text.includes('واتس') || text.includes('فون'))) {
        description = text;
        return false;
      }
    });
  }

  if (!description || description.length < 20) {
    description = bodyText;
  }

  // ═══ Phone Extraction (5 strategies) ═══
  let phone: string | null = null;

  // 1. From description text
  phone = extractPhone(description);

  // 2. From wa.me / whatsapp links
  if (!phone) {
    const waLink = $detail('a[href*="wa.me/"], a[href*="whatsapp.com"]');
    if (waLink.length) {
      const waHref = waLink.first().attr('href') || '';
      const waPhone = waHref.match(/\d{10,}/);
      if (waPhone) phone = normalizePhone(waPhone[0]);
    }
  }

  // 3. From tel: links
  if (!phone) {
    const telLink = $detail('a[href^="tel:"]');
    if (telLink.length) {
      const telHref = telLink.first().attr('href') || '';
      const rawPhone = telHref.replace('tel:', '').replace(/\D/g, '');
      phone = normalizePhone(rawPhone);
    }
  }

  // 4. From phone-specific elements
  if (!phone) {
    const phoneElements = $detail('[data-testid*="phone"], [class*="phone"], [class*="Phone"]');
    phoneElements.each((_: any, el: any) => {
      if (phone) return;
      const elPhone = extractPhone($detail(el).text());
      if (elPhone) phone = elPhone;
    });
  }

  // 5. From full page body as last resort
  if (!phone) {
    phone = extractPhone(bodyText);
  }

  // ═══ DEBUG: first 3 detail fetches ═══
  if (index < 3) {
    console.log(`Detail fetch #${index}`, {
      url: listing.source_listing_url?.substring(0, 60),
      htmlLength: detailHtml.length,
      sellerName,
      sellerProfileUrl,
      descriptionLength: description.length,
      descriptionSample: description.substring(0, 200),
      phoneFound: phone || null,
      anyPhoneInFullPage: detailHtml.match(/01[0-2,5]\d{8}/g)?.slice(0, 3) || [],
      waLink: $detail('a[href*="wa.me"]').attr('href') || null,
      telLink: $detail('a[href^="tel:"]').attr('href') || null,
    });
    console.log('Seller name DEBUG:', {
      sellerName,
      sellerProfileUrl,
      hasProfileLink: profileLink.length > 0,
      textAroundSeller: bodyText.match(/مدرجة من قبل.{0,100}/)?.[0]?.substring(0, 100),
    });
  }

  // ═══ Specifications Extraction (inline — cheerio-based) ═══
  const specifications: Record<string, string> = {};

  // Strategy 1: key-value pairs from li/tr elements
  $detail('li, tr').each(function() {
    const spans = $detail(this).find('span, td, th');
    if (spans.length >= 2) {
      const key = $detail(spans[0]).text().trim();
      const val = $detail(spans[1]).text().trim();
      if (key && val && key !== val && key.length < 50 && val.length < 100) {
        specifications[key] = val;
      }
    }
  });

  // Strategy 2: data-testid or aria-label attribute pairs
  $detail('[data-testid*="spec"], [data-testid*="detail"], [data-testid*="param"]').each(function() {
    const key = $detail(this).find('[data-testid*="label"], [data-testid*="key"]').text().trim();
    const val = $detail(this).find('[data-testid*="value"]').text().trim();
    if (key && val && key !== val) {
      specifications[key] = val;
    }
  });

  console.log(`[Detail] Specs extracted: ${Object.keys(specifications).length} keys`);

  // ═══ Images Extraction ═══
  const allImageUrls: string[] = [];
  $detail('img[src*="dubizzle"], img[src*="olx"], img[src*="classistatic"]').each(function() {
    const src = $detail(this).attr('src') || '';
    if (src && (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
      if (!allImageUrls.includes(src)) allImageUrls.push(src);
    }
  });

  // ═══ Listing type detection ═══
  const fullText = bodyText.toLowerCase();
  const isRental = fullText.includes('للإيجار') || fullText.includes('للايجار') ||
    fullText.includes('إيجار') || fullText.includes('مفروش') ||
    listing.source_listing_url?.includes('for-rent');
  const listingType = isRental ? 'rent' : 'sale';

  // ═══ Normalize specs (inline car/property mapping) ═══
  const CAR_KEYS: Record<string, string> = {
    'الماركة': 'brand', 'الموديل': 'model', 'سنة الصنع': 'year',
    'الكيلومترات': 'mileage', 'ناقل الحركة': 'transmission',
    'نوع الوقود': 'fuel', 'اللون': 'color', 'حجم المحرك': 'engine_cc',
    'Make': 'brand', 'Model': 'model', 'Year': 'year', 'Mileage': 'mileage',
    'Transmission': 'transmission', 'Fuel Type': 'fuel', 'Color': 'color',
  };
  const PROP_KEYS: Record<string, string> = {
    'نوع العقار': 'property_type', 'المساحة': 'area', 'عدد الغرف': 'rooms',
    'عدد الحمامات': 'bathrooms', 'الدور': 'floor', 'التشطيب': 'finishing',
    'Property Type': 'property_type', 'Area': 'area', 'Bedrooms': 'rooms',
    'Bathrooms': 'bathrooms', 'Floor': 'floor', 'Finishing': 'finishing',
  };
  const mapping = listing.source_listing_url?.includes('propert') ? PROP_KEYS : CAR_KEYS;
  const normalizedSpecs: Record<string, string> = {};
  for (const [k, v] of Object.entries(specifications)) {
    normalizedSpecs[mapping[k] || k] = v;
  }

  // ═══ Update listing ═══
  const updateData: Record<string, any> = {};
  if (phone) {
    updateData.extracted_phone = phone;
    updateData.phone_source = phoneSource;
  }
  if (sellerName) updateData.seller_name = sellerName;
  if (sellerProfileUrl) updateData.seller_profile_url = sellerProfileUrl;

  // Add specs + images + description
  if (Object.keys(normalizedSpecs).length > 0) {
    updateData.specifications = normalizedSpecs;
  }
  if (description && description.length > 20) {
    updateData.description = description.substring(0, 5000);
  }
  if (allImageUrls.length > 0) {
    updateData.all_image_urls = allImageUrls;
    updateData.main_image_url = allImageUrls[0];
  }
  if (normalizedSpecs.brand) updateData.detected_brand = normalizedSpecs.brand;
  if (normalizedSpecs.model) updateData.detected_model = normalizedSpecs.model;
  if (normalizedSpecs.area) updateData.area = normalizedSpecs.area;
  updateData.listing_type = listingType;
  updateData.condition = normalizedSpecs.condition || specifications['الحالة'] || null;

  // Try with detail_fetched_at (may not exist yet)
  const fullUpdate = { ...updateData, detail_fetched_at: new Date().toISOString() };
  const { error: updateErr } = await supabase
    .from("ahe_listings")
    .update(fullUpdate)
    .eq("id", listing.id);

  if (updateErr) {
    console.log(`[Detail] Update with detail_fetched_at failed: ${updateErr.message} — retrying without`);
    // Fallback: update without detail_fetched_at
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from("ahe_listings")
        .update(updateData)
        .eq("id", listing.id);
    }
  }

  // ═══ Update seller record ═══
  if (listing.ahe_seller_id) {
    const sellerUpdate: Record<string, any> = {};
    if (phone) {
      sellerUpdate.phone = phone;
      sellerUpdate.pipeline_status = "phone_found";
    }
    if (sellerName) sellerUpdate.name = sellerName;
    if (sellerProfileUrl) sellerUpdate.profile_url = sellerProfileUrl;

    if (Object.keys(sellerUpdate).length > 0) {
      if (phone) {
        // Only update if phone not already set
        await supabase
          .from("ahe_sellers")
          .update(sellerUpdate)
          .eq("id", listing.ahe_seller_id)
          .is("phone", null);
      } else {
        await supabase
          .from("ahe_sellers")
          .update(sellerUpdate)
          .eq("id", listing.ahe_seller_id);
      }
    }
  }

  if (phone) {
    console.log(`[Detail] ✅ Phone ${phone} for listing ${listing.id}`);
  }

  // ═══ BHE: Detect "مطلوب للشراء" (buy request) ads ═══
  // Must read the "نوع الإعلان" field specifically — NOT search full page text
  // (page nav/buttons/filters contain "مطلوب" which caused false positives)
  let isBuyRequest = false;

  // Method 1: Regex on bodyText — match "نوع الإعلان" label then read its value
  const adTypeMatch = bodyText.match(/نوع الإعلان[\s:]*([^\n]{3,30})/);
  if (adTypeMatch) {
    const adTypeValue = adTypeMatch[1].trim();
    isBuyRequest = adTypeValue.includes('مطلوب') && !adTypeValue.includes('معروض');
    console.log('[BHE] Ad type field (regex):', adTypeValue, '→ isBuyRequest:', isBuyRequest);
  }

  // Method 2: DOM — find the element with "نوع الإعلان" label and read the adjacent value
  if (!adTypeMatch) {
    $detail('span, div, li, td, dt, th').each(function(this: any) {
      const text = $detail(this).text().trim();
      if (text === 'نوع الإعلان' || text === 'نوع الإعلان:') {
        const nextEl = $detail(this).next();
        const value = nextEl.text().trim();
        if (value.includes('مطلوب') && !value.includes('معروض')) {
          isBuyRequest = true;
        }
        console.log('[BHE] Ad type element (DOM):', value, '→ isBuyRequest:', isBuyRequest);
        return false; // break .each()
      }
    });
  }

  // Method 3: JSON-LD structured data
  if (!adTypeMatch && !isBuyRequest) {
    $detail('script[type="application/ld+json"]').each(function(this: any) {
      try {
        const json = JSON.parse($detail(this).html() || '');
        if (json.additionalProperty) {
          for (const prop of json.additionalProperty) {
            if (prop.name === 'نوع الإعلان' || prop.name === 'ad_type') {
              if (prop.value?.includes('مطلوب')) isBuyRequest = true;
              console.log('[BHE] Ad type JSON-LD:', prop.value, '→ isBuyRequest:', isBuyRequest);
            }
          }
        }
      } catch {}
    });
  }

  if (isBuyRequest) {
    const detailTitle = $detail('h1').first().text().trim() || '';
    const detailPrice = (() => {
      const priceMatch = bodyText.match(/([\d,]+)\s*ج\.م/);
      return priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;
    })();
    const detailCategory = (() => {
      const url = listing.source_listing_url || '';
      if (/mobile|phone|هاتف/.test(url)) return 'phones';
      if (/vehicle|car|سيار/.test(url)) return 'vehicles';
      if (/propert|عقار/.test(url)) return 'properties';
      if (/electron/.test(url)) return 'electronics';
      if (/furniture|أثاث/.test(url)) return 'furniture';
      return 'general';
    })();
    const detailGovernorate = (() => {
      const url = listing.source_listing_url || '';
      const govMap: Record<string, string> = {
        'cairo': 'القاهرة', 'giza': 'الجيزة', 'alexandria': 'الإسكندرية',
        'dakahlia': 'الدقهلية', 'sharqia': 'الشرقية', 'qalyubia': 'القليوبية',
        'gharbia': 'الغربية', 'monufia': 'المنوفية', 'beheira': 'البحيرة',
        'minya': 'المنيا', 'asyut': 'أسيوط', 'sohag': 'سوهاج',
        'fayoum': 'الفيوم', 'port-said': 'بورسعيد', 'ismailia': 'الإسماعيلية',
        'suez': 'السويس', 'damietta': 'دمياط', 'luxor': 'الأقصر', 'aswan': 'أسوان',
      };
      for (const [eng, ar] of Object.entries(govMap)) {
        if (url.toLowerCase().includes(eng)) return ar;
      }
      return null;
    })();

    const buyerData = {
      source: 'dubizzle_wanted',
      source_url: listing.source_listing_url || null,
      source_platform: 'dubizzle',
      buyer_name: sellerName || null,
      buyer_phone: phone || null,
      buyer_profile_url: sellerProfileUrl || null,
      product_wanted: detailTitle || 'مطلوب',
      category: detailCategory,
      governorate: detailGovernorate,
      budget_max: detailPrice || null,
      estimated_purchase_value: detailPrice || 0,
      original_text: ((detailTitle || '') + ' - ' + (description || '').substring(0, 200)).substring(0, 500),
      buyer_tier: phone ? 'hot_buyer' : 'warm_buyer',
      buyer_score: phone ? 80 : 50,
      pipeline_status: phone ? 'phone_found' : 'discovered',
      harvested_at: new Date().toISOString(),
    };

    console.log(`[BHE] Buy request found: "${detailTitle.substring(0, 50)}" | phone=${phone || 'none'} | cat=${detailCategory} | gov=${detailGovernorate || 'none'} | price=${detailPrice || 'none'}`);
    console.log(`[BHE] Inserting buyer data:`, JSON.stringify(buyerData).substring(0, 300));

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('bhe_buyers')
        .insert(buyerData)
        .select('id');

      if (insertError) {
        console.log(`[BHE] ❌ INSERT ERROR: code=${insertError.code} msg="${insertError.message}" details="${insertError.details}" hint="${insertError.hint}"`);
      } else {
        console.log(`[BHE] ✅ Buyer saved: id=${insertData?.[0]?.id}`);
      }
    } catch (e: any) {
      console.log(`[BHE] ❌ EXCEPTION on insert: ${e.message}`);
    }

    // Mark listing as buy request
    await supabase.from('ahe_listings')
      .update({ is_buy_request: true })
      .eq('id', listing.id);
  }

  // ═══ BHE: Extract buyer comments ═══
  try {
    await extractBuyerComments(supabase, $detail, listing, bodyText);
  } catch (commentErr: any) {
    console.log(`[BHE] Comment extraction skipped: ${commentErr.message}`);
  }

  return { phone, sellerName };
}

// ─── BHE: Buyer Comment Extraction from Dubizzle Detail Pages ─
const BUYER_INTENT_REGEX = /كام|سعر|متاح|أشوف|فين|للبيع|مهتم|عايز|price|available|لسه|آخر سعر|ينفع|how much|still available|interested|عاوز/i;

async function extractBuyerComments(
  supabase: SupabaseClient,
  $detail: cheerio.CheerioAPI,
  listing: { id: string; source_listing_url: string; seller_name?: string | null },
  bodyText: string
): Promise<number> {
  // Extract listing metadata for buyer records
  const listingTitle = $detail('h1').first().text().trim() ||
    $detail('[data-testid*="title"], [class*="title"]').first().text().trim() || '';
  const listingPrice = (() => {
    const priceMatch = bodyText.match(/([\d,]+)\s*ج\.م/);
    return priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : null;
  })();

  // Extract category from URL
  const category = (() => {
    const url = listing.source_listing_url || "";
    if (/mobile|phone|هاتف/.test(url)) return "phones";
    if (/vehicle|car|سيار/.test(url)) return "vehicles";
    if (/propert|عقار/.test(url)) return "properties";
    if (/electron/.test(url)) return "electronics";
    if (/furniture|أثاث/.test(url)) return "furniture";
    return "general";
  })();

  // Extract governorate from listing URL or body
  const governorate = (() => {
    const url = listing.source_listing_url || "";
    const govMap: Record<string, string> = {
      "cairo": "القاهرة", "giza": "الجيزة", "alexandria": "الإسكندرية",
      "dakahlia": "الدقهلية", "sharqia": "الشرقية", "qalyubia": "القليوبية",
      "gharbia": "الغربية", "monufia": "المنوفية", "beheira": "البحيرة",
      "minya": "المنيا", "asyut": "أسيوط", "sohag": "سوهاج",
      "fayoum": "الفيوم", "port-said": "بورسعيد", "ismailia": "الإسماعيلية",
      "suez": "السويس", "damietta": "دمياط", "luxor": "الأقصر", "aswan": "أسوان",
    };
    for (const [eng, ar] of Object.entries(govMap)) {
      if (url.toLowerCase().includes(eng)) return ar;
    }
    return null;
  })();

  // ═══ Step 1: Extract buyer comments from comment elements ═══
  const commentSelectors = [
    '[class*="comment"]',
    '[class*="Comment"]',
    '[data-testid*="comment"]',
    '[class*="reply"]',
    '[class*="Reply"]',
    '[class*="question"]',
    '[class*="Question"]',
    '[class*="inquiry"]',
    '[class*="Inquiry"]',
  ];

  interface BuyerComment {
    text: string;
    authorName: string | null;
    authorUrl: string | null;
    phone: string | null;
  }

  const buyerComments: BuyerComment[] = [];
  const seenTexts = new Set<string>();

  for (const selector of commentSelectors) {
    const commentEls = $detail(selector);
    if (!commentEls.length) continue;

    commentEls.each(function () {
      const el = $detail(this);
      const commentText = el.text().trim();
      if (!commentText || commentText.length < 5 || commentText.length > 500) return;

      // Deduplicate by text (nested elements may repeat)
      const textKey = commentText.substring(0, 80);
      if (seenTexts.has(textKey)) return;

      // Check buyer intent
      const isBuyerIntent = BUYER_INTENT_REGEX.test(commentText);

      // Extract phone from comment
      const phoneMatch = commentText.match(/01[0-2,5][\s.\-]?\d{3,4}[\s.\-]?\d{4,5}/g);
      const phone = phoneMatch ? phoneMatch[0].replace(/[\s.\-]/g, "") : null;

      if (!isBuyerIntent && !phone) return;

      seenTexts.add(textKey);

      // Extract author
      const authorEl = el.find('a[href*="/member/"], a[href*="/profile/"], a[href*="/user/"], [class*="author"], [class*="user"]').first();
      const authorName = authorEl.text().trim() || null;
      const authorUrl = authorEl.attr("href") || null;

      buyerComments.push({ text: commentText, authorName, authorUrl, phone });
    });

    if (buyerComments.length > 0) break;
  }

  // ═══ Step 2: Scan bodyText for buyer phones NOT from comment elements ═══
  // Get seller's phone (first phone in the page is usually seller's)
  const allPhones = bodyText.match(/01[0-2,5]\d{8}/g) || [];
  const sellerPhone = allPhones.length > 0 ? allPhones[0] : null;
  const commentPhones = new Set(buyerComments.map(c => c.phone).filter(Boolean));

  // Find phones in body that aren't seller's and weren't already captured from comments
  const bodyBuyerPhones = [...new Set(allPhones)]
    .filter(p => p !== sellerPhone && !commentPhones.has(p));

  // Add body-level phones as buyers too
  for (const bp of bodyBuyerPhones) {
    // Check if this phone appears near buyer intent text
    const phoneIdx = bodyText.indexOf(bp);
    if (phoneIdx >= 0) {
      const surrounding = bodyText.substring(Math.max(0, phoneIdx - 100), Math.min(bodyText.length, phoneIdx + 100));
      if (BUYER_INTENT_REGEX.test(surrounding)) {
        buyerComments.push({
          text: surrounding.trim().substring(0, 500),
          authorName: null,
          authorUrl: null,
          phone: bp,
        });
      }
    }
  }

  // ═══ Step 3: Save all buyer comments to bhe_buyers ═══
  let savedCount = 0;

  for (const buyer of buyerComments) {
    try {
      const profileUrl = buyer.authorUrl
        ? (buyer.authorUrl.startsWith("http") ? buyer.authorUrl : `https://www.dubizzle.com.eg${buyer.authorUrl}`)
        : null;

      const { error } = await supabase.from("bhe_buyers").insert({
        source: "dubizzle_comment",
        source_url: listing.source_listing_url,
        source_platform: "dubizzle",
        buyer_name: buyer.authorName,
        buyer_profile_url: profileUrl,
        buyer_phone: buyer.phone,
        product_wanted: listingTitle || null,
        category,
        estimated_purchase_value: listingPrice || 0,
        budget_min: listingPrice ? Math.floor(listingPrice * 0.7) : null,
        budget_max: listingPrice || null,
        governorate,
        original_text: buyer.text.substring(0, 500),
        buyer_tier: buyer.phone ? "hot_buyer" : "warm_buyer",
        buyer_score: buyer.phone ? 70 : 40,
        pipeline_status: buyer.phone ? "phone_found" : "discovered",
        harvested_at: new Date().toISOString(),
      });

      if (error && !error.message?.includes("duplicate")) {
        console.log("[BHE] Insert error:", error.message);
      } else if (!error) {
        savedCount++;
      }
    } catch {
      // Ignore upsert errors (dedup conflicts etc.)
    }
  }

  if (buyerComments.length > 0) {
    console.log(`[BHE] Found ${buyerComments.length} buyer comments, saved ${savedCount} for ${listing.source_listing_url?.substring(0, 50)}`);
  }

  return savedCount;
}

// ─── Core Harvest Logic ──────────────────────────────────────
async function harvestScope(scopeCode: string): Promise<HarvestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const supabase = getSupabase();

  // 1. Load scope
  const { data: scope, error: scopeErr } = await supabase
    .from("ahe_scopes")
    .select("*")
    .eq("code", scopeCode)
    .single();

  if (scopeErr || !scope) {
    // Debug: list available scopes
    const { data: availableScopes } = await supabase
      .from("ahe_scopes")
      .select("code, name, is_active")
      .limit(20);

    return {
      success: false,
      scope_code: scopeCode,
      pages_fetched: 0,
      fetched: 0,
      new: 0,
      duplicate: 0,
      sellers_new: 0,
      phones_extracted: 0,
      crm_queued: 0,
      errors: [`Scope not found: ${scopeCode}`],
      debug: {
        scope_found: false,
        db_error: scopeErr?.message || null,
        available_scopes: (availableScopes || []).map((s: any) => s.code),
        env_check: {
          has_supabase_url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      duration_ms: Date.now() - startTime,
    };
  }

  console.log(`[Harvest] 🚀 Starting harvest for scope "${scope.name}" (${scope.code})`);
  console.log(`[Harvest] 📍 URL: ${scope.base_url}`);

  // 2. Fetch pages
  const allListings: ParsedListing[] = [];
  const maxPages = scope.max_pages_per_harvest || 5;
  const delayMs = scope.delay_between_requests_ms || 5000;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const pageUrl = buildPageUrl(
        scope.base_url,
        scope.pagination_pattern || "?page={page}",
        page
      );
      console.log(`[Harvest] 📄 Page ${page}/${maxPages}: ${pageUrl}`);

      const { html, status } = await fetchDubizzlePage(pageUrl, 20000, scope.source_platform);

      if (status === 403) {
        errors.push(`Page ${page}: HTTP 403 — WAF block`);
        // Mark scope as blocked
        await supabase
          .from("ahe_scopes")
          .update({
            server_fetch_blocked: true,
            server_fetch_blocked_at: new Date().toISOString(),
          })
          .eq("id", scope.id);
        break;
      }

      if (status !== 200) {
        errors.push(`Page ${page}: HTTP ${status}`);
        errors.push(JSON.stringify({
          debug: {
            scope_found: true,
            url_used: pageUrl,
            fetch_status: status,
            response_snippet: html.substring(0, 300),
          },
        }));
        break;
      }

      const listings = parseHtmlForPlatform(html, scope.source_platform || "dubizzle");
      console.log(`[Harvest] 📊 Page ${page}: ${listings.length} listings (platform: ${scope.source_platform})`);

      if (listings.length === 0) {
        if (page === 1) {
          errors.push(
            `Page 1: 0 listings parsed from ${html.length} bytes (${(html.match(/<article/g) || []).length} articles)`
          );
        }
        break;
      }

      allListings.push(...listings);

      // Rate limiting delay
      if (page < maxPages) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    } catch (err: any) {
      errors.push(`Page ${page}: ${err.message}`);
      if (errors.length >= 3) break;
    }
  }

  console.log(`[Harvest] 📊 Fetched total: ${allListings.length} listings`);

  // 3. Filter listings by scope governorate (e.g. Dubizzle returns mixed governorates)
  const filteredListings = allListings.filter((listing) => {
    if (!scope.governorate) return true; // No scope governorate — accept all

    const loc = mapLocationFromText(listing.location);
    if (!loc.governorate) return true; // Can't determine governorate — accept and use scope default

    const normalizedScope = normalizeGovernorate(scope.governorate);
    const normalizedListing = normalizeGovernorate(loc.governorate);

    if (normalizedScope && normalizedListing && normalizedScope !== normalizedListing) {
      console.log(`[Filter] Skipping non-${normalizedScope} listing: ${loc.governorate} — "${listing.title?.substring(0, 50)}"`);
      return false;
    }
    return true;
  });
  console.log(`[Filter] ${allListings.length} → ${filteredListings.length} after governorate filter`);

  // 4. Deduplicate against existing listings
  let newCount = 0;
  let dupCount = 0;
  let sellersNew = 0;

  for (const listing of filteredListings) {
    // Check if already exists
    const { data: existing } = await supabase
      .from("ahe_listings")
      .select("id")
      .eq("source_listing_url", listing.url)
      .eq("is_duplicate", false)
      .maybeSingle();

    if (existing) {
      // Update last_seen_at
      await supabase
        .from("ahe_listings")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      dupCount++;
      continue;
    }

    // Map location
    const loc = mapLocationFromText(listing.location);
    const governorate = governorateToArabic(loc.governorate) || scope.governorate;
    const city = loc.city || scope.city;

    // Hard check: only insert Alexandria listings
    const govCheck = (governorate || '').toLowerCase();
    if (!govCheck.includes('الإسكندرية') && !govCheck.includes('اسكندري') && !govCheck.includes('alexandria')) {
      console.log(`[Filter] REJECT non-Alex at insert: gov="${governorate}" — "${listing.title?.substring(0, 50)}"`);
      continue;
    }

    // Upsert seller — create even without profile URL (use name + governorate as fallback key)
    let aheSellerId: string | null = null;
    let isNewSeller = false;

    if (listing.sellerProfileUrl) {
      // Strategy 1: Match by profile URL
      const { data: existingSeller } = await supabase
        .from("ahe_sellers")
        .select("id")
        .eq("profile_url", listing.sellerProfileUrl)
        .maybeSingle();

      if (existingSeller) {
        aheSellerId = existingSeller.id;
        try {
          await supabase.rpc("increment_seller_listings", {
            p_seller_id: existingSeller.id,
          });
        } catch {
          // RPC may not exist
        }
      } else {
        const { data: newSeller } = await supabase
          .from("ahe_sellers")
          .insert({
            profile_url: listing.sellerProfileUrl,
            name: listing.sellerName || null,
            source_platform: scope.source_platform,
            is_verified: listing.isVerified,
            is_business: listing.isBusiness,
            primary_category: scope.maksab_category,
            primary_governorate: governorate,
            total_listings_seen: 1,
            phone: listing.extractedPhone || null,
            priority_score: calcPriorityScore({
              isVerified: listing.isVerified,
              isBusiness: listing.isBusiness,
              phone: listing.extractedPhone,
            }),
            pipeline_status: listing.extractedPhone ? "phone_found" : "discovered",
          })
          .select("id")
          .single();

        if (newSeller) {
          aheSellerId = newSeller.id;
          isNewSeller = true;
          sellersNew++;
        }
      }
    } else if (listing.sellerName) {
      // Strategy 2: No profile URL but have seller name — match by name + platform
      const { data: existingSeller } = await supabase
        .from("ahe_sellers")
        .select("id")
        .eq("name", listing.sellerName)
        .eq("source_platform", scope.source_platform)
        .eq("primary_governorate", governorate)
        .is("profile_url", null)
        .maybeSingle();

      if (existingSeller) {
        aheSellerId = existingSeller.id;
        try {
          await supabase.rpc("increment_seller_listings", {
            p_seller_id: existingSeller.id,
          });
        } catch {
          // RPC may not exist
        }
      } else {
        const { data: newSeller } = await supabase
          .from("ahe_sellers")
          .insert({
            profile_url: null,
            name: listing.sellerName,
            source_platform: scope.source_platform,
            is_verified: listing.isVerified,
            is_business: listing.isBusiness,
            primary_category: scope.maksab_category,
            primary_governorate: governorate,
            total_listings_seen: 1,
            phone: listing.extractedPhone || null,
            priority_score: calcPriorityScore({
              isVerified: listing.isVerified,
              isBusiness: listing.isBusiness,
              phone: listing.extractedPhone,
            }),
            pipeline_status: listing.extractedPhone ? "phone_found" : "discovered",
          })
          .select("id")
          .single();

        if (newSeller) {
          aheSellerId = newSeller.id;
          isNewSeller = true;
          sellersNew++;
        }
      }
    } else {
      // Strategy 3: No profile URL, no name — create anonymous seller record
      // so the listing still gets linked and detail-fetch phone extraction can update it later
      const { data: newSeller } = await supabase
        .from("ahe_sellers")
        .insert({
          profile_url: null,
          name: null,
          source_platform: scope.source_platform,
          is_verified: listing.isVerified,
          is_business: listing.isBusiness,
          primary_category: scope.maksab_category,
          primary_governorate: governorate,
          total_listings_seen: 1,
          priority_score: calcPriorityScore({
            isVerified: listing.isVerified,
            isBusiness: listing.isBusiness,
            phone: null,
          }),
          pipeline_status: "discovered",
        })
        .select("id")
        .single();

      if (newSeller) {
        aheSellerId = newSeller.id;
        isNewSeller = true;
        sellersNew++;
      }
    }

    // Insert listing
    const insertData: Record<string, any> = {
      scope_id: scope.id,
      source_platform: scope.source_platform,
      source_listing_url: listing.url,
      source_listing_id: listing.sourceId,
      title: listing.title,
      price: listing.price,
      is_negotiable: listing.isNegotiable,
      supports_exchange: listing.supportsExchange,
      is_featured: listing.isFeatured,
      thumbnail_url: listing.thumbnailUrl,
      main_image_url: listing.thumbnailUrl,
      source_category: null,
      maksab_category: scope.maksab_category,
      source_location: listing.location || null,
      governorate,
      city,
      source_date_text: listing.dateText || null,
      estimated_posted_at: parseRelativeDate(listing.dateText),
      seller_name: listing.sellerName,
      seller_profile_url: listing.sellerProfileUrl,
      seller_is_verified: listing.isVerified,
      seller_is_business: listing.isBusiness,
      ahe_seller_id: aheSellerId,
      extracted_phone: listing.extractedPhone,
      phone_source: listing.phoneSource,
    };
    let { error: insertErr } = await supabase.from("ahe_listings").insert(insertData);

    // If insert fails (possibly phone_source column doesn't exist), retry without it
    if (insertErr && insertErr.message?.includes("phone_source")) {
      console.log(`[Harvest] Insert with phone_source failed, retrying without: ${insertErr.message}`);
      delete insertData.phone_source;
      const retry = await supabase.from("ahe_listings").insert(insertData);
      insertErr = retry.error;
    }

    if (insertErr) {
      errors.push(`Insert error for "${listing.title}": ${insertErr.message}`);
    } else {
      newCount++;
    }
  }

  // 3b. Detail fetching — extract phone numbers + seller name from ad detail pages
  // Path 1: Fetch top 50 new listings, 3s delay, 4min timeout
  let phonesExtracted = 0;
  const detailStartTime = Date.now();
  const DETAIL_TIMEOUT = 4 * 60 * 1000; // 4 minutes

  try {
    // Query without detail_fetched_at filter first (column may not exist yet)
    // Then try with filter if available
    let newWithoutPhone: any[] | null = null;
    let detailQuery = supabase
      .from("ahe_listings")
      .select("id, source_listing_url, ahe_seller_id, seller_name")
      .eq("scope_id", scope.id)
      .is("extracted_phone", null)
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: queryResult, error: queryErr } = await detailQuery;
    if (queryErr) {
      console.log(`[Detail] Query error: ${queryErr.message}`);
    }
    newWithoutPhone = queryResult;

    console.log(`[Harvest] === Detail Fetch Debug ===`);
    console.log(`[Harvest] 📞 Query returned: ${newWithoutPhone?.length ?? 0} listings, error: ${queryErr?.message || 'none'}`);

    if (newWithoutPhone && newWithoutPhone.length > 0) {
      console.log(`[Detail] Starting detail fetch for ${newWithoutPhone.length} listings`);
      for (let i = 0; i < newWithoutPhone.length; i++) {
        if (Date.now() - detailStartTime > DETAIL_TIMEOUT) {
          console.log(`[Detail] Timeout after ${i} listings — stopping detail fetch`);
          break;
        }

        const listing = newWithoutPhone[i];
        try {
          await new Promise((r) => setTimeout(r, 3000)); // 3s delay
          const detailResult = await fetchAndExtractDetail(supabase, listing, i, "detail_page", scope.source_platform);
          if (detailResult.phone) phonesExtracted++;
        } catch (e: any) {
          if (e.message === "HTTP_403_BLOCKED") {
            console.log(`[Detail] 403 blocked — stopping all detail fetching`);
            break;
          }
          console.log(`[Harvest] 📞 Detail fetch error: ${e.message}`);
        }
      }
      console.log(`[Harvest] 📞 Total phones extracted (new): ${phonesExtracted}`);
    }

    // Path 2: Smart Fill — use remaining time for old listings without phone
    const timeRemaining = DETAIL_TIMEOUT - (Date.now() - detailStartTime);

    if (timeRemaining > 30000) { // more than 30 seconds remaining
      console.log(`[Smart Fill] Time remaining: ${Math.round(timeRemaining / 1000)}s`);

      const { data: oldListings, error: oldErr } = await supabase
        .from("ahe_listings")
        .select("id, source_listing_url, ahe_seller_id, seller_name")
        .eq("scope_id", scope.id)
        .is("extracted_phone", null)
        .eq("is_duplicate", false)
        .order("created_at", { ascending: false })
        .limit(30);

      console.log(`[Smart Fill] Query: ${oldListings?.length ?? 0} listings, error: ${oldErr?.message || 'none'}`);

      if (oldListings && oldListings.length > 0) {
        console.log(`[Smart Fill] Found ${oldListings.length} old listings without phone`);
        let smartFillPhones = 0;
        let smartFillProcessed = 0;

        for (const oldListing of oldListings) {
          if (Date.now() - detailStartTime > DETAIL_TIMEOUT) {
            console.log(`[Smart Fill] Timeout — stopping`);
            break;
          }

          try {
            await new Promise((r) => setTimeout(r, 3000));
            const result = await fetchAndExtractDetail(supabase, oldListing, smartFillProcessed, "smart_fill");
            if (result.phone) smartFillPhones++;
            smartFillProcessed++;
          } catch (e: any) {
            if (e.message === "HTTP_403_BLOCKED") {
              console.log(`[Smart Fill] 403 blocked — stopping`);
              break;
            }
            console.log(`[Smart Fill] Error: ${e.message}`);
          }
        }

        phonesExtracted += smartFillPhones;
        console.log(`[Smart Fill] Processed ${smartFillProcessed} old listings, ${smartFillPhones} phones found`);
      }
    }
  } catch (e: any) {
    console.log(`[Harvest] 📞 FATAL Detail extraction error: ${e.message}`);
    console.log(`[Harvest] 📞 Stack: ${e.stack?.substring(0, 300)}`);
  }

  // 4. Update scope stats
  await supabase
    .from("ahe_scopes")
    .update({
      last_harvest_at: new Date().toISOString(),
      last_harvest_new_listings: newCount,
      last_harvest_new_sellers: sellersNew,
      next_harvest_at: new Date(
        Date.now() + (scope.harvest_interval_minutes || 60) * 60 * 1000
      ).toISOString(),
      total_harvests: (scope.total_harvests || 0) + 1,
      total_listings_found: (scope.total_listings_found || 0) + newCount,
      total_sellers_found: (scope.total_sellers_found || 0) + sellersNew,
      consecutive_failures:
        allListings.length === 0 && errors.length > 0
          ? (scope.consecutive_failures || 0) + 1
          : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scope.id);

  // 5. Update engine hourly metrics
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);

  await supabase.from("ahe_hourly_metrics").upsert(
    {
      scope_id: scope.id,
      hour_start: hourStart.toISOString(),
      listings_fetched: allListings.length,
      listings_new: newCount,
      listings_duplicate: dupCount,
      sellers_new: sellersNew,
      pages_fetched: Math.min(
        allListings.length > 0 ? Math.ceil(allListings.length / 45) : 1,
        maxPages
      ),
      errors_count: errors.length,
      fetch_duration_seconds: Math.floor((Date.now() - startTime) / 1000),
    },
    { onConflict: "scope_id,hour_start" }
  );

  // 6. Auto-queue new sellers with phones to CRM
  let crmQueued = 0;
  if (sellersNew > 0) {
    crmQueued = await autoQueueSellersToCrm(supabase, scope);
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[Harvest] ✅ Done in ${durationMs}ms — ${newCount} new, ${dupCount} dup, ${sellersNew} sellers, ${crmQueued} CRM queued, ${errors.length} errors`
  );

  return {
    success: errors.length === 0 || newCount > 0,
    scope_code: scopeCode,
    pages_fetched: Math.min(
      allListings.length > 0 ? Math.ceil(allListings.length / 45) : 1,
      maxPages
    ),
    fetched: allListings.length,
    new: newCount,
    duplicate: dupCount,
    sellers_new: sellersNew,
    phones_extracted: phonesExtracted,
    crm_queued: crmQueued,
    errors,
    duration_ms: durationMs,
  };
}

// ─── Auto-Queue Sellers to CRM ───────────────────────────────
async function autoQueueSellersToCrm(
  supabase: SupabaseClient,
  scope: any
): Promise<number> {
  try {
    // Find new sellers with phones that aren't yet in CRM
    const { data: sellers } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, primary_category, primary_governorate, is_verified, is_business, profile_url")
      .eq("pipeline_status", "discovered")
      .not("phone", "is", null)
      .is("crm_customer_id", null)
      .order("priority_score", { ascending: false })
      .limit(50);

    if (!sellers || sellers.length === 0) return 0;

    let queued = 0;
    for (const seller of sellers) {
      // Check if phone already exists in CRM
      const { data: existing } = await supabase
        .from("crm_customers")
        .select("id")
        .eq("phone", seller.phone)
        .maybeSingle();

      if (existing) {
        // Link existing CRM customer to seller
        await supabase
          .from("ahe_sellers")
          .update({ crm_customer_id: existing.id, pipeline_status: "crm_linked" })
          .eq("id", seller.id);
        continue;
      }

      // Create new CRM customer
      const { data: newCustomer, error: crmErr } = await supabase
        .from("crm_customers")
        .insert({
          full_name: seller.name || "معلن من دوبيزل",
          phone: seller.phone,
          source: "platform",
          source_platform: scope.source_platform || "dubizzle",
          source_detail: `AHE harvest — ${scope.code}`,
          source_url: seller.profile_url,
          lifecycle_stage: "lead",
          primary_category: seller.primary_category,
          governorate: seller.primary_governorate,
          account_type: seller.is_business ? "business" : "individual",
          is_verified: seller.is_verified,
        })
        .select("id")
        .single();

      if (crmErr) {
        console.error(`[CRM] Error creating customer for ${seller.phone}: ${crmErr.message}`);
        continue;
      }

      if (newCustomer) {
        // Link CRM customer back to seller
        await supabase
          .from("ahe_sellers")
          .update({ crm_customer_id: newCustomer.id, pipeline_status: "crm_linked" })
          .eq("id", seller.id);
        queued++;
      }
    }

    if (queued > 0) {
      console.log(`[CRM] ✅ Auto-queued ${queued} new sellers as CRM leads`);
    }
    return queued;
  } catch (err: any) {
    console.error(`[CRM] Auto-queue error: ${err.message}`);
    return 0;
  }
}

// ─── Harvest Status ─────────────────────────────────────────
async function getHarvestStatus(): Promise<Record<string, any>> {
  const supabase = getSupabase();

  // Get engine status
  const { data: engine } = await supabase
    .from("ahe_engine_status")
    .select("*")
    .eq("id", 1)
    .single();

  // Get all scopes with summary (no filters — fetch everything for debug)
  const { data: scopes, error: scopesError } = await supabase
    .from("ahe_scopes")
    .select("*")
    .order("is_active", { ascending: false })
    .order("last_harvest_at", { ascending: false, nullsFirst: false });

  console.log("All scopes count:", scopes?.length ?? 0);
  console.log("All scopes error:", scopesError?.message ?? "none");

  // Count totals
  const { count: totalListings } = await supabase
    .from("ahe_listings")
    .select("id", { count: "exact", head: true });

  const { count: totalSellers } = await supabase
    .from("ahe_sellers")
    .select("id", { count: "exact", head: true });

  const { count: crmLeads } = await supabase
    .from("crm_customers")
    .select("id", { count: "exact", head: true })
    .eq("source", "platform");

  const now = new Date();
  const readyScopes = (scopes || []).filter((s: any) =>
    s.is_active && !s.is_paused && !s.server_fetch_blocked &&
    (!s.next_harvest_at || new Date(s.next_harvest_at) <= now)
  );

  const allScopes = scopes || [];

  return {
    env_check: {
      has_supabase_url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabase_url_prefix: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").substring(0, 30),
    },
    engine: {
      status: engine?.status || "unknown",
      requests_this_hour: engine?.current_requests_this_hour || 0,
      max_requests_per_hour: engine?.global_max_requests_per_hour || 0,
    },
    totals: {
      listings: totalListings || 0,
      sellers: totalSellers || 0,
      crm_leads_from_harvest: crmLeads || 0,
    },
    scopes_summary: {
      total: allScopes.length,
      active: allScopes.filter((s: any) => s.is_active && !s.is_paused && !s.server_fetch_blocked).length,
      paused: allScopes.filter((s: any) => s.is_active && s.is_paused).length,
      blocked: allScopes.filter((s: any) => s.server_fetch_blocked).length,
      inactive: allScopes.filter((s: any) => !s.is_active).length,
      ready_now: readyScopes.length,
    },
    debug_scopes: {
      total_in_db: allScopes.length,
      error: scopesError?.message || null,
      first_scope: allScopes[0]?.code || null,
      first_scope_flags: allScopes[0] ? {
        is_active: allScopes[0].is_active,
        is_paused: allScopes[0].is_paused,
        server_fetch_blocked: allScopes[0].server_fetch_blocked,
      } : null,
    },
    scopes: allScopes.map((s: any) => ({
      code: s.code,
      name: s.name,
      status: !s.is_active ? "inactive" : s.server_fetch_blocked ? "blocked" : s.is_paused ? "paused" : "active",
      is_active: s.is_active,
      is_paused: s.is_paused,
      server_fetch_blocked: s.server_fetch_blocked,
      source_platform: s.source_platform,
      governorate: s.governorate,
      maksab_category: s.maksab_category,
      last_harvest_at: s.last_harvest_at,
      next_harvest_at: s.next_harvest_at,
      last_harvest_new_listings: s.last_harvest_new_listings,
      last_harvest_new_sellers: s.last_harvest_new_sellers,
      total_harvests: s.total_harvests,
      total_listings_found: s.total_listings_found,
      total_sellers_found: s.total_sellers_found,
      consecutive_failures: s.consecutive_failures,
      harvest_interval_minutes: s.harvest_interval_minutes,
      is_ready: s.is_active && !s.is_paused && !s.server_fetch_blocked &&
        (!s.next_harvest_at || new Date(s.next_harvest_at) <= now),
    })),
    server_time: now.toISOString(),
  };
}

// ─── Enrichment Worker ──────────────────────────────────────
// Dedicated worker to fetch detail pages for listings without phone/name
async function enrichListings(): Promise<{
  enriched: number;
  phones_found: number;
  names_found: number;
}> {
  console.log('[Enrich] Starting enrichment cycle...');
  const supabase = getSupabase();

  // Fetch 10 listings that haven't had their detail page opened yet
  // Opens ALL listings (not just those without phone) to detect "مطلوب" buy requests
  let listings: any[] | null = null;
  let error: any = null;

  // Fetch any listing without detail_fetched_at — prioritize likely buy requests first
  const result1 = await supabase
    .from("ahe_listings")
    .select("id, source_listing_url, ahe_seller_id, seller_name, is_likely_buy_request")
    .is("detail_fetched_at", null)
    .eq("is_duplicate", false)
    .order("is_likely_buy_request", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (result1.error) {
    console.log(`[Enrich] Query with detail_fetched_at failed: ${result1.error.message}`);
    // Fallback: query without detail_fetched_at — use extracted_phone IS NULL
    const result2 = await supabase
      .from("ahe_listings")
      .select("id, source_listing_url, ahe_seller_id, seller_name")
      .is("extracted_phone", null)
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .limit(20);
    listings = result2.data;
    error = result2.error;
  } else {
    listings = result1.data;
    error = result1.error;
  }

  console.log(`[Enrich] Query result: count=${listings?.length ?? 0}, error=${error?.message || 'none'}`);

  if (error || !listings?.length) {
    console.log('[Enrich] No listings to enrich:', error?.message || 'all detail pages opened');
    return { enriched: 0, phones_found: 0, names_found: 0 };
  }

  const buyRequestCount = listings.filter((l: any) => l.is_likely_buy_request).length;
  console.log(`[Enrich] Processing ${listings.length} listings (${buyRequestCount} likely buyers first)`);

  let phonesFound = 0;
  let namesFound = 0;

  for (const listing of listings) {
    try {
      await new Promise((r) => setTimeout(r, 3000)); // 3s delay
      const result = await fetchAndExtractDetail(supabase, listing, 99, "enrichment_worker");
      if (result.phone) phonesFound++;
      if (result.sellerName) namesFound++;
    } catch (e: any) {
      if (e.message === "HTTP_403_BLOCKED") {
        console.log('[Enrich] 403 detected — stopping enrichment');
        break;
      }
      console.log(`[Enrich] Error: ${e.message}`);
    }
  }

  console.log(`[Enrich] Complete: ${listings.length} processed, ${phonesFound} phones, ${namesFound} names`);
  return { enriched: listings.length, phones_found: phonesFound, names_found: namesFound };
}

// ─── Template Engine (inline — mirrors src/lib/whatsapp/template-engine.ts) ──
const CATEGORY_AR_MAP: Record<string, string> = {
  phones: 'الموبايلات', vehicles: 'السيارات', properties: 'العقارات',
  electronics: 'الإلكترونيات', furniture: 'الأثاث', fashion: 'الملابس',
  gold: 'الذهب والفضة', luxury: 'السلع الفاخرة', appliances: 'الأجهزة المنزلية',
  hobbies: 'الهوايات', tools: 'العدد والأدوات', services: 'الخدمات', scrap: 'الخردة',
};

const GOV_AR_MAP: Record<string, string> = {
  cairo: 'القاهرة', giza: 'الجيزة', alexandria: 'الإسكندرية',
  dakahlia: 'الدقهلية', beheira: 'البحيرة', monufia: 'المنوفية',
  gharbia: 'الغربية', sharqia: 'الشرقية', qalyubia: 'القليوبية',
  fayoum: 'الفيوم', minya: 'المنيا', assiut: 'أسيوط', sohag: 'سوهاج',
  port_said: 'بورسعيد', suez: 'السويس', ismailia: 'الإسماعيلية',
};

function renderTemplate(body: string, vars: Record<string, string>): string {
  let r = body;
  for (const [k, v] of Object.entries(vars)) {
    r = r.split(`{{${k}}}`).join(v || '');
  }
  return r;
}

function getTemplateVars(seller: any): Record<string, string> {
  return {
    first_name: seller.name?.split(' ')[0] || 'أهلاً',
    customer_name: seller.name || '',
    category_name_ar: CATEGORY_AR_MAP[seller.primary_category] || 'المنتجات',
    listings_count: String(seller.total_listings_seen || 0),
    governorate: GOV_AR_MAP[seller.primary_governorate] || seller.primary_governorate || 'مصر',
    join_url: `https://maksab.app/join?ref=${seller.id || ''}`,
    competitor_name: 'دوبيزل',
  };
}

// ─── Outreach Engine ────────────────────────────────────────
async function processOutreach(): Promise<{
  new_conversations: number;
  followups_sent: number;
  completed: number;
}> {
  console.log('[Outreach] Starting outreach cycle...');
  const supabase = getSupabase();
  let newConversations = 0;
  let followupsSent = 0;
  let completedCount = 0;

  try {
    // ═══ Step 1: New sellers with phones not yet contacted ═══
    const { data: sellers, error: sellersErr } = await supabase
      .from("ahe_sellers")
      .select("id, name, phone, primary_category, primary_governorate, is_verified, is_business, whale_score, priority_score, total_listings_seen, profile_url")
      .not("phone", "is", null)
      .in("pipeline_status", ["phone_found", "auto_queued"])
      .order("whale_score", { ascending: false, nullsFirst: false })
      .order("priority_score", { ascending: false })
      .limit(5);

    if (sellersErr) {
      console.log(`[Outreach] Sellers query error: ${sellersErr.message}`);
    }

    console.log(`[Outreach] Found ${sellers?.length || 0} new sellers to contact`);

    if (sellers && sellers.length > 0) {
      // Load automation rules
      const { data: rules } = await supabase
        .from("wa_automation_rules")
        .select("*")
        .eq("trigger_type", "new_seller")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      for (const seller of sellers) {
        try {
          // Check if already contacted
          const { data: existing } = await supabase
            .from("wa_conversations")
            .select("id")
            .eq("phone", seller.phone)
            .maybeSingle();

          if (existing) {
            console.log(`[Outreach] Already contacted: ${seller.phone}`);
            continue;
          }

          // Determine seller type
          const sellerType = (seller.whale_score && seller.whale_score >= 70) ? 'whale'
            : seller.is_business ? 'business' : 'individual';

          // Pick the best matching template
          let matchedRule = rules?.find((r: any) => {
            const cond = r.conditions || {};
            if (cond.category && cond.seller_type) {
              return cond.category === seller.primary_category && cond.seller_type === sellerType;
            }
            if (cond.seller_type) return cond.seller_type === sellerType;
            return false;
          });

          // Fallback to general
          if (!matchedRule) {
            matchedRule = rules?.find((r: any) => r.template_id === 'acq_welcome_general_v1');
          }
          if (!matchedRule) {
            console.log(`[Outreach] No matching rule for seller ${seller.phone}`);
            continue;
          }

          // Render template
          const vars = getTemplateVars(seller);
          const messageBody = renderTemplate(matchedRule.template_body || '', vars);

          // Create conversation
          const { data: conv, error: convErr } = await supabase
            .from("wa_conversations")
            .insert({
              seller_id: seller.id,
              phone: seller.phone,
              customer_name: seller.name,
              category: seller.primary_category,
              governorate: seller.primary_governorate,
              seller_type: sellerType,
              listings_count: seller.total_listings_seen || 0,
              status: 'waiting',
              stage: 'initial_outreach',
              messages_sent: 1,
              last_message_at: new Date().toISOString(),
              last_message_direction: 'outbound',
              next_action: 'followup_24h',
              next_action_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            .select("id")
            .single();

          if (convErr) {
            console.log(`[Outreach] Conv insert error: ${convErr.message}`);
            continue;
          }

          // Create message
          await supabase.from("wa_messages").insert({
            conversation_id: conv.id,
            direction: 'outbound',
            message_type: 'template',
            body: messageBody,
            template_id: matchedRule.template_id,
            ai_generated: false,
            wa_status: 'pending',
          });

          // Update seller pipeline
          await supabase
            .from("ahe_sellers")
            .update({ pipeline_status: 'contacted' })
            .eq("id", seller.id);

          newConversations++;
          console.log(`[Outreach] ✅ New conversation: ${seller.name || seller.phone} (${sellerType})`);
        } catch (e: any) {
          console.log(`[Outreach] Error for seller ${seller.phone}: ${e.message}`);
        }
      }
    }

    // ═══ Step 2: Process scheduled follow-ups ═══
    const { data: scheduled, error: schedErr } = await supabase
      .from("wa_conversations")
      .select("id, phone, customer_name, next_action, seller_id, category, seller_type")
      .lte("next_action_at", new Date().toISOString())
      .in("status", ["waiting", "scheduled"])
      .not("next_action", "is", null)
      .limit(10);

    if (schedErr) {
      console.log(`[Outreach] Scheduled query error: ${schedErr.message}`);
    }

    console.log(`[Outreach] Found ${scheduled?.length || 0} scheduled follow-ups`);

    if (scheduled && scheduled.length > 0) {
      // Load follow-up rules
      const { data: followupRules } = await supabase
        .from("wa_automation_rules")
        .select("*")
        .eq("trigger_type", "followup")
        .eq("is_active", true);

      for (const conv of scheduled) {
        try {
          const action = conv.next_action;

          // Find matching follow-up rule
          const rule = followupRules?.find((r: any) => r.template_id === action);

          // Get seller for template vars
          let seller: any = { name: conv.customer_name, id: conv.seller_id };
          if (conv.seller_id) {
            const { data: s } = await supabase
              .from("ahe_sellers")
              .select("id, name, total_listings_seen, primary_category, primary_governorate")
              .eq("id", conv.seller_id)
              .single();
            if (s) seller = s;
          }

          const vars = getTemplateVars(seller);
          const messageBody = rule
            ? renderTemplate(rule.template_body || '', vars)
            : `أهلاً ${vars.first_name}، بنتابع معاك بخصوص مكسب. لو عندك أي سؤال أنا موجود! 💚`;

          // Create follow-up message
          await supabase.from("wa_messages").insert({
            conversation_id: conv.id,
            direction: 'outbound',
            message_type: 'template',
            body: messageBody,
            template_id: action,
            ai_generated: false,
            wa_status: 'pending',
          });

          // Determine next action
          let nextAction: string | null = null;
          let nextActionAt: string | null = null;
          let newStatus = 'waiting';

          if (action === 'followup_24h') {
            nextAction = 'followup_48h';
            nextActionAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
          } else if (action === 'followup_48h') {
            nextAction = 'followup_72h';
            nextActionAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
          } else if (action === 'followup_72h') {
            newStatus = 'completed';
            completedCount++;
          }

          // Update conversation
          await supabase
            .from("wa_conversations")
            .update({
              messages_sent: (conv as any).messages_sent ? (conv as any).messages_sent + 1 : 2,
              last_message_at: new Date().toISOString(),
              last_message_direction: 'outbound',
              next_action: nextAction,
              next_action_at: nextActionAt,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conv.id);

          followupsSent++;
          console.log(`[Outreach] ✅ Follow-up (${action}): ${conv.customer_name || conv.phone}`);
        } catch (e: any) {
          console.log(`[Outreach] Follow-up error: ${e.message}`);
        }
      }
    }
  } catch (e: any) {
    console.log(`[Outreach] FATAL error: ${e.message}`);
    console.log(`[Outreach] Stack: ${e.stack?.substring(0, 300)}`);
  }

  console.log(`[Outreach] Complete: ${newConversations} new, ${followupsSent} follow-ups, ${completedCount} completed`);
  return { new_conversations: newConversations, followups_sent: followupsSent, completed: completedCount };
}

// ─── Cron Harvest Logic ──────────────────────────────────────
// ─── Market Balance Calculator (Phase 4) ─────────────────────

const BALANCE_CATEGORIES = [
  "phones", "vehicles", "properties", "electronics",
  "furniture", "fashion", "home_appliances", "hobbies",
  "services", "gold_jewelry", "scrap", "luxury",
];

const BALANCE_TARGET_RATIOS: Record<string, number> = {
  phones: 0.33, vehicles: 0.20, properties: 0.10,
  electronics: 0.33, furniture: 0.25, fashion: 0.33,
  home_appliances: 0.33, hobbies: 0.33, services: 0.50,
  gold_jewelry: 0.25, scrap: 0.50, luxury: 0.20,
};

const BALANCE_CATEGORY_AR: Record<string, string> = {
  phones: "موبايلات", vehicles: "سيارات", properties: "عقارات",
  electronics: "إلكترونيات", furniture: "أثاث", fashion: "أزياء",
  home_appliances: "أجهزة منزلية", hobbies: "هوايات", services: "خدمات",
  gold_jewelry: "ذهب ومجوهرات", scrap: "خُردة", luxury: "سلع فاخرة",
};

async function calculateMarketBalanceWorker(): Promise<Array<{
  category: string; supply: number; demand: number; status: string;
}>> {
  const supabase = getSupabase();
  const results: Array<{ category: string; supply: number; demand: number; ratio: number; status: string }> = [];

  for (const cat of BALANCE_CATEGORIES) {
    const { count: supply } = await supabase
      .from("ahe_listings")
      .select("id", { count: "exact", head: true })
      .eq("maksab_category", cat)
      .eq("is_duplicate", false);

    const { count: demand } = await supabase
      .from("bhe_buyers")
      .select("id", { count: "exact", head: true })
      .eq("category", cat)
      .eq("is_duplicate", false)
      .in("pipeline_status", ["discovered", "phone_found", "matched"]);

    const target = BALANCE_TARGET_RATIOS[cat] || 0.33;
    const supplyN = supply || 0;
    const demandN = demand || 0;
    const ratio = demandN > 0 ? supplyN / demandN : (supplyN > 0 ? 999 : 0);

    let status: string;
    let action: string;

    if (!supplyN && !demandN) {
      status = "no_data"; action = "maintain";
    } else if (ratio > target * 5) {
      status = "critical_buyers"; action = "urgent_bhe_needed";
    } else if (ratio > target * 2) {
      status = "needs_buyers"; action = "increase_bhe_priority";
    } else if (ratio < target * 0.3 && demandN > 10) {
      status = "needs_sellers"; action = "maintain";
    } else {
      status = "balanced"; action = "maintain";
    }

    await supabase.from("market_balance").upsert({
      category: cat,
      governorate: null,
      active_listings: supplyN,
      active_buyers: demandN,
      supply_demand_ratio: ratio,
      target_ratio: target,
      balance_status: status,
      recommended_action: action,
      updated_at: new Date().toISOString(),
    }, { onConflict: "category,governorate" });

    // Alerts
    if (status === "critical_buyers") {
      await supabase.from("admin_notifications").insert({
        type: "balance_alert",
        title: `🔴 ${BALANCE_CATEGORY_AR[cat]} — محتاجة مشترين عاجل!`,
        body: `عرض: ${supplyN} | طلب: ${demandN} | النسبة: ${ratio.toFixed(1)}:1`,
        action_url: "/admin/sales/buyer-harvest/paste",
        priority: "urgent",
      });
    } else if (status === "needs_buyers") {
      const { data: existing } = await supabase
        .from("admin_notifications")
        .select("id")
        .eq("type", "balance_alert")
        .ilike("title", `%${BALANCE_CATEGORY_AR[cat]}%`)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!existing?.length) {
        await supabase.from("admin_notifications").insert({
          type: "balance_alert",
          title: `🟡 ${BALANCE_CATEGORY_AR[cat]} — محتاجة مشترين أكتر`,
          body: `عرض: ${supplyN} | طلب: ${demandN}`,
          action_url: "/admin/sales/buyer-harvest/paste",
          priority: "high",
        });
      }
    }

    results.push({ category: cat, supply: supplyN, demand: demandN, ratio, status });
  }

  return results;
}

/**
 * Delegate harvest to Vercel endpoint for platforms blocked on Railway
 * (opensooq, aqarmap, dowwr → Railway IPs get 403, Vercel IPs work)
 */
async function harvestViaVercel(scopeCode: string): Promise<HarvestResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 70000); // 70s (Vercel has 60s limit)

    const response = await fetch(VERCEL_HARVEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope_code: scopeCode }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();

    console.log(
      `[Vercel Proxy] ${data.success ? "✅" : "❌"} ${scopeCode}: ` +
      `${data.listings_new || 0} new, ${data.listings_duplicate || 0} dup, ` +
      `${data.sellers_new || 0} sellers, ${data.duration_ms || 0}ms`
    );

    return {
      success: data.success ?? false,
      scope_code: scopeCode,
      pages_fetched: data.pages_fetched || 0,
      fetched: data.listings_fetched || 0,
      new: data.listings_new || 0,
      duplicate: data.listings_duplicate || 0,
      sellers_new: data.sellers_new || 0,
      phones_extracted: data.phones_extracted || 0,
      crm_queued: 0,
      errors: data.errors || [],
      duration_ms: Date.now() - startTime,
      debug: {
        via: "vercel",
        vercel_url: VERCEL_HARVEST_URL,
        vercel_duration_ms: data.duration_ms,
        buyers_detected: data.buyers_detected || 0,
        warnings: data.warnings || [],
      },
    };
  } catch (err: any) {
    console.error(`[Vercel Proxy] ❌ Failed to delegate ${scopeCode}: ${err.message}`);
    return {
      success: false,
      scope_code: scopeCode,
      pages_fetched: 0,
      fetched: 0,
      new: 0,
      duplicate: 0,
      sellers_new: 0,
      phones_extracted: 0,
      crm_queued: 0,
      errors: [`Vercel delegation failed: ${err.message}`],
      duration_ms: Date.now() - startTime,
      debug: { via: "vercel", vercel_url: VERCEL_HARVEST_URL },
    };
  }
}

async function cronHarvest(): Promise<{
  scopes_processed: number;
  results: HarvestResult[];
}> {
  const supabase = getSupabase();

  // Check engine status
  const { data: engine } = await supabase
    .from("ahe_engine_status")
    .select("*")
    .eq("id", 1)
    .single();

  if (!engine || engine.status !== "running") {
    console.log(
      `[Cron] ⏸️ Engine status: ${engine?.status || "unknown"} — skipping`
    );
    return { scopes_processed: 0, results: [] };
  }

  // Check hourly rate limit
  if (
    engine.current_requests_this_hour >=
    engine.global_max_requests_per_hour
  ) {
    console.log(
      `[Cron] 🚫 Hourly rate limit reached: ${engine.current_requests_this_hour}/${engine.global_max_requests_per_hour}`
    );
    return { scopes_processed: 0, results: [] };
  }

  // Smart scope selection — round-robin with priority
  // Pick the scope that hasn't been harvested the longest (or never), breaking ties by priority
  // If Vercel delegation is configured, also include server_fetch_blocked scopes for delegatable platforms
  let query = supabase
    .from("ahe_scopes")
    .select("*")
    .eq("is_active", true)
    .eq("is_paused", false)
    .or("next_harvest_at.is.null,next_harvest_at.lte.now()");

  if (VERCEL_HARVEST_URL) {
    // Allow blocked scopes if their platform can be delegated to Vercel
    const delegatedPlatformFilter = VERCEL_DELEGATED_PLATFORMS
      .map((p) => `source_platform.eq.${p}`)
      .join(",");
    query = query.or(
      `server_fetch_blocked.eq.false,server_fetch_blocked.is.null,${delegatedPlatformFilter}`
    );
  } else {
    query = query.or("server_fetch_blocked.eq.false,server_fetch_blocked.is.null");
  }

  const { data: readyScopes } = await query
    .order("priority", { ascending: true })
    .order("next_harvest_at", { ascending: true, nullsFirst: true })
    .limit(3);

  if (!readyScopes || readyScopes.length === 0) {
    console.log("[Cron] 😴 No scopes ready for harvest");
    return { scopes_processed: 0, results: [] };
  }

  console.log(
    `[Cron] 🚀 Harvesting ${readyScopes.length} scopes: ${readyScopes.map((s: any) => `${s.code}(${s.source_platform})`).join(", ")}`
  );

  const results: HarvestResult[] = [];

  for (const scope of readyScopes) {
    // Delegate to Vercel for non-Dubizzle platforms (Railway only has Dubizzle parser)
    const shouldDelegateToVercel =
      VERCEL_HARVEST_URL &&
      VERCEL_DELEGATED_PLATFORMS.includes(scope.source_platform);

    try {
      if (shouldDelegateToVercel) {
        console.log(
          `[Cron] 🌐 Delegating ${scope.code} (${scope.source_platform}) to Vercel → ${VERCEL_HARVEST_URL}`
        );
        const result = await harvestViaVercel(scope.code);
        results.push(result);
      } else {
        const result = await harvestScope(scope.code);
        results.push(result);
      }
    } catch (err: any) {
      console.error(`[Cron] ❌ Error harvesting ${scope.code}: ${err.message}`);
      results.push({
        success: false,
        scope_code: scope.code,
        pages_fetched: 0,
        fetched: 0,
        new: 0,
        duplicate: 0,
        sellers_new: 0,
        phones_extracted: 0,
        crm_queued: 0,
        errors: [err.message],
        duration_ms: 0,
      });
    }
  }

  return { scopes_processed: readyScopes.length, results };
}

// ─── HTTP Helpers ────────────────────────────────────────────
function sendJson(
  res: ServerResponse,
  data: Record<string, any>,
  status = 200
) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// ─── Route Handlers ──────────────────────────────────────────

async function handleHarvest(req: IncomingMessage, res: ServerResponse) {
  let scope_code: string | null = null;
  try {
    if (req.method === "GET") {
      // GET /harvest?scope_code=dub_phones_alex
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);
      scope_code = url.searchParams.get("scope_code");
    } else if (req.method === "POST") {
      // POST /harvest { scope_code: "..." }
      const body = await readBody(req);
      scope_code = JSON.parse(body).scope_code;
    } else {
      return sendJson(res, { error: "Method not allowed. Use GET or POST." }, 405);
    }

    if (!scope_code) {
      return sendJson(
        res,
        { error: "Missing required parameter: scope_code (e.g. ?scope_code=dub_phones_alex)" },
        400
      );
    }

    console.log(`[API] ${req.method} /harvest — scope_code: ${scope_code}`);

    // Check if this scope should be delegated to Vercel
    let result: HarvestResult;
    if (VERCEL_HARVEST_URL) {
      const supabase = getSupabase();
      const { data: scopeData } = await supabase
        .from("ahe_scopes")
        .select("source_platform")
        .eq("code", scope_code)
        .single();

      if (scopeData && VERCEL_DELEGATED_PLATFORMS.includes(scopeData.source_platform)) {
        console.log(`[API] 🌐 Delegating ${scope_code} (${scopeData.source_platform}) to Vercel`);
        result = await harvestViaVercel(scope_code);
      } else {
        result = await harvestScope(scope_code);
      }
    } else {
      result = await harvestScope(scope_code);
    }

    sendJson(res, result);
  } catch (err: any) {
    console.error(`[API] /harvest error: ${err.message}`);
    sendJson(res, {
      error: err.message,
      debug: {
        scope_code,
        error_stack: err.stack?.split("\n").slice(0, 5),
        env_check: {
          has_supabase_url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    }, 500);
  }
}

async function handleCronHarvest(req: IncomingMessage, res: ServerResponse) {
  try {
    // Optional: validate CRON_SECRET
    if (CRON_SECRET) {
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);
      const secret = url.searchParams.get("secret") || "";
      const authHeader = req.headers.authorization || "";
      if (secret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return sendJson(res, { error: "Unauthorized" }, 401);
      }
    }

    console.log("[API] GET /cron/harvest — starting cron cycle");

    // Timeout protection: 5 minutes max
    const TIMEOUT_MS = 5 * 60 * 1000;
    let timedOut = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        timedOut = true;
        reject(new Error("TIMEOUT: Cron harvest exceeded 5 minutes"));
      }, TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([cronHarvest(), timeoutPromise]);
      sendJson(res, {
        message: "Cron harvest cycle complete",
        ...result,
      });
    } catch (innerErr: any) {
      if (timedOut) {
        console.error("[API] /cron/harvest TIMEOUT — exceeded 5 minutes");
        sendJson(res, {
          error: true,
          message: "Cron harvest timed out after 5 minutes — partial results may have been saved to DB",
          timeout: true,
        });
      } else {
        throw innerErr; // re-throw to outer catch
      }
    }
  } catch (error: any) {
    console.error(`[API] /cron/harvest error: ${error.message}`);
    sendJson(res, {
      error: true,
      message: error.message || "Unknown error",
      stack: error.stack?.substring(0, 500) || null,
    });
  }
}

// ─── Process Job Handler (called by Vercel Cron) ────────────
async function handleProcessJob(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== "POST") {
      return sendJson(res, { error: "POST only" }, 405);
    }

    const body = await readBody(req);
    const { job_id } = JSON.parse(body || "{}");

    if (!job_id) {
      return sendJson(res, { error: "job_id مطلوب" }, 400);
    }

    console.log(`[API] POST /process-job — job_id: ${job_id}`);

    const supabase = getSupabase();

    // Get the job and its scope
    const { data: job, error: jobError } = await supabase
      .from("ahe_harvest_jobs")
      .select("*, ahe_scopes(*)")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return sendJson(res, { error: "Job not found", details: jobError?.message }, 404);
    }

    if (job.status !== "pending") {
      return sendJson(res, { message: `Job already ${job.status}`, job_id });
    }

    const scope = job.ahe_scopes;
    if (!scope) {
      return sendJson(res, { error: "Scope not found for job" }, 404);
    }

    console.log(`[API] 🚀 Processing job ${job_id} for scope ${scope.code} (${scope.maksab_category})`);

    // Check if platform should be delegated to Vercel
    const shouldDelegateToVercel =
      VERCEL_HARVEST_URL &&
      VERCEL_DELEGATED_PLATFORMS.includes(scope.source_platform);

    let result: HarvestResult;

    if (shouldDelegateToVercel) {
      console.log(`[API] 🌐 Delegating ${scope.code} to Vercel (${scope.source_platform} blocked on Railway)`);
      result = await harvestViaVercel(scope.code);
    } else {
      result = await harvestScope(scope.code);
    }

    // Update job with results
    await supabase
      .from("ahe_harvest_jobs")
      .update({
        status: result.success ? "completed" : "failed",
        pages_fetched: result.pages_fetched,
        listings_new: result.new,
        listings_duplicate: result.duplicate,
        sellers_new: result.sellers_new,
        phones_extracted: result.phones_extracted,
        auto_queued: result.crm_queued,
        errors: result.errors,
        completed_at: new Date().toISOString(),
        duration_seconds: result.duration_ms / 1000,
      })
      .eq("id", job_id);

    console.log(`[API] ✅ Job ${job_id} done: new=${result.new}, phones=${result.phones_extracted}`);
    sendJson(res, { message: "Job processed", job_id, ...result });
  } catch (err: any) {
    console.error(`[API] /process-job error: ${err.message}`);
    sendJson(res, { error: true, message: err.message }, 500);
  }
}

// ─── Enrichment Handler ─────────────────────────────────────
async function handleEnrich(_req: IncomingMessage, res: ServerResponse) {
  try {
    console.log("[API] GET /cron/enrich — starting enrichment cycle");
    const result = await enrichListings();
    sendJson(res, { message: "Enrichment cycle complete", ...result });
  } catch (err: any) {
    console.error(`[API] /cron/enrich error: ${err.message}`);
    sendJson(res, { error: true, message: err.message }, 500);
  }
}

// ─── BHE: Buyer Match Handler ────────────────────────────────
async function handleBuyerMatch(_req: IncomingMessage, res: ServerResponse) {
  try {
    console.log("[API] GET /cron/buyer-match — starting buyer matching");
    const result = await matchBuyersToListings();
    sendJson(res, { message: "Buyer matching complete", ...result });
  } catch (err: any) {
    console.error(`[API] /cron/buyer-match error: ${err.message}`);
    sendJson(res, { error: true, message: err.message }, 500);
  }
}

/**
 * BHE: Match unmatched buyers to listings (batch).
 * Runs after each AHE harvest cycle.
 */
async function matchBuyersToListings(): Promise<{ processed: number; total_matches: number }> {
  const supabase = getSupabase();

  // Get unmatched buyers (discovered or phone_found, matches_count = 0)
  const { data: buyers } = await supabase
    .from("bhe_buyers")
    .select("id, category, governorate, budget_min, budget_max, pipeline_status, buyer_score")
    .in("pipeline_status", ["discovered", "phone_found"])
    .eq("matches_count", 0)
    .order("buyer_score", { ascending: false })
    .limit(50);

  if (!buyers || buyers.length === 0) {
    console.log("[BHE Match] No unmatched buyers found");
    return { processed: 0, total_matches: 0 };
  }

  console.log(`[BHE Match] Processing ${buyers.length} unmatched buyers`);
  let totalMatches = 0;

  for (const buyer of buyers) {
    // Build query
    let query = supabase
      .from("ahe_listings")
      .select("id, title, price, source_listing_url")
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (buyer.category) query = query.eq("category", buyer.category);
    if (buyer.governorate) query = query.eq("governorate", buyer.governorate);
    if (buyer.budget_min) query = query.gte("price", buyer.budget_min);
    if (buyer.budget_max) query = query.lte("price", buyer.budget_max);

    const { data: listings } = await query;

    if (listings && listings.length > 0) {
      const matchedListings = listings.map((l: any) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        url: l.source_listing_url,
      }));

      await supabase
        .from("bhe_buyers")
        .update({
          matched_listings: matchedListings,
          matches_count: listings.length,
          last_matched_at: new Date().toISOString(),
          pipeline_status: "matched",
        })
        .eq("id", buyer.id);

      totalMatches += listings.length;
    }
  }

  console.log(`[BHE Match] Done: ${buyers.length} buyers, ${totalMatches} total matches`);
  return { processed: buyers.length, total_matches: totalMatches };
}

// ─── Outreach Handler ────────────────────────────────────────
async function handleOutreach(_req: IncomingMessage, res: ServerResponse) {
  try {
    console.log("[API] GET /cron/outreach — starting outreach cycle");
    const result = await processOutreach();
    sendJson(res, { message: "Outreach cycle complete", ...result });
  } catch (err: any) {
    console.error(`[API] /cron/outreach error: ${err.message}`);
    sendJson(res, { error: true, message: err.message }, 500);
  }
}

// ─── Harvest Status Handler ──────────────────────────────────
async function handleHarvestStatus(_req: IncomingMessage, res: ServerResponse) {
  try {
    console.log("[API] GET /harvest/status");
    const status = await getHarvestStatus();
    sendJson(res, status);
  } catch (err: any) {
    console.error(`[API] /harvest/status error: ${err.message}`);
    sendJson(res, { error: err.message }, 500);
  }
}

// ─── Reverse Buyers: Sellers → Potential Buyers ──────────────
const UPGRADE_MAP: Record<string, { pattern: RegExp; upgrades: string[] }[]> = {
  phones: [
    { pattern: /آيفون\s*(\d+)/i, upgrades: ["آيفون {next}", "آيفون {next2}"] },
    { pattern: /iPhone\s*(\d+)/i, upgrades: ["iPhone {next}", "iPhone {next2}"] },
    { pattern: /سامسونج\s*S(\d+)/i, upgrades: ["سامسونج S{next}", "سامسونج S{next2}"] },
    { pattern: /Samsung\s*S(\d+)/i, upgrades: ["Samsung S{next}", "Samsung S{next2}"] },
    { pattern: /شاومي|Xiaomi|ريدمي|Redmi/i, upgrades: ["النسخة الأحدث من شاومي"] },
    { pattern: /أوبو|Oppo|ريلمي|Realme/i, upgrades: ["النسخة الأحدث من أوبو/ريلمي"] },
    { pattern: /هواوي|Huawei/i, upgrades: ["النسخة الأحدث من هواوي"] },
  ],
  vehicles: [
    { pattern: /(\d{4})/i, upgrades: ["موديل أحدث ({next_year}+)"] },
  ],
  electronics: [
    { pattern: /.+/, upgrades: ["ترقية أو بديل أحدث"] },
  ],
};

function generateUpgradeDescription(title: string, category: string): string | null {
  const rules = UPGRADE_MAP[category] || UPGRADE_MAP.electronics || [];

  for (const rule of rules) {
    const match = title.match(rule.pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) {
        return rule.upgrades
          .map((u) =>
            u
              .replace("{next}", String(num + 1))
              .replace("{next2}", String(num + 2))
              .replace("{next_year}", String(num + 1))
          )
          .join(" أو ");
      }
      return rule.upgrades[0];
    }
  }

  return `ترقية من ${title}`;
}

async function generateReverseBuyers(): Promise<{
  processed: number;
  created: number;
  skipped_existing: number;
  skipped_no_phone: number;
}> {
  const supabase = getSupabase();

  // Get sellers with phones who haven't been reverse-converted yet
  const { data: sellers } = await supabase
    .from("ahe_sellers")
    .select("id, phone, name, primary_category, primary_governorate, total_listings_seen, pipeline_status")
    .not("phone", "is", null)
    .in("pipeline_status", ["discovered", "phone_found", "contacted", "responded"])
    .order("total_listings_seen", { ascending: false })
    .limit(100);

  if (!sellers || sellers.length === 0) {
    console.log("[Reverse Buyers] No eligible sellers found");
    return { processed: 0, created: 0, skipped_existing: 0, skipped_no_phone: 0 };
  }

  console.log(`[Reverse Buyers] Processing ${sellers.length} sellers`);

  // Get most recent listing title for each seller
  let created = 0;
  let skippedExisting = 0;

  for (const seller of sellers) {
    // Check if already exists as reverse buyer
    const { data: existing } = await supabase
      .from("bhe_buyers")
      .select("id")
      .eq("source", "reverse_seller")
      .eq("buyer_phone", seller.phone)
      .limit(1);

    if (existing && existing.length > 0) {
      skippedExisting++;
      continue;
    }

    // Get seller's most recent listing title
    const { data: listings } = await supabase
      .from("ahe_listings")
      .select("title, price, maksab_category")
      .eq("ahe_seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestListing = listings?.[0];
    const category = seller.primary_category || latestListing?.maksab_category || "other";
    const productTitle = latestListing?.title || "منتج";
    const upgradeDesc = generateUpgradeDescription(productTitle, category);

    // Filter garbage text from seller names (WhatsApp UI artifacts)
    let cleanName: string | null = seller.name || null;
    if (cleanName && /مكالمة|المحادثه|واتساب|ساعات|دقائق/.test(cleanName)) {
      cleanName = null;
    }

    const buyerRecord = {
      source: "reverse_seller",
      source_url: null,
      source_platform: "dubizzle",
      buyer_name: cleanName,
      buyer_phone: seller.phone,
      product_wanted: upgradeDesc || `ترقية من ${productTitle}`,
      category,
      governorate: seller.primary_governorate,
      original_text: `بائع حالي يبيع: ${productTitle}`,
      buyer_tier: "warm_buyer",
      buyer_score: 50,
      estimated_purchase_value: latestListing?.price ? Math.round(Number(latestListing.price) * 1.3) : 0,
      pipeline_status: "discovered",
      is_duplicate: false,
    };

    const { error } = await supabase.from("bhe_buyers").insert(buyerRecord);
    if (!error) {
      created++;
    } else {
      console.log(`[Reverse Buyers] Insert error for ${seller.phone}: ${error.message}`);
    }
  }

  console.log(`[Reverse Buyers] Done: processed=${sellers.length}, created=${created}, skipped=${skippedExisting}`);
  return {
    processed: sellers.length,
    created,
    skipped_existing: skippedExisting,
    skipped_no_phone: 0,
  };
}

async function handleReverseBuyers(_req: IncomingMessage, res: ServerResponse) {
  try {
    console.log("[API] GET /cron/reverse-buyers — generating reverse buyers from sellers");
    const result = await generateReverseBuyers();
    sendJson(res, { message: "Reverse buyers generation complete", ...result });
  } catch (err: any) {
    console.error(`[API] /cron/reverse-buyers error: ${err.message}`);
    sendJson(res, { error: true, message: err.message }, 500);
  }
}

// ─── HTTP Server ──────────────────────────────────────────────
const server = createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const path = (req.url || "/").split("?")[0];

  try {
    if (path === "/harvest") {
      await handleHarvest(req, res);
    } else if (path === "/harvest/status") {
      await handleHarvestStatus(req, res);
    } else if (path === "/cron/harvest") {
      await handleCronHarvest(req, res);
    } else if (path === "/cron/enrich") {
      await handleEnrich(req, res);
    } else if (path === "/cron/outreach") {
      await handleOutreach(req, res);
    } else if (path === "/cron/buyer-match") {
      await handleBuyerMatch(req, res);
    } else if (path === "/cron/reverse-buyers") {
      await handleReverseBuyers(req, res);
    } else if (path === "/process-job") {
      await handleProcessJob(req, res);
    } else if (path === "/health") {
      sendJson(res, {
        ok: true,
        timestamp: new Date().toISOString(),
        region: process.env.RAILWAY_REGION || "unknown",
      });
    } else {
      sendJson(res, {
        message: "مكسب Workers Server — Railway",
        endpoints: {
          "GET /harvest?scope_code=XXX": "Harvest a specific scope (browser-testable)",
          "POST /harvest": "Harvest a specific scope { scope_code }",
          "POST /process-job": "Process a pending harvest job { job_id }",
          "GET /harvest/status": "Engine & scopes status overview",
          "GET /cron/harvest": "Automated harvest (picks ready scopes)",
          "GET /cron/enrich": "Enrich listings without phone/name (detail fetch)",
          "GET /cron/outreach": "Process outreach to new sellers + follow-ups",
          "GET /cron/buyer-match": "Match buyers to listings (BHE)",
          "GET /cron/reverse-buyers": "Generate reverse buyers from sellers (BHE)",
          "GET /health": "Health check",
        },
      });
    }
  } catch (err: any) {
    console.error(`[Server] Unhandled error: ${err.message}`);
    sendJson(res, { error: "Internal server error" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`[Server] 🟢 HTTP server running on port ${PORT}`);
  console.log(`[Server] Endpoints: /harvest, /harvest/status, /process-job, /cron/harvest, /cron/enrich, /health`);

  // Railway Cron بيعمل restart كل 15 دقيقة
  // عند كل restart — شغّل حصادة واحدة ثم 5 دورات إثراء
  setTimeout(async () => {
    try {
    // أولاً: harvest
    console.log('[Auto-Cron] Server started — running automatic harvest...');
    try {
      const result = await cronHarvest();
      console.log('[Auto-Cron] Harvest complete:', JSON.stringify(result));
    } catch (e: any) {
      console.log('[Auto-Cron] Harvest error:', e.message);
    }

    // ثانياً: 5 دورات إثراء (10 إعلانات × 5 = 50 إعلان)
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise((r) => setTimeout(r, 5000)); // 5s between cycles
        const enrichResult = await enrichListings();
        if (enrichResult.enriched > 0) {
          console.log(`[Auto-Enrich] Cycle ${i + 1}/5:`, JSON.stringify(enrichResult));
        } else {
          console.log(`[Auto-Enrich] Cycle ${i + 1}/5: No more listings to enrich — stopping`);
          break;
        }
      } catch (e: any) {
        console.log(`[Auto-Enrich] Cycle ${i + 1}/5 error:`, e.message);
      }
    }

    // ثالثاً: Outreach — تواصل مع معلنين جدد + متابعات
    try {
      await new Promise((r) => setTimeout(r, 3000));
      console.log('[Auto-Outreach] Starting outreach...');
      const outreachResult = await processOutreach();
      console.log('[Auto-Outreach] Complete:', JSON.stringify(outreachResult));
    } catch (e: any) {
      console.log('[Auto-Outreach] Error:', e.message);
    }

    // رابعاً: BHE — مطابقة مشترين ← إعلانات
    try {
      await new Promise((r) => setTimeout(r, 3000));
      console.log('[Auto-BHE] Starting buyer matching...');
      const buyerMatchResult = await matchBuyersToListings();
      console.log('[Auto-BHE] Complete:', JSON.stringify(buyerMatchResult));
    } catch (e: any) {
      console.log('[Auto-BHE] Error:', e.message);
    }

    // خامساً: BHE — توليد مشترين عكسيين من البائعين
    try {
      await new Promise((r) => setTimeout(r, 3000));
      console.log('[Auto-ReverseBuyers] Generating reverse buyers from sellers...');
      const reverseResult = await generateReverseBuyers();
      console.log('[Auto-ReverseBuyers] Complete:', JSON.stringify(reverseResult));
    } catch (e: any) {
      console.log('[Auto-ReverseBuyers] Error:', e.message);
    }

    // سادساً: حساب التوازن + إرسال تنبيهات (Phase 4)
    try {
      await new Promise((r) => setTimeout(r, 3000));
      console.log('[Auto-Balance] Calculating market balance...');
      const balanceResults = await calculateMarketBalanceWorker();
      console.log('[Auto-Balance] Complete:', JSON.stringify(
        balanceResults.map((r: any) => `${r.category}: ${r.supply}/${r.demand} = ${r.status}`)
      ));
    } catch (e: any) {
      console.log('[Auto-Balance] Error:', e.message);
    }
    } catch (fatalErr: any) {
      console.error('[Auto-Cron] Fatal error in auto-cron sequence:', fatalErr?.message || fatalErr);
    }
  }, 10000); // 10 ثواني بعد البدء
});

// Also start the auction cron worker
console.log("[Server] Starting auction cron worker...");
import("./auction-cron").catch((err) => {
  console.error("[Server] Failed to start auction cron:", err.message);
});
