/**
 * أنواع البيانات لنظام جمع بيانات OLX
 * OLX Data Collection System Types
 */

// ── OLX Raw Data Types ────────────────────────────────

export interface OlxListingRaw {
  id: string;
  title: string;
  description: string;
  price: {
    value: number;
    currency: string;
    negotiable: boolean;
    displayValue: string;
  };
  category: {
    id: string;
    name: string;
    parentId?: string;
    parentName?: string;
  };
  location: {
    governorate: string;
    city: string;
    neighborhood?: string;
    lat?: number;
    lng?: number;
  };
  seller: {
    id: string;
    name: string;
    phone?: string;
    memberSince?: string;
    profileUrl: string;
    adsCount?: number;
    responseRate?: string;
  };
  images: string[];
  attributes: Record<string, string>;
  createdAt: string;
  url: string;
}

export interface OlxSellerRaw {
  id: string;
  name: string;
  phone?: string;
  memberSince?: string;
  location: string;
  profileUrl: string;
  adsCount: number;
  responseRate?: string;
  categories: string[];
  ads: OlxListingRaw[];
}

// ── Maksab Mapped Types ──────────────────────────────

export interface MaksabAd {
  title: string;
  description: string;
  category_id: string;
  subcategory_id: string;
  sale_type: 'cash';
  price: number | null;
  is_negotiable: boolean;
  category_fields: Record<string, unknown>;
  governorate: string;
  city: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  status: 'active';
  source: 'olx';
  source_url: string;
  source_id: string;
  source_seller_id: string;
  source_seller_name: string;
  source_seller_phone?: string;
  extracted_at: string;
}

export interface MaksabSeller {
  name: string;
  phone?: string;
  source: 'olx';
  source_profile_url: string;
  source_id: string;
  categories: string[];
  active_ads_count: number;
  location: {
    governorate?: string;
    city?: string;
  };
  seller_score: number;
  seller_tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  member_since?: string;
  response_rate?: string;
  notes: string;
}

// ── Collection Config ────────────────────────────────

export interface CollectionConfig {
  categories: string[];          // OLX category slugs to collect
  governorates?: string[];       // Filter by governorate
  maxPages: number;              // Max pages per category
  delayMs: number;               // Delay between requests
  includeImages: boolean;        // Download images
  includePhone: boolean;         // Attempt phone extraction
  outputDir: string;             // Output directory
  batchId: string;               // Batch identifier
}

export interface CollectionStats {
  batchId: string;
  startedAt: string;
  completedAt?: string;
  categoriesProcessed: number;
  totalListings: number;
  totalSellers: number;
  uniqueSellers: number;
  errors: Array<{ category: string; page: number; error: string }>;
  byCategory: Record<string, { listings: number; sellers: number }>;
  byGovernorate: Record<string, number>;
}

// ── OLX Category Mapping ────────────────────────────

export interface OlxCategoryMap {
  olxSlug: string;
  olxName: string;
  olxId: string;
  maksabCategoryId: string;
  maksabSubcategoryId?: string;
  fieldMapping: Record<string, string>; // OLX attr key → Maksab field id
}
