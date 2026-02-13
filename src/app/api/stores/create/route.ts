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
      business_type,
      theme,
      layout,
      primary_color,
      secondary_color,
      location_gov,
      location_area,
      phone,
      logo_url,
      working_hours_text,
      business_data,
      address_detail,
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

    // ── Check user exists ───────────────────────────────────────
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

    // ── Validate business_type ──────────────────────────────────
    const validBusinessTypes = [
      "shop", "showroom", "office", "workshop",
      "restaurant", "freelancer", "wholesaler", "online",
    ];
    const finalBusinessType = validBusinessTypes.includes(business_type)
      ? business_type
      : "shop";

    // ── Build settings object to store business data ─────────────
    // Store business_type and extra fields in the existing `settings`
    // JSONB column for compatibility (works even before migration 00014)
    const settings: Record<string, unknown> = {
      business_type: finalBusinessType,
    };
    if (working_hours_text) settings.working_hours_text = working_hours_text;
    if (address_detail) settings.address_detail = address_detail;
    if (business_data && Object.keys(business_data).length > 0) {
      settings.business_data = business_data;
    }

    // ── Create store ────────────────────────────────────────────
    // Use only columns that exist in the original migration (00012)
    const insertData: Record<string, unknown> = {
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
      settings,
    };

    // Try with new columns first (if migration 00014 was applied)
    let store: { id: string; slug: string } | null = null;
    let storeError: { message: string } | null = null;

    const fullInsert = {
      ...insertData,
      business_type: finalBusinessType,
      working_hours_text: working_hours_text || null,
      address_detail: address_detail || null,
      business_data: business_data || {},
    };

    const result1 = await adminClient
      .from("stores")
      .insert(fullInsert)
      .select("id, slug")
      .single();

    if (result1.error) {
      // Fallback: insert without the new columns (migration not yet applied)
      const result2 = await adminClient
        .from("stores")
        .insert(insertData)
        .select("id, slug")
        .single();

      store = result2.data;
      storeError = result2.error;
    } else {
      store = result1.data;
      storeError = result1.error;
    }

    if (storeError || !store) {
      return NextResponse.json(
        { error: "فشل إنشاء المتجر: " + (storeError?.message || "unknown") },
        { status: 500 },
      );
    }

    // ── Update profile: seller_type → store, link store_id (latest) ─
    // store_id always points to the most recently created store
    await adminClient
      .from("profiles")
      .update({
        store_id: store.id,
        seller_type: "store",
      })
      .eq("id", user_id);

    // ── Migrate unassigned products to new store ─────────────────
    // Only migrate ads that don't already belong to another store
    const { count: migratedCount } = await adminClient
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .is("store_id", null)
      .neq("status", "deleted");

    await adminClient
      .from("ads")
      .update({ store_id: store.id } as never)
      .eq("user_id", user_id)
      .is("store_id", null)
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
