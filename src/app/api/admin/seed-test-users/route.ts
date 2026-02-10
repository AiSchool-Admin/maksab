import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/seed-test-users
 *
 * Creates 5 test accounts with sample ads using Supabase Admin API.
 * Requires SUPABASE_SERVICE_ROLE_KEY.
 *
 * Also supports GET: /api/admin/seed-test-users?secret=YOUR_SERVICE_ROLE_KEY
 */

const TEST_USERS = [
  // ── تجار (Merchants with Stores) ──────────
  {
    id: "a1111111-1111-1111-1111-111111111111",
    email: "mohamed@test.maksab.app",
    phone: "01012345678",
    password: "Test123456",
    display_name: "محمد أحمد",
    governorate: "القاهرة",
    city: "مدينة نصر",
    bio: "بائع سيارات مستعملة — خبرة 10 سنين في السوق",
    is_commission_supporter: true,
    total_ads_count: 5,
    rating: 4.8,
    seller_type: "store" as const,
    store: {
      id: "f1111111-1111-1111-1111-111111111111",
      name: "سيارات محمد أحمد",
      slug: "mohamed-cars",
      description: "أكبر معرض سيارات مستعملة في مدينة نصر — خبرة 10 سنين — كل السيارات مضمونة",
      main_category: "cars",
      theme: "modern",
      layout: "grid",
      primary_color: "#1B7A3D",
      is_verified: true,
      plan: "gold",
    },
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    email: "fatma@test.maksab.app",
    phone: "01198765432",
    password: "Test123456",
    display_name: "فاطمة علي",
    governorate: "الجيزة",
    city: "المهندسين",
    bio: "بيع وشراء موبايلات وتابلت — أصلي ومضمون",
    is_commission_supporter: false,
    total_ads_count: 3,
    rating: 4.5,
    seller_type: "store" as const,
    store: {
      id: "f2222222-2222-2222-2222-222222222222",
      name: "موبايلات فاطمة",
      slug: "fatma-phones",
      description: "موبايلات أصلية ومضمونة — آيفون وسامسونج — جديد ومستعمل",
      main_category: "phones",
      theme: "classic",
      layout: "grid",
      primary_color: "#D4A843",
      is_verified: false,
      plan: "free",
    },
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    email: "ahmed@test.maksab.app",
    phone: "01234567890",
    password: "Test123456",
    display_name: "أحمد حسن",
    governorate: "الإسكندرية",
    city: "سموحة",
    bio: "مكتب عقارات — شقق وفيلات في إسكندرية",
    is_commission_supporter: true,
    total_ads_count: 4,
    rating: 4.9,
    seller_type: "store" as const,
    store: {
      id: "f3333333-3333-3333-3333-333333333333",
      name: "عقارات أحمد حسن",
      slug: "ahmed-realestate",
      description: "مكتب عقارات متخصص في شقق وفيلات إسكندرية — بيع وإيجار",
      main_category: "real_estate",
      theme: "elegant",
      layout: "list",
      primary_color: "#145C2E",
      is_verified: true,
      plan: "platinum",
    },
  },
  // ── أفراد (Individual Users) ──────────
  {
    id: "d4444444-4444-4444-4444-444444444444",
    email: "noura@test.maksab.app",
    phone: "01556789012",
    password: "Test123456",
    display_name: "نورا محمود",
    governorate: "الدقهلية",
    city: "المنصورة",
    bio: "ملابس ماركات أصلية — جديد ومستعمل نضيف",
    is_commission_supporter: false,
    total_ads_count: 3,
    rating: 4.2,
    seller_type: "individual" as const,
  },
  {
    id: "e5555555-5555-5555-5555-555555555555",
    email: "omar@test.maksab.app",
    phone: "01087654321",
    password: "Test123456",
    display_name: "عمر خالد",
    governorate: "الغربية",
    city: "طنطا",
    bio: "أجهزة منزلية مستعملة بحالة ممتازة — ضمان شخصي",
    is_commission_supporter: false,
    total_ads_count: 3,
    rating: 4.6,
    seller_type: "individual" as const,
  },
];

