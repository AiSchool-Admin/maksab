import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createDemoStore } from "@/lib/demo/demo-stores";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const body = await request.json();
    const {
      user_id,
      name,
      description,
      main_category,
      theme,
      layout,
      primary_color,
      secondary_color,
      location_gov,
      location_area,
      phone,
    } = body;

    if (!user_id || !name || !main_category) {
      return NextResponse.json(
        { error: "الاسم والقسم مطلوبين" },
        { status: 400 },
      );
    }

    // Dev mode fallback — create store locally
    if (IS_DEV && (!supabaseUrl || !serviceRoleKey)) {
      const result = createDemoStore({
        name,
        description,
        main_category,
        theme,
        layout,
        primary_color,
        secondary_color,
        location_gov,
        location_area,
        phone,
      });

      return NextResponse.json({
        success: true,
        id: result.id,
        slug: result.slug,
        message: "تم إنشاء المتجر بنجاح! (وضع التطوير)",
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration missing" },
        { status: 500 },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check user exists
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, seller_type, store_id")
      .eq("id", user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 },
      );
    }

    // Check if user already has a store
    if (profile.store_id) {
      return NextResponse.json(
        { error: "عندك متجر بالفعل. المستخدم يقدر ينشئ متجر واحد بس" },
        { status: 409 },
      );
    }

    // Generate slug
    const { data: slugData } = await adminClient.rpc(
      "generate_store_slug" as never,
      { store_name: name } as never,
    );
    const slug = (slugData as string) || `store-${Date.now()}`;

    // Create store
    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .insert({
        user_id,
        name: name.trim(),
        slug,
        description: description || null,
        main_category,
        theme: theme || "classic",
        layout: layout || "grid",
        primary_color: primary_color || "#1B7A3D",
        secondary_color: secondary_color || null,
        location_gov: location_gov || null,
        location_area: location_area || null,
        phone: phone || null,
      })
      .select("id, slug")
      .single();

    if (storeError) {
      return NextResponse.json(
        { error: "فشل إنشاء المتجر: " + storeError.message },
        { status: 500 },
      );
    }

    // Update profile with store_id and seller_type
    await adminClient
      .from("profiles")
      .update({
        store_id: store.id,
        seller_type: "store",
      })
      .eq("id", user_id);

    // Auto-create FREE subscription
    await adminClient
      .from("store_subscriptions")
      .insert({
        store_id: store.id,
        plan: "free",
        status: "active",
        price: 0,
        start_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      id: store.id,
      slug: store.slug,
      message: "تم إنشاء المتجر بنجاح!",
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
