import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getParser, getPlatformHeaders } from "@/lib/crm/harvester/parsers/platform-router";
import { type ListPageListing } from "@/lib/crm/harvester/parsers/dubizzle";
import { extractPhone } from "@/lib/crm/harvester/parsers/phone-extractor";
import { mapLocation } from "@/lib/crm/harvester/parsers/location-mapper";

export const maxDuration = 60;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface SimulatedListing {
  title: string;
  description: string | null;
  price: number | null;
  url: string;
  location: string | null;
  governorate: string | null;
  city: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  thumbnail: string | null;
  date_text: string | null;
  is_featured: boolean;
}

interface ScopeSimulation {
  scope_code: string;
  scope_id: string;
  platform: string;
  category: string;
  base_url: string;
  status: "success" | "blocked" | "error" | "empty" | "no_parser";
  error_message: string | null;
  http_status: number | null;
  fetch_duration_ms: number;
  parse_duration_ms: number;
  raw_html_size: number;
  listings_found: number;
  listings_in_governorate: number;
  listings_with_phone: number;
  listings_with_name: number;
  listings_with_price: number;
  listings_with_image: number;
  sample_listings: SimulatedListing[];
}

interface SimulationResult {
  governorate: string;
  timestamp: string;
  total_scopes: number;
  working_scopes: number;
  blocked_scopes: number;
  error_scopes: number;
  empty_scopes: number;
  total_listings: number;
  total_in_governorate: number;
  total_with_phone: number;
  total_duration_ms: number;
  scopes: ScopeSimulation[];
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7",
};

