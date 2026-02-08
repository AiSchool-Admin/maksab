import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/seed-exchange-test
 *
 * Seeds 8 test users + 12 exchange-focused ads that create:
 *
 * Scenario 1: PERFECT MATCH (phones)
 *   - Youssef has iPhone 15 Pro, wants Samsung S24
 *   - Mariam has Samsung S24 Ultra, wants iPhone 15
 *   → Score ~95 — bidirectional exact match
 *
 * Scenario 2: STRONG MATCH (phones)
 *   - Karim has Xiaomi 13 Pro, wants iPhone (any)
 *   → Matches Youssef's iPhone (one-direction, same category)
 *
 * Scenario 3: CHAIN EXCHANGE (phones→cars→gold→phones)
 *   - Youssef: has phones, wants cars
 *   - Tamer: has car (Hyundai), wants gold
 *   - Huda: has gold chain, wants phones
 *   → Triangle: Youssef→Tamer→Huda→Youssef
 *
 * Scenario 4: CROSS-CATEGORY (appliances↔furniture)
 *   - Samir has Samsung washer, wants bedroom furniture
 *   - Dina has bedroom set, wants washer
 *   → Perfect cross-category match
 *
 * Scenario 5: PARTIAL MATCH (cars)
 *   - Tamer wants gold, not cars — but has a car
 *   - Rania has Kia Sportage, wants Toyota
 *   → Partial: same category (cars), different brand spec
 *
 * Scenario 6: OLD TEXT-ONLY (backward compat)
 *   - Rania's ad uses old text exchange_description only (no structured data)
 */

const EXCHANGE_USERS = [
  {
    id: "ee111111-1111-1111-1111-111111111111",
    email: "youssef@test.maksab.app",
    phone: "01011111111",
    password: "Test123456",
    display_name: "يوسف سامي",
    governorate: "القاهرة",
    city: "مدينة نصر",
    bio: "بيع وتبديل موبايلات — بشتغل بالأمانة",
  },
  {
    id: "ee222222-2222-2222-2222-222222222222",
    email: "mariam@test.maksab.app",
    phone: "01122222222",
    password: "Test123456",
    display_name: "مريم حسام",
    governorate: "القاهرة",
    city: "المعادي",
    bio: "عندي موبايلات وأجهزة للتبديل",
  },
  {
    id: "ee333333-3333-3333-3333-333333333333",
    email: "karim@test.maksab.app",
    phone: "01233333333",
    password: "Test123456",
    display_name: "كريم عادل",
    governorate: "الجيزة",
    city: "الدقي",
    bio: "مهتم بالموبايلات والتكنولوجيا",
  },
  {
    id: "ee444444-4444-4444-4444-444444444444",
    email: "tamer@test.maksab.app",
    phone: "01544444444",
    password: "Test123456",
    display_name: "تامر فتحي",
    governorate: "القاهرة",
    city: "مصر الجديدة",
    bio: "سيارات مستعملة بحالة ممتازة",
  },
  {
    id: "ee555555-5555-5555-5555-555555555555",
    email: "huda@test.maksab.app",
    phone: "01055555555",
    password: "Test123456",
    display_name: "هدى محمد",
    governorate: "القاهرة",
    city: "التجمع الخامس",
    bio: "ذهب ومجوهرات — أصلي ومضمون",
  },
  {
    id: "ee666666-6666-6666-6666-666666666666",
    email: "samir@test.maksab.app",
    phone: "01066666666",
    password: "Test123456",
    display_name: "سمير جمال",
    governorate: "الإسكندرية",
    city: "سيدي بشر",
    bio: "أجهزة منزلية بحالات ممتازة",
  },
  {
    id: "ee777777-7777-7777-7777-777777777777",
    email: "dina@test.maksab.app",
    phone: "01177777777",
    password: "Test123456",
    display_name: "دينا أحمد",
    governorate: "الإسكندرية",
    city: "سموحة",
    bio: "أثاث مستعمل — حالات نضيفة جداً",
  },
  {
    id: "ee888888-8888-8888-8888-888888888888",
    email: "rania@test.maksab.app",
    phone: "01588888888",
    password: "Test123456",
    display_name: "رانيا خالد",
    governorate: "الجيزة",
    city: "أكتوبر",
    bio: "سيارات عائلية — ملاكي فقط",
  },
];

