/**
 * POST /api/auth/dev-login
 *
 * Development-only endpoint for quick login without OTP.
 * Creates a real user in Supabase (if service role key is available)
 * or returns a mock session for UI testing.
 *
 * NOT available in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Test accounts
const TEST_ACCOUNTS = {
  individual: {
    phone: "01011111111",
    email: "test-individual@dev.maksab.app",
    display_name: "مستخدم تجريبي",
    governorate: "القاهرة",
    city: "مدينة نصر",
    seller_type: "individual" as const,
  },
  store: {
    phone: "01022222222",
    email: "test-store@dev.maksab.app",
    display_name: "تاجر تجريبي",
    governorate: "القاهرة",
    city: "وسط البلد",
    seller_type: "store" as const,
    store_name: "متجر تجريبي",
    store_category: "phones",
  },
};

export async function POST(req: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "مش متاح في الإنتاج" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const accountType = body.type as "individual" | "store";

    if (!accountType || !TEST_ACCOUNTS[accountType]) {
      return NextResponse.json(
        { error: "نوع الحساب مطلوب: individual أو store" },
        { status: 400 },
      );
    }

    const account = TEST_ACCOUNTS[accountType];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ── With service role key: create real user ─────────────────────
    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Find or create auth user
      let userId: string;

      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("phone", account.phone)
        .maybeSingle();

      if (existingProfile) {
        // User already exists — return their profile
        const profile = existingProfile as Record<string, unknown>;

        // If store account requested and user doesn't have a store yet, create one
        if (accountType === "store" && !profile.store_id) {
          const storeAccount = account as typeof TEST_ACCOUNTS.store;
          const storeResult = await createTestStore(adminClient, profile.id as string, storeAccount);
          if (storeResult) {
            profile.store_id = storeResult.id;
            profile.seller_type = "store";
          }
        }

        return NextResponse.json({ user: profile, mode: "real" });
      }

      // Create new auth user
      const { data: authUser, error: authError } =
        await adminClient.auth.admin.createUser({
          email: account.email,
          phone: `+2${account.phone}`,
          email_confirm: true,
          phone_confirm: true,
          password: `DevTest@${account.phone}`,
          user_metadata: {
            display_name: account.display_name,
            is_dev: true,
          },
        });

      if (authError) {
        // Try to find existing auth user
        const { data: users } = await adminClient.auth.admin.listUsers();
        const found = users?.users?.find((u) => u.email === account.email);
        if (found) {
          userId = found.id;
        } else {
          console.error("[dev-login] Auth error:", authError.message);
          return NextResponse.json(
            { error: `خطأ في إنشاء المستخدم: ${authError.message}` },
            { status: 500 },
          );
        }
      } else {
        userId = authUser.user.id;
      }

      // Create profile
      const profileData: Record<string, unknown> = {
        id: userId,
        phone: account.phone,
        display_name: account.display_name,
        governorate: account.governorate,
        city: account.city,
        seller_type: account.seller_type,
      };

      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .upsert(profileData, { onConflict: "id" })
        .select()
        .single();

      if (profileError) {
        console.error("[dev-login] Profile error:", profileError.message);
      }

      const userProfile = (profile as Record<string, unknown>) || {
        ...profileData,
        avatar_url: null,
        bio: null,
        is_commission_supporter: false,
        total_ads_count: 0,
        rating: 0,
        store_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If store account, create test store
      if (accountType === "store" && !userProfile.store_id) {
        const storeAccount = account as typeof TEST_ACCOUNTS.store;
        const storeResult = await createTestStore(adminClient, userId, storeAccount);
        if (storeResult) {
          userProfile.store_id = storeResult.id;
          userProfile.seller_type = "store";
        }
      }

      return NextResponse.json({ user: userProfile, mode: "real" });
    }

    // ── Without service role key: mock session ──────────────────────
    const mockId = accountType === "store"
      ? "00000000-0000-0000-0000-000000000002"
      : "00000000-0000-0000-0000-000000000001";

    const mockProfile = {
      id: mockId,
      phone: account.phone,
      display_name: account.display_name,
      avatar_url: null,
      governorate: account.governorate,
      city: account.city,
      bio: null,
      is_commission_supporter: false,
      total_ads_count: 0,
      rating: 0,
      seller_type: account.seller_type,
      store_id: accountType === "store" ? "mock-store-001" : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      user: mockProfile,
      mode: "mock",
      warning: "جلسة وهمية — عشان تختبر كل حاجة (إنشاء إعلانات، متاجر) ضيف SUPABASE_SERVICE_ROLE_KEY في .env.local",
    });
  } catch (err) {
    console.error("[dev-login] Error:", err);
    return NextResponse.json(
      { error: "حصلت مشكلة" },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createTestStore(adminClient: any, userId: string, account: typeof TEST_ACCOUNTS.store) {
  try {
    // Ensure categories exist
    const categoriesModule = await import("@/lib/categories/categories-config");
    const allCategories = categoriesModule.categoriesConfig || [];
    for (const cat of allCategories) {
      await adminClient
        .from("categories")
        .upsert(
          { id: cat.id, name: cat.name, icon: cat.icon, slug: cat.slug, sort_order: 0, is_active: true },
          { onConflict: "id" },
        );
      for (const sub of cat.subcategories || []) {
        await adminClient
          .from("subcategories")
          .upsert(
            { id: sub.id, category_id: cat.id, name: sub.name, slug: sub.slug, sort_order: 0, is_active: true },
            { onConflict: "id" },
          );
      }
    }

    const slug = `test-store-${Date.now()}`;

    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .insert({
        user_id: userId,
        name: account.store_name,
        slug,
        description: "متجر تجريبي لاختبار التطبيق",
        main_category: account.store_category,
        theme: "modern",
        primary_color: "#1B7A3D",
        location_gov: account.governorate,
        location_area: account.city,
        phone: account.phone,
      })
      .select("id, slug")
      .single();

    if (storeError) {
      console.error("[dev-login] Store creation error:", storeError.message);
      return null;
    }

    // Link store to profile
    await adminClient
      .from("profiles")
      .update({ store_id: store.id, seller_type: "store" })
      .eq("id", userId);

    // Create free subscription
    await adminClient
      .from("store_subscriptions")
      .insert({
        store_id: store.id,
        plan: "free",
        status: "active",
        price: 0,
        start_at: new Date().toISOString(),
      });

    // Create a few test ads for the store
    const testAds = [
      {
        user_id: userId,
        store_id: store.id,
        title: "آيفون 15 برو — 256GB — مستعمل زيرو",
        description: "آيفون 15 برو، 256 جيجا، مستعمل زيرو، مع العلبة",
        category_id: "phones",
        subcategory_id: "mobile",
        sale_type: "cash",
        price: 45000,
        is_negotiable: true,
        governorate: account.governorate,
        city: account.city,
        category_fields: { brand: "آيفون", model: "15 برو", storage: "256GB", condition: "مستعمل زيرو" },
        status: "active",
        images: [],
      },
      {
        user_id: userId,
        store_id: store.id,
        title: "سامسونج S24 — 128GB — جديد",
        description: "سامسونج جالاكسي S24، 128 جيجا، جديد متبرشم",
        category_id: "phones",
        subcategory_id: "mobile",
        sale_type: "cash",
        price: 28000,
        is_negotiable: false,
        governorate: account.governorate,
        city: account.city,
        category_fields: { brand: "سامسونج", model: "S24", storage: "128GB", condition: "جديد متبرشم" },
        status: "active",
        images: [],
      },
    ];

    for (const ad of testAds) {
      await adminClient.from("ads").insert(ad);
    }

    return store;
  } catch (err) {
    console.error("[dev-login] Store error:", err);
    return null;
  }
}
