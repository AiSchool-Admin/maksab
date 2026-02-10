export type {
  Database,
  SellerType,
  StoreTheme,
  StoreLayout,
  StoreStatus,
  StoreBadgeType,
  SubscriptionPlan,
  SubscriptionStatus,
  PromoType,
} from "./database";

export type SaleType = "cash" | "auction" | "live_auction" | "exchange";

export type AdStatus = "active" | "sold" | "exchanged" | "expired" | "deleted";

export type AuctionStatus = "active" | "ended_winner" | "ended_no_bids" | "bought_now" | "cancelled";

// ============================================
// Store Types
// ============================================

export interface Store {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  main_category: string;
  sub_categories: string[];
  primary_color: string;
  secondary_color: string | null;
  theme: "classic" | "modern" | "elegant" | "sporty";
  layout: "grid" | "list" | "showcase";
  location_gov: string | null;
  location_area: string | null;
  phone: string | null;
  working_hours: Record<string, unknown> | null;
  is_verified: boolean;
  settings: Record<string, unknown>;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface StoreWithStats extends Store {
  avg_rating: number;
  total_reviews: number;
  total_followers: number;
  total_products: number;
  total_sales: number;
  avg_response_time: string | null;
  is_following: boolean;
  badges: StoreBadge[];
}

export interface StoreCategory {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  sort_order: number;
  products_count: number;
  created_at: string;
}

export interface StoreBadge {
  id: string;
  store_id: string;
  badge_type: "verified" | "trusted" | "active" | "top_seller" | "gold" | "platinum";
  earned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface StoreReview {
  id: string;
  store_id: string;
  reviewer_id: string;
  transaction_id: string;
  overall_rating: number;
  quality_rating: number | null;
  accuracy_rating: number | null;
  response_rating: number | null;
  commitment_rating: number | null;
  comment: string | null;
  seller_reply: string | null;
  replied_at: string | null;
  created_at: string;
  reviewer?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface StorePromotion {
  id: string;
  store_id: string;
  ad_id: string;
  promo_type: "discount" | "bundle" | "free_shipping" | "timed";
  discount_percent: number | null;
  original_price: number | null;
  sale_price: number | null;
  start_at: string;
  end_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StoreSubscription {
  id: string;
  store_id: string;
  plan: "free" | "gold" | "platinum";
  status: "active" | "expired" | "cancelled";
  price: number | null;
  start_at: string;
  end_at: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  created_at: string;
}

/** Seller info attached to product cards in unified feed */
export interface SellerInfo {
  type: "individual" | "store";
  id: string;
  name: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  rating: number;
  is_verified: boolean;
  badges?: StoreBadge[];
  slug?: string;
}

/** Unified product card data for home feed */
export interface UnifiedProduct {
  id: string;
  title: string;
  price: number | null;
  original_price: number | null;
  images: string[];
  governorate: string | null;
  city: string | null;
  sale_type: SaleType;
  status: AdStatus;
  created_at: string;
  seller: SellerInfo;
}

export interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  slug: string;
  subcategories: Subcategory[];
  fields: CategoryField[];
  requiredFields: string[];
  titleTemplate: string;
  descriptionTemplate: string;
  /** Override required fields and templates per subcategory */
  subcategoryOverrides?: Record<string, SubcategoryOverride>;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryField {
  id: string;
  label: string;
  type: "select" | "number" | "text" | "toggle" | "multi-select" | "year-picker";
  options?: { value: string; label: string }[];
  placeholder?: string;
  unit?: string;
  isRequired: boolean;
  order: number;
  defaultValue?: unknown;
  /** Hide this field when one of these subcategories is selected */
  hiddenForSubcategories?: string[];
}

export interface SubcategoryOverride {
  requiredFields?: string[];
  titleTemplate?: string;
  descriptionTemplate?: string;
  /** Additional fields only shown for this subcategory */
  extraFields?: CategoryField[];
  /** Override specific fields' options/label for this subcategory (keyed by field id) */
  fieldOverrides?: Record<string, Partial<Pick<CategoryField, "options" | "label" | "unit" | "placeholder" | "type" | "isRequired">>>;
}

export interface SearchRequest {
  query?: string;
  category?: string;
  subcategory?: string;
  sale_type?: SaleType;
  price_min?: number;
  price_max?: number;
  governorate?: string;
  city?: string;
  condition?: string;
  sort_by?: "newest" | "price_asc" | "price_desc" | "nearest";
  user_lat?: number;
  user_lng?: number;
  category_filters?: Record<string, unknown>;
  page?: number;
  limit?: number;
}
