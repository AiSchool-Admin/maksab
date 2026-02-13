/**
 * GET /api/admin/setup
 *
 * Applies admin schema changes (adds is_admin column).
 * Safe to call multiple times (idempotent).
 * Requires SUPABASE_SERVICE_ROLE_KEY.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getServiceClient();

    // Add is_admin column (IF NOT EXISTS handled by catching error)
    const { error: alterError } = await sb.rpc("exec_sql", {
      query: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;",
    });

    // If rpc doesn't exist, try direct approach via REST
    if (alterError) {
      // Try adding the column by updating a profile — if column doesn't exist, we need raw SQL
      // Use the Supabase Management API or direct SQL approach
      const { error: testError } = await sb
        .from("profiles")
        .select("is_admin")
        .limit(1);

      if (testError && testError.message.includes("is_admin")) {
        // Column doesn't exist — we need to create it via raw HTTP
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const sqlRes = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: key!,
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            query: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;",
          }),
        });

        if (!sqlRes.ok) {
          // Last resort: try via Supabase SQL endpoint
          const pgRes = await fetch(`${url}/pg`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: key!,
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              query: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;",
            }),
          });

          if (!pgRes.ok) {
            return NextResponse.json({
              success: false,
              message: "لم نتمكن من إضافة عمود is_admin تلقائياً. يرجى تنفيذ الأمر التالي يدوياً في Supabase SQL Editor:",
              sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;",
            });
          }
        }
      }
      // If no error about is_admin, column already exists
    }

    // Verify column exists
    const { error: verifyError } = await sb
      .from("profiles")
      .select("is_admin")
      .limit(1);

    if (verifyError && verifyError.message.includes("is_admin")) {
      return NextResponse.json({
        success: false,
        message: "العمود is_admin لم يتم إنشاؤه. نفّذ هذا الأمر في Supabase SQL Editor:",
        sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;",
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم إعداد نظام الأدمن بنجاح",
      next_step: "UPDATE profiles SET is_admin = true WHERE phone = 'رقم_موبايلك';",
    });
  } catch (err) {
    console.error("[Admin Setup Error]", err);
    return NextResponse.json({
      success: false,
      error: "حصلت مشكلة",
      manual_sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;",
    }, { status: 500 });
  }
}
