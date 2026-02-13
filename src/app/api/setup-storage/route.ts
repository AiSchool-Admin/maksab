/**
 * GET /api/setup-storage
 *
 * Creates all required Supabase Storage buckets and verifies they exist.
 * Safe to call multiple times (idempotent).
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment variables.
 *
 * Buckets created:
 *   - ad-images:    صور الإعلانات (public, max 5MB)
 *   - store-logos:  شعارات المحلات (public, max 2MB)
 *   - chat-images:  صور المحادثات (public, max 5MB)
 *   - avatars:      صور المستخدمين (public, max 2MB)
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface BucketConfig {
  name: string;
  label: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

const BUCKETS: BucketConfig[] = [
  {
    name: "ad-images",
    label: "صور الإعلانات",
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  {
    name: "store-logos",
    label: "شعارات المحلات",
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: "chat-images",
    label: "صور المحادثات",
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  {
    name: "avatars",
    label: "صور المستخدمين",
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: { bucket: string; label: string; status: string }[] = [];

  // Get existing buckets
  const { data: existingBuckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    return NextResponse.json(
      { error: "فشل الاتصال بالـ Storage: " + listError.message },
      { status: 500 },
    );
  }

  const existingNames = new Set(existingBuckets?.map((b) => b.name) || []);

  for (const bucket of BUCKETS) {
    if (existingNames.has(bucket.name)) {
      // Bucket already exists — update settings
      const { error: updateError } = await supabase.storage.updateBucket(
        bucket.name,
        {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes,
        },
      );

      results.push({
        bucket: bucket.name,
        label: bucket.label,
        status: updateError
          ? `⚠️ موجود بس فشل التحديث: ${updateError.message}`
          : "✅ موجود — تم تحديث الإعدادات",
      });
    } else {
      // Create new bucket
      const { error: createError } = await supabase.storage.createBucket(
        bucket.name,
        {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes,
        },
      );

      results.push({
        bucket: bucket.name,
        label: bucket.label,
        status: createError
          ? `❌ فشل الإنشاء: ${createError.message}`
          : "✅ تم الإنشاء بنجاح",
      });
    }
  }

  const allSuccess = results.every((r) => r.status.startsWith("✅"));

  return NextResponse.json({
    success: allSuccess,
    message: allSuccess
      ? "✅ كل الـ Storage Buckets جاهزة!"
      : "⚠️ بعض الـ Buckets محتاجة مراجعة",
    buckets: results,
  });
}
