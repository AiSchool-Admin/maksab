import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "البحث في مكسب — بيع وشراء وتبديل في مصر",
  description:
    "ابحث عن سيارات، موبايلات، عقارات، ذهب، أجهزة منزلية، أثاث وأكتر. بيع نقدي، مزادات، وتبديل. أكبر سوق إلكتروني مصري.",
  openGraph: {
    title: "البحث في مكسب — بيع وشراء وتبديل",
    description:
      "ابحث عن أي حاجة تحتاجها — سيارات، موبايلات، عقارات، ذهب وأكتر. بيع وشراء وتبديل ومزادات في مكان واحد.",
    locale: "ar_EG",
    type: "website",
    siteName: "مكسب",
  },
  twitter: {
    card: "summary_large_image",
    title: "البحث في مكسب — بيع وشراء وتبديل",
    description: "ابحث عن أي حاجة تحتاجها في مكسب — أكبر سوق إلكتروني مصري",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
