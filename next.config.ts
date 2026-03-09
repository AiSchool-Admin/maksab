import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Security & caching headers are defined in vercel.json to avoid
  // duplication. Only add Next.js-specific headers here if needed.

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },

  // Compression
  compress: true,

  // Production source maps (for Sentry)
  productionBrowserSourceMaps: !!process.env.SENTRY_AUTH_TOKEN,

  // Experimental performance features
  experimental: {
    optimizeCss: false,
  },
};

// Only wrap with Sentry when credentials are available
const finalConfig = process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      sourcemaps: {
        disable: false,
      },
    })
  : nextConfig;

export default finalConfig;