const SAMPLE_ADS = [
  // ── محمد أحمد — سيارات ──
  {
    id: "11111111-0001-0001-0001-000000000001",
    user_id: "a1111111-1111-1111-1111-111111111111",
    category_id: "cars", subcategory_id: "passenger", sale_type: "cash",
    title: "تويوتا كورولا 2022 — 35,000 كم — أوتوماتيك",
    description: "سيارة تويوتا كورولا موديل 2022، مسافة 35,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة. السيارة بحالة ممتازة، صيانة وكالة.",
    price: 450000, is_negotiable: true,
    category_fields: { brand: "تويوتا", model: "كورولا", year: "2022", mileage: "35000", color: "أبيض", fuel: "بنزين", transmission: "أوتوماتيك" },
    governorate: "القاهرة", city: "مدينة نصر", views_count: 245, favorites_count: 18,
  },
  {
    id: "11111111-0001-0001-0001-000000000002",
    user_id: "a1111111-1111-1111-1111-111111111111",
    category_id: "cars", subcategory_id: "passenger", sale_type: "auction",
    title: "هيونداي توسان 2021 — 50,000 كم — فول أوبشن",
    description: "هيونداي توسان موديل 2021، فول أوبشن، مسافة 50,000 كم، بنزين، أوتوماتيك. بانوراما، كاميرا خلفية.",
    price: null, is_negotiable: false,
    auction_start_price: 380000, auction_buy_now_price: 480000,
    auction_duration_hours: 48, auction_min_increment: 5000,
    auction_ends_at: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: { brand: "هيونداي", model: "توسان", year: "2021", mileage: "50000", color: "رمادي", fuel: "بنزين", transmission: "أوتوماتيك" },
    governorate: "القاهرة", city: "مدينة نصر", views_count: 189, favorites_count: 32,
  },
  {
    id: "11111111-0001-0001-0001-000000000003",
    user_id: "a1111111-1111-1111-1111-111111111111",
    category_id: "cars", subcategory_id: "passenger", sale_type: "exchange",
    title: "نيسان صني 2020 — 60,000 كم — للتبديل بكورولا",
    description: "نيسان صني موديل 2020، مسافة 60,000 كم، أوتوماتيك، بنزين، لون أسود. فابريكة بالكامل.",
    price: null, is_negotiable: false,
    exchange_description: "عايز أبدل بتويوتا كورولا 2019 أو أحدث",
    exchange_accepts_price_diff: true, exchange_price_diff: 30000,
    category_fields: { brand: "نيسان", model: "صني", year: "2020", mileage: "60000", color: "أسود", fuel: "بنزين", transmission: "أوتوماتيك" },
    governorate: "القاهرة", city: "المعادي", views_count: 95, favorites_count: 7,
  },
  // ── فاطمة علي — موبايلات ──
  {
    id: "22222222-0002-0002-0002-000000000001",
    user_id: "b2222222-2222-2222-2222-222222222222",
    category_id: "phones", subcategory_id: "mobile", sale_type: "cash",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    description: "آيفون 15 برو ماكس، 256 جيجا، تيتانيوم أسود. البطارية 98%، مع العلبة والشاحن الأصلي.",
    price: 52000, is_negotiable: true,
    category_fields: { brand: "آيفون", model: "15 برو ماكس", storage: "256GB", condition: "مستعمل زيرو", color: "تيتانيوم أسود" },
    governorate: "الجيزة", city: "المهندسين", views_count: 456, favorites_count: 52,
  },
  {
    id: "22222222-0002-0002-0002-000000000002",
    user_id: "b2222222-2222-2222-2222-222222222222",
    category_id: "phones", subcategory_id: "mobile", sale_type: "auction",
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    description: "سامسونج جالاكسي S24 ألترا، 512 جيجا، بنفسجي، جديد متبرشم. ضمان دولي.",
    price: null, is_negotiable: false,
    auction_start_price: 38000, auction_buy_now_price: 48000,
    auction_duration_hours: 72, auction_min_increment: 1000,
    auction_ends_at: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: { brand: "سامسونج", model: "S24 Ultra", storage: "512GB", condition: "جديد متبرشم", color: "بنفسجي" },
    governorate: "الجيزة", city: "المهندسين", views_count: 334, favorites_count: 45,
  },
  // ── أحمد حسن — عقارات ──
  {
    id: "33333333-0003-0003-0003-000000000001",
    user_id: "c3333333-3333-3333-3333-333333333333",
    category_id: "real_estate", subcategory_id: "apartments-sale", sale_type: "cash",
    title: "شقة 180م² — 3 غرف — سوبر لوكس — سموحة",
    description: "شقة 180 متر في سموحة، 3 غرف، 2 حمام، سوبر لوكس، الطابق الخامس، أسانسير. واجهة بحري.",
    price: 2800000, is_negotiable: true,
    category_fields: { type: "شقة", area: "180", rooms: "3", floor: "5", bathrooms: "2", finishing: "سوبر لوكس", elevator: true, facing: "بحري" },
    governorate: "الإسكندرية", city: "سموحة", views_count: 567, favorites_count: 78,
  },
  {
    id: "33333333-0003-0003-0003-000000000002",
    user_id: "c3333333-3333-3333-3333-333333333333",
    category_id: "real_estate", subcategory_id: "apartments-rent", sale_type: "cash",
    title: "شقة 120م² للإيجار — 2 غرف — سيدي جابر",
    description: "شقة 120 متر للإيجار الشهري، 2 غرف، حمام، مطبخ مجهز. قريبة من المحطة.",
    price: 8000, is_negotiable: false,
    category_fields: { type: "شقة", area: "120", rooms: "2", floor: "3", bathrooms: "1", finishing: "لوكس", elevator: true },
    governorate: "الإسكندرية", city: "سيدي جابر", views_count: 234, favorites_count: 19,
  },
  // ── نورا محمود — موضة ──
  {
    id: "44444444-0004-0004-0004-000000000001",
    user_id: "d4444444-4444-4444-4444-444444444444",
    category_id: "fashion", subcategory_id: "women", sale_type: "cash",
    title: "جاكت جلد طبيعي — Zara — مقاس M — جديد بالتاج",
    description: "جاكت جلد طبيعي من زارا، مقاس M، لون أسود. جديد بالتاج، اتشرى من برة.",
    price: 3500, is_negotiable: false,
    category_fields: { type: "جاكت", condition: "جديد بالتاج", size: "M", brand: "Zara", color: "أسود", material: "جلد" },
    governorate: "الدقهلية", city: "المنصورة", views_count: 198, favorites_count: 34,
  },
  {
    id: "44444444-0004-0004-0004-000000000002",
    user_id: "d4444444-4444-4444-4444-444444444444",
    category_id: "fashion", subcategory_id: "bags", sale_type: "auction",
    title: "شنطة Michael Kors — أصلي بالضمان — مستعملة ممتاز",
    description: "شنطة مايكل كورس أصلية، لون بني، استعمال خفيف. مع الداست باج والفاتورة.",
    price: null, is_negotiable: false,
    auction_start_price: 2000, auction_buy_now_price: 4500,
    auction_duration_hours: 24, auction_min_increment: 200,
    auction_ends_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: { type: "شنطة", condition: "مستعمل ممتاز", brand: "Michael Kors", color: "بني" },
    governorate: "الدقهلية", city: "المنصورة", views_count: 267, favorites_count: 41,
  },
  // ── عمر خالد — أجهزة منزلية ──
  {
    id: "55555555-0005-0005-0005-000000000001",
    user_id: "e5555555-5555-5555-5555-555555555555",
    category_id: "appliances", subcategory_id: "washers", sale_type: "cash",
    title: "غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز",
    description: "غسالة توشيبا فول أوتوماتيك 10 كيلو، موديل 2023، أبيض. مستعملة 6 شهور. حالة الزيرو.",
    price: 9500, is_negotiable: true,
    category_fields: { type: "غسالة", brand: "توشيبا", condition: "مستعمل ممتاز", purchase_year: "2023", capacity: "10 كيلو" },
    governorate: "الغربية", city: "طنطا", views_count: 145, favorites_count: 11,
  },
  {
    id: "55555555-0005-0005-0005-000000000002",
    user_id: "e5555555-5555-5555-5555-555555555555",
    category_id: "appliances", subcategory_id: "fridges", sale_type: "auction",
    title: "ثلاجة شارب 18 قدم — نوفروست — 2022",
    description: "ثلاجة شارب 18 قدم نوفروست، 2022، سيلفر. بحالة ممتازة.",
    price: null, is_negotiable: false,
    auction_start_price: 8000, auction_buy_now_price: 13000,
    auction_duration_hours: 48, auction_min_increment: 500,
    auction_ends_at: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: { type: "ثلاجة", brand: "شارب", condition: "مستعمل ممتاز", purchase_year: "2022", capacity: "18 قدم" },
    governorate: "الغربية", city: "طنطا", views_count: 203, favorites_count: 22,
  },
  {
    id: "55555555-0005-0005-0005-000000000003",
    user_id: "e5555555-5555-5555-5555-555555555555",
    category_id: "appliances", subcategory_id: "ac", sale_type: "cash",
    title: "مكيف كاريير 1.5 حصان — بارد ساخن — 2024",
    description: "مكيف كاريير 1.5 حصان بارد ساخن، 2024، إنفرتر. جديد متبرشم — ضمان وكالة سنتين.",
    price: 18000, is_negotiable: false,
    category_fields: { type: "مكيف", brand: "كاريير", condition: "جديد متبرشم", purchase_year: "2024" },
    governorate: "الغربية", city: "المحلة الكبرى", views_count: 178, favorites_count: 15,
  },
];

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || secretParam;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "مفيش Service Role Key. ضيف SUPABASE_SERVICE_ROLE_KEY أو ابعته كـ ?secret=KEY" },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SUPABASE_URL مش موجود" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const results: Record<string, string> = {};

  // Step 1: Create auth users
  let usersCreated = 0;
  let usersSkipped = 0;
  for (const u of TEST_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      phone: `+2${u.phone}`,
      phone_confirm: true,
      user_metadata: { display_name: u.display_name },
      // Force specific UUID
      ...(u.id ? { id: u.id } : {}),
    });

    if (error) {
      if (error.message?.includes("already been registered") || error.message?.includes("duplicate")) {
        usersSkipped++;
      } else {
        results[`auth_${u.email}`] = `خطأ: ${error.message}`;
      }
    } else if (data?.user) {
      usersCreated++;
    }
  }
  results.auth_users = `تم إنشاء ${usersCreated} حساب (${usersSkipped} موجودين مسبقاً)`;

  // Step 2: Create public profiles (without store_id first)
  const profiles = TEST_USERS.map((u) => ({
    id: u.id,
    phone: u.phone,
    display_name: u.display_name,
    governorate: u.governorate,
    city: u.city,
    bio: u.bio,
    is_commission_supporter: u.is_commission_supporter,
    total_ads_count: u.total_ads_count,
    rating: u.rating,
    seller_type: u.seller_type,
  }));

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profiles, { onConflict: "id" });
  results.profiles = profileError
    ? `خطأ: ${profileError.message}`
    : `تم إضافة ${profiles.length} بروفايل`;

  // Step 3: Create stores for merchant accounts
  const merchantUsers = TEST_USERS.filter((u) => u.seller_type === "store" && u.store);
  let storesCreated = 0;
  for (const u of merchantUsers) {
    const s = u.store!;
    const { error: storeErr } = await admin
      .from("stores")
      .upsert({
        id: s.id,
        user_id: u.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        main_category: s.main_category,
        theme: s.theme,
        layout: s.layout,
        primary_color: s.primary_color,
        location_gov: u.governorate,
        location_area: u.city,
        phone: u.phone,
        is_verified: s.is_verified,
        status: "active",
      }, { onConflict: "id" });

    if (!storeErr) {
      storesCreated++;
      // Link store to profile
      await admin
        .from("profiles")
        .update({ store_id: s.id })
        .eq("id", u.id);
      // Create subscription (delete old first, no unique constraint on store_id)
      await admin
        .from("store_subscriptions")
        .delete()
        .eq("store_id", s.id);
      await admin
        .from("store_subscriptions")
        .insert({
          store_id: s.id,
          plan: s.plan,
          status: "active",
          price: 0,
          start_at: new Date().toISOString(),
        });
    }
  }
  results.stores = `تم إنشاء ${storesCreated} متجر (${merchantUsers.length - storesCreated} موجودين مسبقاً)`;

  // Step 4: Create sample ads
  const { error: adsError } = await admin
    .from("ads")
    .upsert(SAMPLE_ADS, { onConflict: "id" });
  results.ads = adsError
    ? `خطأ: ${adsError.message}`
    : `تم إضافة ${SAMPLE_ADS.length} إعلان`;

  // Step 5: Link merchant ads to their stores
  for (const u of merchantUsers) {
    await admin
      .from("ads")
      .update({ store_id: u.store!.id } as never)
      .eq("user_id", u.id);
  }

  const hasErrors = Object.values(results).some((r) => r.startsWith("خطأ"));

  return NextResponse.json(
    {
      success: !hasErrors,
      message: hasErrors
        ? "حصلت بعض الأخطاء"
        : "تم إنشاء 5 حسابات تجريبية مع إعلانات نموذجية! 🎉",
      results,
      accounts: TEST_USERS.map((u) => ({
        email: u.email,
        password: u.password,
        name: u.display_name,
        phone: u.phone,
        location: `${u.governorate} — ${u.city}`,
        type: u.seller_type === "store" ? "تاجر" : "فرد",
        store_name: u.seller_type === "store" && u.store ? u.store.name : null,
        store_slug: u.seller_type === "store" && u.store ? u.store.slug : null,
      })),
    },
    { status: hasErrors ? 207 : 200 },
  );
}

export async function GET(request: Request) {
  return POST(request);
}
