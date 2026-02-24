/**
 * Environment variable validation.
 * Called at startup to ensure all required variables are set.
 * Logs warnings for missing variables — does NOT throw to avoid breaking the app.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  // ── Supabase (Required) ──
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "رابط مشروع Supabase",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "مفتاح Supabase العام (anon key)",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "مفتاح Supabase للخدمة (service role) — للـ API routes فقط",
  },

  // ── Authentication (Required) ──
  {
    name: "OTP_SECRET",
    required: true,
    description: "مفتاح توقيع رموز OTP — أنشئه بـ: openssl rand -hex 32",
  },

  // ── Admin (Required) ──
  {
    name: "ADMIN_SETUP_SECRET",
    required: true,
    description: "مفتاح حماية endpoint الأدمن — أنشئه بـ: openssl rand -hex 16",
  },

  // ── Push Notifications (Recommended) ──
  {
    name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    required: false,
    description: "مفتاح VAPID العام — أنشئه بـ: npx web-push generate-vapid-keys",
  },
  {
    name: "VAPID_PRIVATE_KEY",
    required: false,
    description: "مفتاح VAPID الخاص — من نفس الأمر أعلاه",
  },

  // ── Sentry (Recommended) ──
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
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
    console.error("╔══════════════════════════════════════════════════════════╗");
    console.error("║  ⛔  مكسب — متغيرات بيئية مطلوبة مفقودة                 ║");
    console.error("╠══════════════════════════════════════════════════════════╣");
    for (const name of missing) {
      const v = ENV_VARS.find((e) => e.name === name)!;
      console.error(`║  ❌  ${name}`);
      console.error(`║      ${v.description}`);
    }
    console.error("╠══════════════════════════════════════════════════════════╣");
    console.error("║  📄  راجع .env.local.example لكل التفاصيل               ║");
    console.error("╚══════════════════════════════════════════════════════════╝");
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
