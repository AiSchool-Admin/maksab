/**
 * AHE Sellers Copy Phone API
 * POST — جلب رقم الهاتف للنسخ
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/crm/auth";

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();

  try {
    const { seller_id } = await req.json();

    if (!seller_id) {
      return NextResponse.json(
        { error: "seller_id مطلوب" },
        { status: 400 }
      );
    }

    const { data: seller, error } = await supabase
      .from("ahe_sellers")
      .select("phone")
      .eq("id", seller_id)
      .single();

    if (error || !seller) {
      return NextResponse.json(
        { error: "المعلن غير موجود" },
        { status: 404 }
      );
    }

    if (!seller.phone) {
      return NextResponse.json(
        { error: "لا يوجد رقم هاتف لهذا المعلن" },
        { status: 404 }
      );
    }

    return NextResponse.json({ phone: seller.phone });
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطأ في الخادم",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
