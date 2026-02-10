import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/seed-stores (also GET for browser testing)
 *
 * Seeds demo stores with their owners (auth users + profiles).
 * Uses service role key to create auth users and bypass RLS.
 * Safe to run multiple times — checks if stores already exist.
 *
 * Creates 8 demo stores across different categories and governorates.
 */

interface DemoStore {
  email: string;
  phone: string;
  display_name: string;
  governorate: string;
  city: string;
  store: {
    name: string;
    description: string;
    main_category: string;
    sub_categories: string[];
    theme: "classic" | "modern" | "elegant" | "sporty";
    primary_color: string;
    location_gov: string;
    location_area: string;
    phone: string;
    is_verified: boolean;
  };
  ads: {
    title: string;
    description: string;
    category_id: string;
    subcategory_id: string;
    sale_type: "cash" | "auction" | "exchange";
    price: number | null;
    is_negotiable: boolean;
    governorate: string;
    city: string;
    category_fields: Record<string, string | number | boolean>;
  }[];
}

const DEMO_STORES: DemoStore[] = [
  {
    email: "store-cars@demo.maksab.app",
    phone: "01012345001",
    display_name: "أحمد الفاروق",
    governorate: "القاهرة",
    city: "مدينة نصر",
    store: {
      name: "سيارات الفاروق",
      description:
        "متخصصين في بيع وشراء السيارات المستعملة والجديدة. خبرة أكتر من 10 سنين في سوق السيارات المصري. كل عربية عندنا متفحصة ومضمونة.",
      main_category: "cars",
      sub_categories: ["passenger", "car-parts"],
      theme: "modern",
      primary_color: "#1B5E20",
      location_gov: "القاهرة",
      location_area: "مدينة نصر",
      phone: "01012345001",
      is_verified: true,
    },
    ads: [
      {
        title: "تويوتا كورولا 2022 — 35,000 كم",
        description:
          "سيارة تويوتا كورولا موديل 2022، مسافة 35,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة",
        category_id: "cars",
        subcategory_id: "passenger",
        sale_type: "cash",
        price: 450000,
        is_negotiable: true,
        governorate: "القاهرة",
        city: "مدينة نصر",
        category_fields: {
          brand: "تويوتا",
          model: "كورولا",
          year: 2022,
          mileage: 35000,
          fuel: "بنزين",
          transmission: "أوتوماتيك",
          color: "أبيض",
          licensed: true,
        },
      },
      {
        title: "هيونداي توسان 2023 — 20,000 كم",
        description:
          "هيونداي توسان موديل 2023، مسافة 20,000 كم، أوتوماتيك، بنزين، لون رمادي، فبريكة بالكامل",
        category_id: "cars",
        subcategory_id: "passenger",
        sale_type: "cash",
        price: 750000,
        is_negotiable: false,
        governorate: "القاهرة",
        city: "مدينة نصر",
        category_fields: {
          brand: "هيونداي",
          model: "توسان",
          year: 2023,
          mileage: 20000,
          fuel: "بنزين",
          transmission: "أوتوماتيك",
          color: "رمادي",
          licensed: true,
        },
      },
      {
        title: "كيا سبورتاج 2021 — 55,000 كم",
        description:
          "كيا سبورتاج موديل 2021، مسافة 55,000 كم، أوتوماتيك، بنزين، لون أسود",
        category_id: "cars",
        subcategory_id: "passenger",
        sale_type: "cash",
        price: 580000,
        is_negotiable: true,
        governorate: "القاهرة",
        city: "مدينة نصر",
        category_fields: {
          brand: "كيا",
          model: "سبورتاج",
          year: 2021,
          mileage: 55000,
          fuel: "بنزين",
          transmission: "أوتوماتيك",
          color: "أسود",
          licensed: true,
        },
      },
    ],
  },
  {
    email: "store-phones@demo.maksab.app",
    phone: "01112345002",
    display_name: "محمد سمير",
    governorate: "الجيزة",
    city: "الدقي",
    store: {
      name: "موبايلات سمير",
      description:
        "أكبر تشكيلة موبايلات جديدة ومستعملة. آيفون، سامسونج، شاومي وكل الماركات. ضمان حقيقي وأسعار منافسة.",
      main_category: "phones",
      sub_categories: ["mobile", "tablet", "phone-accessories"],
      theme: "modern",
      primary_color: "#1565C0",
      location_gov: "الجيزة",
      location_area: "الدقي",
      phone: "01112345002",
      is_verified: true,
    },
    ads: [
      {
        title: "آيفون 15 برو ماكس — 256GB — جديد متبرشم",
        description:
          "آيفون 15 برو ماكس، 256 جيجا، جديد متبرشم، ضمان سنة، لون تيتانيوم",
        category_id: "phones",
        subcategory_id: "mobile",
        sale_type: "cash",
        price: 62000,
        is_negotiable: false,
        governorate: "الجيزة",
        city: "الدقي",
        category_fields: {
          brand: "آيفون",
          model: "15 برو ماكس",
          storage: "256GB",
          condition: "جديد متبرشم",
          color: "تيتانيوم",
          ram: "8GB",
          with_box: true,
          with_warranty: true,
        },
      },
      {
        title: "سامسونج S24 Ultra — 512GB — مستعمل زيرو",
        description:
          "سامسونج جالاكسي S24 الترا، 512 جيجا، مستعمل زيرو، مع العلبة والضمان",
        category_id: "phones",
        subcategory_id: "mobile",
        sale_type: "cash",
        price: 48000,
        is_negotiable: true,
        governorate: "الجيزة",
        city: "الدقي",
        category_fields: {
          brand: "سامسونج",
          model: "S24 Ultra",
          storage: "512GB",
          condition: "مستعمل زيرو",
          ram: "12GB",
          with_box: true,
          with_warranty: true,
        },
      },
      {
        title: "شاومي 14 — 256GB — جديد",
        description: "شاومي 14، مساحة 256 جيجا، جديد متبرشم، لون أسود",
        category_id: "phones",
        subcategory_id: "mobile",
        sale_type: "cash",
        price: 18000,
        is_negotiable: true,
        governorate: "الجيزة",
        city: "الدقي",
        category_fields: {
          brand: "شاومي",
          model: "14",
          storage: "256GB",
          condition: "جديد متبرشم",
          color: "أسود",
          ram: "12GB",
          with_box: true,
        },
      },
    ],
  },
  {
    email: "store-gold@demo.maksab.app",
    phone: "01212345003",
    display_name: "حسن الصاغة",
    governorate: "القاهرة",
    city: "الحسين",
    store: {
      name: "صاغة الحسين",
      description:
        "ذهب وفضة ومجوهرات بأعلى جودة وأحسن سعر. خبرة 20 سنة في صناعة وتجارة الذهب. عيار 21 و 18 و 24. شهادات ضمان لكل قطعة.",
      main_category: "gold",
      sub_categories: [],
      theme: "elegant",
      primary_color: "#D4A843",
      location_gov: "القاهرة",
      location_area: "الحسين",
      phone: "01212345003",
      is_verified: true,
    },
    ads: [
      {
        title: "سلسلة ذهب عيار 21 — 15 جرام — جديدة",
        description:
          "سلسلة ذهب عيار 21، وزن 15 جرام، جديدة، تصميم إيطالي، مع شهادة",
        category_id: "gold",
        subcategory_id: "gold-items",
        sale_type: "cash",
        price: 52500,
        is_negotiable: false,
        governorate: "القاهرة",
        city: "الحسين",
        category_fields: {
          type: "سلسلة",
          karat: "عيار 21",
          weight: 15,
          condition: "جديد",
          has_certificate: true,
        },
      },
      {
        title: "دبلة ذهب عيار 18 — 8 جرام",
        description: "دبلة ذهب عيار 18، وزن 8 جرام، تصميم كلاسيك، مقاسات متاحة",
        category_id: "gold",
        subcategory_id: "gold-items",
        sale_type: "cash",
        price: 22000,
        is_negotiable: true,
        governorate: "القاهرة",
        city: "الحسين",
        category_fields: {
          type: "دبلة",
          karat: "عيار 18",
          weight: 8,
          condition: "جديد",
        },
      },
    ],
  },
  {
    email: "store-fashion@demo.maksab.app",
    phone: "01512345004",
    display_name: "سارة عبدالله",
    governorate: "الإسكندرية",
    city: "سموحة",
    store: {
      name: "ستايل سارة",
      description:
        "أحدث صيحات الموضة الحريمي والرجالي. ماركات أصلية بأسعار مناسبة. شحن لكل المحافظات.",
      main_category: "fashion",
      sub_categories: ["women-clothing", "men-clothing", "shoes"],
      theme: "elegant",
      primary_color: "#E91E63",
      location_gov: "الإسكندرية",
      location_area: "سموحة",
      phone: "01512345004",
      is_verified: false,
    },
    ads: [
      {
        title: "جاكت جلد رجالي — Zara — مقاس L — جديد بالتاج",
        description:
          "جاكت جلد طبيعي رجالي من Zara، مقاس L، جديد بالتاج، لون أسود",
        category_id: "fashion",
        subcategory_id: "men-clothing",
        sale_type: "cash",
        price: 3500,
        is_negotiable: true,
        governorate: "الإسكندرية",
        city: "سموحة",
        category_fields: {
          type: "جاكت",
          condition: "جديد بالتاج",
          size: "L",
          brand: "Zara",
          color: "أسود",
          material: "جلد",
        },
      },
      {
        title: "فستان سواريه — مقاس M — جديد",
        description:
          "فستان سواريه حريمي، مقاس M، جديد بدون تاج، لون نبيتي، خامة ساتان",
        category_id: "fashion",
        subcategory_id: "women-clothing",
        sale_type: "cash",
        price: 2800,
        is_negotiable: true,
        governorate: "الإسكندرية",
        city: "سموحة",
        category_fields: {
          type: "فستان",
          condition: "جديد بدون تاج",
          size: "M",
          color: "نبيتي",
          material: "ساتان",
        },
      },
    ],
  },
  {
    email: "store-realestate@demo.maksab.app",
    phone: "01012345005",
    display_name: "عمرو العقاري",
    governorate: "القاهرة",
    city: "التجمع الخامس",
    store: {
      name: "عقارات التجمع",
      description:
        "شقق وفيلات ومحلات في التجمع الخامس والقاهرة الجديدة. خبرة 15 سنة. استشارات عقارية مجانية.",
      main_category: "real_estate",
      sub_categories: ["apartments-sale", "villas", "commercial"],
      theme: "classic",
      primary_color: "#2E7D32",
      location_gov: "القاهرة",
      location_area: "التجمع الخامس",
      phone: "01012345005",
      is_verified: true,
    },
    ads: [
      {
        title: "شقة 180م² — 3 غرف — التجمع الخامس",
        description:
          "شقة 180 متر مربع، 3 غرف نوم، 2 حمام، الطابق الخامس، سوبر لوكس، أسانسير",
        category_id: "real_estate",
        subcategory_id: "apartments-sale",
        sale_type: "cash",
        price: 3500000,
        is_negotiable: true,
        governorate: "القاهرة",
        city: "التجمع الخامس",
        category_fields: {
          type: "شقة",
          area: 180,
          rooms: "3",
          floor: "5",
          bathrooms: "2",
          finishing: "سوبر لوكس",
          elevator: true,
          facing: "بحري",
        },
      },
      {
        title: "فيلا 350م² — التجمع الخامس — تشطيب كامل",
        description:
          "فيلا مستقلة 350 متر مربع، 4 غرف نوم، حديقة خاصة، جراج، سوبر لوكس",
        category_id: "real_estate",
        subcategory_id: "villas",
        sale_type: "cash",
        price: 12000000,
        is_negotiable: true,
        governorate: "القاهرة",
        city: "التجمع الخامس",
        category_fields: {
          type: "فيلا",
          area: 350,
          rooms: "4",
          floor: "أرضي",
          bathrooms: "3",
          finishing: "سوبر لوكس",
          garden: true,
          garage: true,
        },
      },
    ],
  },
  {
    email: "store-appliances@demo.maksab.app",
    phone: "01112345006",
    display_name: "خالد التوكيل",
    governorate: "الجيزة",
    city: "فيصل",
    store: {
      name: "توكيل الأجهزة",
      description:
        "أجهزة منزلية جديدة ومستعملة بضمان. غسالات، ثلاجات، بوتاجازات، مكيفات. أسعار الجملة للجمهور.",
      main_category: "appliances",
      sub_categories: [],
      theme: "classic",
      primary_color: "#0277BD",
      location_gov: "الجيزة",
      location_area: "فيصل",
      phone: "01112345006",
      is_verified: false,
    },
    ads: [
      {
        title: "غسالة توشيبا 10 كيلو — 2024 — جديدة",
        description:
          "غسالة توشيبا فوق أوتوماتيك، 10 كيلو، موديل 2024، جديدة متبرشمة، ضمان 5 سنين",
        category_id: "appliances",
        subcategory_id: "washers",
        sale_type: "cash",
        price: 12500,
        is_negotiable: true,
        governorate: "الجيزة",
        city: "فيصل",
        category_fields: {
          type: "غسالة",
          brand: "توشيبا",
          condition: "جديد متبرشم",
          purchase_year: 2024,
          capacity: "10 كيلو",
          warranty: true,
        },
      },
      {
        title: "ثلاجة شارب 16 قدم — مستعملة ممتاز",
        description:
          "ثلاجة شارب نوفروست 16 قدم، مستعملة حالة ممتازة، لون سيلفر",
        category_id: "appliances",
        subcategory_id: "fridges",
        sale_type: "cash",
        price: 8500,
        is_negotiable: true,
        governorate: "الجيزة",
        city: "فيصل",
        category_fields: {
          type: "ثلاجة",
          brand: "شارب",
          condition: "مستعمل ممتاز",
          capacity: "16 قدم",
          color: "سيلفر",
        },
      },
    ],
  },
  {
    email: "store-furniture@demo.maksab.app",
    phone: "01212345007",
    display_name: "مصطفى النجار",
    governorate: "الدقهلية",
    city: "المنصورة",
    store: {
      name: "أثاث دمياط الأصلي",
      description:
        "أثاث دمياطي أصلي — غرف نوم، سفرة، أنتريه — خشب زان وأرو طبيعي. تصنيع حسب الطلب. شحن لكل المحافظات.",
      main_category: "furniture",
      sub_categories: [],
      theme: "elegant",
      primary_color: "#5D4037",
      location_gov: "الدقهلية",
      location_area: "المنصورة",
      phone: "01212345007",
      is_verified: true,
    },
    ads: [
      {
        title: "غرفة نوم خشب زان — 7 قطع — جديدة",
        description:
          "غرفة نوم كاملة خشب زان طبيعي، 7 قطع، تصنيع دمياطي أصلي، تشطيب عالي الجودة",
        category_id: "furniture",
        subcategory_id: "bedrooms",
        sale_type: "cash",
        price: 45000,
        is_negotiable: true,
        governorate: "الدقهلية",
        city: "المنصورة",
        category_fields: {
          type: "غرفة نوم",
          condition: "جديد",
          material: "خشب زان",
          pieces: 7,
        },
      },
      {
        title: "سفرة 8 كراسي — خشب أرو — جديدة",
        description:
          "سفرة مودرن 8 كراسي، خشب أرو طبيعي، تصميم عصري، نوع الخشب مستورد",
        category_id: "furniture",
        subcategory_id: "dining",
        sale_type: "cash",
        price: 35000,
        is_negotiable: true,
        governorate: "الدقهلية",
        city: "المنصورة",
        category_fields: {
          type: "سفرة",
          condition: "جديد",
          material: "خشب أرو",
          pieces: 9,
        },
      },
    ],
  },
  {
    email: "store-scrap@demo.maksab.app",
    phone: "01512345008",
    display_name: "ياسر الخردة",
    governorate: "القاهرة",
    city: "شبرا",
    store: {
      name: "خردة شبرا",
      description:
        "شراء وبيع جميع أنواع الخردة — حديد، نحاس، ألومنيوم، بلاستيك. أعلى سعر وتقييم فوري. نيجي لحد عندك.",
      main_category: "scrap",
      sub_categories: [],
      theme: "sporty",
      primary_color: "#E65100",
      location_gov: "القاهرة",
      location_area: "شبرا",
      phone: "01512345008",
      is_verified: false,
    },
    ads: [
      {
        title: "حديد خردة — 2 طن — نظيف",
        description:
          "حديد خردة نظيف، 2 طن، جاهز للشحن، السعر للطن الواحد",
        category_id: "scrap",
        subcategory_id: "iron",
        sale_type: "cash",
        price: 25000,
        is_negotiable: true,
        governorate: "القاهرة",
        city: "شبرا",
        category_fields: {
          type: "حديد",
          weight: 2000,
          weight_unit: "كجم",
          condition: "نظيف",
        },
      },
      {
        title: "نحاس خردة — 500 كجم — مختلط",
        description:
          "نحاس خردة، حوالي 500 كيلو، مختلط (أسلاك + مواسير)، جاهز للتسليم",
        category_id: "scrap",
        subcategory_id: "copper",
        sale_type: "cash",
        price: 95000,
        is_negotiable: true,
        governorate: "القاهرة",
        city: "شبرا",
        category_fields: {
          type: "نحاس",
          weight: 500,
          weight_unit: "كجم",
          condition: "مختلط",
        },
      },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedStores(adminClient: ReturnType<typeof createClient<any>>) {
  const results: {
    store: string;
    status: "created" | "exists" | "error";
    error?: string;
    ads_created?: number;
  }[] = [];

  for (const demo of DEMO_STORES) {
    // Check if store already exists by name
    const { data: existing } = await adminClient
      .from("stores" as never)
      .select("id, name")
      .ilike("name", demo.store.name)
      .maybeSingle();

    if (existing) {
      results.push({ store: demo.store.name, status: "exists" });
      continue;
    }

    try {
      // 1. Create auth user (or get existing)
      let userId: string;

      const { data: authUser, error: authError } =
        await adminClient.auth.admin.createUser({
          email: demo.email,
          phone: `+2${demo.phone}`,
          email_confirm: true,
          phone_confirm: true,
          password: `Demo@${demo.phone}`,
          user_metadata: {
            display_name: demo.display_name,
            is_demo: true,
          },
        });

      if (authError) {
        // User might already exist — try to find by email
        const { data: existingUsers } =
          await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const found = existingUsers?.users?.find(
          (u) => u.email === demo.email,
        );
        if (found) {
          userId = found.id;
        } else {
          results.push({
            store: demo.store.name,
            status: "error",
            error: `Auth: ${authError.message}`,
          });
          continue;
        }
      } else {
        userId = authUser.user.id;
      }

      // 2. Upsert profile
      await adminClient.from("profiles" as never).upsert(
        {
          id: userId,
          phone: demo.phone,
          display_name: demo.display_name,
          governorate: demo.governorate,
          city: demo.city,
          seller_type: "store",
        } as never,
        { onConflict: "id" },
      );

      // 3. Generate slug
      const { data: slugData } = await adminClient.rpc(
        "generate_store_slug" as never,
        { store_name: demo.store.name } as never,
      );
      const slug =
        (slugData as unknown as string) || `store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // 4. Create store
      const { data: store, error: storeError } = await adminClient
        .from("stores" as never)
        .insert({
          user_id: userId,
          name: demo.store.name,
          slug,
          description: demo.store.description,
          main_category: demo.store.main_category,
          sub_categories: demo.store.sub_categories,
          theme: demo.store.theme,
          primary_color: demo.store.primary_color,
          location_gov: demo.store.location_gov,
          location_area: demo.store.location_area,
          phone: demo.store.phone,
          is_verified: demo.store.is_verified,
        } as never)
        .select("id")
        .single();

      if (storeError) {
        results.push({
          store: demo.store.name,
          status: "error",
          error: `Store: ${storeError.message}`,
        });
        continue;
      }

      // 5. Link store_id to profile
      await adminClient
        .from("profiles" as never)
        .update({ store_id: (store as { id: string }).id } as never)
        .eq("id", userId);

      const storeId = (store as { id: string }).id;

      // 6. Create demo ads for this store
      let adsCreated = 0;
      for (const ad of demo.ads) {
        const { error: adError } = await adminClient.from("ads" as never).insert({
          user_id: userId,
          store_id: storeId,
          title: ad.title,
          description: ad.description,
          category_id: ad.category_id,
          subcategory_id: ad.subcategory_id,
          sale_type: ad.sale_type,
          price: ad.price,
          is_negotiable: ad.is_negotiable,
          governorate: ad.governorate,
          city: ad.city,
          category_fields: ad.category_fields,
          status: "active",
          images: [],
        } as never);

        if (!adError) adsCreated++;
      }

      // 7. Create free subscription
      await adminClient.from("store_subscriptions" as never).insert({
        store_id: storeId,
        plan: "free",
        status: "active",
        price: 0,
        start_at: new Date().toISOString(),
      } as never);

      results.push({
        store: demo.store.name,
        status: "created",
        ads_created: adsCreated,
      });
    } catch (err) {
      results.push({
        store: demo.store.name,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        hint: "Add SUPABASE_SERVICE_ROLE_KEY to your environment variables (Supabase Dashboard → Settings → API → service_role key)",
      },
      { status: 500 },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const results = await seedStores(adminClient);

    const created = results.filter((r) => r.status === "created").length;
    const existing = results.filter((r) => r.status === "exists").length;
    const errors = results.filter((r) => r.status === "error").length;
    const totalAds = results.reduce(
      (sum, r) => sum + (r.ads_created || 0),
      0,
    );

    return NextResponse.json({
      success: errors === 0,
      summary: {
        total: DEMO_STORES.length,
        created,
        already_existing: existing,
        errors,
        total_ads_created: totalAds,
      },
      details: results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// Also support GET for easy browser testing
export async function GET() {
  return POST();
}
