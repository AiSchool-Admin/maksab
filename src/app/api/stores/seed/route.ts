import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/stores/seed
 *
 * Creates demo stores with products so the stores directory isn't empty.
 * Uses service role key to bypass RLS.
 * Safe to call multiple times — skips if demo stores already exist.
 */

const DEMO_STORES = [
  {
    name: "موبايلات المعلم",
    slug: "mobailat-elmoallem",
    description: "أكبر تشكيلة موبايلات جديدة ومستعملة بأحسن الأسعار في مصر. ضمان وفاتورة على كل جهاز.",
    main_category: "phones",
    theme: "modern" as const,
    primary_color: "#2563EB",
    location_gov: "القاهرة",
    location_area: "وسط البلد",
    phone: "01012345678",
    is_verified: true,
    products: [
      { title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو", price: 42000, sale_type: "cash", category_id: "phones", subcategory_id: "mobile", category_fields: { brand: "آيفون", model: "15 برو ماكس", storage: "256GB", condition: "مستعمل زيرو" } },
      { title: "سامسونج S24 Ultra — 512GB — جديد متبرشم", price: 55000, sale_type: "cash", category_id: "phones", subcategory_id: "mobile", category_fields: { brand: "سامسونج", model: "S24 Ultra", storage: "512GB", condition: "جديد متبرشم" } },
      { title: "شاومي 14 — 256GB — جديد بالعلبة", price: 15000, sale_type: "cash", category_id: "phones", subcategory_id: "mobile", category_fields: { brand: "شاومي", model: "14", storage: "256GB", condition: "جديد متبرشم" } },
      { title: "آيفون 14 برو — 128GB — مستعمل كويس", price: 28000, sale_type: "cash", category_id: "phones", subcategory_id: "mobile", category_fields: { brand: "آيفون", model: "14 برو", storage: "128GB", condition: "مستعمل كويس" } },
    ],
  },
  {
    name: "معرض النجم للسيارات",
    slug: "maarad-elnagm",
    description: "معرض سيارات مستعملة بحالة ممتازة. فحص شامل وضمان على كل عربية. بنبيع ونشتري.",
    main_category: "cars",
    theme: "elegant" as const,
    primary_color: "#1B7A3D",
    location_gov: "الجيزة",
    location_area: "فيصل",
    phone: "01123456789",
    is_verified: true,
    products: [
      { title: "تويوتا كورولا 2022 — 35,000 كم", price: 850000, sale_type: "cash", category_id: "cars", subcategory_id: "passenger", category_fields: { brand: "تويوتا", model: "كورولا", year: "2022", mileage: "35000" } },
      { title: "هيونداي توسان 2021 — 50,000 كم", price: 950000, sale_type: "cash", category_id: "cars", subcategory_id: "passenger", category_fields: { brand: "هيونداي", model: "توسان", year: "2021", mileage: "50000" } },
      { title: "شيفروليه أوبترا 2023 — 20,000 كم", price: 680000, sale_type: "cash", category_id: "cars", subcategory_id: "passenger", category_fields: { brand: "شيفروليه", model: "أوبترا", year: "2023", mileage: "20000" } },
    ],
  },
  {
    name: "ذهب الحسين",
    slug: "dahab-elhussein",
    description: "محل ذهب وفضة في الحسين. عيار 21 و 18. شغل يدوي ومكن. أسعار الجملة.",
    main_category: "gold",
    theme: "elegant" as const,
    primary_color: "#D4A843",
    location_gov: "القاهرة",
    location_area: "الحسين",
    phone: "01234567890",
    is_verified: false,
    products: [
      { title: "سلسلة ذهب عيار 21 — 10 جرام", price: 32000, sale_type: "cash", category_id: "gold", subcategory_id: "gold_items", category_fields: { type: "سلسلة", karat: "عيار 21", weight: "10", condition: "جديد" } },
      { title: "خاتم ذهب عيار 18 — 5 جرام — فص زمرد", price: 18000, sale_type: "cash", category_id: "gold", subcategory_id: "gold_items", category_fields: { type: "خاتم", karat: "عيار 18", weight: "5", condition: "جديد" } },
      { title: "دبلة ذهب عيار 21 — 8 جرام", price: 25000, sale_type: "cash", category_id: "gold", subcategory_id: "gold_items", category_fields: { type: "دبلة", karat: "عيار 21", weight: "8", condition: "جديد" } },
    ],
  },
  {
    name: "أثاث البركة",
    slug: "athath-elbaraka",
    description: "غرف نوم وسفرة وأنتريه خشب زان. صناعة دمياط الأصلية. توصيل لكل المحافظات.",
    main_category: "furniture",
    theme: "classic" as const,
    primary_color: "#78716C",
    location_gov: "دمياط",
    location_area: "دمياط الجديدة",
    phone: "01098765432",
    is_verified: false,
    products: [
      { title: "غرفة نوم خشب زان — 7 قطع — كلاسيك", price: 85000, sale_type: "cash", category_id: "furniture", subcategory_id: "bedrooms", category_fields: { type: "غرفة نوم", condition: "جديد", material: "خشب زان" } },
      { title: "سفرة 8 كراسي خشب زان — مودرن", price: 45000, sale_type: "cash", category_id: "furniture", subcategory_id: "dining", category_fields: { type: "سفرة", condition: "جديد", material: "خشب زان" } },
    ],
  },
  {
    name: "الكترونيات أبو حميد",
    slug: "electronics-abuhamid",
    description: "كل الأجهزة المنزلية بأسعار الجملة. غسالات وثلاجات وبوتاجازات. ضمان سنة.",
    main_category: "appliances",
    theme: "sporty" as const,
    primary_color: "#DC2626",
    location_gov: "الإسكندرية",
    location_area: "محطة الرمل",
    phone: "01187654321",
    is_verified: true,
    products: [
      { title: "غسالة توشيبا 10 كيلو — فوق أوتوماتيك — جديدة", price: 16000, sale_type: "cash", category_id: "appliances", subcategory_id: "washers", category_fields: { type: "غسالة", brand: "توشيبا", condition: "جديد متبرشم", year: "2024" } },
      { title: "ثلاجة شارب 16 قدم — نوفروست — جديدة", price: 22000, sale_type: "cash", category_id: "appliances", subcategory_id: "fridges", category_fields: { type: "ثلاجة", brand: "شارب", condition: "جديد متبرشم", year: "2024" } },
      { title: "مكيف كاريير 1.5 حصان — بارد ساخن — مستعمل", price: 8000, sale_type: "cash", category_id: "appliances", subcategory_id: "ac", category_fields: { type: "مكيف", brand: "كاريير", condition: "مستعمل ممتاز", year: "2022" } },
    ],
  },
  {
    name: "ملابس ستايل",
    slug: "malabs-style",
    description: "أحدث الموضة الرجالي والحريمي. ماركات أصلية بأسعار مناسبة. شحن لكل مصر.",
    main_category: "fashion",
    theme: "modern" as const,
    primary_color: "#7C3AED",
    location_gov: "القاهرة",
    location_area: "مدينة نصر",
    phone: "01076543210",
    is_verified: false,
    products: [
      { title: "جاكت جلد رجالي — Zara — مقاس L — جديد بالتاج", price: 3500, sale_type: "cash", category_id: "fashion", subcategory_id: "men", category_fields: { type: "جاكت", condition: "جديد بالتاج", size: "L", brand: "Zara" } },
      { title: "حذاء رياضي Nike Air Max — مقاس 43 — جديد", price: 4200, sale_type: "cash", category_id: "fashion", subcategory_id: "shoes", category_fields: { type: "حذاء رياضي", condition: "جديد بالتاج", size: "43", brand: "Nike" } },
    ],
  },
];

export async function POST() {
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
    // Check if demo stores already exist
    const { data: existing } = await adminClient
      .from("stores")
      .select("slug")
      .in("slug", DEMO_STORES.map((s) => s.slug));

    const existingSlugs = new Set((existing || []).map((s: { slug: string }) => s.slug));
    const storesToCreate = DEMO_STORES.filter((s) => !existingSlugs.has(s.slug));

    if (storesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "المتاجر التجريبية موجودة بالفعل",
        created: 0,
      });
    }

    let totalStores = 0;
    let totalProducts = 0;

    for (const storeData of storesToCreate) {
      // Create a demo user for this store
      const demoEmail = `demo-${storeData.slug}@maksab.app`;
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: demoEmail,
        password: `demo-${storeData.slug}-${Date.now()}`,
        email_confirm: true,
        user_metadata: { is_demo: true },
      });

      if (authError || !authUser.user) {
        console.error(`Failed to create auth user for ${storeData.name}:`, authError);
        continue;
      }

      const userId = authUser.user.id;

      // Create profile
      await adminClient.from("profiles").upsert({
        id: userId,
        phone: storeData.phone,
        display_name: storeData.name,
        governorate: storeData.location_gov,
        city: storeData.location_area,
        seller_type: "store",
      });

      // Create store
      const { data: store, error: storeError } = await adminClient
        .from("stores")
        .insert({
          user_id: userId,
          name: storeData.name,
          slug: storeData.slug,
          description: storeData.description,
          main_category: storeData.main_category,
          theme: storeData.theme,
          primary_color: storeData.primary_color,
          location_gov: storeData.location_gov,
          location_area: storeData.location_area,
          phone: storeData.phone,
          is_verified: storeData.is_verified,
        })
        .select("id")
        .single();

      if (storeError || !store) {
        console.error(`Failed to create store ${storeData.name}:`, storeError);
        continue;
      }

      // Link store to profile
      await adminClient
        .from("profiles")
        .update({ store_id: store.id })
        .eq("id", userId);

      // Create free subscription
      await adminClient.from("store_subscriptions").insert({
        store_id: store.id,
        plan: "free",
        status: "active",
        price: 0,
        start_at: new Date().toISOString(),
      });

      // Create products (ads)
      for (const product of storeData.products) {
        await adminClient.from("ads").insert({
          user_id: userId,
          store_id: store.id,
          title: product.title,
          description: product.title,
          price: product.price,
          sale_type: product.sale_type,
          category_id: product.category_id,
          subcategory_id: product.subcategory_id,
          category_fields: product.category_fields,
          governorate: storeData.location_gov,
          city: storeData.location_area,
          status: "active",
          is_negotiable: true,
          images: [],
        });
        totalProducts++;
      }

      // Give verified stores a badge
      if (storeData.is_verified) {
        await adminClient.from("store_badges").insert({
          store_id: store.id,
          badge_type: "verified",
          is_active: true,
        });
      }

      totalStores++;
    }

    return NextResponse.json({
      success: true,
      message: `تم إنشاء ${totalStores} متجر و ${totalProducts} منتج`,
      created: totalStores,
      products: totalProducts,
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
