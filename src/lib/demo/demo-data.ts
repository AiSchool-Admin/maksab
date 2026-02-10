/**
 * Realistic demo ads for testing the app like an end user.
 * Covers all categories, sale types, and Egyptian locations.
 */

import type { MockAd } from "@/lib/mock-data";
import type { MockAdDetail, MockSeller } from "@/lib/mock-ad-detail";
import { DEMO_USER } from "./demo-mode";

// ── Demo Sellers ──────────────────────────────────────────────────────
const sellers: Record<string, MockSeller> = {
  ahmed: {
    id: "demo-user-01012345678",
    displayName: "أحمد محمد",
    phone: "01012345678",
    avatarUrl: null,
    memberSince: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
    totalAds: 5,
    rating: 4.7,
  },
  fatma: {
    id: "demo-seller-fatma",
    displayName: "فاطمة علي",
    phone: "01198765432",
    avatarUrl: null,
    memberSince: new Date(Date.now() - 180 * 24 * 3600000).toISOString(),
    totalAds: 12,
    rating: 4.9,
  },
  omar: {
    id: "demo-seller-omar",
    displayName: "عمر خالد",
    phone: "01087654321",
    avatarUrl: null,
    memberSince: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
    totalAds: 8,
    rating: 4.5,
  },
  nora: {
    id: "demo-seller-nora",
    displayName: "نورا محمود",
    phone: "01556789012",
    avatarUrl: null,
    memberSince: new Date(Date.now() - 120 * 24 * 3600000).toISOString(),
    totalAds: 15,
    rating: 4.8,
  },
  hassan: {
    id: "demo-seller-hassan",
    displayName: "حسن إبراهيم",
    phone: "01234567890",
    avatarUrl: null,
    memberSince: new Date(Date.now() - 200 * 24 * 3600000).toISOString(),
    totalAds: 22,
    rating: 4.6,
  },
};

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600000).toISOString();
}

