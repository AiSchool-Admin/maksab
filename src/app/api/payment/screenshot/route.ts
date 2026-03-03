import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * POST /api/payment/screenshot
 *
 * Upload a payment screenshot as proof for manual payments (InstaPay, Vodafone Cash).
 * The screenshot is stored in Supabase Storage and linked to the commission record.
 *
 * Expects multipart/form-data with:
 * - file: The screenshot image (JPEG, PNG, or WebP, max 2MB)
 * - commission_id: The commission record to attach it to
 * - session_token: Auth token
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const commissionId = formData.get("commission_id") as string | null;
    const sessionToken = formData.get("session_token") as string | null;

    if (!sessionToken) {
      return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
    }

    const tokenResult = verifySessionToken(sessionToken);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }

    const userId = tokenResult.userId;

    if (!file || !commissionId) {
      return NextResponse.json({ error: "الصورة ومعرف الدفع مطلوبين" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "نوع الصورة مش مدعوم. استخدم JPG أو PNG" }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "الصورة كبيرة. الحد الأقصى 2 ميجا" }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify the commission belongs to this user
    const { data: commission, error: fetchErr } = await adminClient
      .from("commissions")
      .select("id, payer_id, status, payment_method")
      .eq("id", commissionId)
      .maybeSingle();

    if (fetchErr || !commission) {
      return NextResponse.json({ error: "سجل الدفع مش موجود" }, { status: 404 });
    }

    if (commission.payer_id !== userId) {
      return NextResponse.json({ error: "غير مسموح" }, { status: 403 });
    }

    // Only allow screenshot upload for pending or pending_verification payments
    if (commission.status !== "pending" && commission.status !== "pending_verification") {
      return NextResponse.json({ error: "الدفع ده مش محتاج إثبات" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `${userId}/${commissionId}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await adminClient
      .storage
      .from("payment-screenshots")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true, // Allow re-upload
      });

    if (uploadErr) {
      console.error("Screenshot upload error:", uploadErr);
      return NextResponse.json({ error: "حصل مشكلة في رفع الصورة" }, { status: 500 });
    }

    // Get the URL
    const { data: urlData } = adminClient
      .storage
      .from("payment-screenshots")
      .getPublicUrl(fileName);

    const screenshotUrl = urlData?.publicUrl || fileName;

    // Update commission with screenshot URL and set to pending_verification
    await adminClient
      .from("commissions")
      .update({
        screenshot_url: screenshotUrl,
        status: "pending_verification",
      } as never)
      .eq("id", commissionId);

    // Log the action
    await adminClient.from("payment_verification_log").insert({
      commission_id: commissionId,
      action: "screenshot_uploaded",
      notes: "المستخدم رفع إثبات دفع (سكرين شوت)",
      performed_by: userId,
    });

    return NextResponse.json({
      success: true,
      screenshotUrl,
    });
  } catch (err) {
    console.error("Screenshot upload error:", err);
    return NextResponse.json({ error: "حصل مشكلة، جرب تاني" }, { status: 500 });
  }
}
