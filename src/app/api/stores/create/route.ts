import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
      logo_url,
    } = body;

    // ── Validation ──────────────────────────────────────────────
    if (!user_id || !name || !main_category) {
      return NextResponse.json(
        { error: "الاسم والقسم مطلوبين" },
        { status: 400 },
      );
    }

    if (name.trim().length > 30) {
      return NextResponse.json(
        { error: "اسم المتجر لازم يكون أقل من 30 حرف" },
        { status: 400 },
      );
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

    // ── Check user exists and is individual ─────────────────────
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

    if (profile.store_id) {
      return NextResponse.json(
        { error: "عندك متجر بالفعل. المستخدم يقدر ينشئ متجر واحد بس" },
        { status: 409 },
      );
    }

    // ── Validate store name uniqueness ──────────────────────────
    const { data: existingStore } = await adminClient
      .from("stores")
      .select("id")
      .ilike("name", name.trim())
      .maybeSingle();

    if (existingStore) {
      return NextResponse.json(
        { error: "الاسم ده مستخدم بالفعل. اختار اسم تاني لمتجرك" },
        { status: 409 },
      );
    }

    // ── Generate slug ───────────────────────────────────────────
    const { data: slugData } = await adminClient.rpc(
      "generate_store_slug" as never,
      { store_name: name } as never,
    );
    const slug = (slugData as string) || `store-${Date.now()}`;

    // ── Create store (single transaction) ───────────────────────
    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .insert({
        user_id,
        name: name.trim(),
        slug,
        description: description || null,
        logo_url: logo_url || null,
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

    // ── Update profile: seller_type → store, link store_id ──────
    await adminClient
      .from("profiles")
      .update({
        store_id: store.id,
        seller_type: "store",
      })
      .eq("id", user_id);

    // ── Migrate existing products to store ──────────────────────
    // First count how many ads to migrate
    const { count: migratedCount } = await adminClient
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .neq("status", "deleted");

    // Then update them all
    await adminClient
      .from("ads")
      .update({ store_id: store.id } as never)
      .eq("user_id", user_id)
      .neq("status", "deleted");

    // ── Auto-create FREE subscription ───────────────────────────
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
      store: {
        id: store.id,
        slug: store.slug,
        name: name.trim(),
      },
      migrated_products: migratedCount || 0,
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
