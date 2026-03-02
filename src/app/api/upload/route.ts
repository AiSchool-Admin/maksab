/**
 * POST /api/upload
 *
 * Generic file upload endpoint for Supabase Storage.
 * Accepts FormData with: file, bucket, path
 * Uses service role key to bypass RLS/storage policies.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySessionToken } from "@/lib/auth/session-token";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Allowed buckets with per-bucket size limits and allowed MIME types
const BUCKET_CONFIG: Record<string, { maxSize: number; label: string; allowedTypes: string[] }> = {
  "ad-images": { maxSize: 5 * 1024 * 1024, label: "5MB", allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] },
  "ad-videos": { maxSize: 50 * 1024 * 1024, label: "50MB", allowedTypes: ["video/mp4", "video/quicktime", "video/webm"] },
  "ad-audio": { maxSize: 10 * 1024 * 1024, label: "10MB", allowedTypes: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/webm", "audio/wav"] },
  "store-logos": { maxSize: 5 * 1024 * 1024, label: "5MB", allowedTypes: ["image/jpeg", "image/png", "image/webp"] },
  "chat-images": { maxSize: 5 * 1024 * 1024, label: "5MB", allowedTypes: ["image/jpeg", "image/png", "image/webp"] },
  "avatars": { maxSize: 5 * 1024 * 1024, label: "5MB", allowedTypes: ["image/jpeg", "image/png", "image/webp"] },
};

export async function POST(req: NextRequest) {
  try {
    // Verify authentication — uploads require a logged-in user
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "لازم تسجل دخول الأول" }, { status: 401 });
    }
    const session = verifySessionToken(token);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

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

    // Path traversal protection — reject paths with directory traversal sequences
    if (path.includes("..") || path.includes("//") || /[<>|:*?"\\]/.test(path)) {
      return NextResponse.json(
        { error: "مسار الملف غير صالح" },
        { status: 400 },
      );
    }

    // File type validation — check MIME type against bucket's allowed types
    const contentType = file.type || "application/octet-stream";
    if (!bucketCfg.allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `نوع الملف مش مسموح. الأنواع المسموحة: ${bucketCfg.allowedTypes.join(", ")}` },
        { status: 400 },
      );
    }

    if (file.size > bucketCfg.maxSize) {
      return NextResponse.json(
        { error: `حجم الملف أكبر من ${bucketCfg.label}` },
        { status: 400 },
      );
    }

    // Empty file check
    if (file.size === 0) {
      return NextResponse.json(
        { error: "الملف فاضي" },
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
