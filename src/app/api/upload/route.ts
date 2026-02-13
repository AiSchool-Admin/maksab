/**
 * POST /api/upload
 *
 * Generic file upload endpoint for Supabase Storage.
 * Accepts FormData with: file, bucket, path
 * Uses service role key to bypass RLS/storage policies.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Allowed buckets with per-bucket size limits
const BUCKET_CONFIG: Record<string, { maxSize: number; label: string }> = {
  "ad-images": { maxSize: 5 * 1024 * 1024, label: "5MB" },
  "ad-videos": { maxSize: 50 * 1024 * 1024, label: "50MB" },
  "ad-audio": { maxSize: 10 * 1024 * 1024, label: "10MB" },
  "store-logos": { maxSize: 5 * 1024 * 1024, label: "5MB" },
  "chat-images": { maxSize: 5 * 1024 * 1024, label: "5MB" },
  "avatars": { maxSize: 5 * 1024 * 1024, label: "5MB" },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;
    const path = formData.get("path") as string | null;

    if (!file || !bucket || !path) {
      return NextResponse.json(
        { error: "file, bucket, and path are required" },
        { status: 400 },
      );
    }

    const bucketCfg = BUCKET_CONFIG[bucket];
    if (!bucketCfg) {
      return NextResponse.json(
        { error: "Invalid bucket" },
        { status: 400 },
      );
    }

    if (file.size > bucketCfg.maxSize) {
      return NextResponse.json(
        { error: `حجم الملف أكبر من ${bucketCfg.label}` },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Ensure bucket exists (create if not)
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucket);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: bucketCfg.maxSize,
      });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = file.type || "image/jpeg";

    // Upload
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[upload] Storage error:", uploadError.message);
      return NextResponse.json(
        { error: "فشل رفع الملف: " + uploadError.message },
        { status: 500 },
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json(
      { error: "حصل مشكلة في رفع الملف" },
      { status: 500 },
    );
  }
}
