/**
 * Environment variable validation.
 * Called at startup to check all required variables are set.
 *
 * IMPORTANT: This function is called from the root layout (Server Component).
 * It must NEVER throw, because that crashes the entire page render and causes
 * 500 errors on client-side navigation (RSC payload generation).
 *
 * Server-only vars (SUPABASE_SERVICE_ROLE_KEY, OTP_SECRET, ADMIN_SETUP_SECRET)
 * are only needed by API routes — not by the layout. They are logged as errors
 * but the app continues to render. The API routes that need these keys handle
 * missing values with proper 500 responses.
 */

interface EnvVar {
  name: string;
  /** "client" = needed for the app to render at all (NEXT_PUBLIC_*) */
  /** "server" = only needed by API routes, not by page rendering */
  scope: "client" | "server";
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  // ── Supabase (Required — client) ──
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    scope: "client",
    required: true,
    description: "رابط مشروع Supabase",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    scope: "client",
    required: true,
    description: "مفتاح Supabase العام (anon key)",
  },

  // ── Server-only (Required — but only for API routes) ──
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    scope: "server",
    required: true,
    description: "مفتاح Supabase للخدمة (service role) — للـ API routes فقط",
  },
  {
    name: "OTP_SECRET",
    scope: "server",
    required: true,
    description: "مفتاح توقيع رموز OTP — أنشئه بـ: openssl rand -hex 32",
  },
  {
    name: "ADMIN_SETUP_SECRET",
    scope: "server",
    required: true,
    description: "مفتاح حماية endpoint الأدمن — أنشئه بـ: openssl rand -hex 16",
  },

  // ── Push Notifications (Optional) ──
  {
    name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    scope: "client",
    required: false,
    description: "مفتاح VAPID العام — أنشئه بـ: npx web-push generate-vapid-keys",
  },
  {
    name: "VAPID_PRIVATE_KEY",
    scope: "server",
    required: false,
    description: "مفتاح VAPID الخاص — من نفس الأمر أعلاه",
  },

  // ── Sentry (Optional) ──
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    scope: "client",
    required: false,
    description: "رابط Sentry لمراقبة الأخطاء",
  },
];

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.name];

    if (!value || value.startsWith("your_")) {
      if (v.required) {
        missing.push(v.name);
      } else {
        warnings.push(v.name);
      }
    }
  }

  if (missing.length > 0) {
    const header = "⛔  مكسب — متغيرات بيئية مطلوبة مفقودة";
    const lines = [
      "╔══════════════════════════════════════════════════════════╗",
      `║  ${header}                 ║`,
      "╠══════════════════════════════════════════════════════════╣",
    ];
    for (const name of missing) {
      const v = ENV_VARS.find((e) => e.name === name)!;
      lines.push(`║  ❌  ${name}`);
      lines.push(`║      ${v.description}`);
    }
    lines.push("╠══════════════════════════════════════════════════════════╣");
    lines.push("║  📄  راجع .env.local.example لكل التفاصيل               ║");
    lines.push("╚══════════════════════════════════════════════════════════╝");

    console.error(lines.join("\n"));

    // Never throw here — this function runs in the root layout (Server Component).
    // Throwing crashes the entire RSC render and causes 500 errors on every page.
    // Server-only keys are validated at the point of use (API routes).
  }

  if (warnings.length > 0) {
    console.warn("[مكسب] متغيرات بيئية اختيارية مفقودة (الميزات المرتبطة معطلة):");
    for (const name of warnings) {
      const v = ENV_VARS.find((e) => e.name === name)!;
      console.warn(`  ⚠️  ${name} — ${v.description}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