export async function GET(req: NextRequest) {
  const governorate = req.nextUrl.searchParams.get("governorate") || "الإسكندرية";
  const supabase = getServiceClient();
  const start = Date.now();

  // Get all scopes for this governorate
  const govSlugMap: Record<string, string> = {
    "الإسكندرية": "alexandria",
    "القاهرة": "cairo",
    "الجيزة": "giza",
  };
  const govSlug = govSlugMap[governorate] || governorate.toLowerCase();

  const { data: scopes } = await supabase
    .from("ahe_scopes")
    .select("id, code, source_platform, maksab_category, base_url, governorate, server_fetch_blocked, is_active, is_paused")
    .or(`governorate.eq.${govSlug},governorate.eq.${governorate},governorate.eq.الإسكندرية`)
    .eq("is_active", true)
    .order("source_platform");

  if (!scopes || scopes.length === 0) {
    return NextResponse.json({
      governorate,
      timestamp: new Date().toISOString(),
      total_scopes: 0,
      working_scopes: 0,
      blocked_scopes: 0,
      error_scopes: 0,
      empty_scopes: 0,
      total_listings: 0,
      total_in_governorate: 0,
      total_with_phone: 0,
      total_duration_ms: 0,
      scopes: [],
    } as SimulationResult);
  }

  const scopeResults: ScopeSimulation[] = [];

  for (const scope of scopes) {
    const scopeResult: ScopeSimulation = {
      scope_code: scope.code,
      scope_id: scope.id,
      platform: scope.source_platform,
      category: scope.maksab_category || "",
      base_url: scope.base_url,
      status: "success",
      error_message: null,
      http_status: null,
      fetch_duration_ms: 0,
      parse_duration_ms: 0,
      raw_html_size: 0,
      listings_found: 0,
      listings_in_governorate: 0,
      listings_with_phone: 0,
      listings_with_name: 0,
      listings_with_price: 0,
      listings_with_image: 0,
      sample_listings: [],
    };

    try {
      // 1. Fetch the page
      const fetchStart = Date.now();
      let parser: ReturnType<typeof getParser>;
      try {
        parser = getParser(scope.source_platform);
      } catch {
        scopeResult.status = "no_parser";
        scopeResult.error_message = `لا يوجد parser لمنصة ${scope.source_platform}`;
        scopeResults.push(scopeResult);
        continue;
      }

      const headers = {
        ...BROWSER_HEADERS,
        ...(getPlatformHeaders ? getPlatformHeaders(scope.source_platform) : {}),
      };

      let html = "";
      try {
        const fetchRes = await fetch(scope.base_url, {
          headers,
          signal: AbortSignal.timeout(15000),
        });
        scopeResult.http_status = fetchRes.status;
        scopeResult.fetch_duration_ms = Date.now() - fetchStart;

        if (fetchRes.status === 403) {
          scopeResult.status = "blocked";
          scopeResult.error_message = `HTTP 403 — المنصة تحظر السيرفر (يحتاج Puppeteer أو Bookmarklet)`;
          scopeResults.push(scopeResult);
          continue;
        }

        if (!fetchRes.ok) {
          scopeResult.status = "error";
          scopeResult.error_message = `HTTP ${fetchRes.status}`;
          scopeResults.push(scopeResult);
          continue;
        }

        html = await fetchRes.text();
        scopeResult.raw_html_size = html.length;
      } catch (fetchErr: any) {
        scopeResult.fetch_duration_ms = Date.now() - fetchStart;
        scopeResult.status = "error";
        scopeResult.error_message = `فشل الاتصال: ${fetchErr.message}`;
        scopeResults.push(scopeResult);
        continue;
      }

      // 2. Parse listings
      const parseStart = Date.now();
      let listings: ListPageListing[] = [];
      try {
        listings = parser.parseList(html);
      } catch (parseErr: any) {
        scopeResult.status = "error";
        scopeResult.error_message = `فشل التحليل: ${parseErr.message}`;
        scopeResult.parse_duration_ms = Date.now() - parseStart;
        scopeResults.push(scopeResult);
        continue;
      }
      scopeResult.parse_duration_ms = Date.now() - parseStart;
      scopeResult.listings_found = listings.length;

      if (listings.length === 0) {
        scopeResult.status = "empty";
        scopeResult.error_message = "الصفحة لا تحتوي على إعلانات (0 نتائج)";
        scopeResults.push(scopeResult);
        continue;
      }

      // 3. Analyze & filter
      const simulated: SimulatedListing[] = [];
      for (const listing of listings) {
        const loc = mapLocation(listing.location || "", scope.source_platform);
        const phone = listing.sellerPhone
          ? listing.sellerPhone.replace(/[^\d+]/g, "")
          : listing.title
            ? extractPhone(listing.title)
            : null;
        const normalizedPhone = phone && phone.length >= 10
          ? (phone.startsWith("0") ? phone : phone.startsWith("+2") ? phone.slice(2) : "0" + phone)
          : null;

        const isInGov = loc.governorate === govSlug ||
          (listing.location || "").includes(governorate) ||
          (listing.location || "").includes("الإسكندرية") ||
          (listing.location || "").includes("الاسكندرية") ||
          (listing.title || "").includes(governorate);

        if (isInGov) scopeResult.listings_in_governorate++;
        if (normalizedPhone) scopeResult.listings_with_phone++;
        if (listing.sellerName) scopeResult.listings_with_name++;
        if (listing.price) scopeResult.listings_with_price++;
        if (listing.thumbnailUrl) scopeResult.listings_with_image++;

        simulated.push({
          title: listing.title || "",
          description: listing.description || null,
          price: listing.price || null,
          url: listing.url || "",
          location: listing.location || null,
          governorate: loc.governorate || null,
          city: loc.city || null,
          seller_name: listing.sellerName || null,
          seller_phone: normalizedPhone,
          thumbnail: listing.thumbnailUrl || null,
          date_text: listing.dateText || null,
          is_featured: listing.isFeatured || false,
        });
      }

      // Take 10 samples (prefer in-governorate with phones)
      const sorted = simulated.sort((a, b) => {
        const scoreA = (a.governorate === govSlug ? 10 : 0) + (a.seller_phone ? 5 : 0) + (a.price ? 2 : 0);
        const scoreB = (b.governorate === govSlug ? 10 : 0) + (b.seller_phone ? 5 : 0) + (b.price ? 2 : 0);
        return scoreB - scoreA;
      });
      scopeResult.sample_listings = sorted.slice(0, 10);

    } catch (err: any) {
      scopeResult.status = "error";
      scopeResult.error_message = err.message;
    }

    scopeResults.push(scopeResult);
  }

  const result: SimulationResult = {
    governorate,
    timestamp: new Date().toISOString(),
    total_scopes: scopeResults.length,
    working_scopes: scopeResults.filter((s) => s.status === "success").length,
    blocked_scopes: scopeResults.filter((s) => s.status === "blocked").length,
    error_scopes: scopeResults.filter((s) => s.status === "error").length,
    empty_scopes: scopeResults.filter((s) => s.status === "empty").length,
    total_listings: scopeResults.reduce((s, r) => s + r.listings_found, 0),
    total_in_governorate: scopeResults.reduce((s, r) => s + r.listings_in_governorate, 0),
    total_with_phone: scopeResults.reduce((s, r) => s + r.listings_with_phone, 0),
    total_duration_ms: Date.now() - start,
    scopes: scopeResults,
  };

  return NextResponse.json(result);
}
