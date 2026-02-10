import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * POST /api/admin/setup-stores-db
 *
 * Runs migration 00012 to set up the stores & unified seller system.
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 *
 * Alternative: pass ?secret=YOUR_SERVICE_ROLE_KEY as query param.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || secretParam;

  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "مفيش Service Role Key. ضيف SUPABASE_SERVICE_ROLE_KEY في environment variables أو ابعته كـ query param ?secret=KEY",
      },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL مش موجود" },
      { status: 500 },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // Read the migration SQL file
    const sqlPath = join(
      process.cwd(),
      "supabase",
      "migrations",
      "00012_stores_unified_system.sql",
    );
    const sql = readFileSync(sqlPath, "utf-8");

    // Split into individual statements and execute
    // We use rpc to execute raw SQL via Supabase
    const { error } = await adminClient.rpc("exec_sql" as never, {
      query: sql,
    } as never);

    if (error) {
      // Fallback: try to check if tables already exist
      const { data: storesCheck } = await adminClient
        .from("stores" as never)
        .select("id")
        .limit(0);

      if (storesCheck !== null) {
        return NextResponse.json({
          success: true,
          message: "جداول المحلات موجودة بالفعل. يُرجى تشغيل migration SQL في Supabase SQL Editor.",
          note: "استخدم GET /api/admin/setup-stores-db للحصول على SQL",
        });
      }

      return NextResponse.json(
        {
          error: "فشل تنفيذ الـ migration. شغّل الـ SQL يدوياً في Supabase SQL Editor.",
          details: error.message,
          hint: "استخدم GET /api/admin/setup-stores-db للحصول على ملف SQL",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم إنشاء جداول نظام المحلات والبائعين الموحد بنجاح!",
      tables_created: [
        "stores",
        "store_categories",
        "store_followers",
        "store_reviews",
        "store_badges",
        "store_pinned_products",
        "store_analytics",
        "store_promotions",
        "store_subscriptions",
        "user_wishlist",
        "user_recently_viewed",
      ],
      columns_added: [
        "profiles.seller_type",
        "profiles.store_id",
        "ads.store_id",
        "ads.store_category_id",
        "ads.is_pinned",
        "ads.original_price",
      ],
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "خطأ في تنفيذ الـ migration",
        details: err instanceof Error ? err.message : String(err),
        hint: "استخدم GET /api/admin/setup-stores-db للحصول على ملف SQL وشغله في Supabase SQL Editor",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/setup-stores-db
 *
 * Returns the migration SQL file content for manual execution in SQL Editor.
 */
export async function GET() {
  try {
    const sqlPath = join(
      process.cwd(),
      "supabase",
      "migrations",
      "00012_stores_unified_system.sql",
    );
    const sql = readFileSync(sqlPath, "utf-8");
    return new NextResponse(sql, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: "مش لاقي ملف migration المحلات" },
      { status: 404 },
    );
  }
}
