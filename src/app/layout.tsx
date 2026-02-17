import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import AuthProvider from "@/components/auth/AuthProvider";
import ThemeProvider from "@/components/theme/ThemeProvider";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import UpdateBanner from "@/components/pwa/UpdateBanner";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import { validateEnv } from "@/lib/env-check";
import "./globals.css";

// Validate environment variables at startup (server-side only)
validateEnv();

const cairo = localFont({
  src: "../fonts/Cairo-Variable.ttf",
  variable: "--font-cairo",
  display: "swap",
  weight: "200 1000",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app"),
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
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "مكسب — كل صفقة مكسب",
    description:
      "سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة",
    locale: "ar_EG",
    type: "website",
    siteName: "مكسب",
  },
  twitter: {
    card: "summary_large_image",
    title: "مكسب — كل صفقة مكسب",
    description:
      "سوق إلكتروني مصري لبيع وشراء وتبديل السلع الجديدة والمستعملة",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://maksab.app",
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
    <html lang="ar" dir="rtl" className={`${cairo.variable}`}>
      <head>
        {/* Preconnect to Supabase for faster API calls */}
        {supabaseUrl && <link rel="preconnect" href={supabaseUrl} />}
        {supabaseUrl && <link rel="dns-prefetch" href={supabaseUrl} />}
        {/* Prevent theme flash: check localStorage before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('maksab_theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-cairo antialiased bg-white">
        <ServiceWorkerRegistration />
        <UpdateBanner />
        <ThemeProvider>
          <AuthProvider>
            {/* Main content with bottom padding to avoid BottomNav overlap */}
            <div className="min-h-screen pb-20">{children}</div>
            <InstallPrompt />
            <ChatbotWidget />
            <AnalyticsProvider />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