// ── Demo Ads (MockAd format for feed/cards) ───────────────────────────
export const demoAds: MockAd[] = [
  // ── Cars ──
  {
    id: "demo-ad-car-1",
    title: "تويوتا كورولا 2020 — 45,000 كم",
    price: 350000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "مدينة نصر",
    createdAt: hoursAgo(3),
    isNegotiable: true,
  },
  {
    id: "demo-ad-car-2",
    title: "هيونداي توسان 2022 — 30,000 كم",
    price: 450000,
    saleType: "auction",
    image: null,
    governorate: "الجيزة",
    city: "6 أكتوبر",
    createdAt: hoursAgo(8),
    auctionHighestBid: 480000,
    auctionEndsAt: hoursFromNow(18),
    auctionBidsCount: 7,
  },
  {
    id: "demo-ad-car-3",
    title: "كيا سبورتاج 2019 — للتبديل بسيارة أصغر",
    price: null,
    saleType: "exchange",
    image: null,
    governorate: "الإسكندرية",
    city: "سموحة",
    createdAt: hoursAgo(12),
    exchangeDescription: "سيارة أصغر زي i10 أو بيكانتو",
  },

  // ── Phones ──
  {
    id: "demo-ad-phone-1",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    price: 42000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "المعادي",
    createdAt: hoursAgo(1),
    isNegotiable: false,
  },
  {
    id: "demo-ad-phone-2",
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    price: 38000,
    saleType: "auction",
    image: null,
    governorate: "الجيزة",
    city: "المهندسين",
    createdAt: hoursAgo(5),
    auctionHighestBid: 36500,
    auctionEndsAt: hoursFromNow(36),
    auctionBidsCount: 12,
  },
  {
    id: "demo-ad-phone-3",
    title: "آيفون 14 برو — 128GB — للتبديل بسامسونج",
    price: null,
    saleType: "exchange",
    image: null,
    governorate: "القاهرة",
    city: "مصر الجديدة",
    createdAt: hoursAgo(6),
    exchangeDescription: "سامسونج S24 أو S23 Ultra",
  },

  // ── Real Estate ──
  {
    id: "demo-ad-realestate-1",
    title: "شقة 150م² — 3 غرف — الطابق الخامس — سوبر لوكس",
    price: 2500000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "مدينة نصر",
    createdAt: hoursAgo(2),
    isNegotiable: true,
  },
  {
    id: "demo-ad-realestate-2",
    title: "شقة 120م² للإيجار — المهندسين — مفروشة",
    price: 12000,
    saleType: "cash",
    image: null,
    governorate: "الجيزة",
    city: "المهندسين",
    createdAt: hoursAgo(10),
    isNegotiable: true,
  },

  // ── Gold ──
  {
    id: "demo-ad-gold-1",
    title: "سلسلة ذهب عيار 21 — 15 جرام — جديدة",
    price: 75000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "وسط البلد",
    createdAt: hoursAgo(4),
    isNegotiable: false,
  },
  {
    id: "demo-ad-gold-2",
    title: "خاتم ذهب عيار 18 — 8 جرام — مع فص ألماس",
    price: 25000,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "التجمع الخامس",
    createdAt: hoursAgo(15),
    auctionHighestBid: 28000,
    auctionEndsAt: hoursFromNow(6),
    auctionBidsCount: 9,
  },

  // ── Fashion ──
  {
    id: "demo-ad-fashion-1",
    title: "جاكت جلد رجالي — Zara — مقاس L — جديد بالتاج",
    price: 1800,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "مصر الجديدة",
    createdAt: hoursAgo(7),
    isNegotiable: true,
  },
  {
    id: "demo-ad-fashion-2",
    title: "شنطة Michael Kors أصلية — مستعملة ممتاز",
    price: 3500,
    saleType: "cash",
    image: null,
    governorate: "الإسكندرية",
    city: "سيدي جابر",
    createdAt: hoursAgo(20),
    isNegotiable: false,
  },

  // ── Home Appliances ──
  {
    id: "demo-ad-appliance-1",
    title: "غسالة توشيبا 10 كيلو — 2023 — مستعملة ممتاز",
    price: 8500,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "حلوان",
    createdAt: hoursAgo(14),
    auctionHighestBid: 7200,
    auctionEndsAt: hoursFromNow(48),
    auctionBidsCount: 4,
  },
  {
    id: "demo-ad-appliance-2",
    title: "ثلاجة شارب 16 قدم — نوفروست — 2022",
    price: 15000,
    saleType: "cash",
    image: null,
    governorate: "الدقهلية",
    city: "المنصورة",
    createdAt: hoursAgo(9),
    isNegotiable: true,
  },

  // ── Furniture ──
  {
    id: "demo-ad-furniture-1",
    title: "غرفة نوم خشب زان — 7 قطع — مستعملة ممتاز",
    price: 35000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "شبرا",
    createdAt: hoursAgo(11),
    isNegotiable: true,
  },

  // ── Scrap ──
  {
    id: "demo-ad-scrap-1",
    title: "حديد خردة — 500 كجم — نظيف",
    price: 25000,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: "15 مايو",
    createdAt: hoursAgo(16),
    isNegotiable: true,
  },

  // ── Luxury ──
  {
    id: "demo-ad-luxury-1",
    title: "ساعة Rolex Submariner — أصلي بالضمان",
    price: 850000,
    saleType: "auction",
    image: null,
    governorate: "القاهرة",
    city: "الزمالك",
    createdAt: hoursAgo(24),
    auctionHighestBid: 920000,
    auctionEndsAt: hoursFromNow(12),
    auctionBidsCount: 15,
  },

  // ── Hobbies ──
  {
    id: "demo-ad-hobby-1",
    title: "بلايستيشن 5 — مستعمل ممتاز — مع 2 يد و 5 ألعاب",
    price: 22000,
    saleType: "cash",
    image: null,
    governorate: "الغربية",
    city: "طنطا",
    createdAt: hoursAgo(13),
    isNegotiable: true,
  },

  // ── Tools ──
  {
    id: "demo-ad-tool-1",
    title: "شنيور بوش كهرباء — مستعمل يعمل",
    price: 2500,
    saleType: "cash",
    image: null,
    governorate: "القليوبية",
    city: "بنها",
    createdAt: hoursAgo(30),
    isNegotiable: false,
  },

  // ── Services ──
  {
    id: "demo-ad-service-1",
    title: "سباك خبرة 5+ سنوات — بالمشروع — القاهرة والجيزة",
    price: null,
    saleType: "cash",
    image: null,
    governorate: "القاهرة",
    city: null,
    createdAt: hoursAgo(18),
  },
];

