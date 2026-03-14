/**
 * Dubizzle "Wanted" Ads Discovery Endpoint
 * GET /api/admin/crm/harvester/test-dubizzle-wanted
 *
 * يجرب كل الاحتمالات الممكنة لإيجاد فلتر "مطلوب للشراء" على دوبيزل
 * بدون كتابة في قاعدة البيانات — فقط fetch + تحليل
 */

import { NextRequest, NextResponse } from "next/server";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";

export const maxDuration = 120; // 2 minutes — lots of requests

const WANTED_KEYWORDS = /مطلوب|نشتري|عايز|محتاج|بدور|مطلوب للشراء|wanted|looking for/i;

const BASE_URLS = [
  {
    name: "موبايلات",
    url: "https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/",
  },
  {
    name: "سيارات",
    url: "https://www.dubizzle.com.eg/ar/vehicles/cars-for-sale/",
  },
  {
    name: "شقق",
    url: "https://www.dubizzle.com.eg/ar/properties/apartments-duplex-for-sale/",
  },
];

// Query param filters to try
const QUERY_FILTERS = [
  "ad_type=2",
  "ad_type=wanted",
  "ad_type=buy",
  "ad_type=مطلوب",
  "type=wanted",
  "type=2",
  "listing_type=wanted",
  "listing_type=2",
  "ad_posting_type=2",
  "ad_posting_type=wanted",
  "filter=wanted",
  "filter=type_2",
  "is_wanted=true",
  "is_wanted=1",
  "ad_kind=wanted",
  "ad_kind=2",
  "category_type=wanted",
  "o_type=wanted",
  "o_type=2",
];

// Path-based variations (only for mobile phones)
const PATH_VARIATIONS = [
  "https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/wanted/",
  "https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/?keywords=مطلوب",
  "https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/?q=مطلوب",
  "https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/?search=مطلوب",
  "https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/?attrs=ad_type-2",
  "https://www.dubizzle.com.eg/ar/mobile-phones-tablets-accessories-numbers/mobile-phones/?attrs=type-wanted",
];

interface ProbeResult {
  url: string;
  label: string;
  status: number | null;
  articleCount: number;
  hasWantedKeyword: boolean;
  wantedTitles: string[];
  firstTitles: string[];
  error: string | null;
  duration_ms: number;
}

/** Extract article titles from dubizzle HTML */
function extractTitles(html: string): string[] {
  const titles: string[] = [];
  // Try aria-label on links (common dubizzle pattern)
  const ariaMatches = html.matchAll(/aria-label="([^"]{5,200})"/g);
  for (const m of ariaMatches) {
    const t = m[1].trim();
    if (t && !titles.includes(t) && !t.includes("صفحة") && !t.includes("menu")) {
      titles.push(t);
    }
  }
  // Try h2/h3 tags
  const hMatches = html.matchAll(/<h[23][^>]*>([^<]{3,200})<\/h[23]>/g);
  for (const m of hMatches) {
    const t = m[1].trim();
    if (t && !titles.includes(t)) {
      titles.push(t);
    }
  }
  // Try title attributes
  const titleAttrMatches = html.matchAll(/title="([^"]{5,200})"/g);
  for (const m of titleAttrMatches) {
    const t = m[1].trim();
    if (
      t &&
      !titles.includes(t) &&
      !t.includes("dubizzle") &&
      !t.includes("صفحة")
    ) {
      titles.push(t);
    }
  }
  return titles;
}

