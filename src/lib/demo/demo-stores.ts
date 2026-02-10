/**
 * Demo Store Data — realistic store data for testing the merchant system
 * without any backend dependencies.
 */

import type {
  Store,
  StoreWithStats,
  StoreCategory,
  StoreReview,
  StorePromotion,
  StoreSubscription,
  StoreBadge,
  SubscriptionPlan,
} from "@/types";
import { isDemoMode } from "./demo-mode";

// ── Demo Store Constants ──────────────────────────────────────────

const DEMO_STORE_ID = "demo-store-001";
const DEMO_STORE_SLUG = "mobailat-ahmed";
const DEMO_USER_ID = "demo-user-01012345678";

// ── Demo Stores ───────────────────────────────────────────────────

const demoStores: Store[] = [
  {
    id: DEMO_STORE_ID,
    user_id: DEMO_USER_ID,
    name: "موبايلات أحمد",
    slug: DEMO_STORE_SLUG,
    logo_url: null,
    cover_url: null,
    description: "أكبر تشكيلة موبايلات جديدة ومستعملة في مدينة نصر. ضمان حقيقي وأسعار مالهاش مثيل!",
    main_category: "phones",
    sub_categories: ["mobile", "tablets", "accessories"],
    primary_color: "#1B7A3D",
    secondary_color: "#145C2E",
    theme: "modern",
    layout: "grid",
    location_gov: "القاهرة",
    location_area: "مدينة نصر",
    phone: "01012345678",
    working_hours: { sat_thu: "10:00 - 22:00", fri: "14:00 - 22:00" },
    is_verified: false,
    settings: {},
    status: "active",
    created_at: new Date(Date.now() - 45 * 24 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-store-002",
    user_id: "demo-seller-fatma",
    name: "ذهب وفضة فاطمة",
    slug: "gold-fatma",
    logo_url: null,
    cover_url: null,
    description: "أجمل تشكيلة ذهب وفضة في الإسكندرية. كل القطع أصلية بضمان.",
    main_category: "gold",
    sub_categories: ["gold-items", "silver"],
    primary_color: "#D4A843",
    secondary_color: "#B8860B",
    theme: "elegant",
    layout: "showcase",
    location_gov: "الإسكندرية",
    location_area: "سيدي جابر",
    phone: "01198765432",
    working_hours: null,
    is_verified: true,
    settings: {},
    status: "active",
    created_at: new Date(Date.now() - 120 * 24 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-store-003",
    user_id: "demo-seller-omar",
    name: "عقارات عمر",
    slug: "omar-realestate",
    logo_url: null,
    cover_url: null,
    description: "عقارات في أرقى مناطق القاهرة والجيزة. شقق وفيلات وأراضي.",
    main_category: "real_estate",
    sub_categories: ["apartments-sale", "apartments-rent", "villas"],
    primary_color: "#2563EB",
    secondary_color: "#1D4ED8",
    theme: "classic",
    layout: "list",
    location_gov: "الجيزة",
    location_area: "6 أكتوبر",
    phone: "01087654321",
    working_hours: null,
    is_verified: false,
    settings: {},
    status: "active",
    created_at: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-store-004",
    user_id: "demo-seller-nora",
    name: "أزياء نورا",
    slug: "nora-fashion",
    logo_url: null,
    cover_url: null,
    description: "أحدث صيحات الموضة الحريمي. ماركات أصلية وهاي كوبي.",
    main_category: "fashion",
    sub_categories: ["women", "bags", "accessories"],
    primary_color: "#EC4899",
    secondary_color: "#DB2777",
    theme: "sporty",
    layout: "grid",
    location_gov: "القاهرة",
    location_area: "التجمع الخامس",
    phone: "01556789012",
    working_hours: null,
    is_verified: false,
    settings: {},
    status: "active",
    created_at: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-store-005",
    user_id: "demo-seller-hassan",
    name: "أجهزة حسن",
    slug: "hassan-appliances",
    logo_url: null,
    cover_url: null,
    description: "كل الأجهزة المنزلية بأرخص الأسعار. جديد ومستعمل بضمان.",
    main_category: "appliances",
    sub_categories: ["washers", "fridges", "acs"],
    primary_color: "#059669",
    secondary_color: "#047857",
    theme: "classic",
    layout: "grid",
    location_gov: "الدقهلية",
    location_area: "المنصورة",
    phone: "01234567890",
    working_hours: null,
    is_verified: false,
    settings: {},
    status: "active",
    created_at: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ── Stats for each store ──────────────────────────────────────────

const storeStats: Record<string, Omit<StoreWithStats, keyof Store>> = {
  [DEMO_STORE_ID]: {
    avg_rating: 4.7,
    total_reviews: 23,
    total_followers: 156,
    total_products: 8,
    total_sales: 45,
    avg_response_time: "5 دقائق",
    is_following: false,
    badges: [
      { id: "b1", store_id: DEMO_STORE_ID, badge_type: "active", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
      { id: "b2", store_id: DEMO_STORE_ID, badge_type: "trusted", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
    ],
  },
  "demo-store-002": {
    avg_rating: 4.9,
    total_reviews: 67,
    total_followers: 312,
    total_products: 15,
    total_sales: 89,
    avg_response_time: "3 دقائق",
    is_following: false,
    badges: [
      { id: "b3", store_id: "demo-store-002", badge_type: "verified", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
      { id: "b4", store_id: "demo-store-002", badge_type: "top_seller", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
      { id: "b5", store_id: "demo-store-002", badge_type: "gold", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
    ],
  },
  "demo-store-003": {
    avg_rating: 4.5,
    total_reviews: 12,
    total_followers: 89,
    total_products: 6,
    total_sales: 18,
    avg_response_time: "15 دقيقة",
    is_following: false,
    badges: [
      { id: "b6", store_id: "demo-store-003", badge_type: "active", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
    ],
  },
  "demo-store-004": {
    avg_rating: 4.8,
    total_reviews: 34,
    total_followers: 245,
    total_products: 22,
    total_sales: 67,
    avg_response_time: "10 دقائق",
    is_following: false,
    badges: [
      { id: "b7", store_id: "demo-store-004", badge_type: "trusted", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
      { id: "b8", store_id: "demo-store-004", badge_type: "platinum", earned_at: new Date().toISOString(), expires_at: null, is_active: true },
    ],
  },
  "demo-store-005": {
    avg_rating: 4.6,
    total_reviews: 19,
    total_followers: 78,
    total_products: 10,
    total_sales: 32,
    avg_response_time: "20 دقيقة",
    is_following: false,
    badges: [],
  },
};

// ── Demo Products (for store owner's dashboard) ───────────────────

export interface DemoProduct {
  id: string;
  title: string;
  price: number | null;
  images: string[];
  status: string;
  sale_type: string;
  is_pinned: boolean;
  views_count: number;
  created_at: string;
  store_id: string;
  governorate: string | null;
  city: string | null;
  is_negotiable: boolean;
  exchange_description: string | null;
}

const demoProducts: DemoProduct[] = [
  {
    id: "demo-prod-1",
    title: "آيفون 15 برو ماكس — 256GB — مستعمل زيرو",
    price: 42000,
    images: [],
    status: "active",
    sale_type: "cash",
    is_pinned: true,
    views_count: 890,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: false,
    exchange_description: null,
  },
  {
    id: "demo-prod-2",
    title: "سامسونج S24 Ultra — 512GB — جديد متبرشم",
    price: 38000,
    images: [],
    status: "active",
    sale_type: "auction",
    is_pinned: true,
    views_count: 650,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: false,
    exchange_description: null,
  },
  {
    id: "demo-prod-3",
    title: "آيفون 14 برو — 128GB — للتبديل بسامسونج",
    price: null,
    images: [],
    status: "active",
    sale_type: "exchange",
    is_pinned: false,
    views_count: 320,
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: false,
    exchange_description: "سامسونج S24 أو S23 Ultra",
  },
  {
    id: "demo-prod-4",
    title: "شاومي 14 — 256GB — جديد بالضمان",
    price: 15000,
    images: [],
    status: "active",
    sale_type: "cash",
    is_pinned: false,
    views_count: 210,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: true,
    exchange_description: null,
  },
  {
    id: "demo-prod-5",
    title: "ريلمي GT 5 Pro — 256GB — مستعمل ممتاز",
    price: 12000,
    images: [],
    status: "active",
    sale_type: "cash",
    is_pinned: false,
    views_count: 145,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: true,
    exchange_description: null,
  },
  {
    id: "demo-prod-6",
    title: "أوبو رينو 11 — 256GB — جديد متبرشم",
    price: 18000,
    images: [],
    status: "active",
    sale_type: "cash",
    is_pinned: false,
    views_count: 95,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: false,
    exchange_description: null,
  },
  {
    id: "demo-prod-7",
    title: "كفرات وسكرينات لكل الموبايلات",
    price: 50,
    images: [],
    status: "active",
    sale_type: "cash",
    is_pinned: false,
    views_count: 430,
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: false,
    exchange_description: null,
  },
  {
    id: "demo-prod-8",
    title: "ايربودز برو 2 — أصلي بالضمان",
    price: 8500,
    images: [],
    status: "sold",
    sale_type: "cash",
    is_pinned: false,
    views_count: 560,
    created_at: new Date(Date.now() - 120 * 3600000).toISOString(),
    store_id: DEMO_STORE_ID,
    governorate: "القاهرة",
    city: "مدينة نصر",
    is_negotiable: false,
    exchange_description: null,
  },
];

// ── Demo Reviews ──────────────────────────────────────────────────

const demoReviews: StoreReview[] = [
  {
    id: "demo-review-1",
    store_id: DEMO_STORE_ID,
    reviewer_id: "demo-seller-fatma",
    transaction_id: "demo-tx-1",
    overall_rating: 5,
    quality_rating: 5,
    accuracy_rating: 5,
    response_rating: 5,
    commitment_rating: 5,
    comment: "ممتاز جداً! الموبايل وصل زي ما في الوصف بالظبط. البائع محترم ورد بسرعة. هشتري تاني إن شاء الله.",
    seller_reply: "تسلمي يا فاطمة! نورتينا ومستنينك دايماً 💚",
    replied_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    reviewer: { display_name: "فاطمة علي", avatar_url: null },
  },
  {
    id: "demo-review-2",
    store_id: DEMO_STORE_ID,
    reviewer_id: "demo-seller-omar",
    transaction_id: "demo-tx-2",
    overall_rating: 4,
    quality_rating: 4,
    accuracy_rating: 5,
    response_rating: 4,
    commitment_rating: 4,
    comment: "المنتج كويس والسعر مناسب. بس التوصيل اتأخر يوم. بشكل عام تجربة كويسة.",
    seller_reply: null,
    replied_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    reviewer: { display_name: "عمر خالد", avatar_url: null },
  },
  {
    id: "demo-review-3",
    store_id: DEMO_STORE_ID,
    reviewer_id: "demo-seller-nora",
    transaction_id: "demo-tx-3",
    overall_rating: 5,
    quality_rating: 5,
    accuracy_rating: 5,
    response_rating: 5,
    commitment_rating: 5,
    comment: "أحسن متجر موبايلات اتعاملت معاه! الأسعار مالهاش مثيل والضمان حقيقي.",
    seller_reply: "شكراً جداً يا نورا! رأيك مهم لينا 🙏",
    replied_at: new Date(Date.now() - 9 * 24 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    reviewer: { display_name: "نورا محمود", avatar_url: null },
  },
  {
    id: "demo-review-4",
    store_id: DEMO_STORE_ID,
    reviewer_id: "demo-seller-hassan",
    transaction_id: "demo-tx-4",
    overall_rating: 5,
    quality_rating: 5,
    accuracy_rating: 4,
    response_rating: 5,
    commitment_rating: 5,
    comment: "تجربة ممتازة. اشتريت آيفون مستعمل وكان زي الجديد بالظبط.",
    seller_reply: null,
    replied_at: null,
    created_at: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
    reviewer: { display_name: "حسن إبراهيم", avatar_url: null },
  },
  {
    id: "demo-review-5",
    store_id: DEMO_STORE_ID,
    reviewer_id: "demo-reviewer-5",
    transaction_id: "demo-tx-5",
    overall_rating: 4,
    quality_rating: 4,
    accuracy_rating: 4,
    response_rating: 3,
    commitment_rating: 4,
    comment: "المنتج كويس بس ياريت يردوا أسرع على الرسائل.",
    seller_reply: "معلش يا باشا كان في ضغط. هنحسّن الموضوع ده إن شاء الله!",
    replied_at: new Date(Date.now() - 19 * 24 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 20 * 24 * 3600000).toISOString(),
    reviewer: { display_name: "كريم سعيد", avatar_url: null },
  },
];

// ── Demo Analytics ────────────────────────────────────────────────

function generateDemoAnalytics(days: number) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const baseViews = 15 + Math.floor(Math.random() * 40);
    const visitors = Math.floor(baseViews * 0.7);
    data.push({
      date: date.toISOString().split("T")[0],
      total_views: baseViews,
      unique_visitors: visitors,
      source_search: Math.floor(baseViews * 0.4),
      source_direct: Math.floor(baseViews * 0.25),
      source_followers: Math.floor(baseViews * 0.2),
      source_product_card: Math.floor(baseViews * 0.15),
    });
  }
  return data;
}

// ── Demo Promotions ───────────────────────────────────────────────

const demoPromotions: StorePromotion[] = [
  {
    id: "demo-promo-1",
    store_id: DEMO_STORE_ID,
    ad_id: "demo-prod-4",
    promo_type: "discount",
    discount_percent: 15,
    original_price: 15000,
    sale_price: 12750,
    start_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    end_at: new Date(Date.now() + 4 * 24 * 3600000).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
  },
  {
    id: "demo-promo-2",
    store_id: DEMO_STORE_ID,
    ad_id: "demo-prod-7",
    promo_type: "timed",
    discount_percent: 30,
    original_price: 50,
    sale_price: 35,
    start_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
    end_at: new Date(Date.now() + 2 * 24 * 3600000).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  },
];

// ── Demo Store Categories ─────────────────────────────────────────

const demoStoreCategories: StoreCategory[] = [
  { id: "demo-scat-1", store_id: DEMO_STORE_ID, name: "آيفون", slug: "iphone", sort_order: 1, products_count: 3, created_at: new Date().toISOString() },
  { id: "demo-scat-2", store_id: DEMO_STORE_ID, name: "سامسونج", slug: "samsung", sort_order: 2, products_count: 2, created_at: new Date().toISOString() },
  { id: "demo-scat-3", store_id: DEMO_STORE_ID, name: "إكسسوارات", slug: "accessories", sort_order: 3, products_count: 1, created_at: new Date().toISOString() },
];

// ── Demo Subscription ─────────────────────────────────────────────

const demoSubscription: StoreSubscription = {
  id: "demo-sub-1",
  store_id: DEMO_STORE_ID,
  plan: "free",
  status: "active",
  price: 0,
  payment_method: null,
  payment_ref: null,
  start_at: new Date(Date.now() - 45 * 24 * 3600000).toISOString(),
  end_at: null,
  created_at: new Date(Date.now() - 45 * 24 * 3600000).toISOString(),
};

// ── Local Storage Helpers (for demo state that changes) ───────────

const DEMO_STORE_KEY = "maksab_demo_store";
const DEMO_SUB_KEY = "maksab_demo_subscription";

function getDemoStoreFromStorage(): Store | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DEMO_STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function saveDemoStoreToStorage(store: Store): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
}

function getDemoSubscriptionFromStorage(): StoreSubscription {
  if (typeof window === "undefined") return demoSubscription;
  const raw = localStorage.getItem(DEMO_SUB_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { return demoSubscription; }
  }
  return demoSubscription;
}

function saveDemoSubscriptionToStorage(sub: StoreSubscription): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_SUB_KEY, JSON.stringify(sub));
}

// ============================================
// Public API — used by pages and store-service
// ============================================

/** Check if a store ID belongs to a demo store */
export function isDemoStore(id: string): boolean {
  return id.startsWith("demo-store-");
}

/** Get the demo user's own store */
export function getDemoUserStore(): Store {
  return getDemoStoreFromStorage() || demoStores[0];
}

/** Get all demo stores (for listing) */
export function getDemoStores(params?: {
  category?: string;
  governorate?: string;
  search?: string;
}): { stores: Store[]; total: number } {
  let filtered = [...demoStores];

  // Add user-created store if exists and not already in list
  const userStore = getDemoStoreFromStorage();
  if (userStore && !filtered.find((s) => s.id === userStore.id)) {
    filtered.unshift(userStore);
  }

  if (params?.category) {
    filtered = filtered.filter((s) => s.main_category === params.category);
  }
  if (params?.governorate) {
    filtered = filtered.filter((s) => s.location_gov === params.governorate);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    );
  }

  return { stores: filtered, total: filtered.length };
}

/** Get a demo store by slug (with stats) */
export function getDemoStoreBySlug(slug: string): StoreWithStats | null {
  // Check user-created store first
  const userStore = getDemoStoreFromStorage();
  if (userStore && userStore.slug === slug) {
    const stats = storeStats[userStore.id] || storeStats[DEMO_STORE_ID];
    return { ...userStore, ...stats };
  }

  const store = demoStores.find((s) => s.slug === slug);
  if (!store) return null;

  const stats = storeStats[store.id] || {
    avg_rating: 0,
    total_reviews: 0,
    total_followers: 0,
    total_products: 0,
    total_sales: 0,
    avg_response_time: null,
    is_following: false,
    badges: [],
  };

  return { ...store, ...stats };
}

/** Get demo store products */
export function getDemoStoreProducts(storeId: string): {
  products: DemoProduct[];
  total: number;
} {
  const filtered = demoProducts.filter((p) => p.store_id === storeId);
  return { products: filtered, total: filtered.length };
}

/** Get demo store categories */
export function getDemoStoreCategories(storeId: string): StoreCategory[] {
  return demoStoreCategories.filter((c) => c.store_id === storeId);
}

/** Get demo store reviews */
export function getDemoStoreReviews(storeId: string): {
  reviews: StoreReview[];
  total: number;
} {
  const filtered = demoReviews.filter((r) => r.store_id === storeId);
  return { reviews: filtered, total: filtered.length };
}

/** Get demo store promotions */
export function getDemoStorePromotions(storeId: string): StorePromotion[] {
  return demoPromotions.filter((p) => p.store_id === storeId);
}

/** Get demo analytics */
export function getDemoAnalytics(days: number) {
  return generateDemoAnalytics(days);
}

/** Get demo subscription */
export function getDemoSubscription(): StoreSubscription {
  return getDemoSubscriptionFromStorage();
}

/** Get demo subscription history */
export function getDemoSubscriptionHistory(): StoreSubscription[] {
  const current = getDemoSubscriptionFromStorage();
  return [current];
}

/** Create a demo store (save to localStorage) */
export function createDemoStore(data: {
  name: string;
  description?: string;
  main_category: string;
  theme?: string;
  layout?: string;
  primary_color?: string;
  secondary_color?: string;
  location_gov?: string;
  location_area?: string;
  phone?: string;
}): { id: string; slug: string } {
  const slug = data.name.trim().replace(/\s+/g, "-").toLowerCase() + "-" + Date.now().toString(36);
  const store: Store = {
    id: DEMO_STORE_ID,
    user_id: DEMO_USER_ID,
    name: data.name.trim(),
    slug,
    logo_url: null,
    cover_url: null,
    description: data.description || null,
    main_category: data.main_category,
    sub_categories: [],
    primary_color: data.primary_color || "#1B7A3D",
    secondary_color: data.secondary_color || null,
    theme: (data.theme as Store["theme"]) || "classic",
    layout: (data.layout as Store["layout"]) || "grid",
    location_gov: data.location_gov || null,
    location_area: data.location_area || null,
    phone: data.phone || null,
    working_hours: null,
    is_verified: false,
    settings: {},
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveDemoStoreToStorage(store);

  // Also create default free subscription
  saveDemoSubscriptionToStorage({
    ...demoSubscription,
    start_at: new Date().toISOString(),
  });

  return { id: store.id, slug };
}

/** Update demo store (save to localStorage) */
export function updateDemoStore(updates: Partial<Store>): void {
  const store = getDemoUserStore();
  const updated = { ...store, ...updates, updated_at: new Date().toISOString() };
  saveDemoStoreToStorage(updated);
}

/** Upgrade demo subscription */
export function upgradeDemoSubscription(plan: SubscriptionPlan, billingCycle: "monthly" | "yearly"): StoreSubscription {
  const sub: StoreSubscription = {
    id: "demo-sub-" + Date.now(),
    store_id: DEMO_STORE_ID,
    plan,
    status: "active",
    price: plan === "gold" ? (billingCycle === "monthly" ? 99 : 999) : plan === "platinum" ? (billingCycle === "monthly" ? 199 : 1999) : 0,
    payment_method: "vodafone_cash",
    payment_ref: "DEMO-" + Date.now(),
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + (billingCycle === "monthly" ? 30 : 365) * 24 * 3600000).toISOString(),
    created_at: new Date().toISOString(),
  };
  saveDemoSubscriptionToStorage(sub);
  return sub;
}

/** Cancel demo subscription */
export function cancelDemoSubscription(): void {
  saveDemoSubscriptionToStorage({
    ...demoSubscription,
    start_at: new Date().toISOString(),
  });
}

/** Get the store that belongs to a given user (demo) */
export function getDemoStoreByUserId(userId: string): Store | null {
  if (userId === DEMO_USER_ID) {
    return getDemoUserStore();
  }
  return demoStores.find((s) => s.user_id === userId) || null;
}
