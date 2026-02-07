import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/setup-db
 *
 * Seeds the database with categories, subcategories, governorates, and cities.
 * Requires SUPABASE_SERVICE_ROLE_KEY env variable (bypasses RLS).
 *
 * Can also accept a `secret` query param as alternative auth:
 *   POST /api/admin/setup-db?secret=YOUR_SERVICE_ROLE_KEY
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || secretParam;

  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "مفيش Service Role Key. ضيف SUPABASE_SERVICE_ROLE_KEY في environment variables أو ابعته كـ query param ?secret=KEY",
      },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL مش موجود" },
      { status: 500 },
    );
  }

  // Create admin client that bypasses RLS
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const results: Record<string, string> = {};

  try {
    // 1. Seed categories
    const { error: catError } = await adminClient.from("categories").upsert(
      CATEGORIES,
      { onConflict: "id" },
    );
    results.categories = catError
      ? `خطأ: ${catError.message}`
      : `تم إضافة ${CATEGORIES.length} قسم`;

    // 2. Seed subcategories
    const { error: subError } = await adminClient
      .from("subcategories")
      .upsert(SUBCATEGORIES, { onConflict: "id" });
    results.subcategories = subError
      ? `خطأ: ${subError.message}`
      : `تم إضافة ${SUBCATEGORIES.length} قسم فرعي`;

    // 3. Seed governorates
    const { error: govError } = await adminClient
      .from("governorates")
      .upsert(GOVERNORATES, { onConflict: "id" });
    results.governorates = govError
      ? `خطأ: ${govError.message}`
      : `تم إضافة ${GOVERNORATES.length} محافظة`;

    // 4. Seed cities
    const { error: cityError } = await adminClient
      .from("cities")
      .upsert(CITIES, { onConflict: "id", ignoreDuplicates: true });
    results.cities = cityError
      ? `خطأ: ${cityError.message}`
      : `تم إضافة ${CITIES.length} مدينة`;

    const hasErrors = Object.values(results).some((r) => r.startsWith("خطأ"));

    return NextResponse.json(
      {
        success: !hasErrors,
        message: hasErrors
          ? "حصلت بعض الأخطاء أثناء التهيئة"
          : "تم تهيئة قاعدة البيانات بنجاح! 🎉",
        results,
      },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "حصل خطأ غير متوقع",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// Also support GET for easy browser-based seeding
export async function GET(request: Request) {
  return POST(request);
}

// ── Seed Data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "cars", name: "السيارات", icon: "🚗", slug: "cars", sort_order: 1, is_active: true },
  { id: "real_estate", name: "العقارات", icon: "🏠", slug: "real-estate", sort_order: 2, is_active: true },
  { id: "phones", name: "الموبايلات والتابلت", icon: "📱", slug: "phones", sort_order: 3, is_active: true },
  { id: "fashion", name: "الموضة", icon: "👗", slug: "fashion", sort_order: 4, is_active: true },
  { id: "scrap", name: "الخردة", icon: "♻️", slug: "scrap", sort_order: 5, is_active: true },
  { id: "gold", name: "الذهب والفضة", icon: "💰", slug: "gold", sort_order: 6, is_active: true },
  { id: "luxury", name: "السلع الفاخرة", icon: "💎", slug: "luxury", sort_order: 7, is_active: true },
  { id: "appliances", name: "الأجهزة المنزلية", icon: "🏠", slug: "appliances", sort_order: 8, is_active: true },
  { id: "furniture", name: "الأثاث والديكور", icon: "🪑", slug: "furniture", sort_order: 9, is_active: true },
  { id: "hobbies", name: "الهوايات", icon: "🎮", slug: "hobbies", sort_order: 10, is_active: true },
  { id: "tools", name: "العدد والأدوات", icon: "🔧", slug: "tools", sort_order: 11, is_active: true },
  { id: "services", name: "الخدمات", icon: "🛠️", slug: "services", sort_order: 12, is_active: true },
];

const SUBCATEGORIES = [
  // Cars
  { id: "cars_passenger", category_id: "cars", name: "سيارات ملاكي", slug: "passenger", sort_order: 1, is_active: true },
  { id: "cars_microbus", category_id: "cars", name: "ميكروباص", slug: "microbus", sort_order: 2, is_active: true },
  { id: "cars_trucks", category_id: "cars", name: "نقل", slug: "trucks", sort_order: 3, is_active: true },
  { id: "cars_motorcycles", category_id: "cars", name: "موتوسيكلات", slug: "motorcycles", sort_order: 4, is_active: true },
  { id: "cars_parts", category_id: "cars", name: "قطع غيار", slug: "car-parts", sort_order: 5, is_active: true },
  // Real Estate
  { id: "re_apartments_sale", category_id: "real_estate", name: "شقق للبيع", slug: "apartments-sale", sort_order: 1, is_active: true },
  { id: "re_apartments_rent", category_id: "real_estate", name: "شقق للإيجار", slug: "apartments-rent", sort_order: 2, is_active: true },
  { id: "re_villas", category_id: "real_estate", name: "فيلات", slug: "villas", sort_order: 3, is_active: true },
  { id: "re_land", category_id: "real_estate", name: "أراضي", slug: "land", sort_order: 4, is_active: true },
  { id: "re_commercial", category_id: "real_estate", name: "محلات تجارية", slug: "commercial", sort_order: 5, is_active: true },
  { id: "re_offices", category_id: "real_estate", name: "مكاتب", slug: "offices", sort_order: 6, is_active: true },
  // Phones
  { id: "phones_mobile", category_id: "phones", name: "موبايلات", slug: "mobile", sort_order: 1, is_active: true },
  { id: "phones_tablet", category_id: "phones", name: "تابلت", slug: "tablet", sort_order: 2, is_active: true },
  { id: "phones_accessories", category_id: "phones", name: "إكسسوارات", slug: "phone-accessories", sort_order: 3, is_active: true },
  { id: "phones_parts", category_id: "phones", name: "قطع غيار", slug: "phone-parts", sort_order: 4, is_active: true },
  // Fashion
  { id: "fashion_men", category_id: "fashion", name: "ملابس رجالي", slug: "men", sort_order: 1, is_active: true },
  { id: "fashion_women", category_id: "fashion", name: "ملابس حريمي", slug: "women", sort_order: 2, is_active: true },
  { id: "fashion_kids", category_id: "fashion", name: "ملابس أطفال", slug: "kids", sort_order: 3, is_active: true },
  { id: "fashion_shoes", category_id: "fashion", name: "أحذية", slug: "shoes", sort_order: 4, is_active: true },
  { id: "fashion_bags", category_id: "fashion", name: "شنط", slug: "bags", sort_order: 5, is_active: true },
  { id: "fashion_accessories", category_id: "fashion", name: "إكسسوارات", slug: "fashion-accessories", sort_order: 6, is_active: true },
  // Scrap
  { id: "scrap_iron", category_id: "scrap", name: "حديد", slug: "iron", sort_order: 1, is_active: true },
  { id: "scrap_aluminum", category_id: "scrap", name: "ألومنيوم", slug: "aluminum", sort_order: 2, is_active: true },
  { id: "scrap_copper", category_id: "scrap", name: "نحاس", slug: "copper", sort_order: 3, is_active: true },
  { id: "scrap_plastic", category_id: "scrap", name: "بلاستيك", slug: "plastic", sort_order: 4, is_active: true },
  { id: "scrap_paper", category_id: "scrap", name: "ورق", slug: "paper", sort_order: 5, is_active: true },
  { id: "scrap_old_devices", category_id: "scrap", name: "أجهزة قديمة", slug: "old-devices", sort_order: 6, is_active: true },
  { id: "scrap_construction", category_id: "scrap", name: "مخلفات بناء", slug: "construction", sort_order: 7, is_active: true },
  { id: "scrap_other", category_id: "scrap", name: "أخرى", slug: "scrap-other", sort_order: 8, is_active: true },
  // Gold
  { id: "gold_items", category_id: "gold", name: "ذهب", slug: "gold-items", sort_order: 1, is_active: true },
  { id: "gold_silver", category_id: "gold", name: "فضة", slug: "silver", sort_order: 2, is_active: true },
  { id: "gold_diamond", category_id: "gold", name: "ألماس", slug: "diamond", sort_order: 3, is_active: true },
  { id: "gold_precious_watch", category_id: "gold", name: "ساعات ثمينة", slug: "precious-watches", sort_order: 4, is_active: true },
  // Luxury
  { id: "luxury_bags", category_id: "luxury", name: "شنط فاخرة", slug: "luxury-bags", sort_order: 1, is_active: true },
  { id: "luxury_sunglasses", category_id: "luxury", name: "نظارات", slug: "sunglasses", sort_order: 2, is_active: true },
  { id: "luxury_watches", category_id: "luxury", name: "ساعات", slug: "watches", sort_order: 3, is_active: true },
  { id: "luxury_perfumes", category_id: "luxury", name: "عطور", slug: "perfumes", sort_order: 4, is_active: true },
  { id: "luxury_pens", category_id: "luxury", name: "أقلام", slug: "pens", sort_order: 5, is_active: true },
  // Appliances
  { id: "app_washers", category_id: "appliances", name: "غسالات", slug: "washers", sort_order: 1, is_active: true },
  { id: "app_fridges", category_id: "appliances", name: "ثلاجات", slug: "fridges", sort_order: 2, is_active: true },
  { id: "app_cookers", category_id: "appliances", name: "بوتاجازات", slug: "cookers", sort_order: 3, is_active: true },
  { id: "app_ac", category_id: "appliances", name: "مكيفات", slug: "ac", sort_order: 4, is_active: true },
  { id: "app_heaters", category_id: "appliances", name: "سخانات", slug: "heaters", sort_order: 5, is_active: true },
  { id: "app_small", category_id: "appliances", name: "أجهزة صغيرة", slug: "small-appliances", sort_order: 6, is_active: true },
  // Furniture
  { id: "furn_bedroom", category_id: "furniture", name: "غرف نوم", slug: "bedroom", sort_order: 1, is_active: true },
  { id: "furn_dining", category_id: "furniture", name: "سفرة", slug: "dining", sort_order: 2, is_active: true },
  { id: "furn_living", category_id: "furniture", name: "أنتريه", slug: "living", sort_order: 3, is_active: true },
  { id: "furn_kitchen", category_id: "furniture", name: "مطابخ", slug: "kitchen", sort_order: 4, is_active: true },
  { id: "furn_decor", category_id: "furniture", name: "ديكورات", slug: "decor", sort_order: 5, is_active: true },
  { id: "furn_lighting", category_id: "furniture", name: "إضاءة", slug: "lighting", sort_order: 6, is_active: true },
  { id: "furn_carpets", category_id: "furniture", name: "سجاد", slug: "carpets", sort_order: 7, is_active: true },
  { id: "furn_other", category_id: "furniture", name: "أخرى", slug: "furniture-other", sort_order: 8, is_active: true },
  // Hobbies
  { id: "hobby_music", category_id: "hobbies", name: "آلات موسيقية", slug: "music", sort_order: 1, is_active: true },
  { id: "hobby_sports", category_id: "hobbies", name: "معدات رياضية", slug: "sports", sort_order: 2, is_active: true },
  { id: "hobby_gaming", category_id: "hobbies", name: "ألعاب فيديو", slug: "gaming", sort_order: 3, is_active: true },
  { id: "hobby_books", category_id: "hobbies", name: "كتب", slug: "books", sort_order: 4, is_active: true },
  { id: "hobby_cameras", category_id: "hobbies", name: "كاميرات", slug: "cameras", sort_order: 5, is_active: true },
  { id: "hobby_bikes", category_id: "hobbies", name: "دراجات", slug: "bikes", sort_order: 6, is_active: true },
  { id: "hobby_antiques", category_id: "hobbies", name: "تحف وأنتيكات", slug: "antiques", sort_order: 7, is_active: true },
  { id: "hobby_pets", category_id: "hobbies", name: "حيوانات أليفة", slug: "pets", sort_order: 8, is_active: true },
  // Tools
  { id: "tools_hand", category_id: "tools", name: "عدد يدوية", slug: "hand-tools", sort_order: 1, is_active: true },
  { id: "tools_power", category_id: "tools", name: "عدد كهربائية", slug: "power-tools", sort_order: 2, is_active: true },
  { id: "tools_workshop", category_id: "tools", name: "معدات ورش", slug: "workshop", sort_order: 3, is_active: true },
  { id: "tools_agricultural", category_id: "tools", name: "معدات زراعية", slug: "agricultural", sort_order: 4, is_active: true },
  { id: "tools_restaurant", category_id: "tools", name: "معدات مطاعم", slug: "restaurant-equipment", sort_order: 5, is_active: true },
  // Services
  { id: "svc_plumbing", category_id: "services", name: "سباكة", slug: "plumbing", sort_order: 1, is_active: true },
  { id: "svc_electrical", category_id: "services", name: "كهرباء", slug: "electrical", sort_order: 2, is_active: true },
  { id: "svc_painting", category_id: "services", name: "نقاشة", slug: "painting", sort_order: 3, is_active: true },
  { id: "svc_carpentry", category_id: "services", name: "نجارة", slug: "carpentry", sort_order: 4, is_active: true },
  { id: "svc_device_repair", category_id: "services", name: "صيانة أجهزة", slug: "device-repair", sort_order: 5, is_active: true },
  { id: "svc_moving", category_id: "services", name: "نقل أثاث", slug: "moving", sort_order: 6, is_active: true },
  { id: "svc_cleaning", category_id: "services", name: "تنظيف", slug: "cleaning", sort_order: 7, is_active: true },
  { id: "svc_tech", category_id: "services", name: "خدمات تقنية", slug: "tech", sort_order: 8, is_active: true },
  { id: "svc_tutoring", category_id: "services", name: "دروس خصوصية", slug: "tutoring", sort_order: 9, is_active: true },
  { id: "svc_other", category_id: "services", name: "خدمات أخرى", slug: "services-other", sort_order: 10, is_active: true },
];

const GOVERNORATES = [
  { id: 1, name: "القاهرة", name_en: "Cairo" },
  { id: 2, name: "الجيزة", name_en: "Giza" },
  { id: 3, name: "الإسكندرية", name_en: "Alexandria" },
  { id: 4, name: "القليوبية", name_en: "Qalyubia" },
  { id: 5, name: "الشرقية", name_en: "Sharqia" },
  { id: 6, name: "الدقهلية", name_en: "Dakahlia" },
  { id: 7, name: "البحيرة", name_en: "Beheira" },
  { id: 8, name: "الغربية", name_en: "Gharbia" },
  { id: 9, name: "المنوفية", name_en: "Monufia" },
  { id: 10, name: "كفر الشيخ", name_en: "Kafr El Sheikh" },
  { id: 11, name: "دمياط", name_en: "Damietta" },
  { id: 12, name: "بورسعيد", name_en: "Port Said" },
  { id: 13, name: "الإسماعيلية", name_en: "Ismailia" },
  { id: 14, name: "السويس", name_en: "Suez" },
  { id: 15, name: "شمال سيناء", name_en: "North Sinai" },
  { id: 16, name: "جنوب سيناء", name_en: "South Sinai" },
  { id: 17, name: "الفيوم", name_en: "Fayoum" },
  { id: 18, name: "بني سويف", name_en: "Beni Suef" },
  { id: 19, name: "المنيا", name_en: "Minya" },
  { id: 20, name: "أسيوط", name_en: "Asyut" },
  { id: 21, name: "سوهاج", name_en: "Sohag" },
  { id: 22, name: "قنا", name_en: "Qena" },
  { id: 23, name: "الأقصر", name_en: "Luxor" },
  { id: 24, name: "أسوان", name_en: "Aswan" },
  { id: 25, name: "البحر الأحمر", name_en: "Red Sea" },
  { id: 26, name: "الوادي الجديد", name_en: "New Valley" },
  { id: 27, name: "مطروح", name_en: "Matrouh" },
];

const CITIES = [
  // Cairo
  { governorate_id: 1, name: "مدينة نصر", name_en: "Nasr City" },
  { governorate_id: 1, name: "مصر الجديدة", name_en: "Heliopolis" },
  { governorate_id: 1, name: "المعادي", name_en: "Maadi" },
  { governorate_id: 1, name: "التجمع الخامس", name_en: "Fifth Settlement" },
  { governorate_id: 1, name: "الشروق", name_en: "El Shorouk" },
  { governorate_id: 1, name: "بدر", name_en: "Badr" },
  { governorate_id: 1, name: "العبور", name_en: "El Obour" },
  { governorate_id: 1, name: "شبرا", name_en: "Shubra" },
  { governorate_id: 1, name: "عين شمس", name_en: "Ain Shams" },
  { governorate_id: 1, name: "المطرية", name_en: "El Matariya" },
  { governorate_id: 1, name: "حلوان", name_en: "Helwan" },
  { governorate_id: 1, name: "المقطم", name_en: "Mokattam" },
  { governorate_id: 1, name: "وسط البلد", name_en: "Downtown" },
  { governorate_id: 1, name: "الزمالك", name_en: "Zamalek" },
  { governorate_id: 1, name: "المنيل", name_en: "El Manial" },
  { governorate_id: 1, name: "السيدة زينب", name_en: "Sayeda Zeinab" },
  { governorate_id: 1, name: "الدرب الأحمر", name_en: "El Darb El Ahmar" },
  { governorate_id: 1, name: "العاشر من رمضان", name_en: "10th of Ramadan" },
  { governorate_id: 1, name: "القاهرة الجديدة", name_en: "New Cairo" },
  // Giza
  { governorate_id: 2, name: "الدقي", name_en: "Dokki" },
  { governorate_id: 2, name: "المهندسين", name_en: "Mohandessin" },
  { governorate_id: 2, name: "العجوزة", name_en: "Agouza" },
  { governorate_id: 2, name: "الهرم", name_en: "Haram" },
  { governorate_id: 2, name: "فيصل", name_en: "Faisal" },
  { governorate_id: 2, name: "الشيخ زايد", name_en: "Sheikh Zayed" },
  { governorate_id: 2, name: "السادس من أكتوبر", name_en: "6th of October" },
  { governorate_id: 2, name: "حدائق الأهرام", name_en: "Hadayek El Ahram" },
  { governorate_id: 2, name: "البدرشين", name_en: "El Badrasheen" },
  { governorate_id: 2, name: "العياط", name_en: "El Ayat" },
  { governorate_id: 2, name: "أبو النمرس", name_en: "Abu El Nomros" },
  { governorate_id: 2, name: "الحوامدية", name_en: "El Hawamdiya" },
  { governorate_id: 2, name: "أوسيم", name_en: "Ausim" },
  { governorate_id: 2, name: "كرداسة", name_en: "Kerdasa" },
  // Alexandria
  { governorate_id: 3, name: "سموحة", name_en: "Smouha" },
  { governorate_id: 3, name: "سيدي جابر", name_en: "Sidi Gaber" },
  { governorate_id: 3, name: "المنتزه", name_en: "El Montaza" },
  { governorate_id: 3, name: "المعمورة", name_en: "El Maamoura" },
  { governorate_id: 3, name: "ستانلي", name_en: "Stanley" },
  { governorate_id: 3, name: "العجمي", name_en: "El Agami" },
  { governorate_id: 3, name: "المندرة", name_en: "El Mandara" },
  { governorate_id: 3, name: "محرم بك", name_en: "Moharam Bek" },
  { governorate_id: 3, name: "العصافرة", name_en: "El Asafra" },
  { governorate_id: 3, name: "الإبراهيمية", name_en: "El Ibrahimiya" },
  { governorate_id: 3, name: "كفر عبده", name_en: "Kafr Abdo" },
  { governorate_id: 3, name: "بحري", name_en: "Bahary" },
  { governorate_id: 3, name: "العامرية", name_en: "El Ameriya" },
  { governorate_id: 3, name: "برج العرب", name_en: "Borg El Arab" },
  // Qalyubia
  { governorate_id: 4, name: "بنها", name_en: "Banha" },
  { governorate_id: 4, name: "شبرا الخيمة", name_en: "Shubra El Kheima" },
  { governorate_id: 4, name: "قليوب", name_en: "Qalyub" },
  { governorate_id: 4, name: "القناطر الخيرية", name_en: "El Qanater El Khayriya" },
  { governorate_id: 4, name: "الخانكة", name_en: "El Khanka" },
  { governorate_id: 4, name: "كفر شكر", name_en: "Kafr Shokr" },
  { governorate_id: 4, name: "طوخ", name_en: "Tukh" },
  { governorate_id: 4, name: "قها", name_en: "Qaha" },
  // Sharqia
  { governorate_id: 5, name: "الزقازيق", name_en: "Zagazig" },
  { governorate_id: 5, name: "العاشر من رمضان", name_en: "10th of Ramadan" },
  { governorate_id: 5, name: "بلبيس", name_en: "Belbeis" },
  { governorate_id: 5, name: "منيا القمح", name_en: "Minya El Qamh" },
  { governorate_id: 5, name: "أبو حماد", name_en: "Abu Hammad" },
  { governorate_id: 5, name: "فاقوس", name_en: "Faqous" },
  { governorate_id: 5, name: "ههيا", name_en: "Hihya" },
  { governorate_id: 5, name: "ديرب نجم", name_en: "Diarb Negm" },
  { governorate_id: 5, name: "أبو كبير", name_en: "Abu Kebir" },
  { governorate_id: 5, name: "كفر صقر", name_en: "Kafr Saqr" },
  // Dakahlia
  { governorate_id: 6, name: "المنصورة", name_en: "Mansoura" },
  { governorate_id: 6, name: "طلخا", name_en: "Talkha" },
  { governorate_id: 6, name: "ميت غمر", name_en: "Mit Ghamr" },
  { governorate_id: 6, name: "دكرنس", name_en: "Dikirnis" },
  { governorate_id: 6, name: "أجا", name_en: "Aga" },
  { governorate_id: 6, name: "السنبلاوين", name_en: "El Sinbellawin" },
  { governorate_id: 6, name: "شربين", name_en: "Sherbin" },
  { governorate_id: 6, name: "المنزلة", name_en: "El Manzala" },
  { governorate_id: 6, name: "بلقاس", name_en: "Belqas" },
  { governorate_id: 6, name: "نبروه", name_en: "Nabaroh" },
  // Beheira
  { governorate_id: 7, name: "دمنهور", name_en: "Damanhour" },
  { governorate_id: 7, name: "كفر الدوار", name_en: "Kafr El Dawar" },
  { governorate_id: 7, name: "رشيد", name_en: "Rashid" },
  { governorate_id: 7, name: "إدكو", name_en: "Edku" },
  { governorate_id: 7, name: "أبو المطامير", name_en: "Abu El Matamir" },
  { governorate_id: 7, name: "حوش عيسى", name_en: "Hosh Eisa" },
  { governorate_id: 7, name: "إيتاي البارود", name_en: "Itay El Barud" },
  { governorate_id: 7, name: "شبراخيت", name_en: "Shubrakheit" },
  // Gharbia
  { governorate_id: 8, name: "طنطا", name_en: "Tanta" },
  { governorate_id: 8, name: "المحلة الكبرى", name_en: "El Mahalla El Kubra" },
  { governorate_id: 8, name: "كفر الزيات", name_en: "Kafr El Zayat" },
  { governorate_id: 8, name: "زفتى", name_en: "Zifta" },
  { governorate_id: 8, name: "السنطة", name_en: "El Santa" },
  { governorate_id: 8, name: "سمنود", name_en: "Samannoud" },
  { governorate_id: 8, name: "بسيون", name_en: "Basyoun" },
  { governorate_id: 8, name: "قطور", name_en: "Qutur" },
  // Monufia
  { governorate_id: 9, name: "شبين الكوم", name_en: "Shibin El Kom" },
  { governorate_id: 9, name: "منوف", name_en: "Menouf" },
  { governorate_id: 9, name: "السادات", name_en: "El Sadat" },
  { governorate_id: 9, name: "أشمون", name_en: "Ashmoun" },
  { governorate_id: 9, name: "الباجور", name_en: "El Bagour" },
  { governorate_id: 9, name: "قويسنا", name_en: "Quesna" },
  { governorate_id: 9, name: "بركة السبع", name_en: "Berket El Sabaa" },
  { governorate_id: 9, name: "تلا", name_en: "Tala" },
  // Kafr El Sheikh
  { governorate_id: 10, name: "كفر الشيخ", name_en: "Kafr El Sheikh" },
  { governorate_id: 10, name: "دسوق", name_en: "Desouk" },
  { governorate_id: 10, name: "فوه", name_en: "Fuwwah" },
  { governorate_id: 10, name: "بيلا", name_en: "Billa" },
  { governorate_id: 10, name: "الحامول", name_en: "El Hamoul" },
  { governorate_id: 10, name: "سيدي سالم", name_en: "Sidi Salem" },
  { governorate_id: 10, name: "البرلس", name_en: "El Burullus" },
  { governorate_id: 10, name: "مطوبس", name_en: "Mutubas" },
  // Damietta
  { governorate_id: 11, name: "دمياط", name_en: "Damietta" },
  { governorate_id: 11, name: "دمياط الجديدة", name_en: "New Damietta" },
  { governorate_id: 11, name: "رأس البر", name_en: "Ras El Bar" },
  { governorate_id: 11, name: "فارسكور", name_en: "Faraskour" },
  { governorate_id: 11, name: "كفر سعد", name_en: "Kafr Saad" },
  { governorate_id: 11, name: "الزرقا", name_en: "El Zarqa" },
  // Port Said
  { governorate_id: 12, name: "بورسعيد", name_en: "Port Said" },
  { governorate_id: 12, name: "بورفؤاد", name_en: "Port Fouad" },
  { governorate_id: 12, name: "العرب", name_en: "El Arab" },
  { governorate_id: 12, name: "الزهور", name_en: "El Zohour" },
  { governorate_id: 12, name: "الضواحي", name_en: "El Dawahy" },
  // Ismailia
  { governorate_id: 13, name: "الإسماعيلية", name_en: "Ismailia" },
  { governorate_id: 13, name: "فايد", name_en: "Fayed" },
  { governorate_id: 13, name: "القنطرة شرق", name_en: "El Qantara Sharq" },
  { governorate_id: 13, name: "القنطرة غرب", name_en: "El Qantara Gharb" },
  { governorate_id: 13, name: "التل الكبير", name_en: "El Tal El Kebir" },
  { governorate_id: 13, name: "أبو صوير", name_en: "Abu Suweir" },
  // Suez
  { governorate_id: 14, name: "السويس", name_en: "Suez" },
  { governorate_id: 14, name: "الأربعين", name_en: "El Arbaeen" },
  { governorate_id: 14, name: "عتاقة", name_en: "Ataka" },
  { governorate_id: 14, name: "فيصل", name_en: "Faisal" },
  { governorate_id: 14, name: "الجناين", name_en: "El Ganayen" },
  // North Sinai
  { governorate_id: 15, name: "العريش", name_en: "El Arish" },
  { governorate_id: 15, name: "الشيخ زويد", name_en: "Sheikh Zuweid" },
  { governorate_id: 15, name: "رفح", name_en: "Rafah" },
  { governorate_id: 15, name: "بئر العبد", name_en: "Bir El Abd" },
  { governorate_id: 15, name: "الحسنة", name_en: "El Hasana" },
  { governorate_id: 15, name: "نخل", name_en: "Nakhl" },
  // South Sinai
  { governorate_id: 16, name: "الطور", name_en: "El Tur" },
  { governorate_id: 16, name: "شرم الشيخ", name_en: "Sharm El Sheikh" },
  { governorate_id: 16, name: "دهب", name_en: "Dahab" },
  { governorate_id: 16, name: "نويبع", name_en: "Nuweiba" },
  { governorate_id: 16, name: "طابا", name_en: "Taba" },
  { governorate_id: 16, name: "سانت كاترين", name_en: "Saint Catherine" },
  // Fayoum
  { governorate_id: 17, name: "الفيوم", name_en: "Fayoum" },
  { governorate_id: 17, name: "الفيوم الجديدة", name_en: "New Fayoum" },
  { governorate_id: 17, name: "إبشواي", name_en: "Ibsheway" },
  { governorate_id: 17, name: "طامية", name_en: "Tamiya" },
  { governorate_id: 17, name: "سنورس", name_en: "Sennoures" },
  { governorate_id: 17, name: "إطسا", name_en: "Itsa" },
  { governorate_id: 17, name: "يوسف الصديق", name_en: "Yusuf El Siddiq" },
  // Beni Suef
  { governorate_id: 18, name: "بني سويف", name_en: "Beni Suef" },
  { governorate_id: 18, name: "بني سويف الجديدة", name_en: "New Beni Suef" },
  { governorate_id: 18, name: "الواسطى", name_en: "El Wasta" },
  { governorate_id: 18, name: "ناصر", name_en: "Nasser" },
  { governorate_id: 18, name: "إهناسيا", name_en: "Ihnasya" },
  { governorate_id: 18, name: "ببا", name_en: "Beba" },
  { governorate_id: 18, name: "الفشن", name_en: "El Fashn" },
  // Minya
  { governorate_id: 19, name: "المنيا", name_en: "Minya" },
  { governorate_id: 19, name: "المنيا الجديدة", name_en: "New Minya" },
  { governorate_id: 19, name: "ملوي", name_en: "Mallawi" },
  { governorate_id: 19, name: "سمالوط", name_en: "Samalut" },
  { governorate_id: 19, name: "أبو قرقاص", name_en: "Abu Qurqas" },
  { governorate_id: 19, name: "مغاغة", name_en: "Maghagha" },
  { governorate_id: 19, name: "بني مزار", name_en: "Beni Mazar" },
  { governorate_id: 19, name: "ديرمواس", name_en: "Deir Mawas" },
  { governorate_id: 19, name: "العدوة", name_en: "El Edwa" },
  // Asyut
  { governorate_id: 20, name: "أسيوط", name_en: "Asyut" },
  { governorate_id: 20, name: "أسيوط الجديدة", name_en: "New Asyut" },
  { governorate_id: 20, name: "ديروط", name_en: "Dairut" },
  { governorate_id: 20, name: "القوصية", name_en: "El Qusiya" },
  { governorate_id: 20, name: "منفلوط", name_en: "Manfalut" },
  { governorate_id: 20, name: "أبنوب", name_en: "Abnoub" },
  { governorate_id: 20, name: "الفتح", name_en: "El Fath" },
  { governorate_id: 20, name: "ساحل سليم", name_en: "Sahel Selim" },
  { governorate_id: 20, name: "أبو تيج", name_en: "Abu Tig" },
  { governorate_id: 20, name: "الغنايم", name_en: "El Ghanayem" },
  { governorate_id: 20, name: "البداري", name_en: "El Badari" },
  // Sohag
  { governorate_id: 21, name: "سوهاج", name_en: "Sohag" },
  { governorate_id: 21, name: "سوهاج الجديدة", name_en: "New Sohag" },
  { governorate_id: 21, name: "أخميم", name_en: "Akhmim" },
  { governorate_id: 21, name: "جرجا", name_en: "Girga" },
  { governorate_id: 21, name: "طهطا", name_en: "Tahta" },
  { governorate_id: 21, name: "المراغة", name_en: "El Maragha" },
  { governorate_id: 21, name: "البلينا", name_en: "El Balyana" },
  { governorate_id: 21, name: "المنشأة", name_en: "El Monshaa" },
  { governorate_id: 21, name: "ساقلتة", name_en: "Saqulta" },
  { governorate_id: 21, name: "دار السلام", name_en: "Dar El Salam" },
  // Qena
  { governorate_id: 22, name: "قنا", name_en: "Qena" },
  { governorate_id: 22, name: "قنا الجديدة", name_en: "New Qena" },
  { governorate_id: 22, name: "نجع حمادي", name_en: "Nag Hammadi" },
  { governorate_id: 22, name: "دشنا", name_en: "Dishna" },
  { governorate_id: 22, name: "قفط", name_en: "Qift" },
  { governorate_id: 22, name: "قوص", name_en: "Qus" },
  { governorate_id: 22, name: "نقادة", name_en: "Naqada" },
  { governorate_id: 22, name: "فرشوط", name_en: "Farshut" },
  { governorate_id: 22, name: "أبو تشت", name_en: "Abu Tesht" },
  // Luxor
  { governorate_id: 23, name: "الأقصر", name_en: "Luxor" },
  { governorate_id: 23, name: "الأقصر الجديدة", name_en: "New Luxor" },
  { governorate_id: 23, name: "الطود", name_en: "El Tod" },
  { governorate_id: 23, name: "إسنا", name_en: "Esna" },
  { governorate_id: 23, name: "أرمنت", name_en: "Armant" },
  { governorate_id: 23, name: "البياضية", name_en: "El Bayadiya" },
  // Aswan
  { governorate_id: 24, name: "أسوان", name_en: "Aswan" },
  { governorate_id: 24, name: "أسوان الجديدة", name_en: "New Aswan" },
  { governorate_id: 24, name: "كوم أمبو", name_en: "Kom Ombo" },
  { governorate_id: 24, name: "إدفو", name_en: "Edfu" },
  { governorate_id: 24, name: "دراو", name_en: "Daraw" },
  { governorate_id: 24, name: "نصر النوبة", name_en: "Nasr El Nuba" },
  { governorate_id: 24, name: "أبو سمبل", name_en: "Abu Simbel" },
  // Red Sea
  { governorate_id: 25, name: "الغردقة", name_en: "Hurghada" },
  { governorate_id: 25, name: "سفاجا", name_en: "Safaga" },
  { governorate_id: 25, name: "القصير", name_en: "El Quseir" },
  { governorate_id: 25, name: "مرسى علم", name_en: "Marsa Alam" },
  { governorate_id: 25, name: "رأس غارب", name_en: "Ras Gharib" },
  { governorate_id: 25, name: "الجونة", name_en: "El Gouna" },
  // New Valley
  { governorate_id: 26, name: "الخارجة", name_en: "El Kharga" },
  { governorate_id: 26, name: "الداخلة", name_en: "El Dakhla" },
  { governorate_id: 26, name: "الفرافرة", name_en: "El Farafra" },
  { governorate_id: 26, name: "باريس", name_en: "Paris" },
  { governorate_id: 26, name: "بلاط", name_en: "Balat" },
  // Matrouh
  { governorate_id: 27, name: "مرسى مطروح", name_en: "Marsa Matrouh" },
  { governorate_id: 27, name: "العلمين", name_en: "El Alamein" },
  { governorate_id: 27, name: "العلمين الجديدة", name_en: "New Alamein" },
  { governorate_id: 27, name: "الحمام", name_en: "El Hammam" },
  { governorate_id: 27, name: "الضبعة", name_en: "El Dabaa" },
  { governorate_id: 27, name: "سيدي براني", name_en: "Sidi Barani" },
  { governorate_id: 27, name: "سيوة", name_en: "Siwa" },
  { governorate_id: 27, name: "الساحل الشمالي", name_en: "North Coast" },
];
