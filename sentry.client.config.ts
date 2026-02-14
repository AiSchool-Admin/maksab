import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Sample 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Capture 50% of sessions with errors for replay
  replaysOnErrorSampleRate: 0.5,
  replaysSessionSampleRate: 0,

  // Filter noisy errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "Load failed",
    "ChunkLoadError",
    "Loading chunk",
  ],

  beforeSend(event) {
    // Don't send in development
    if (process.env.NODE_ENV !== "production") return null;
    return event;
  },
});