// ── Full Ad Details (for ad detail page) ──────────────────────────────
const detailsMap: Record<string, Omit<MockAdDetail, "id">> = {
  "demo-ad-car-1": {
    title: "تويوتا كورولا 2020 — 45,000 كم",
    description: "سيارة تويوتا كورولا موديل 2020، مسافة 45,000 كم، أوتوماتيك، بنزين، لون أبيض، مُرخصة. السيارة بحالة ممتازة، صيانة دورية من التوكيل. بدون حوادث. الفحص مسموح.",
    price: 350000,
    saleType: "cash",
    isNegotiable: true,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "toyota", model: "corolla", year: "2020", mileage: "45000",
      color: "white", fuel: "petrol", transmission: "automatic", engine_cc: "1600",
      condition: "used", licensed: true,
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    viewsCount: 245,
    favoritesCount: 18,
    createdAt: hoursAgo(3),
    auctionStartPrice: null,
    auctionBuyNowPrice: null,
    auctionEndsAt: null,
    auctionHighestBid: null,
    auctionHighestBidderId: null,
    auctionHighestBidderName: null,
    auctionBidsCount: 0,
    auctionMinIncrement: 50,
    auctionStatus: null,
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: [],
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: sellers.ahmed,
    isFavorited: false,
  },
  "demo-ad-car-2": {
    title: "هيونداي توسان 2022 — 30,000 كم",
    description: "هيونداي توسان موديل 2022، ماشية 30,000 كم بس. فول اوبشن، جلد، سقف بانوراما، كاميرا خلفية. السيارة نضيفة جداً.",
    price: 450000,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "hyundai", model: "tucson", year: "2022", mileage: "30000",
      color: "gray", fuel: "petrol", transmission: "automatic", engine_cc: "1600",
      condition: "used", licensed: true,
    },
    governorate: "الجيزة",
    city: "6 أكتوبر",
    viewsCount: 520,
    favoritesCount: 35,
    createdAt: hoursAgo(8),
    auctionStartPrice: 400000,
    auctionBuyNowPrice: 550000,
    auctionEndsAt: hoursFromNow(18),
    auctionHighestBid: 480000,
    auctionHighestBidderId: "demo-seller-omar",
    auctionHighestBidderName: "عمر خالد",
    auctionBidsCount: 7,
    auctionMinIncrement: 10000,
    auctionStatus: "active",
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: [
      { id: "demo-bid-1", bidderName: "عمر خالد", amount: 480000, createdAt: hoursAgo(1) },
      { id: "demo-bid-2", bidderName: "سارة أحمد", amount: 470000, createdAt: hoursAgo(2) },
      { id: "demo-bid-3", bidderName: "محمود حسن", amount: 460000, createdAt: hoursAgo(4) },
      { id: "demo-bid-4", bidderName: "ياسر علي", amount: 450000, createdAt: hoursAgo(5) },
      { id: "demo-bid-5", bidderName: "كريم سعيد", amount: 440000, createdAt: hoursAgo(6) },
      { id: "demo-bid-6", bidderName: "عمر خالد", amount: 420000, createdAt: hoursAgo(7) },
      { id: "demo-bid-7", bidderName: "سارة أحمد", amount: 410000, createdAt: hoursAgo(7.5) },
    ],
    exchangeDescription: null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller: sellers.fatma,
    isFavorited: false,
  },
  "demo-ad-car-3": {
    title: "كيا سبورتاج 2019 — للتبديل بسيارة أصغر",
    description: "كيا سبورتاج 2019، حالة ممتازة، ماشية 60,000 كم. عايز أبدّلها بسيارة أصغر زي هيونداي i10 أو كيا بيكانتو. ممكن فرق سعر بسيط.",
    price: null,
    saleType: "exchange",
    isNegotiable: false,
    images: [],
    categoryId: "cars",
    subcategoryId: "passenger",
    categoryFields: {
      brand: "kia", model: "sportage", year: "2019", mileage: "60000",
      color: "silver", fuel: "petrol", transmission: "automatic",
      condition: "used", licensed: true,
    },
    governorate: "الإسكندرية",
    city: "سموحة",
    viewsCount: 180,
    favoritesCount: 12,
    createdAt: hoursAgo(12),
    auctionStartPrice: null, auctionBuyNowPrice: null, auctionEndsAt: null,
    auctionHighestBid: null, auctionHighestBidderId: null, auctionHighestBidderName: null,
    auctionBidsCount: 0, auctionMinIncrement: 50, auctionStatus: null,
    auctionWinnerId: null, auctionWinnerName: null, bids: [],
    exchangeDescription: "سيارة أصغر زي i10 أو بيكانتو",
    exchangeAcceptsPriceDiff: true,
    exchangePriceDiff: 50000,
    seller: sellers.hassan,
    isFavorited: false,
  },
  "demo-ad-phone-1": {
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    description: "آيفون 15 برو ماكس، 256 جيجا، لون تيتانيوم أسود. مستعمل شهر واحد بس. البطارية 100%. مع العلبة والشاحن والكفر الأصلي. الضمان لسه ساري.",
    price: 42000,
    saleType: "cash",
    isNegotiable: false,
    images: [],
    categoryId: "phones",
    subcategoryId: "mobile",
    categoryFields: {
      brand: "apple", model: "iphone-15-pro-max", storage: "256GB",
      condition: "used_like_new", color: "black", ram: "8GB",
      battery_health: "excellent", with_box: true, with_warranty: true,
    },
    governorate: "القاهرة",
    city: "المعادي",
    viewsCount: 890,
    favoritesCount: 42,
    createdAt: hoursAgo(1),
    auctionStartPrice: null, auctionBuyNowPrice: null, auctionEndsAt: null,
    auctionHighestBid: null, auctionHighestBidderId: null, auctionHighestBidderName: null,
    auctionBidsCount: 0, auctionMinIncrement: 50, auctionStatus: null,
    auctionWinnerId: null, auctionWinnerName: null, bids: [],
    exchangeDescription: null, exchangeAcceptsPriceDiff: false, exchangePriceDiff: null,
    seller: sellers.nora,
    isFavorited: false,
  },
  "demo-ad-phone-2": {
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    description: "سامسونج جالاكسي S24 الترا، 512 جيجا، جديد متبرشم. اللون تيتانيوم فايوليت. ضمان سنتين من سامسونج مصر.",
    price: 38000,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "phones",
    subcategoryId: "mobile",
    categoryFields: {
      brand: "samsung", model: "s24-ultra", storage: "512GB",
      condition: "new_sealed", color: "violet", ram: "12GB",
      with_box: true, with_warranty: true,
    },
    governorate: "الجيزة",
    city: "المهندسين",
    viewsCount: 650,
    favoritesCount: 28,
    createdAt: hoursAgo(5),
    auctionStartPrice: 35000,
    auctionBuyNowPrice: 45000,
    auctionEndsAt: hoursFromNow(36),
    auctionHighestBid: 36500,
    auctionHighestBidderId: "demo-seller-hassan",
    auctionHighestBidderName: "حسن إبراهيم",
    auctionBidsCount: 12,
    auctionMinIncrement: 500,
    auctionStatus: "active",
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: [
      { id: "demo-bid-p1", bidderName: "حسن إبراهيم", amount: 36500, createdAt: hoursAgo(0.5) },
      { id: "demo-bid-p2", bidderName: "مريم أحمد", amount: 36000, createdAt: hoursAgo(1) },
      { id: "demo-bid-p3", bidderName: "طارق حسين", amount: 35500, createdAt: hoursAgo(2) },
    ],
    exchangeDescription: null, exchangeAcceptsPriceDiff: false, exchangePriceDiff: null,
    seller: sellers.omar,
    isFavorited: false,
  },
  "demo-ad-phone-3": {
    title: "آيفون 14 برو — 128GB — للتبديل بسامسونج",
    description: "آيفون 14 برو 128 جيجا، حالة ممتازة، البطارية 92%. عايز أبدّله بسامسونج S24 أو S23 Ultra. ممكن فرق سعر.",
    price: null,
    saleType: "exchange",
    isNegotiable: false,
    images: [],
    categoryId: "phones",
    subcategoryId: "mobile",
    categoryFields: {
      brand: "apple", model: "iphone-14-pro", storage: "128GB",
      condition: "used_good", color: "black",
    },
    governorate: "القاهرة",
    city: "مصر الجديدة",
    viewsCount: 320,
    favoritesCount: 15,
    createdAt: hoursAgo(6),
    auctionStartPrice: null, auctionBuyNowPrice: null, auctionEndsAt: null,
    auctionHighestBid: null, auctionHighestBidderId: null, auctionHighestBidderName: null,
    auctionBidsCount: 0, auctionMinIncrement: 50, auctionStatus: null,
    auctionWinnerId: null, auctionWinnerName: null, bids: [],
    exchangeDescription: "سامسونج S24 أو S23 Ultra",
    exchangeAcceptsPriceDiff: true,
    exchangePriceDiff: 5000,
    seller: sellers.fatma,
    isFavorited: false,
  },
  "demo-ad-realestate-1": {
    title: "شقة 150م² — 3 غرف — الطابق الخامس — سوبر لوكس",
    description: "شقة 150 متر مربع في مدينة نصر، 3 غرف نوم و 2 حمام، تشطيب سوبر لوكس. أسانسير، جراج. واجهة بحري. الشقة نضيفة وجاهزة للسكن فوري.",
    price: 2500000,
    saleType: "cash",
    isNegotiable: true,
    images: [],
    categoryId: "real_estate",
    subcategoryId: "apartments-sale",
    categoryFields: {
      property_type: "apartment", area: "150", rooms: "3", floor: "5",
      bathrooms: "2", finishing: "super_lux", elevator: true, garage: true,
      facing: "north",
    },
    governorate: "القاهرة",
    city: "مدينة نصر",
    viewsCount: 1200,
    favoritesCount: 55,
    createdAt: hoursAgo(2),
    auctionStartPrice: null, auctionBuyNowPrice: null, auctionEndsAt: null,
    auctionHighestBid: null, auctionHighestBidderId: null, auctionHighestBidderName: null,
    auctionBidsCount: 0, auctionMinIncrement: 50, auctionStatus: null,
    auctionWinnerId: null, auctionWinnerName: null, bids: [],
    exchangeDescription: null, exchangeAcceptsPriceDiff: false, exchangePriceDiff: null,
    seller: sellers.hassan,
    isFavorited: false,
  },
  "demo-ad-realestate-2": {
    title: "شقة 120م² للإيجار — المهندسين — مفروشة",
    description: "شقة مفروشة بالكامل للإيجار الشهري في المهندسين. 120 متر، 2 غرفة نوم، ريسيبشن كبير، مطبخ مجهز. قريبة من الخدمات والمواصلات.",
    price: 12000,
    saleType: "cash",
    isNegotiable: true,
    images: [],
    categoryId: "real_estate",
    subcategoryId: "apartments-rent",
    categoryFields: {
      property_type: "apartment", area: "120", rooms: "2", floor: "3",
      bathrooms: "1", finishing: "super_lux", elevator: true, furnished: true,
    },
    governorate: "الجيزة",
    city: "المهندسين",
    viewsCount: 780,
    favoritesCount: 30,
    createdAt: hoursAgo(10),
    auctionStartPrice: null, auctionBuyNowPrice: null, auctionEndsAt: null,
    auctionHighestBid: null, auctionHighestBidderId: null, auctionHighestBidderName: null,
    auctionBidsCount: 0, auctionMinIncrement: 50, auctionStatus: null,
    auctionWinnerId: null, auctionWinnerName: null, bids: [],
    exchangeDescription: null, exchangeAcceptsPriceDiff: false, exchangePriceDiff: null,
    seller: sellers.nora,
    isFavorited: false,
  },
  "demo-ad-gold-1": {
    title: "سلسلة ذهب عيار 21 — 15 جرام — جديدة",
    description: "سلسلة ذهب عيار 21 وزن 15 جرام، تصميم إيطالي، جديدة مالبستش. مع الفاتورة من الصاغة.",
    price: 75000,
    saleType: "cash",
    isNegotiable: false,
    images: [],
    categoryId: "gold",
    subcategoryId: "gold-items",
    categoryFields: {
      type: "chain", karat: "21", weight: "15", condition: "new",
      has_certificate: true,
    },
    governorate: "القاهرة",
    city: "وسط البلد",
    viewsCount: 340,
    favoritesCount: 22,
    createdAt: hoursAgo(4),
    auctionStartPrice: null, auctionBuyNowPrice: null, auctionEndsAt: null,
    auctionHighestBid: null, auctionHighestBidderId: null, auctionHighestBidderName: null,
    auctionBidsCount: 0, auctionMinIncrement: 50, auctionStatus: null,
    auctionWinnerId: null, auctionWinnerName: null, bids: [],
    exchangeDescription: null, exchangeAcceptsPriceDiff: false, exchangePriceDiff: null,
    seller: sellers.omar,
    isFavorited: false,
  },
  "demo-ad-gold-2": {
    title: "خاتم ذهب عيار 18 — 8 جرام — مع فص ألماس",
    description: "خاتم ذهب عيار 18 بفص ألماس أصلي. وزن الخاتم 8 جرام. مقاس 17. مناسب كهدية أو خطوبة.",
    price: 25000,
    saleType: "auction",
    isNegotiable: false,
    images: [],
    categoryId: "gold",
    subcategoryId: "gold-items",
    categoryFields: {
      type: "ring", karat: "18", weight: "8", condition: "used",
      has_gemstone: true, ring_size: 17,
    },
    governorate: "القاهرة",
    city: "التجمع الخامس",
    viewsCount: 410,
    favoritesCount: 19,
    createdAt: hoursAgo(15),
    auctionStartPrice: 20000,
    auctionBuyNowPrice: 30000,
    auctionEndsAt: hoursFromNow(6),
    auctionHighestBid: 28000,
    auctionHighestBidderId: "demo-seller-nora",
    auctionHighestBidderName: "نورا محمود",
    auctionBidsCount: 9,
    auctionMinIncrement: 500,
    auctionStatus: "active",
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: [
      { id: "demo-bid-g1", bidderName: "نورا محمود", amount: 28000, createdAt: hoursAgo(0.5) },
      { id: "demo-bid-g2", bidderName: "هند سامي", amount: 27000, createdAt: hoursAgo(2) },
      { id: "demo-bid-g3", bidderName: "سلمى خالد", amount: 25000, createdAt: hoursAgo(5) },
    ],
    exchangeDescription: null, exchangeAcceptsPriceDiff: false, exchangePriceDiff: null,
    seller: sellers.fatma,
    isFavorited: false,
  },
};

