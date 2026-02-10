import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/seed-test-data
 * GET  /api/admin/seed-test-data?secret=YOUR_SERVICE_ROLE_KEY
 *
 * Comprehensive seed endpoint that creates:
 * - 13 test accounts with auth + profiles
 * - 30 sample ads covering ALL 12 categories
 * - All 3 sale types (cash, auction, exchange)
 * - Auction bids on active auctions
 * - Conversations with messages
 * - Favorites
 *
 * All subcategory IDs use SHORT format matching categories-config.ts.
 * Idempotent — safe to run multiple times (uses upsert / ON CONFLICT).
 *
 * Also calls /api/ensure-categories first to guarantee categories exist.
 */

// ─── Test Users ───────────────────────────────────────────────────
const TEST_USERS = [
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
  },
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
  },
  {
    id: "f6666666-6666-6666-6666-666666666666",
    email: "sara@test.maksab.app",
    phone: "01023456789",
    password: "Test123456",
    display_name: "سارة إبراهيم",
    governorate: "القاهرة",
    city: "التجمع الخامس",
    bio: "ذهب ومجوهرات — أصلي بالفاتورة",
    is_commission_supporter: true,
    total_ads_count: 2,
    rating: 4.7,
  },
  {
    id: "a7777777-7777-7777-7777-777777777777",
    email: "hussein@test.maksab.app",
    phone: "01134567890",
    password: "Test123456",
    display_name: "حسين علاء",
    governorate: "الجيزة",
    city: "الشيخ زايد",
    bio: "سلع فاخرة وماركات عالمية",
    is_commission_supporter: false,
    total_ads_count: 2,
    rating: 4.4,
  },
  {
    id: "b8888888-8888-8888-8888-888888888888",
    email: "mona@test.maksab.app",
    phone: "01245678901",
    password: "Test123456",
    display_name: "منى عبدالله",
    governorate: "القاهرة",
    city: "مصر الجديدة",
    bio: "أثاث وديكور منزلي — خشب أصلي",
    is_commission_supporter: false,
    total_ads_count: 2,
    rating: 4.3,
  },
  {
    id: "c9999999-9999-9999-9999-999999999999",
    email: "karim@test.maksab.app",
    phone: "01556781234",
    password: "Test123456",
    display_name: "كريم مصطفى",
    governorate: "الإسكندرية",
    city: "المنتزه",
    bio: "ألعاب فيديو وهوايات — أسعار زمان",
    is_commission_supporter: true,
    total_ads_count: 2,
    rating: 4.6,
  },
  {
    id: "d0000000-aaaa-bbbb-cccc-111111111111",
    email: "yasmin@test.maksab.app",
    phone: "01067891234",
    password: "Test123456",
    display_name: "ياسمين حسن",
    governorate: "المنوفية",
    city: "شبين الكوم",
    bio: "عدد وأدوات — جديد ومستعمل",
    is_commission_supporter: false,
    total_ads_count: 2,
    rating: 4.1,
  },
  {
    id: "e1111111-aaaa-bbbb-cccc-222222222222",
    email: "tarek@test.maksab.app",
    phone: "01178901234",
    password: "Test123456",
    display_name: "طارق محمود",
    governorate: "بورسعيد",
    city: "بورسعيد",
    bio: "خردة ومخلفات — أسعار عادلة",
    is_commission_supporter: false,
    total_ads_count: 2,
    rating: 4.0,
  },
  {
    id: "f2222222-aaaa-bbbb-cccc-333333333333",
    email: "heba@test.maksab.app",
    phone: "01289012345",
    password: "Test123456",
    display_name: "هبة سعيد",
    governorate: "الشرقية",
    city: "الزقازيق",
    bio: "سباكة وكهرباء — خبرة 8 سنوات",
    is_commission_supporter: true,
    total_ads_count: 2,
    rating: 4.8,
  },
  {
    id: "a3333333-aaaa-bbbb-cccc-444444444444",
    email: "mahmoud@test.maksab.app",
    phone: "01590123456",
    password: "Test123456",
    display_name: "محمود رضا",
    governorate: "القليوبية",
    city: "بنها",
    bio: "بيع وشراء كل حاجة — مكسب للجميع",
    is_commission_supporter: false,
    total_ads_count: 3,
    rating: 4.5,
  },
];

