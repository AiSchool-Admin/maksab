import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const cairo = localFont({
  src: "../fonts/Cairo-Variable.ttf",
  variable: "--font-cairo",
  display: "swap",
  weight: "200 1000",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "مكسب — كل صفقة مكسب",
  description:
    "سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة. بيع نقدي، مزادات، وتبديل.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مكسب",
  },
  openGraph: {
    title: "مكسب — كل صفقة مكسب",
    description:
      "سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة",
    locale: "ar_EG",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1B7A3D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-cairo antialiased">{children}</body>
    </html>
  );
}
