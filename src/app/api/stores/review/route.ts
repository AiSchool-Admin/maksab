import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
      reviewer_id,
      transaction_id,
      overall_rating,
      quality_rating,
      accuracy_rating,
      response_rating,
      commitment_rating,
      comment,
    } = body;

    if (!store_id || !reviewer_id || !transaction_id || !overall_rating) {
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

    const { data: review, error } = await adminClient
      .from("store_reviews")
      .insert({
        store_id,
        reviewer_id,
        transaction_id,
        overall_rating,
        quality_rating: quality_rating || null,
        accuracy_rating: accuracy_rating || null,
        response_rating: response_rating || null,
        commitment_rating: commitment_rating || null,
        comment: comment || null,
      })
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
        { error: "فشل إضافة التقييم: " + error.message },
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
      {
        error: "خطأ غير متوقع",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
