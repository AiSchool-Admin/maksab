export type { Database } from "./database";

export type SaleType = "cash" | "auction" | "live_auction" | "exchange";

export type AdStatus = "active" | "sold" | "exchanged" | "expired" | "deleted";

export type AuctionStatus = "active" | "ended_winner" | "ended_no_bids" | "bought_now" | "cancelled";

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
  requiredFields: string[];
  titleTemplate?: string;
  descriptionTemplate?: string;
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
