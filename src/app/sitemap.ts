import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app";

const CATEGORIES = [
  "cars",
  "real-estate",
  "phones",
  "fashion",
  "scrap",
  "gold",
  "luxury",
  "appliances",
  "furniture",
  "hobbies",
  "tools",
  "services",
  "computers",
  "kids-babies",
  "electronics",
  "beauty",
];

/**
 * Dynamic sitemap — includes static pages, category pages,
 * and up to 5,000 active ads for SEO indexing.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/auctions`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/pre-launch`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/stores`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((slug) => ({
    url: `${BASE_URL}/search?category=${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Dynamic ad pages — fetch active ads from Supabase
  let adPages: MetadataRoute.Sitemap = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: ads } = await supabase
        .from("ads")
        .select("id, updated_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5000);

      if (ads) {
        adPages = ads.map((ad) => ({
          url: `${BASE_URL}/ad/${ad.id}`,
          lastModified: ad.updated_at ? new Date(ad.updated_at) : now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }));
      }
    } catch {
      // Sitemap still works without dynamic ads
    }
  }

  return [...staticPages, ...categoryPages, ...adPages];
}
