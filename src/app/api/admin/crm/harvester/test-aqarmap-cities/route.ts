/**
 * Test Aqarmap City URLs
 * GET /api/admin/crm/harvester/test-aqarmap-cities
 *
 * Tests which Aqarmap URLs work for each city/type combination
 */

import { NextResponse } from "next/server";
import { BROWSER_HEADERS } from "@/lib/crm/harvester/parsers/dubizzle";
import { parseAqarmapList } from "@/lib/crm/harvester/parsers/aqarmap";

export const maxDuration = 60;

interface CityTest {
  label: string;
  urls: { url: string; type: string }[];
}

const CITY_TESTS: CityTest[] = [
  {
    label: "giza",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/giza/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-rent/apartment/giza/", type: "rent_apt" },
    ],
  },
  {
    label: "new-cairo",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/new-cairo/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-rent/apartment/new-cairo/", type: "rent_apt" },
    ],
  },
  {
    label: "6th-of-october",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/6th-of-october-city/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/6-october/", type: "sale_apt_alt" },
      { url: "https://aqarmap.com.eg/en/for-rent/apartment/6th-of-october-city/", type: "rent_apt" },
    ],
  },
  {
    label: "sheikh-zayed",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/sheikh-zayed/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-rent/apartment/sheikh-zayed/", type: "rent_apt" },
    ],
  },
  {
    label: "maadi",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/maadi/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-rent/apartment/maadi/", type: "rent_apt" },
    ],
  },
  {
    label: "nasr-city",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/nasr-city/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-rent/apartment/nasr-city/", type: "rent_apt" },
    ],
  },
  {
    label: "cairo-villas",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/villa/cairo/", type: "sale_villa" },
      { url: "https://aqarmap.com.eg/en/for-sale/villa/new-cairo/", type: "sale_villa_newcairo" },
      { url: "https://aqarmap.com.eg/en/for-sale/villa/6th-of-october-city/", type: "sale_villa_october" },
    ],
  },
  {
    label: "heliopolis",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/heliopolis/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-rent/apartment/heliopolis/", type: "rent_apt" },
    ],
  },
  {
    label: "shorouk",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/al-shorouk-city/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/shorouk/", type: "sale_apt_alt" },
    ],
  },
  {
    label: "obour",
    urls: [
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/al-obour-city/", type: "sale_apt" },
      { url: "https://aqarmap.com.eg/en/for-sale/apartment/obour/", type: "sale_apt_alt" },
    ],
  },
];

interface UrlResult {
  url: string;
  type: string;
  status: number | null;
  listingsCount: number;
  error: string | null;
  htmlLength: number;
  redirectUrl: string | null;
}

export async function GET() {
  const startTime = Date.now();
  const results: { label: string; working: UrlResult[]; failed: UrlResult[] }[] = [];

  for (const city of CITY_TESTS) {
    if (Date.now() - startTime > 50000) break;

    const cityResult = { label: city.label, working: [] as UrlResult[], failed: [] as UrlResult[] };

    for (const { url, type } of city.urls) {
      if (Date.now() - startTime > 50000) break;

      const urlResult: UrlResult = {
        url, type, status: null, listingsCount: 0,
        error: null, htmlLength: 0, redirectUrl: null,
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: BROWSER_HEADERS,
          redirect: "follow",
        });
        clearTimeout(timeout);

        urlResult.status = response.status;
        if (response.redirected) urlResult.redirectUrl = response.url;

        if (response.ok) {
          const html = await response.text();
          urlResult.htmlLength = html.length;
          const listings = parseAqarmapList(html);
          urlResult.listingsCount = listings.length;

          if (listings.length > 0) {
            cityResult.working.push(urlResult);
          } else {
            urlResult.error = "0 listings parsed";
            cityResult.failed.push(urlResult);
          }
        } else {
          urlResult.error = `HTTP ${response.status}`;
          cityResult.failed.push(urlResult);
        }
      } catch (err) {
        urlResult.error = err instanceof Error ? err.message : String(err);
        cityResult.failed.push(urlResult);
      }
    }

    results.push(cityResult);
  }

  const summary = results.map((r) => ({
    city: r.label,
    working: r.working.length,
    failed: r.failed.length,
    bestUrl: r.working.length > 0
      ? r.working.sort((a, b) => b.listingsCount - a.listingsCount)[0]
      : null,
  }));

  return NextResponse.json({
    duration_ms: Date.now() - startTime,
    summary,
    details: results,
  });
}