const EXCHANGE_ADS = [
  // ═══════════════════════════════════════════════════════════
  // SCENARIO 1: PERFECT BIDIRECTIONAL — Youssef ↔ Mariam (phones)
  // ═══════════════════════════════════════════════════════════

  // Youssef: has iPhone 15 Pro, wants Samsung S24
  {
    id: "ex111111-0001-0001-0001-000000000001",
    user_id: "ee111111-1111-1111-1111-111111111111",
    category_id: "phones",
    subcategory_id: "mobile",
    sale_type: "exchange",
    title: "آيفون 15 برو — 256GB — مستعمل زيرو — للتبديل",
    description: "آيفون 15 برو، 256 جيجا، مستعمل زيرو. بطارية 96%. عايز أبدل بسامسونج S24 أو S24 Ultra.",
    price: null,
    is_negotiable: false,
    exchange_description: "سامسونج — S24 — 256GB — مستعمل زيرو",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 5000,
    category_fields: {
      brand: "apple",
      model: "15 Pro",
      storage: "256",
      condition: "like_new",
      color: "black",
      battery: "excellent",
      with_box: true,
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "phones",
        subcategory_id: "mobile",
        fields: {
          brand: "samsung",
          model: "S24",
          storage: "256",
          condition: "like_new",
        },
        title: "سامسونج — S24 — 256GB — مستعمل زيرو",
      },
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    views_count: 312,
    favorites_count: 28,
  },

  // Mariam: has Samsung S24 Ultra, wants iPhone 15
  {
    id: "ex222222-0002-0002-0002-000000000001",
    user_id: "ee222222-2222-2222-2222-222222222222",
    category_id: "phones",
    subcategory_id: "mobile",
    sale_type: "exchange",
    title: "سامسونج S24 Ultra — 512GB — جديد — للتبديل بآيفون",
    description: "سامسونج جالاكسي S24 ألترا، 512 جيجا، تيتانيوم بنفسجي. جديد بالعلبة. عايزة أبدل بآيفون 15 برو أو برو ماكس.",
    price: null,
    is_negotiable: false,
    exchange_description: "آيفون — 15 برو — 256GB — مستعمل زيرو",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 3000,
    category_fields: {
      brand: "samsung",
      model: "S24 Ultra",
      storage: "512",
      condition: "sealed",
      color: "other",
      battery: "excellent",
      with_box: true,
      with_warranty: true,
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "phones",
        subcategory_id: "mobile",
        fields: {
          brand: "apple",
          model: "15 Pro",
          storage: "256",
          condition: "like_new",
        },
        title: "آيفون — 15 برو — 256GB — مستعمل زيرو",
      },
    },
    governorate: "القاهرة",
    city: "المعادي",
    views_count: 287,
    favorites_count: 35,
  },

  // ═══════════════════════════════════════════════════════════
  // SCENARIO 2: STRONG MATCH — Karim wants any iPhone
  // ═══════════════════════════════════════════════════════════

  // Karim: has Xiaomi 13 Pro, wants any iPhone
  {
    id: "ex333333-0003-0003-0003-000000000001",
    user_id: "ee333333-3333-3333-3333-333333333333",
    category_id: "phones",
    subcategory_id: "mobile",
    sale_type: "exchange",
    title: "شاومي 13 برو — 256GB — مستعمل ممتاز — للتبديل بآيفون",
    description: "شاومي 13 برو، 256 جيجا، أسود. مستعمل 4 شهور. عايز أبدل بأي آيفون 14 أو 15.",
    price: null,
    is_negotiable: false,
    exchange_description: "آيفون — 128GB — مستعمل كويس",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 8000,
    category_fields: {
      brand: "xiaomi",
      model: "13 Pro",
      storage: "256",
      condition: "like_new",
      color: "black",
      ram: "12",
      battery: "excellent",
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "phones",
        subcategory_id: "mobile",
        fields: {
          brand: "apple",
          storage: "128",
          condition: "good",
        },
        title: "آيفون — 128GB — مستعمل كويس",
      },
    },
    governorate: "الجيزة",
    city: "الدقي",
    views_count: 156,
    favorites_count: 12,
  },

  // ═══════════════════════════════════════════════════════════
  // SCENARIO 3: CHAIN EXCHANGE — phones→cars→gold→phones
  // Youssef also posts a phone→car exchange ad
  // ═══════════════════════════════════════════════════════════

  // Youssef: has another phone (Samsung A54), wants a car
  {
    id: "ex111111-0001-0001-0001-000000000002",
    user_id: "ee111111-1111-1111-1111-111111111111",
    category_id: "phones",
    subcategory_id: "mobile",
    sale_type: "exchange",
    title: "سامسونج A54 — 128GB — للتبديل بسيارة",
    description: "سامسونج A54 جديد متبرشم + فرق سعر. عايز أبدل بسيارة هيونداي أو كيا.",
    price: null,
    is_negotiable: false,
    exchange_description: "هيونداي — أي موديل — مستعملة",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 150000,
    category_fields: {
      brand: "samsung",
      model: "A54",
      storage: "128",
      condition: "sealed",
      color: "black",
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "cars",
        subcategory_id: "passenger",
        fields: {
          brand: "hyundai",
          condition: "used",
        },
        title: "هيونداي — مستعملة",
      },
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    views_count: 89,
    favorites_count: 5,
  },

  // Tamer: has Hyundai Accent, wants gold
  {
    id: "ex444444-0004-0004-0004-000000000001",
    user_id: "ee444444-4444-4444-4444-444444444444",
    category_id: "cars",
    subcategory_id: "passenger",
    sale_type: "exchange",
    title: "هيونداي أكسنت 2019 — 70,000 كم — للتبديل بذهب",
    description: "هيونداي أكسنت 2019، أوتوماتيك، بنزين، فضي. 70 ألف كم. عايز أبدل بذهب عيار 21.",
    price: null,
    is_negotiable: false,
    exchange_description: "ذهب عيار 21 — أي نوع",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 50000,
    category_fields: {
      brand: "hyundai",
      model: "أكسنت",
      year: "2019",
      mileage: "70000",
      color: "silver",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "gold",
        subcategory_id: "gold-items",
        fields: {
          karat: "21",
          condition: "new",
        },
        title: "ذهب — عيار 21 — جديد",
      },
    },
    governorate: "القاهرة",
    city: "مصر الجديدة",
    views_count: 204,
    favorites_count: 19,
  },

  // Huda: has gold chain, wants phone (Samsung)
  {
    id: "ex555555-0005-0005-0005-000000000001",
    user_id: "ee555555-5555-5555-5555-555555555555",
    category_id: "gold",
    subcategory_id: "gold-items",
    sale_type: "exchange",
    title: "سلسلة ذهب عيار 21 — 25 جرام — جديدة — للتبديل بموبايل",
    description: "سلسلة ذهب عيار 21، 25 جرام، جديدة بالفاتورة. عايزة أبدلها بموبايل سامسونج حديث.",
    price: null,
    is_negotiable: false,
    exchange_description: "سامسونج — أي موديل حديث",
    exchange_accepts_price_diff: false,
    exchange_price_diff: 0,
    category_fields: {
      type: "chain",
      karat: "21",
      weight: "25",
      condition: "new",
      certificate: true,
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "phones",
        subcategory_id: "mobile",
        fields: {
          brand: "samsung",
          condition: "like_new",
        },
        title: "سامسونج — مستعمل زيرو",
      },
    },
    governorate: "القاهرة",
    city: "التجمع الخامس",
    views_count: 178,
    favorites_count: 22,
  },

  // ═══════════════════════════════════════════════════════════
  // SCENARIO 4: CROSS-CATEGORY PERFECT — appliances↔furniture
  // ═══════════════════════════════════════════════════════════

  // Samir: has Samsung washer, wants bedroom furniture
  {
    id: "ex666666-0006-0006-0006-000000000001",
    user_id: "ee666666-6666-6666-6666-666666666666",
    category_id: "appliances",
    subcategory_id: "washers",
    sale_type: "exchange",
    title: "غسالة سامسونج 12 كيلو — 2024 — جديدة — للتبديل بغرفة نوم",
    description: "غسالة سامسونج فول أوتوماتيك 12 كيلو، 2024، أبيض. جديدة متبرشمة. عايز أبدلها بغرفة نوم خشب زان.",
    price: null,
    is_negotiable: false,
    exchange_description: "غرفة نوم خشب زان — مستعملة ممتاز",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 5000,
    category_fields: {
      type: "washer",
      brand: "samsung",
      condition: "sealed",
      purchase_year: "2024",
      capacity: "12kg",
      color: "white",
      warranty: true,
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "furniture",
        subcategory_id: "bedroom",
        fields: {
          type: "bedroom",
          condition: "excellent",
          material: "beech",
        },
        title: "غرفة نوم — مستعمل ممتاز — خشب زان",
      },
    },
    governorate: "الإسكندرية",
    city: "سيدي بشر",
    views_count: 134,
    favorites_count: 9,
  },

  // Dina: has bedroom set, wants washer
  {
    id: "ex777777-0007-0007-0007-000000000001",
    user_id: "ee777777-7777-7777-7777-777777777777",
    category_id: "furniture",
    subcategory_id: "bedroom",
    sale_type: "exchange",
    title: "غرفة نوم خشب زان — 7 قطع — مستعملة ممتاز — للتبديل بغسالة",
    description: "غرفة نوم كاملة 7 قطع، خشب زان أصلي، مستعملة سنة واحدة. عايزة أبدلها بغسالة فول أوتوماتيك سامسونج أو إل جي.",
    price: null,
    is_negotiable: false,
    exchange_description: "غسالة سامسونج أو إل جي — فول أوتوماتيك",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 3000,
    category_fields: {
      type: "bedroom",
      condition: "excellent",
      material: "beech",
      color: "brown",
      pieces: "7",
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "appliances",
        subcategory_id: "washers",
        fields: {
          type: "washer",
          brand: "samsung",
          condition: "sealed",
        },
        title: "غسالة — سامسونج — جديد متبرشم",
      },
    },
    governorate: "الإسكندرية",
    city: "سموحة",
    views_count: 198,
    favorites_count: 16,
  },

  // ═══════════════════════════════════════════════════════════
  // SCENARIO 5: PARTIAL MATCH (cars — different brand wanted)
  // ═══════════════════════════════════════════════════════════

  // Tamer: another car ad, cash type (so it shows as "partial" for car exchange seekers)
  {
    id: "ex444444-0004-0004-0004-000000000002",
    user_id: "ee444444-4444-4444-4444-444444444444",
    category_id: "cars",
    subcategory_id: "passenger",
    sale_type: "cash",
    title: "كيا سيراتو 2022 — 30,000 كم — فول أوبشن",
    description: "كيا سيراتو 2022، أوتوماتيك، بنزين، فول أوبشن. 30 ألف كم. حالة الزيرو.",
    price: 520000,
    is_negotiable: true,
    category_fields: {
      brand: "kia",
      model: "سيراتو",
      year: "2022",
      mileage: "30000",
      color: "white",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
    },
    governorate: "القاهرة",
    city: "مصر الجديدة",
    views_count: 345,
    favorites_count: 41,
  },

  // ═══════════════════════════════════════════════════════════
  // SCENARIO 6: OLD TEXT-ONLY EXCHANGE (backward compat)
  // ═══════════════════════════════════════════════════════════

  // Rania: old-style exchange ad — NO structured exchange_wanted
  {
    id: "ex888888-0008-0008-0008-000000000001",
    user_id: "ee888888-8888-8888-8888-888888888888",
    category_id: "cars",
    subcategory_id: "passenger",
    sale_type: "exchange",
    title: "كيا سبورتاج 2020 — 55,000 كم — للتبديل بتويوتا كورولا",
    description: "كيا سبورتاج 2020، أوتوماتيك، بنزين، أبيض. 55 ألف كم. عايزة أبدل بتويوتا كورولا 2019 أو أحدث.",
    price: null,
    is_negotiable: false,
    exchange_description: "عايزة تويوتا كورولا 2019 أو أحدث — أوتوماتيك",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 40000,
    // NO exchange_wanted in category_fields — old format
    category_fields: {
      brand: "kia",
      model: "سبورتاج",
      year: "2020",
      mileage: "55000",
      color: "white",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
    },
    governorate: "الجيزة",
    city: "أكتوبر",
    views_count: 167,
    favorites_count: 14,
  },

  // ═══════════════════════════════════════════════════════════
  // EXTRA: Mariam also selling a PS5 for exchange with phone
  // (helps test cross-category and chain discovery)
  // ═══════════════════════════════════════════════════════════

  {
    id: "ex222222-0002-0002-0002-000000000002",
    user_id: "ee222222-2222-2222-2222-222222222222",
    category_id: "hobbies",
    subcategory_id: "gaming",
    sale_type: "exchange",
    title: "بلايستيشن 5 — مع 2 يد — مستعمل ممتاز — للتبديل بموبايل",
    description: "بلايستيشن 5 ديسك إيديشن، مع 2 يد وصندوق أصلي. مستعمل 6 شهور. عايزة أبدل بموبايل آيفون أو سامسونج.",
    price: null,
    is_negotiable: false,
    exchange_description: "آيفون 14 أو سامسونج S23 أو أحدث",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 5000,
    category_fields: {
      type: "ps5",
      condition: "excellent",
      brand: "sony",
      with_accessories: true,
      // Structured exchange wanted
      exchange_wanted: {
        category_id: "phones",
        subcategory_id: "mobile",
        fields: {
          brand: "apple",
          condition: "like_new",
        },
        title: "آيفون — مستعمل زيرو",
      },
    },
    governorate: "القاهرة",
    city: "المعادي",
    views_count: 223,
    favorites_count: 31,
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

  // Step 1: Ensure categories exist
  const baseUrl = url.origin;
  try {
    await fetch(`${baseUrl}/api/ensure-categories?secret=${serviceRoleKey}`);
  } catch {
    // ignore — categories might already exist
  }

  // Step 2: Create auth users
  let usersCreated = 0;
  let usersSkipped = 0;
  for (const u of EXCHANGE_USERS) {
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      phone: `+2${u.phone}`,
      phone_confirm: true,
      user_metadata: { display_name: u.display_name },
      ...(u.id ? { id: u.id } : {}),
    });

    if (error) {
      if (error.message?.includes("already been registered") || error.message?.includes("duplicate")) {
        usersSkipped++;
      } else {
        results[`auth_${u.email}`] = `خطأ: ${error.message}`;
      }
    } else {
      usersCreated++;
    }
  }
  results.auth_users = `تم إنشاء ${usersCreated} حساب (${usersSkipped} موجودين مسبقاً)`;

  // Step 3: Create profiles
  const profiles = EXCHANGE_USERS.map((u) => ({
    id: u.id,
    phone: u.phone,
    display_name: u.display_name,
    governorate: u.governorate,
    city: u.city,
    bio: u.bio,
    is_commission_supporter: false,
    total_ads_count: 2,
    rating: 4.5,
  }));

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profiles, { onConflict: "id" });
  results.profiles = profileError
    ? `خطأ: ${profileError.message}`
    : `تم إضافة ${profiles.length} بروفايل`;

  // Step 4: Create exchange ads
  const { error: adsError } = await admin
    .from("ads")
    .upsert(EXCHANGE_ADS, { onConflict: "id" });
  results.ads = adsError
    ? `خطأ: ${adsError.message}`
    : `تم إضافة ${EXCHANGE_ADS.length} إعلان تبديل`;

  const hasErrors = Object.values(results).some((r) => r.startsWith("خطأ"));

  return NextResponse.json(
    {
      success: !hasErrors,
      message: hasErrors
        ? "حصلت بعض الأخطاء"
        : "تم إنشاء سيناريوهات تجربة التبديل بنجاح! 🔄🎉",
      results,
      scenarios: [
        {
          name: "تطابق مثالي ثنائي الاتجاه (موبايلات)",
          description: "يوسف عنده آيفون 15 برو وعايز سامسونج S24 ← مريم عندها سامسونج S24 وعايزة آيفون 15 برو",
          test_ad: `/ad/ex111111-0001-0001-0001-000000000001`,
          expected_score: "~95 (perfect)",
        },
        {
          name: "تطابق قوي (موبايلات)",
          description: "كريم عنده شاومي وعايز آيفون ← يوسف عنده آيفون (one-way match)",
          test_ad: `/ad/ex333333-0003-0003-0003-000000000001`,
          expected_score: "~60 (strong)",
        },
        {
          name: "تبديل ثلاثي (موبايل→سيارة→ذهب→موبايل)",
          description: "يوسف (موبايل→سيارة) → تامر (سيارة→ذهب) → هدى (ذهب→موبايل) → يوسف",
          test_ad: `/ad/ex111111-0001-0001-0001-000000000002`,
          expected_score: "chain detected",
        },
        {
          name: "تطابق مثالي عبر الأقسام (أجهزة↔أثاث)",
          description: "سمير عنده غسالة وعايز غرفة نوم ← دينا عندها غرفة نوم وعايزة غسالة",
          test_ad: `/ad/ex666666-0006-0006-0006-000000000001`,
          expected_score: "~85 (perfect)",
        },
        {
          name: "تطابق جزئي (سيارات)",
          description: "تامر عنده كيا سيراتو كاش ← يظهر كـ partial لأنه مش تبديل",
          test_ad: `/ad/ex444444-0004-0004-0004-000000000001`,
          expected_score: "~25 (partial)",
        },
        {
          name: "إعلان تبديل قديم (backward compat)",
          description: "رانيا عندها إعلان نص حر بدون بيانات منظمة ← يستخدم البحث النصي",
          test_ad: `/ad/ex888888-0008-0008-0008-000000000001`,
          expected_score: "text-based fallback",
        },
      ],
      accounts: EXCHANGE_USERS.map((u) => ({
        email: u.email,
        password: u.password,
        name: u.display_name,
        phone: u.phone,
        role: getAccountRole(u.id),
      })),
    },
    { status: hasErrors ? 207 : 200 },
  );
}

function getAccountRole(id: string): string {
  const roles: Record<string, string> = {
    "ee111111-1111-1111-1111-111111111111": "📱 بائع موبايلات (آيفون→سامسونج + سامسونج→سيارة)",
    "ee222222-2222-2222-2222-222222222222": "📱 بائعة موبايلات (سامسونج→آيفون + PS5→موبايل)",
    "ee333333-3333-3333-3333-333333333333": "📱 بائع موبايلات (شاومي→آيفون)",
    "ee444444-4444-4444-4444-444444444444": "🚗 بائع سيارات (هيونداي→ذهب + كيا كاش)",
    "ee555555-5555-5555-5555-555555555555": "💰 بائعة ذهب (سلسلة→موبايل)",
    "ee666666-6666-6666-6666-666666666666": "🏠 بائع أجهزة (غسالة→أثاث)",
    "ee777777-7777-7777-7777-777777777777": "🪑 بائعة أثاث (غرفة نوم→غسالة)",
    "ee888888-8888-8888-8888-888888888888": "🚗 بائعة سيارات (إعلان نص قديم)",
  };
  return roles[id] || "مستخدم تجريبي";
}

export async function GET(request: Request) {
  return POST(request);
}
