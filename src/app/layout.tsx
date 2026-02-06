import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import AuthProvider from "@/components/auth/AuthProvider";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
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
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png",
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        {/* Preconnect to Supabase for faster API calls */}
        {supabaseUrl && <link rel="preconnect" href={supabaseUrl} />}
        {supabaseUrl && <link rel="dns-prefetch" href={supabaseUrl} />}
      </head>
      <body className="font-cairo antialiased bg-white">
        <ServiceWorkerRegistration />
        <AuthProvider>
          {/* Main content with bottom padding to avoid BottomNav overlap */}
          <div className="min-h-screen pb-20">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
