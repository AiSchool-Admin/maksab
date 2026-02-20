import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CAMPAIGNS } from "@/lib/campaigns";
import LandingPageTemplate from "@/components/campaign/LandingPageTemplate";

interface CampaignPageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: CampaignPageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = CAMPAIGNS[slug];
  if (!campaign) return {};

  const title = `${campaign.heroTitle} — مكسب`;
  const description = campaign.heroSubtitle;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ar_EG",
      siteName: "مكسب",
      url: `${siteUrl}/campaign/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${siteUrl}/campaign/${slug}`,
    },
  };
}

// Generate static paths for known campaigns
export function generateStaticParams() {
  return Object.keys(CAMPAIGNS).map((slug) => ({ slug }));
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { slug } = await params;
  const campaign = CAMPAIGNS[slug];

  if (!campaign) {
    notFound();
  }

  return <LandingPageTemplate config={campaign} />;
}