// Generate default details for ads not in the map
function buildDefaultDetail(ad: MockAd, seller: MockSeller): MockAdDetail {
  return {
    id: ad.id,
    title: ad.title,
    description: ad.title,
    price: ad.price,
    saleType: ad.saleType,
    isNegotiable: ad.isNegotiable ?? false,
    images: [],
    categoryId: "",
    subcategoryId: "",
    categoryFields: {},
    governorate: ad.governorate ?? "",
    city: ad.city,
    viewsCount: Math.floor(Math.random() * 500) + 50,
    favoritesCount: Math.floor(Math.random() * 30) + 5,
    createdAt: ad.createdAt,
    auctionStartPrice: ad.saleType === "auction" ? (ad.price ?? null) : null,
    auctionBuyNowPrice: null,
    auctionEndsAt: ad.auctionEndsAt ?? null,
    auctionHighestBid: ad.auctionHighestBid ?? null,
    auctionHighestBidderId: null,
    auctionHighestBidderName: null,
    auctionBidsCount: ad.auctionBidsCount ?? 0,
    auctionMinIncrement: 50,
    auctionStatus: ad.saleType === "auction" ? "active" : null,
    auctionWinnerId: null,
    auctionWinnerName: null,
    bids: [],
    exchangeDescription: ad.exchangeDescription ?? null,
    exchangeAcceptsPriceDiff: false,
    exchangePriceDiff: null,
    seller,
    isFavorited: false,
  };
}

