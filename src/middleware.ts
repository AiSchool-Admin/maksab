import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware for مكسب
 *
 * Handles:
 * 1. Security headers (applied to all responses)
 * 2. Rate limiting protection for API routes
 * 3. Protected page redirects (if needed in the future)
 */

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/search",
  "/api/search/autocomplete",
  "/api/search/trending",
  "/api/search/image",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/ensure-categories",
  "/api/recommendations",
  "/api/price/analytics",
  "/api/stores/check-name",
];

// Admin-only routes
const ADMIN_ROUTES = ["/api/admin/"];

// Rate limit config (requests per window)
const RATE_LIMITS: Record<string, { max: number; windowSecs: number }> = {
  "/api/auth/send-otp": { max: 3, windowSecs: 3600 },     // 3 per hour
  "/api/ads/create": { max: 10, windowSecs: 86400 },       // 10 per day
  "/api/ads/bulk-create": { max: 3, windowSecs: 86400 },   // 3 per day
  "/api/reports/create": { max: 5, windowSecs: 3600 },     // 5 per hour
  "/api/upload": { max: 30, windowSecs: 3600 },            // 30 per hour
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ── 1. Security Headers ──────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), interest-cohort=()"
  );

  // ── 2. API Route Protection ──────────────────────────────
  if (pathname.startsWith("/api/")) {
    // Add CORS headers for API routes — restrict to allowed origins only
    const origin = request.headers.get("origin") || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const allowedOrigins = [
      appUrl,
      "https://maksab.app",
      "https://www.maksab.app",
    ].filter(Boolean);
    const isDev = process.env.NODE_ENV === "development";
    const isAllowedOrigin = allowedOrigins.includes(origin) || (isDev && origin.startsWith("http://localhost"));
    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }

    // Block API requests without proper content type for POST/PUT
    if (
      (request.method === "POST" || request.method === "PUT") &&
      !pathname.startsWith("/api/upload") &&
      request.headers.get("content-type")?.includes("application/json") === false &&
      request.headers.get("content-type") !== null
    ) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415, headers: response.headers }
      );
    }

    // Simple in-memory rate limiting signal via headers
    // (Actual rate limiting is done in route handlers via rate-limit-service)
    for (const [route, config] of Object.entries(RATE_LIMITS)) {
      if (pathname.startsWith(route)) {
        response.headers.set("X-RateLimit-Limit", String(config.max));
        response.headers.set("X-RateLimit-Window", `${config.windowSecs}s`);
        break;
      }
    }
  }

  // ── 3. Static asset caching ──────────────────────────────
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // ── 4. Service worker scope ──────────────────────────────
  if (pathname === "/sw.js" || pathname === "/workbox-*.js") {
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, must-revalidate"
    );
    response.headers.set("Service-Worker-Allowed", "/");
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and common static files
    "/((?!_next/static|_next/image|favicon.ico|icons/).*)",
  ],
};
