/**
 * AHE Types — أنواع محرك الحصاد الآلي
 */

export interface AheEngineStatus {
  id: number;
  status: "running" | "paused" | "stopped";
  status_changed_at: string;
  status_changed_by: string | null;
  status_reason: string | null;
  active_scopes_count: number;
  running_jobs_count: number;
  global_max_concurrent_jobs: number;
  global_max_requests_per_hour: number;
  current_requests_this_hour: number;
  hour_started_at: string;
  consecutive_errors: number;
  auto_pause_threshold: number;
  last_error_at: string | null;
  last_error_message: string | null;
  updated_at: string;
}

export interface AheScope {
  id: string;
  name: string;
  code: string;
  source_platform: string;
  maksab_category: string;
  governorate: string;
  city: string | null;
  base_url: string;
  pagination_pattern: string;
  harvest_interval_minutes: number;
  fetch_depth_minutes: number | null;
  max_pages_per_harvest: number;
  delay_between_requests_ms: number;
  detail_fetch_enabled: boolean;
  detail_delay_between_requests_ms: number;
  is_active: boolean;
  is_paused: boolean;
  pause_reason: string | null;
  last_harvest_at: string | null;
  last_harvest_job_id: string | null;
  last_harvest_new_listings: number;
  last_harvest_new_sellers: number;
  next_harvest_at: string | null;
  total_harvests: number;
  total_listings_found: number;
  total_sellers_found: number;
  total_phones_extracted: number;
  avg_new_listings_per_harvest: number;
  consecutive_failures: number;
  server_fetch_blocked: boolean;
  server_fetch_blocked_at: string | null;
  priority: number;
  // Phase 3: Advanced Parameters
  subcategory: string | null;
  subcategory_ar: string | null;
  price_min: number | null;
  price_max: number | null;
  product_condition: "new" | "used" | null;
  target_seller_type: "all" | "business" | "individual" | "verified" | "whales";
  target_listing_type: "all" | "featured" | "elite" | "featured_and_elite";
  scope_group: "general" | "whale_hunting" | "high_value" | "seasonal";
  description: string | null;
  total_whales_found: number;
  total_filtered_out: number;
  created_at: string;
  updated_at: string;
}

export interface AheHarvestJob {
  id: string;
  scope_id: string;
  target_from: string;
  target_to: string;
  status: string;
  pages_fetched: number;
  pages_total: number | null;
  listings_fetched: number;
  details_fetched: number;
  progress_percentage: number;
  current_step: string | null;
  listings_total: number;
  listings_new: number;
  listings_duplicate: number;
  listings_expired: number;
  sellers_total: number;
  sellers_new: number;
  sellers_existing: number;
  phones_extracted: number;
  phones_new: number;
  auto_queued: number;
  errors: string[];
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  // Joined
  ahe_scopes?: AheScope;
}

export interface AheListing {
  id: string;
  scope_id: string;
  harvest_job_id: string | null;
  source_platform: string;
  source_listing_url: string;
  source_listing_id: string | null;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  is_negotiable: boolean;
  supports_exchange: boolean;
  is_featured: boolean;
  thumbnail_url: string | null;
  main_image_url: string | null;
  all_image_urls: string[];
  source_category: string | null;
  maksab_category: string | null;
  detected_brand: string | null;
  detected_model: string | null;
  specifications: Record<string, string>;
  source_location: string | null;
  governorate: string | null;
  city: string | null;
  area: string | null;
  source_date_text: string | null;
  estimated_posted_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  seller_name: string | null;
  seller_profile_url: string | null;
  seller_is_verified: boolean;
  seller_is_business: boolean;
  ahe_seller_id: string | null;
  extracted_phone: string | null;
  phone_source: string | null;
  migration_status: string;
  is_expired: boolean;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
}

export interface AheSeller {
  id: string;
  phone: string | null;
  profile_url: string | null;
  name: string | null;
  avatar_url: string | null;
  source_platform: string;
  is_verified: boolean;
  is_business: boolean;
  badge: string | null;
  member_since: string | null;
  detected_account_type: string;
  primary_category: string | null;
  primary_governorate: string | null;
  operating_areas: string[];
  total_listings_seen: number;
  active_listings: number;
  first_seen_at: string;
  last_seen_at: string;
  last_new_listing_at: string | null;
  priority_score: number;
  pipeline_status: string;
  crm_customer_id: string | null;
  assigned_agent_id: string | null;
  campaign_id: string | null;
  first_outreach_at: string | null;
  last_response_at: string | null;
  // Phase 3: Whale Detection
  whale_score: number;
  is_whale: boolean;
  whale_detected_at: string | null;
  has_featured_listings: boolean;
  has_elite_listings: boolean;
  featured_listings_count: number;
  elite_listings_count: number;
  created_at: string;
  updated_at: string;
}

export interface AheSubcategoryMapping {
  id: string;
  maksab_category: string;
  subcategory: string;
  subcategory_ar: string;
  source_platform: string;
  source_query: string;
  source_url_segment: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface AheDailyMetrics {
  id: string;
  metric_date: string;
  total_harvests: number;
  total_listings_new: number;
  total_sellers_new: number;
  total_phones_extracted: number;
  total_auto_queued: number;
  contacted: number;
  responded: number;
  signed_up: number;
  activated: number;
  listings_expired: number;
  listings_renewed: number;
  listings_deleted: number;
  by_platform: Record<string, number>;
  by_category: Record<string, number>;
  by_governorate: Record<string, number>;
}

export interface AheCategoryMapping {
  id: string;
  maksab_category: string;
  maksab_category_ar: string;
  source_platform: string;
  source_category_name: string;
  source_url_segment: string;
  source_url_template: string;
  is_active: boolean;
}

export interface AheGovernorateMapping {
  id: string;
  maksab_governorate: string;
  maksab_governorate_ar: string;
  source_platform: string;
  source_governorate_name: string;
  source_url_segment: string;
  estimated_daily_listings: number;
  suggested_interval_minutes: number;
  is_active: boolean;
}

export type EngineAction =
  | "start"
  | "pause"
  | "stop"
  | "pause_scope"
  | "resume_scope"
  | "test_scope";