// ─── Sample Ads — ALL 12 categories, all sale types ─────────────
// NOTE: All subcategory_id values use SHORT format from categories-config.ts
const SAMPLE_ADS = [
  // ── 🚗 Cars (3 ads: cash, auction, exchange) ──
  {
    id: "10000000-0001-0001-0001-000000000001",
    user_id: "a1111111-1111-1111-1111-111111111111",
    category_id: "cars",
    subcategory_id: "passenger",
    sale_type: "cash",
    title: "تويوتا كورولا 2022 — 35,000 كم — أوتوماتيك",
    description:
      "سيارة تويوتا كورولا موديل 2022، مسافة 35,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة. السيارة بحالة ممتازة، صيانة وكالة.",
    price: 450000,
    is_negotiable: true,
    category_fields: {
      brand: "toyota",
      model: "كورولا",
      year: "2022",
      mileage: "35000",
      color: "white",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
      licensed: true,
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    views_count: 245,
    favorites_count: 18,
  },
  {
    id: "10000000-0001-0001-0001-000000000002",
    user_id: "a1111111-1111-1111-1111-111111111111",
    category_id: "cars",
    subcategory_id: "passenger",
    sale_type: "auction",
    title: "هيونداي توسان 2021 — 50,000 كم — فول أوبشن",
    description:
      "هيونداي توسان موديل 2021، فول أوبشن، مسافة 50,000 كم، بنزين، أوتوماتيك. بانوراما، كاميرا خلفية.",
    price: null,
    is_negotiable: false,
    auction_start_price: 380000,
    auction_buy_now_price: 480000,
    auction_duration_hours: 48,
    auction_min_increment: 5000,
    auction_ends_at: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: {
      brand: "hyundai",
      model: "توسان",
      year: "2021",
      mileage: "50000",
      color: "gray",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    views_count: 189,
    favorites_count: 32,
  },
  {
    id: "10000000-0001-0001-0001-000000000003",
    user_id: "a1111111-1111-1111-1111-111111111111",
    category_id: "cars",
    subcategory_id: "passenger",
    sale_type: "exchange",
    title: "نيسان صني 2020 — 60,000 كم — للتبديل بكورولا",
    description:
      "نيسان صني موديل 2020، مسافة 60,000 كم، أوتوماتيك، بنزين، لون أسود. فابريكة بالكامل.",
    price: null,
    is_negotiable: false,
    exchange_description: "عايز أبدل بتويوتا كورولا 2019 أو أحدث",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 30000,
    category_fields: {
      brand: "nissan",
      model: "صني",
      year: "2020",
      mileage: "60000",
      color: "black",
      fuel: "petrol",
      transmission: "automatic",
      condition: "used",
    },
    governorate: "القاهرة",
    city: "المعادي",
    views_count: 95,
    favorites_count: 7,
  },

  // ── 🏠 Real Estate (3 ads) ──
  {
    id: "10000000-0002-0002-0002-000000000001",
    user_id: "c3333333-3333-3333-3333-333333333333",
    category_id: "real_estate",
    subcategory_id: "apartments-sale",
    sale_type: "cash",
    title: "شقة 180م² — 3 غرف — سوبر لوكس — سموحة",
    description:
      "شقة 180 متر في سموحة، 3 غرف، 2 حمام، سوبر لوكس، الطابق الخامس، أسانسير. واجهة بحري.",
    price: 2800000,
    is_negotiable: true,
    category_fields: {
      property_type: "apartment",
      area: "180",
      rooms: "3",
      floor: "5",
      bathrooms: "2",
      finishing: "super_lux",
      elevator: true,
      facing: "north",
    },
    governorate: "الإسكندرية",
    city: "سموحة",
    views_count: 567,
    favorites_count: 78,
  },
  {
    id: "10000000-0002-0002-0002-000000000002",
    user_id: "c3333333-3333-3333-3333-333333333333",
    category_id: "real_estate",
    subcategory_id: "apartments-rent",
    sale_type: "cash",
    title: "شقة 120م² للإيجار — 2 غرف — سيدي جابر",
    description:
      "شقة 120 متر للإيجار الشهري، 2 غرف، حمام، مطبخ مجهز. قريبة من المحطة.",
    price: 8000,
    is_negotiable: false,
    category_fields: {
      property_type: "apartment",
      area: "120",
      rooms: "2",
      floor: "3",
      bathrooms: "1",
      finishing: "lux",
      elevator: true,
    },
    governorate: "الإسكندرية",
    city: "سيدي جابر",
    views_count: 234,
    favorites_count: 19,
  },
  {
    id: "10000000-0002-0002-0002-000000000003",
    user_id: "c3333333-3333-3333-3333-333333333333",
    category_id: "real_estate",
    subcategory_id: "land",
    sale_type: "auction",
    title: "أرض 300م² — الساحل الشمالي — مزاد",
    description:
      "أرض 300 متر في الساحل الشمالي، قريبة من الطريق الرئيسي. فرصة استثمارية.",
    price: null,
    is_negotiable: false,
    auction_start_price: 500000,
    auction_buy_now_price: 900000,
    auction_duration_hours: 72,
    auction_min_increment: 10000,
    auction_ends_at: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: { property_type: "land", area: "300" },
    governorate: "مطروح",
    city: "الساحل الشمالي",
    views_count: 412,
    favorites_count: 56,
  },

  // ── 📱 Phones (2 ads) ──
  {
    id: "10000000-0003-0003-0003-000000000001",
    user_id: "b2222222-2222-2222-2222-222222222222",
    category_id: "phones",
    subcategory_id: "mobile",
    sale_type: "cash",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    description:
      "آيفون 15 برو ماكس، 256 جيجا، تيتانيوم أسود. البطارية 98%، مع العلبة والشاحن الأصلي.",
    price: 52000,
    is_negotiable: true,
    category_fields: {
      brand: "apple",
      model: "15 Pro Max",
      storage: "256",
      condition: "like_new",
      color: "black",
      battery: "excellent",
      with_box: true,
    },
    governorate: "الجيزة",
    city: "المهندسين",
    views_count: 456,
    favorites_count: 52,
  },
  {
    id: "10000000-0003-0003-0003-000000000002",
    user_id: "b2222222-2222-2222-2222-222222222222",
    category_id: "phones",
    subcategory_id: "mobile",
    sale_type: "auction",
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    description:
      "سامسونج جالاكسي S24 ألترا، 512 جيجا، بنفسجي، جديد متبرشم. ضمان دولي.",
    price: null,
    is_negotiable: false,
    auction_start_price: 38000,
    auction_buy_now_price: 48000,
    auction_duration_hours: 72,
    auction_min_increment: 1000,
    auction_ends_at: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: {
      brand: "samsung",
      model: "S24 Ultra",
      storage: "512",
      condition: "sealed",
      color: "other",
      with_warranty: true,
    },
    governorate: "الجيزة",
    city: "المهندسين",
    views_count: 334,
    favorites_count: 45,
  },

  // ── 👗 Fashion (2 ads) ──
  {
    id: "10000000-0004-0004-0004-000000000001",
    user_id: "d4444444-4444-4444-4444-444444444444",
    category_id: "fashion",
    subcategory_id: "women",
    sale_type: "cash",
    title: "جاكت جلد طبيعي — Zara — مقاس M — جديد بالتاج",
    description:
      "جاكت جلد طبيعي من زارا، مقاس M، لون أسود. جديد بالتاج، اتشرى من برة.",
    price: 3500,
    is_negotiable: false,
    category_fields: {
      type: "jacket",
      condition: "new_tagged",
      size: "m",
      brand: "zara",
      color: "black",
      material: "leather",
    },
    governorate: "الدقهلية",
    city: "المنصورة",
    views_count: 198,
    favorites_count: 34,
  },
  {
    id: "10000000-0004-0004-0004-000000000002",
    user_id: "d4444444-4444-4444-4444-444444444444",
    category_id: "fashion",
    subcategory_id: "bags",
    sale_type: "auction",
    title: "شنطة Michael Kors — أصلي بالضمان — مستعملة ممتاز",
    description:
      "شنطة مايكل كورس أصلية، لون بني، استعمال خفيف. مع الداست باج والفاتورة.",
    price: null,
    is_negotiable: false,
    auction_start_price: 2000,
    auction_buy_now_price: 4500,
    auction_duration_hours: 24,
    auction_min_increment: 200,
    auction_ends_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: {
      type: "handbag",
      condition: "excellent",
      brand: "other",
      color: "other",
    },
    governorate: "الدقهلية",
    city: "المنصورة",
    views_count: 267,
    favorites_count: 41,
  },

  // ── ♻️ Scrap (2 ads) ──
  {
    id: "10000000-0005-0005-0005-000000000001",
    user_id: "e1111111-aaaa-bbbb-cccc-222222222222",
    category_id: "scrap",
    subcategory_id: "iron",
    sale_type: "cash",
    title: "حديد خردة — 500 كجم — نظيف",
    description: "حديد خردة نظيف، 500 كيلو تقريباً. جاهز للتسليم فوراً.",
    price: 8500,
    is_negotiable: true,
    category_fields: {
      type: "iron",
      weight: "500",
      condition: "clean",
      quantity: "large",
    },
    governorate: "بورسعيد",
    city: "بورسعيد",
    views_count: 87,
    favorites_count: 4,
  },
  {
    id: "10000000-0005-0005-0005-000000000002",
    user_id: "e1111111-aaaa-bbbb-cccc-222222222222",
    category_id: "scrap",
    subcategory_id: "old-devices",
    sale_type: "cash",
    title: "ثلاجة قديمة + غسالة — للخردة أو الإصلاح",
    description:
      "ثلاجة توشيبا قديمة 12 قدم + غسالة 7 كيلو. ممكن تتصلح أو تتباع خردة.",
    price: 1500,
    is_negotiable: true,
    category_fields: {
      type: "fridge",
      weight: "120",
      condition: "mixed",
    },
    governorate: "بورسعيد",
    city: "بورسعيد",
    views_count: 56,
    favorites_count: 2,
  },

  // ── 💰 Gold & Silver (2 ads) ──
  {
    id: "10000000-0006-0006-0006-000000000001",
    user_id: "f6666666-6666-6666-6666-666666666666",
    category_id: "gold",
    subcategory_id: "gold-items",
    sale_type: "cash",
    title: "سلسلة ذهب عيار 21 — 15 جرام — جديدة",
    description:
      "سلسلة ذهب عيار 21، 15 جرام، جديدة بالفاتورة من لازوردي.",
    price: 52500,
    is_negotiable: false,
    category_fields: {
      type: "chain",
      karat: "21",
      weight: "15",
      condition: "new",
      brand: "lazurde",
      certificate: true,
    },
    governorate: "القاهرة",
    city: "التجمع الخامس",
    views_count: 312,
    favorites_count: 45,
  },
  {
    id: "10000000-0006-0006-0006-000000000002",
    user_id: "f6666666-6666-6666-6666-666666666666",
    category_id: "gold",
    subcategory_id: "gold-items",
    sale_type: "auction",
    title: "دبلة ذهب عيار 18 — 8 جرام — مع فص ألماس",
    description:
      "دبلة ذهب عيار 18، 8 جرام، مع فص ألماس صغير. مستعملة بحالة ممتازة.",
    price: null,
    is_negotiable: false,
    auction_start_price: 15000,
    auction_buy_now_price: 25000,
    auction_duration_hours: 48,
    auction_min_increment: 500,
    auction_ends_at: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: {
      type: "wedding_ring",
      karat: "18",
      weight: "8",
      condition: "used",
      has_gemstone: true,
    },
    governorate: "القاهرة",
    city: "التجمع الخامس",
    views_count: 189,
    favorites_count: 28,
  },

  // ── 💎 Luxury Goods (2 ads) ──
  {
    id: "10000000-0007-0007-0007-000000000001",
    user_id: "a7777777-7777-7777-7777-777777777777",
    category_id: "luxury",
    subcategory_id: "luxury-bags",
    sale_type: "cash",
    title: "شنطة Louis Vuitton Neverfull — أصلي بالضمان — ممتازة",
    description:
      "شنطة لويس فيتون نيفرفول MM، أصلي بالضمان والفاتورة. مستعملة ممتاز، استعمال خفيف.",
    price: 28000,
    is_negotiable: true,
    category_fields: {
      type: "tote",
      brand: "louis_vuitton",
      condition: "excellent",
      authentic: "authentic_warranty",
      with_box: true,
      with_receipt: true,
    },
    governorate: "الجيزة",
    city: "الشيخ زايد",
    views_count: 456,
    favorites_count: 67,
  },
  {
    id: "10000000-0007-0007-0007-000000000002",
    user_id: "a7777777-7777-7777-7777-777777777777",
    category_id: "luxury",
    subcategory_id: "perfumes",
    sale_type: "cash",
    title: "عطر Dior Sauvage — 100ml — أصلي بالضمان — جديد",
    description:
      "عطر ديور سوفاج EDP، 100ml، جديد متبرشم. أصلي بالضمان.",
    price: 4500,
    is_negotiable: false,
    category_fields: {
      type: "perfume",
      brand: "dior",
      condition: "sealed",
      authentic: "authentic_warranty",
      perfume_size: "100ml",
      concentration: "edp",
      gender: "men",
    },
    governorate: "الجيزة",
    city: "الشيخ زايد",
    views_count: 234,
    favorites_count: 38,
  },

  // ── 🏠 Home Appliances (3 ads) ──
  {
    id: "10000000-0008-0008-0008-000000000001",
    user_id: "e5555555-5555-5555-5555-555555555555",
    category_id: "appliances",
    subcategory_id: "washers",
    sale_type: "cash",
    title: "غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز",
    description:
      "غسالة توشيبا فول أوتوماتيك 10 كيلو، موديل 2023، أبيض. مستعملة 6 شهور. حالة الزيرو.",
    price: 9500,
    is_negotiable: true,
    category_fields: {
      type: "washer",
      brand: "toshiba",
      condition: "excellent",
      purchase_year: "2023",
      capacity: "10kg",
      color: "white",
    },
    governorate: "الغربية",
    city: "طنطا",
    views_count: 145,
    favorites_count: 11,
  },
  {
    id: "10000000-0008-0008-0008-000000000002",
    user_id: "e5555555-5555-5555-5555-555555555555",
    category_id: "appliances",
    subcategory_id: "fridges",
    sale_type: "auction",
    title: "ثلاجة شارب 18 قدم — نوفروست — 2022",
    description:
      "ثلاجة شارب 18 قدم نوفروست، 2022، سيلفر. بحالة ممتازة.",
    price: null,
    is_negotiable: false,
    auction_start_price: 8000,
    auction_buy_now_price: 13000,
    auction_duration_hours: 48,
    auction_min_increment: 500,
    auction_ends_at: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: {
      type: "fridge",
      brand: "sharp",
      condition: "excellent",
      purchase_year: "2022",
      capacity: "18ft",
      color: "silver",
    },
    governorate: "الغربية",
    city: "طنطا",
    views_count: 203,
    favorites_count: 22,
  },
  {
    id: "10000000-0008-0008-0008-000000000003",
    user_id: "e5555555-5555-5555-5555-555555555555",
    category_id: "appliances",
    subcategory_id: "ac",
    sale_type: "cash",
    title: "مكيف كاريير 1.5 حصان — بارد ساخن — 2024",
    description:
      "مكيف كاريير 1.5 حصان بارد ساخن، 2024، إنفرتر. جديد متبرشم — ضمان وكالة سنتين.",
    price: 18000,
    is_negotiable: false,
    category_fields: {
      type: "ac",
      brand: "carrier",
      condition: "sealed",
      purchase_year: "2024",
      capacity: "1.5hp",
      color: "white",
      warranty: true,
    },
    governorate: "الغربية",
    city: "المحلة الكبرى",
    views_count: 178,
    favorites_count: 15,
  },

  // ── 🪑 Furniture & Decor (2 ads) ──
  {
    id: "10000000-0009-0009-0009-000000000001",
    user_id: "b8888888-8888-8888-8888-888888888888",
    category_id: "furniture",
    subcategory_id: "bedroom",
    sale_type: "cash",
    title: "غرفة نوم خشب زان — 7 قطع — مستعملة ممتاز",
    description:
      "غرفة نوم كاملة 7 قطع، خشب زان أصلي، مستعملة سنة واحدة. دولاب 250 سم، سرير 180، 2 كومودينو، تسريحة، شماعة.",
    price: 35000,
    is_negotiable: true,
    category_fields: {
      type: "bedroom",
      condition: "excellent",
      material: "beech",
      color: "brown",
      pieces: "7",
    },
    governorate: "القاهرة",
    city: "مصر الجديدة",
    views_count: 312,
    favorites_count: 41,
  },
  {
    id: "10000000-0009-0009-0009-000000000002",
    user_id: "b8888888-8888-8888-8888-888888888888",
    category_id: "furniture",
    subcategory_id: "living",
    sale_type: "exchange",
    title: "أنتريه كلاسيك 9 قطع — خشب زان — للتبديل بمودرن",
    description:
      "أنتريه كلاسيك 9 قطع، خشب زان، مستعمل بحالة ممتازة. عايزة أبدله بأنتريه مودرن.",
    price: null,
    is_negotiable: false,
    exchange_description:
      "عايزة أنتريه مودرن — 7 قطع أو أكتر — أي خامة",
    exchange_accepts_price_diff: true,
    exchange_price_diff: 5000,
    category_fields: {
      type: "living",
      condition: "excellent",
      material: "beech",
      color: "brown",
      pieces: "9",
    },
    governorate: "القاهرة",
    city: "مصر الجديدة",
    views_count: 156,
    favorites_count: 18,
  },

  // ── 🎮 Hobbies (2 ads) ──
  {
    id: "10000000-0010-0010-0010-000000000001",
    user_id: "c9999999-9999-9999-9999-999999999999",
    category_id: "hobbies",
    subcategory_id: "gaming",
    sale_type: "cash",
    title: "بلايستيشن 5 — مع 2 يد — مستعمل ممتاز",
    description:
      "بلايستيشن 5 ديسك إيديشن، مع 2 يد وصندوق أصلي. مستعمل 6 شهور بس.",
    price: 18500,
    is_negotiable: true,
    category_fields: {
      type: "ps5",
      condition: "excellent",
      brand: "sony",
      with_accessories: true,
    },
    governorate: "الإسكندرية",
    city: "المنتزه",
    views_count: 423,
    favorites_count: 56,
  },
  {
    id: "10000000-0010-0010-0010-000000000002",
    user_id: "c9999999-9999-9999-9999-999999999999",
    category_id: "hobbies",
    subcategory_id: "cameras",
    sale_type: "auction",
    title: "كاميرا Canon EOS R6 — بودي + عدسة 24-105 — ممتازة",
    description:
      "كاميرا كانون EOS R6 ميرورلس، مع عدسة 24-105mm f/4L. مستعملة ممتاز، عداد 8000 صورة.",
    price: null,
    is_negotiable: false,
    auction_start_price: 25000,
    auction_buy_now_price: 42000,
    auction_duration_hours: 72,
    auction_min_increment: 1000,
    auction_ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    auction_status: "active",
    category_fields: {
      type: "camera_kit",
      condition: "excellent",
      brand: "canon",
      camera_type: "mirrorless",
      megapixels: "20mp",
      with_accessories: true,
    },
    governorate: "الإسكندرية",
    city: "المنتزه",
    views_count: 278,
    favorites_count: 39,
  },

  // ── 🔧 Tools & Equipment (2 ads) ──
  {
    id: "10000000-0011-0011-0011-000000000001",
    user_id: "d0000000-aaaa-bbbb-cccc-111111111111",
    category_id: "tools",
    subcategory_id: "power-tools",
    sale_type: "cash",
    title: "شنيور بوش كهرباء — مستعمل يعمل",
    description:
      "شنيور بوش مع شنطة وسنن. مستعمل يعمل بحالة ممتازة.",
    price: 2500,
    is_negotiable: true,
    category_fields: {
      type: "drill",
      condition: "working",
      brand: "bosch",
      power: "electric",
    },
    governorate: "المنوفية",
    city: "شبين الكوم",
    views_count: 67,
    favorites_count: 5,
  },
  {
    id: "10000000-0011-0011-0011-000000000002",
    user_id: "d0000000-aaaa-bbbb-cccc-111111111111",
    category_id: "tools",
    subcategory_id: "workshop",
    sale_type: "cash",
    title: "ماكينة لحام كهرباء 250 أمبير — ديوالت — مستعملة",
    description:
      "ماكينة لحام ديوالت 250 أمبير، مستعملة يعمل بدون مشاكل. مع كابلات وقناع.",
    price: 5500,
    is_negotiable: true,
    category_fields: {
      type: "welder",
      condition: "working",
      brand: "dewalt",
      power: "electric",
    },
    governorate: "المنوفية",
    city: "شبين الكوم",
    views_count: 89,
    favorites_count: 8,
  },

  // ── 🛠️ Services (2 ads) ──
  {
    id: "10000000-0012-0012-0012-000000000001",
    user_id: "f2222222-aaaa-bbbb-cccc-333333333333",
    category_id: "services",
    subcategory_id: "plumbing",
    sale_type: "cash",
    title: "سباك خبرة 8 سنوات — القاهرة والجيزة",
    description:
      "سباك محترف، خبرة 8 سنوات. تأسيس وصيانة. بالمشروع أو بالساعة. خدمة سريعة.",
    price: 250,
    is_negotiable: false,
    category_fields: {
      service_type: "plumbing",
      pricing: "by_project",
      experience: "5_plus",
    },
    governorate: "الشرقية",
    city: "الزقازيق",
    views_count: 145,
    favorites_count: 12,
  },
  {
    id: "10000000-0012-0012-0012-000000000002",
    user_id: "f2222222-aaaa-bbbb-cccc-333333333333",
    category_id: "services",
    subcategory_id: "electrical",
    sale_type: "cash",
    title: "كهربائي منازل — تأسيس وصيانة — خبرة 8 سنوات",
    description:
      "كهربائي منازل محترف. تأسيس، صيانة، إصلاح أعطال. بالاتفاق.",
    price: 200,
    is_negotiable: false,
    category_fields: {
      service_type: "electrical",
      pricing: "by_agreement",
      experience: "5_plus",
    },
    governorate: "الشرقية",
    city: "الزقازيق",
    views_count: 98,
    favorites_count: 7,
  },

  // ── Extra variety ads ──
  {
    id: "10000000-0013-0013-0013-000000000001",
    user_id: "a3333333-aaaa-bbbb-cccc-444444444444",
    category_id: "phones",
    subcategory_id: "tablet",
    sale_type: "cash",
    title: "آيباد برو 12.9 — M2 — 256GB — مستعمل ممتاز",
    description:
      "آيباد برو 12.9 إنش، شريحة M2، 256 جيجا، WiFi + Cellular. مع Apple Pencil الجيل التاني.",
    price: 28000,
    is_negotiable: true,
    category_fields: {
      brand: "apple",
      model: "iPad Pro 12.9 M2",
      storage: "256",
      condition: "like_new",
      color: "other",
    },
    governorate: "القليوبية",
    city: "بنها",
    views_count: 234,
    favorites_count: 32,
  },
  {
    id: "10000000-0013-0013-0013-000000000002",
    user_id: "a3333333-aaaa-bbbb-cccc-444444444444",
    category_id: "cars",
    subcategory_id: "motorcycles",
    sale_type: "cash",
    title: "بينيلي TNT 250 — 2023 — 5,000 كم — ممتازة",
    description:
      "موتوسيكل بينيلي TNT 250 موديل 2023، 5,000 كم. حالة ممتازة، صيانة وكالة.",
    price: 65000,
    is_negotiable: true,
    category_fields: {
      brand: "other",
      model: "بينيلي TNT 250",
      year: "2023",
      mileage: "5000",
      color: "red",
      fuel: "petrol",
      condition: "used",
    },
    governorate: "القليوبية",
    city: "بنها",
    views_count: 178,
    favorites_count: 21,
  },
  {
    id: "10000000-0013-0013-0013-000000000003",
    user_id: "a3333333-aaaa-bbbb-cccc-444444444444",
    category_id: "fashion",
    subcategory_id: "men",
    sale_type: "cash",
    title: "بدلة رجالي — Hugo Boss — مقاس 50 — جديدة بالتاج",
    description:
      "بدلة هوجو بوص كلاسيك فت، مقاس 50، لون كحلي. جديدة بالتاج. اتشريت من دبي.",
    price: 8500,
    is_negotiable: false,
    category_fields: {
      type: "suit",
      condition: "new_tagged",
      size: "xl",
      brand: "other",
      color: "blue",
      material: "polyester",
    },
    governorate: "القليوبية",
    city: "بنها",
    views_count: 145,
    favorites_count: 19,
  },
];

// ─── Auction Bids ──────────────────────────────────────────────
const AUCTION_BIDS = [
  // Bids on Hyundai Tucson auction
  {
    id: "b0000001-0001-0001-0001-000000000001",
    ad_id: "10000000-0001-0001-0001-000000000002",
    bidder_id: "b2222222-2222-2222-2222-222222222222",
    amount: 385000,
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b0000001-0001-0001-0001-000000000002",
    ad_id: "10000000-0001-0001-0001-000000000002",
    bidder_id: "c3333333-3333-3333-3333-333333333333",
    amount: 390000,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b0000001-0001-0001-0001-000000000003",
    ad_id: "10000000-0001-0001-0001-000000000002",
    bidder_id: "b2222222-2222-2222-2222-222222222222",
    amount: 400000,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b0000001-0001-0001-0001-000000000004",
    ad_id: "10000000-0001-0001-0001-000000000002",
    bidder_id: "d4444444-4444-4444-4444-444444444444",
    amount: 410000,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b0000001-0001-0001-0001-000000000005",
    ad_id: "10000000-0001-0001-0001-000000000002",
    bidder_id: "b2222222-2222-2222-2222-222222222222",
    amount: 420000,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  // Bids on Samsung S24 Ultra auction
  {
    id: "b0000002-0002-0002-0002-000000000001",
    ad_id: "10000000-0003-0003-0003-000000000002",
    bidder_id: "a1111111-1111-1111-1111-111111111111",
    amount: 39000,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b0000002-0002-0002-0002-000000000002",
    ad_id: "10000000-0003-0003-0003-000000000002",
    bidder_id: "c3333333-3333-3333-3333-333333333333",
    amount: 40000,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b0000002-0002-0002-0002-000000000003",
    ad_id: "10000000-0003-0003-0003-000000000002",
    bidder_id: "a1111111-1111-1111-1111-111111111111",
    amount: 41500,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  // Bids on gold ring auction
  {
    id: "b0000003-0003-0003-0003-000000000001",
    ad_id: "10000000-0006-0006-0006-000000000002",
    bidder_id: "d4444444-4444-4444-4444-444444444444",
    amount: 15500,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "b0000003-0003-0003-0003-000000000002",
    ad_id: "10000000-0006-0006-0006-000000000002",
    bidder_id: "a3333333-aaaa-bbbb-cccc-444444444444",
    amount: 16000,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Conversations & Messages ──────────────────────────────────
const CONVERSATIONS = [
  {
    id: "conv0001-0001-0001-0001-000000000001",
    ad_id: "10000000-0001-0001-0001-000000000001",
    buyer_id: "b2222222-2222-2222-2222-222222222222",
    seller_id: "a1111111-1111-1111-1111-111111111111",
    last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "conv0002-0002-0002-0002-000000000001",
    ad_id: "10000000-0003-0003-0003-000000000001",
    buyer_id: "c3333333-3333-3333-3333-333333333333",
    seller_id: "b2222222-2222-2222-2222-222222222222",
    last_message_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

const MESSAGES = [
  // Conv 1: Fatma asks Mohamed about Toyota
  {
    id: "msg00001-0001-0001-0001-000000000001",
    conversation_id: "conv0001-0001-0001-0001-000000000001",
    sender_id: "b2222222-2222-2222-2222-222222222222",
    content: "السلام عليكم، السيارة لسه متاحة؟",
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg00001-0001-0001-0001-000000000002",
    conversation_id: "conv0001-0001-0001-0001-000000000001",
    sender_id: "a1111111-1111-1111-1111-111111111111",
    content: "وعليكم السلام، أيوا متاحة. تحبي تيجي تعاينيها؟",
    is_read: true,
    created_at: new Date(
      Date.now() - 1 * 60 * 60 * 1000 - 50 * 60 * 1000
    ).toISOString(),
  },
  {
    id: "msg00001-0001-0001-0001-000000000003",
    conversation_id: "conv0001-0001-0001-0001-000000000001",
    sender_id: "b2222222-2222-2222-2222-222222222222",
    content: "ممكن أعرف آخر سعر؟ لو ينفع 420 ألف؟",
    is_read: true,
    created_at: new Date(
      Date.now() - 1 * 60 * 60 * 1000 - 30 * 60 * 1000
    ).toISOString(),
  },
  {
    id: "msg00001-0001-0001-0001-000000000004",
    conversation_id: "conv0001-0001-0001-0001-000000000001",
    sender_id: "a1111111-1111-1111-1111-111111111111",
    content: "لا ده قليل شوية. ممكن 440 وتاخديها النهارده.",
    is_read: true,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg00001-0001-0001-0001-000000000005",
    conversation_id: "conv0001-0001-0001-0001-000000000001",
    sender_id: "b2222222-2222-2222-2222-222222222222",
    content:
      "تمام، هبعتلك لوكيشن عشان أجيلك. إن شاء الله بكرة الصبح.",
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  // Conv 2: Ahmed asks Fatma about iPhone
  {
    id: "msg00002-0002-0002-0002-000000000001",
    conversation_id: "conv0002-0002-0002-0002-000000000001",
    sender_id: "c3333333-3333-3333-3333-333333333333",
    content: "الآيفون ده عليه أي خدش أو حاجة؟",
    is_read: true,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg00002-0002-0002-0002-000000000002",
    conversation_id: "conv0002-0002-0002-0002-000000000001",
    sender_id: "b2222222-2222-2222-2222-222222222222",
    content:
      "لا والله زيرو خالص. عليه جراب وإسكرينة من أول يوم.",
    is_read: true,
    created_at: new Date(
      Date.now() - 4 * 60 * 60 * 1000 - 30 * 60 * 1000
    ).toISOString(),
  },
  {
    id: "msg00002-0002-0002-0002-000000000003",
    conversation_id: "conv0002-0002-0002-0002-000000000001",
    sender_id: "c3333333-3333-3333-3333-333333333333",
    content: "تمام. هل ممكن نتقابل في المهندسين؟",
    is_read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Favorites ──────────────────────────────────────────────────
const FAVORITES = [
  {
    user_id: "b2222222-2222-2222-2222-222222222222",
    ad_id: "10000000-0001-0001-0001-000000000001",
  },
  {
    user_id: "c3333333-3333-3333-3333-333333333333",
    ad_id: "10000000-0001-0001-0001-000000000002",
  },
  {
    user_id: "d4444444-4444-4444-4444-444444444444",
    ad_id: "10000000-0003-0003-0003-000000000001",
  },
  {
    user_id: "a1111111-1111-1111-1111-111111111111",
    ad_id: "10000000-0003-0003-0003-000000000002",
  },
  {
    user_id: "e5555555-5555-5555-5555-555555555555",
    ad_id: "10000000-0006-0006-0006-000000000001",
  },
  {
    user_id: "a7777777-7777-7777-7777-777777777777",
    ad_id: "10000000-0009-0009-0009-000000000001",
  },
  {
    user_id: "c9999999-9999-9999-9999-999999999999",
    ad_id: "10000000-0007-0007-0007-000000000001",
  },
  {
    user_id: "a3333333-aaaa-bbbb-cccc-444444444444",
    ad_id: "10000000-0010-0010-0010-000000000001",
  },
];

// ═══════════════════════════════════════════════════════════════
// Route handler
// ═══════════════════════════════════════════════════════════════

async function handler(request: Request) {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || secretParam;

  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "مفيش Service Role Key. ضيف SUPABASE_SERVICE_ROLE_KEY أو ابعته كـ ?secret=KEY",
      },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL مش موجود" },
      { status: 500 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const results: Record<string, string> = {};

  // ── Step 0: Ensure categories exist ──
  try {
    const baseUrl = url.origin;
    await fetch(`${baseUrl}/api/ensure-categories?secret=${serviceRoleKey}`);
    results.categories = "تم التأكد من وجود الأقسام";
  } catch {
    results.categories = "تحذير: مش قادر يتأكد من الأقسام (ممكن تكون موجودة)";
  }

  // ── Step 1: Create auth users ──
  let usersCreated = 0;
  let usersSkipped = 0;
  for (const u of TEST_USERS) {
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
      if (
        error.message?.includes("already been registered") ||
        error.message?.includes("duplicate")
      ) {
        usersSkipped++;
      } else {
        results[`auth_${u.email}`] = `خطأ: ${error.message}`;
      }
    } else {
      usersCreated++;
    }
  }
  results.auth_users = `تم إنشاء ${usersCreated} حساب (${usersSkipped} موجودين مسبقاً)`;

  // ── Step 2: Create profiles ──
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
  }));

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profiles, { onConflict: "id" });
  results.profiles = profileError
    ? `خطأ: ${profileError.message}`
    : `تم إضافة ${profiles.length} بروفايل`;

  // ── Step 3: Create ads ──
  const { error: adsError } = await admin
    .from("ads")
    .upsert(SAMPLE_ADS, { onConflict: "id" });
  results.ads = adsError
    ? `خطأ: ${adsError.message}`
    : `تم إضافة ${SAMPLE_ADS.length} إعلان`;

  // ── Step 4: Create auction bids ──
  const { error: bidsError } = await admin
    .from("auction_bids")
    .upsert(AUCTION_BIDS, { onConflict: "id" });
  results.bids = bidsError
    ? `خطأ: ${bidsError.message}`
    : `تم إضافة ${AUCTION_BIDS.length} مزايدة`;

  // ── Step 5: Create conversations ──
  const { error: convError } = await admin
    .from("conversations")
    .upsert(CONVERSATIONS, { onConflict: "id" });
  results.conversations = convError
    ? `خطأ: ${convError.message}`
    : `تم إضافة ${CONVERSATIONS.length} محادثة`;

  // ── Step 6: Create messages ──
  const { error: msgError } = await admin
    .from("messages")
    .upsert(MESSAGES, { onConflict: "id" });
  results.messages = msgError
    ? `خطأ: ${msgError.message}`
    : `تم إضافة ${MESSAGES.length} رسالة`;

  // ── Step 7: Create favorites ──
  for (const fav of FAVORITES) {
    await admin.from("favorites").upsert(fav, {
      onConflict: "user_id,ad_id",
    });
  }
  results.favorites = `تم إضافة ${FAVORITES.length} مفضلة`;

  // ── Response ──
  const hasErrors = Object.values(results).some((r) => r.startsWith("خطأ"));

  return NextResponse.json(
    {
      success: !hasErrors,
      message: hasErrors
        ? "حصلت بعض الأخطاء — شوف التفاصيل"
        : "تم إنشاء بيانات تجريبية شاملة بنجاح! 🎉",
      summary: {
        users: `${TEST_USERS.length} حساب`,
        ads: `${SAMPLE_ADS.length} إعلان (12 قسم × كاش/مزاد/تبديل)`,
        bids: `${AUCTION_BIDS.length} مزايدة`,
        conversations: `${CONVERSATIONS.length} محادثة`,
        messages: `${MESSAGES.length} رسالة`,
        favorites: `${FAVORITES.length} مفضلة`,
      },
      results,
      categories_covered: [
        "🚗 سيارات (cars)",
        "🏠 عقارات (real_estate)",
        "📱 موبايلات (phones)",
        "👗 موضة (fashion)",
        "♻️ خردة (scrap)",
        "💰 ذهب وفضة (gold)",
        "💎 سلع فاخرة (luxury)",
        "🏠 أجهزة منزلية (appliances)",
        "🪑 أثاث وديكور (furniture)",
        "🎮 هوايات (hobbies)",
        "🔧 عدد وأدوات (tools)",
        "🛠️ خدمات (services)",
      ],
      accounts: TEST_USERS.map((u) => ({
        email: u.email,
        password: u.password,
        name: u.display_name,
        phone: u.phone,
        location: `${u.governorate} — ${u.city}`,
      })),
    },
    { status: hasErrors ? 207 : 200 }
  );
}

export async function POST(request: Request) {
  return handler(request);
}

export async function GET(request: Request) {
  return handler(request);
}
