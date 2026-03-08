/**
 * GET /api/admin/crm-setup-sql
 *
 * Returns the CRM tables SQL for manual setup in Supabase SQL Editor.
 * Combines the CRM core tables migration + RLS policies.
 */

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

    const crmFiles = [
      "00021_crm_core_tables.sql",
      "00037_crm_rls_admin_only.sql",
    ];

    const parts: string[] = [
      "-- ══════════════════════════════════════════════════════════════",
      "-- مكسب (Maksab) — CRM Tables Setup",
      `-- Generated: ${new Date().toISOString()}`,
      "-- ",
      "-- INSTRUCTIONS:",
      "-- 1. Open Supabase Dashboard → SQL Editor",
      "-- 2. Paste this entire script",
      "-- 3. Click 'Run'",
      "-- 4. Go back to /admin/setup and click 'إعادة الفحص'",
      "-- ══════════════════════════════════════════════════════════════",
      "",
    ];

    for (const file of crmFiles) {
      try {
        const content = await fs.readFile(
          path.join(migrationsDir, file),
          "utf-8"
        );
        parts.push(`-- ── ${file} ${"─".repeat(Math.max(0, 50 - file.length))}──`);
        parts.push(content.trim());
        parts.push("");
        parts.push("");
      } catch {
        parts.push(`-- WARNING: Could not read ${file}`);
        parts.push("");
      }
    }

    // Add GRANT statements to ensure access
    parts.push("-- ── Grant permissions ──────────────────────────────────────────");
    parts.push(`
GRANT ALL ON crm_agents TO anon, authenticated;
GRANT ALL ON crm_customers TO anon, authenticated;
GRANT ALL ON crm_conversations TO anon, authenticated;
GRANT ALL ON crm_campaigns TO anon, authenticated;
GRANT ALL ON crm_message_templates TO anon, authenticated;
GRANT ALL ON crm_promotions TO anon, authenticated;
GRANT ALL ON crm_loyalty_transactions TO anon, authenticated;
GRANT ALL ON crm_listing_assists TO anon, authenticated;
GRANT ALL ON crm_activity_log TO anon, authenticated;
GRANT ALL ON crm_competitor_sources TO anon, authenticated;
GRANT ALL ON crm_referrals TO anon, authenticated;
GRANT ALL ON crm_daily_metrics TO anon, authenticated;
GRANT ALL ON crm_subscription_history TO anon, authenticated;
`);

    parts.push("-- ══════════════════════════════════════════════════════════════");
    parts.push("-- CRM Setup complete!");
    parts.push("-- ══════════════════════════════════════════════════════════════");

    return new NextResponse(parts.join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "inline; filename=maksab-crm-setup.sql",
      },
    });
  } catch (err) {
    return new NextResponse(
      `-- Error: ${err instanceof Error ? err.message : String(err)}`,
      {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        status: 500,
      }
    );
  }
}