/** Count article/listing elements */
function countArticles(html: string): number {
  const articleMatches = html.match(/<article/g);
  if (articleMatches && articleMatches.length > 0) return articleMatches.length;
  // Fallback: count listing-like divs
  const listingMatches = html.match(/data-testid="listing/g);
  if (listingMatches) return listingMatches.length;
  const resultMatches = html.match(/class="[^"]*result[^"]*"/g);
  if (resultMatches) return resultMatches.length;
  return 0;
}

async function probeUrl(
  url: string,
  label: string
): Promise<ProbeResult> {
  const start = Date.now();
  const result: ProbeResult = {
    url,
    label,
    status: null,
    articleCount: 0,
    hasWantedKeyword: false,
    wantedTitles: [],
    firstTitles: [],
    error: null,
    duration_ms: 0,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);

    result.status = resp.status;

    if (resp.ok) {
      const html = await resp.text();
      result.articleCount = countArticles(html);
      const titles = extractTitles(html);
      result.firstTitles = titles.slice(0, 5);

      // Check for wanted keywords in titles
      for (const title of titles) {
        if (WANTED_KEYWORDS.test(title)) {
          result.hasWantedKeyword = true;
          result.wantedTitles.push(title);
        }
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  result.duration_ms = Date.now() - start;
  return result;
}

export async function GET(_req: NextRequest) {
  const startTime = Date.now();
  const results: ProbeResult[] = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 30;

  // ═══ Phase 1: Baseline — fetch each base URL without filters ═══
  const baselines: Record<string, ProbeResult> = {};
  for (const base of BASE_URLS) {
    if (attempts >= MAX_ATTEMPTS) break;
    const result = await probeUrl(base.url, `baseline: ${base.name}`);
    baselines[base.url] = result;
    results.push(result);
    attempts++;
    await delay(500);
  }

  // ═══ Phase 2: Query param filters × base URLs ═══
  // Use only the first base URL (phones) for most filters to save attempts
  const primaryBase = BASE_URLS[0];
  for (const filter of QUERY_FILTERS) {
    if (attempts >= MAX_ATTEMPTS) break;
    const url = `${primaryBase.url}?${filter}`;
    const result = await probeUrl(url, `${primaryBase.name} + ${filter}`);
    results.push(result);
    attempts++;

    // If this filter works (different article count or has wanted keywords),
    // also try it on other base URLs
    if (
      result.status === 200 &&
      (result.hasWantedKeyword ||
        (result.articleCount > 0 &&
          result.articleCount !==
            (baselines[primaryBase.url]?.articleCount ?? 0)))
    ) {
      for (const otherBase of BASE_URLS.slice(1)) {
        if (attempts >= MAX_ATTEMPTS) break;
        const otherUrl = `${otherBase.url}?${filter}`;
        const otherResult = await probeUrl(
          otherUrl,
          `${otherBase.name} + ${filter} (confirmed)`
        );
        results.push(otherResult);
        attempts++;
        await delay(300);
      }
    }

    await delay(300);
  }

  // ═══ Phase 3: Path variations & keyword searches ═══
  for (const pathUrl of PATH_VARIATIONS) {
    if (attempts >= MAX_ATTEMPTS) break;
    const result = await probeUrl(pathUrl, `path/keyword: ${pathUrl.split("?")[1] || pathUrl.split("/").slice(-2).join("/")}`);
    results.push(result);
    attempts++;
    await delay(300);
  }

  // ═══ Analysis ═══
  const successful = results.filter((r) => r.status === 200);
  const withWanted = results.filter((r) => r.hasWantedKeyword);
  const differentCounts = successful.filter((r) => {
    // Find which base URL this belongs to
    for (const base of BASE_URLS) {
      if (r.url.startsWith(base.url) && r.url !== base.url) {
        const baseline = baselines[base.url];
        return (
          baseline &&
          r.articleCount !== baseline.articleCount &&
          r.articleCount > 0
        );
      }
    }
    return false;
  });

  const duration = Math.round((Date.now() - startTime) / 1000);

  return NextResponse.json({
    summary: {
      total_attempts: attempts,
      successful_200: successful.length,
      blocked_403: results.filter((r) => r.status === 403).length,
      not_found_404: results.filter((r) => r.status === 404).length,
      with_wanted_keywords: withWanted.length,
      with_different_article_count: differentCounts.length,
      duration_seconds: duration,
    },
    baselines: Object.fromEntries(
      BASE_URLS.map((b) => [
        b.name,
        {
          url: b.url,
          articleCount: baselines[b.url]?.articleCount ?? null,
          status: baselines[b.url]?.status ?? null,
        },
      ])
    ),
    winning_filters: withWanted.map((r) => ({
      url: r.url,
      label: r.label,
      wantedTitles: r.wantedTitles.slice(0, 5),
      articleCount: r.articleCount,
    })),
    different_counts: differentCounts.map((r) => ({
      url: r.url,
      label: r.label,
      articleCount: r.articleCount,
      firstTitles: r.firstTitles,
    })),
    all_results: results.map((r) => ({
      label: r.label,
      url: r.url,
      status: r.status,
      articleCount: r.articleCount,
      hasWantedKeyword: r.hasWantedKeyword,
      wantedTitles: r.wantedTitles.slice(0, 3),
      firstTitles: r.firstTitles.slice(0, 3),
      error: r.error,
      duration_ms: r.duration_ms,
    })),
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