/** Get demo ad detail by ID */
export function getDemoAdDetail(id: string): MockAdDetail | null {
  const detail = detailsMap[id];
  if (detail) {
    return { id, ...detail };
  }

  // Fallback: build from feed ad data
  const feedAd = demoAds.find((a) => a.id === id);
  if (feedAd) {
    const sellerKeys = Object.keys(sellers);
    const sellerKey = sellerKeys[Math.abs(id.charCodeAt(9)) % sellerKeys.length];
    return buildDefaultDetail(feedAd, sellers[sellerKey]);
  }

  return null;
}

/** Get demo ads filtered by category */
export function getDemoAdsByCategory(categorySlug: string): MockAd[] {
  const categoryMap: Record<string, string[]> = {
    cars: ["demo-ad-car-"],
    "real-estate": ["demo-ad-realestate-"],
    phones: ["demo-ad-phone-"],
    fashion: ["demo-ad-fashion-"],
    scrap: ["demo-ad-scrap-"],
    gold: ["demo-ad-gold-"],
    luxury: ["demo-ad-luxury-"],
    appliances: ["demo-ad-appliance-"],
    furniture: ["demo-ad-furniture-"],
    hobbies: ["demo-ad-hobby-"],
    tools: ["demo-ad-tool-"],
    services: ["demo-ad-service-"],
  };

  const prefixes = categoryMap[categorySlug] ?? [];
  if (prefixes.length === 0) return [];

  return demoAds.filter((ad) =>
    prefixes.some((prefix) => ad.id.startsWith(prefix))
  );
}

/** Get demo auction ads */
export function getDemoAuctionAds(): MockAd[] {
  return demoAds.filter((ad) => ad.saleType === "auction");
}

/** Search demo ads by query */
export function searchDemoAds(query: string): MockAd[] {
  const q = query.toLowerCase().trim();
  if (!q) return demoAds;

  return demoAds.filter(
    (ad) =>
      ad.title.toLowerCase().includes(q) ||
      (ad.governorate && ad.governorate.toLowerCase().includes(q)) ||
      (ad.city && ad.city.toLowerCase().includes(q)) ||
      (ad.exchangeDescription && ad.exchangeDescription.toLowerCase().includes(q))
  );
}
