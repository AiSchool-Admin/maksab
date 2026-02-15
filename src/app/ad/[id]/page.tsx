import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import AdDetailClient from "./AdDetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app";

/**
 * Fetch minimal ad data for metadata (server-side).
 * Uses a lightweight query — only fields needed for SEO.
 */
async function getAdForMetadata(id: string) {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("ads" as never)
      .select("id, title, description, price, sale_type, images, governorate, city, category_id, status")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const ad = data as Record<string, unknown>;
    return {
      id: ad.id as string,
      title: (ad.title as string) || "إعلان على مكسب",
      description: (ad.description as string) || "",
      price: ad.price ? Number(ad.price) : null,
      saleType: ad.sale_type as string,
      images: (ad.images as string[]) || [],
      governorate: (ad.governorate as string) || "",
      city: (ad.city as string) || null,
      categoryId: (ad.category_id as string) || "",
      status: (ad.status as string) || "active",
    };
  } catch {
    return null;
  }
}

/**
 * Dynamic metadata for each ad page — SEO + Open Graph + Twitter Cards
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ad = await getAdForMetadata(id);

  if (!ad) {
    return {
      title: "إعلان غير موجود — مكسب",
      description: "الإعلان ده مش متاح حالياً على مكسب",
    };
  }

  const saleTypeLabel =
    ad.saleType === "cash" ? "للبيع" :
    ad.saleType === "auction" ? "مزاد" : "للتبديل";

  const priceText = ad.price
    ? `${ad.price.toLocaleString("ar-EG")} جنيه`
    : "";

  const locationText = ad.city
    ? `${ad.governorate} — ${ad.city}`
    : ad.governorate || "";

  const fullTitle = `${ad.title} — ${saleTypeLabel} | مكسب`;

  const descriptionParts = [ad.description || ad.title];
  if (priceText) descriptionParts.push(`السعر: ${priceText}`);
  if (locationText) descriptionParts.push(`الموقع: ${locationText}`);
  descriptionParts.push("على مكسب — كل صفقة مكسب");
  const fullDescription = descriptionParts.join(" | ").slice(0, 300);

  const adUrl = `${SITE_URL}/ad/${ad.id}`;
  const imageUrl = ad.images[0] || `${SITE_URL}/icons/icon-512x512.png`;

  return {
    title: fullTitle,
    description: fullDescription,
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: adUrl,
      siteName: "مكسب",
      locale: "ar_EG",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: ad.title,
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
      canonical: adUrl,
    },
    robots: {
      index: ad.status === "active",
      follow: true,
    },
  };
}

/**
 * JSON-LD Structured Data for the ad (Product schema)
 */
function AdStructuredData({ ad }: { ad: NonNullable<Awaited<ReturnType<typeof getAdForMetadata>>> }) {
  const siteUrl = SITE_URL;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: ad.title,
    description: ad.description || ad.title,
    url: `${siteUrl}/ad/${ad.id}`,
    image: ad.images.length > 0 ? ad.images : [`${siteUrl}/icons/icon-512x512.png`],
    ...(ad.price != null && {
      offers: {
        "@type": "Offer",
        price: ad.price,
        priceCurrency: "EGP",
        availability:
          ad.status === "active"
            ? "https://schema.org/InStock"
            : "https://schema.org/SoldOut",
        itemCondition: "https://schema.org/UsedCondition",
        seller: {
          "@type": "Organization",
          name: "مكسب",
          url: siteUrl,
        },
      },
    }),
    ...(ad.governorate && {
      areaServed: {
        "@type": "Place",
        name: ad.city ? `${ad.governorate} — ${ad.city}` : ad.governorate,
        address: {
          "@type": "PostalAddress",
          addressRegion: ad.governorate,
          ...(ad.city && { addressLocality: ad.city }),
          addressCountry: "EG",
        },
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Server Component page — provides metadata + renders client component
 */
export default async function AdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch minimal ad data for structured data (non-blocking for client)
  const adForSeo = await getAdForMetadata(id);

  return (
    <>
      {/* JSON-LD Structured Data for search engines */}
      {adForSeo && <AdStructuredData ad={adForSeo} />}

      {/* Client-side interactive ad detail page */}
      <AdDetailClient id={id} />
    </>
  );
}
