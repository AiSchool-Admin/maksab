import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { getBreadcrumbSchema, serializeJsonLd } from "@/lib/structured-data";
import StorePageClient from "./StorePageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app";

/**
 * Fetch minimal store data for metadata (server-side).
 * Uses a lightweight query — only fields needed for SEO.
 */
async function getStoreForMetadata(slug: string) {
  try {
    const supabase = createServerClient();
    const decodedSlug = decodeURIComponent(slug);

    const { data, error } = await supabase
      .from("stores" as never)
      .select("id, name, slug, description, logo_url, cover_url, main_category, location_gov, location_area, status")
      .eq("slug", decodedSlug)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return null;

    const store = data as Record<string, unknown>;
    return {
      id: store.id as string,
      name: (store.name as string) || "متجر على مكسب",
      slug: store.slug as string,
      description: (store.description as string) || "",
      logoUrl: store.logo_url as string | null,
      coverUrl: store.cover_url as string | null,
      mainCategory: (store.main_category as string) || "",
      governorate: (store.location_gov as string) || "",
      area: (store.location_area as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Dynamic metadata for each store page — SEO + Open Graph + Twitter Cards
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreForMetadata(slug);

  if (!store) {
    return {
      title: "متجر غير موجود — مكسب",
      description: "المتجر ده مش متاح حالياً على مكسب",
    };
  }

  const locationText = store.area
    ? `${store.governorate} — ${store.area}`
    : store.governorate || "";

  const fullTitle = `${store.name} — متجر على مكسب`;

  const descriptionParts = [store.description || `متجر ${store.name} على مكسب`];
  if (locationText) descriptionParts.push(`الموقع: ${locationText}`);
  descriptionParts.push("تسوّق من مكسب — كل صفقة مكسب");
  const fullDescription = descriptionParts.join(" | ").slice(0, 300);

  const storeUrl = `${SITE_URL}/store/${store.slug}`;
  const imageUrl = store.coverUrl || store.logoUrl || `${SITE_URL}/icons/icon-512x512.png`;

  return {
    title: fullTitle,
    description: fullDescription,
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: storeUrl,
      siteName: "مكسب",
      locale: "ar_EG",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: store.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: fullDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: storeUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * JSON-LD Structured Data for the store (LocalBusiness schema)
 */
function StoreStructuredData({ store }: { store: NonNullable<Awaited<ReturnType<typeof getStoreForMetadata>>> }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description || `متجر ${store.name} على مكسب`,
    url: `${SITE_URL}/store/${store.slug}`,
    ...(store.logoUrl && { logo: store.logoUrl }),
    ...(store.coverUrl && { image: store.coverUrl }),
    ...(store.governorate && {
      address: {
        "@type": "PostalAddress",
        addressRegion: store.governorate,
        ...(store.area && { addressLocality: store.area }),
        addressCountry: "EG",
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
    />
  );
}

/**
 * Server Component page — provides metadata + renders client component
 */
export default async function StorePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch minimal store data for structured data (non-blocking for client)
  const storeForSeo = await getStoreForMetadata(slug);

  // Build breadcrumb data
  const breadcrumbData = storeForSeo
    ? getBreadcrumbSchema([
        { name: "الرئيسية", url: SITE_URL },
        { name: "المتاجر", url: `${SITE_URL}/stores` },
        { name: storeForSeo.name, url: `${SITE_URL}/store/${storeForSeo.slug}` },
      ])
    : null;

  return (
    <>
      {/* JSON-LD Structured Data for search engines */}
      {storeForSeo && <StoreStructuredData store={storeForSeo} />}

      {/* JSON-LD Breadcrumb */}
      {breadcrumbData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbData) }}
        />
      )}

      {/* Client-side interactive store page */}
      <StorePageClient slug={slug} />
    </>
  );
}
