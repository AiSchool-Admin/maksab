import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.com";

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CATEGORIES = ["phones", "vehicles", "properties", "electronics", "furniture", "gold", "appliances"];
const GOVERNORATES = [
  "cairo", "giza", "alexandria", "dakahlia", "sharqia", "qalyubia",
  "gharbia", "monufia", "beheira", "minya", "asyut", "sohag",
  "fayoum", "port-said", "ismailia", "suez", "damietta", "luxor", "aswan",
];

/**
 * GET /api/sitemap.xml
 * Auto-generated sitemap from ahe_listings
 */
export async function GET() {
  try {
    const supabase = getSupabase();

    // Category/Governorate landing pages (7 × 19 = 133 pages)
    const landingPages: string[] = [];
    for (const cat of CATEGORIES) {
      for (const gov of GOVERNORATES) {
        landingPages.push(`${SITE_URL}/browse/${cat}/${gov}`);
      }
    }

    // Individual listing pages (up to 50,000)
    const { data: listings } = await supabase
      .from("ahe_listings")
      .select("id, title, category, governorate, updated_at")
      .eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .limit(50000);

    const govSlugMap: Record<string, string> = {
      "القاهرة": "cairo", "الجيزة": "giza", "الإسكندرية": "alexandria",
      "الدقهلية": "dakahlia", "الشرقية": "sharqia", "القليوبية": "qalyubia",
      "الغربية": "gharbia", "المنوفية": "monufia", "البحيرة": "beheira",
      "المنيا": "minya", "أسيوط": "asyut", "سوهاج": "sohag",
      "الفيوم": "fayoum", "بورسعيد": "port-said", "الإسماعيلية": "ismailia",
      "السويس": "suez", "دمياط": "damietta", "الأقصر": "luxor", "أسوان": "aswan",
    };

    const listingUrls = (listings || []).map((l: any) => {
      const cat = l.category || "general";
      const gov = govSlugMap[l.governorate] || "cairo";
      const slug = `${(l.title || "ad").replace(/\s+/g, "-").substring(0, 50)}-${l.id}`;
      const lastmod = l.updated_at
        ? new Date(l.updated_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      return { url: `${SITE_URL}/browse/${cat}/${gov}/${encodeURIComponent(slug)}`, lastmod };
    });

    // Build XML
    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

    // Landing pages
    for (const url of landingPages) {
      xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Listing pages
    for (const item of listingUrls) {
      xml += `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err: any) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml" } }
    );
  }
}
