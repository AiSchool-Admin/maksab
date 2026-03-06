import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration missing" },
      { status: 500 },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await request.json();
    const {
      store_id,
      session_token,
      transaction_id,
      overall_rating,
      quality_rating,
      accuracy_rating,
      response_rating,
      commitment_rating,
      comment,
    } = body;

    // Authentication (session_token required)
    if (!session_token) {
      return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
    }
    const tokenResult = verifySessionToken(session_token);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 401 });
    }
    const reviewer_id = tokenResult.userId;

    if (!store_id || !overall_rating) {
      return NextResponse.json(
        { error: "البيانات الأساسية مطلوبة" },
        { status: 400 },
      );
    }

    if (overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json(
        { error: "التقييم لازم يكون من 1 لـ 5" },
        { status: 400 },
      );
    }

    // Validate sub-ratings (1-5 if provided)
    const subRatings = { quality_rating, accuracy_rating, response_rating, commitment_rating };
    for (const [key, val] of Object.entries(subRatings)) {
      if (val != null && (val < 1 || val > 5)) {
        return NextResponse.json(
          { error: "التقييمات الفرعية لازم تكون من 1 لـ 5" },
          { status: 400 },
        );
      }
    }

    // Validate comment length
    if (comment && typeof comment === "string" && comment.length > 500) {
      return NextResponse.json(
        { error: "التعليق لازم يكون أقل من 500 حرف" },
        { status: 400 },
      );
    }

    // Check store exists
    const { data: store } = await adminClient
      .from("stores")
      .select("id, user_id")
      .eq("id", store_id)
      .maybeSingle();

    if (!store) {
      return NextResponse.json(
        { error: "المتجر غير موجود" },
        { status: 404 },
      );
    }

    // Can't review your own store
    if (store.user_id === reviewer_id) {
      return NextResponse.json(
        { error: "مينفعش تقيّم متجرك" },
        { status: 400 },
      );
    }

    // Check if user already reviewed this store (one review per user per store)
    const { data: existingReview } = await adminClient
      .from("store_reviews")
      .select("id")
      .eq("store_id", store_id)
      .eq("reviewer_id", reviewer_id)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: "أنت قيّمت المتجر ده قبل كده" },
        { status: 409 },
      );
    }

    const insertData: Record<string, unknown> = {
      store_id,
      reviewer_id,
      overall_rating,
      quality_rating: quality_rating || null,
      accuracy_rating: accuracy_rating || null,
      response_rating: response_rating || null,
      commitment_rating: commitment_rating || null,
      comment: comment ? String(comment).slice(0, 500) : null,
    };
    // Only include transaction_id if it's a valid UUID
    if (transaction_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transaction_id)) {
      insertData.transaction_id = transaction_id;
    }

    const { data: review, error } = await adminClient
      .from("store_reviews")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "قيّمت المعاملة دي قبل كده" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "فشل إضافة التقييم. جرب تاني" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      review,
      message: "تم إضافة التقييم بنجاح! شكراً ليك",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "حصل مشكلة. جرب تاني" },
      { status: 500 },
    );
  }
}
