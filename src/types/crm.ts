// CRM Types for Maksab

export interface CrmCustomer {
  id: string;
  full_name: string;
  display_name: string | null;
  phone: string;
  phone_verified: boolean;
  whatsapp: string | null;
  whatsapp_verified: boolean;
  email: string | null;
  email_verified: boolean;
  avatar_url: string | null;
  national_id: string | null;
  account_type: 'individual' | 'store' | 'chain' | 'wholesaler' | 'manufacturer';
  role: 'buyer' | 'seller' | 'both';
  is_verified: boolean;
  verification_level: 'none' | 'phone' | 'id' | 'business_license' | 'premium';
  business_name: string | null;
  business_name_ar: string | null;
  business_license_number: string | null;
  tax_id: string | null;
  business_category: string | null;
  business_description: string | null;
  business_logo_url: string | null;
  business_cover_url: string | null;
  website_url: string | null;
  subscription_plan: 'free' | 'silver' | 'gold' | 'platinum';
  subscription_billing: 'none' | 'monthly' | 'annual';
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  subscription_auto_renew: boolean;
  max_active_listings: number;
  max_featured_listings: number;
  governorate: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_category: string | null;
  secondary_categories: string[];
  interests: string[];
  source: string;
  source_detail: string | null;
  source_url: string | null;
  source_platform: string | null;
  referral_code: string | null;
  referred_by: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  lifecycle_stage: LifecycleStage;
  lifecycle_changed_at: string;
  lifecycle_history: LifecycleEntry[];
  acquisition_score: number;
  engagement_score: number;
  value_score: number;
  churn_risk_score: number;
  health_score: number;
  scores_updated_at: string | null;
  total_listings: number;
  active_listings: number;
  total_sales: number;
  total_purchases: number;
  total_exchanges: number;
  total_auctions_created: number;
  total_auctions_won: number;
  total_views_received: number;
  total_messages_received: number;
  avg_response_time_minutes: number | null;
  avg_listing_quality_score: number | null;
  total_gmv_egp: number;
  total_commission_paid_egp: number;
  commission_payment_rate: number;
  is_commission_supporter: boolean;
  last_commission_paid_at: string | null;
  total_subscription_paid_egp: number;
  total_addons_paid_egp: number;
  total_featured_purchased: number;
  total_boosts_purchased: number;
  preferred_channel: 'whatsapp' | 'sms' | 'email' | 'in_app' | 'phone_call';
  preferred_language: string;
  notification_enabled: boolean;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  quiet_hours_start: string;
  quiet_hours_end: string;
  do_not_contact: boolean;
  do_not_contact_reason: string | null;
  outreach_attempts: number;
  last_outreach_at: string | null;
  last_outreach_channel: string | null;
  last_response_at: string | null;
  last_response_sentiment: string | null;
  last_active_at: string | null;
  last_app_open_at: string | null;
  last_listing_posted_at: string | null;
  last_transaction_at: string | null;
  first_listing_at: string | null;
  first_transaction_at: string | null;
  app_sessions_count: number;
  days_since_last_active: number;
  assigned_agent_id: string | null;
  assigned_at: string | null;
  loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  loyalty_points: number;
  loyalty_points_lifetime: number;
  loyalty_tier_upgraded_at: string | null;
  lifetime_value_egp: number;
  competitor_profiles: Record<string, CompetitorProfile>;
  estimated_competitor_listings: number;
  migrated_from: string | null;
  tags: string[];
  internal_notes: string | null;
  app_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type LifecycleStage =
  | 'anonymous' | 'lead' | 'qualified' | 'contacted' | 'responded' | 'interested'
  | 'onboarding' | 'activated'
  | 'active' | 'power_user' | 'champion'
  | 'at_risk' | 'dormant' | 'churned'
  | 'reactivated' | 'blacklisted';

export interface LifecycleEntry {
  stage: LifecycleStage;
  at: string;
}

export interface CompetitorProfile {
  url?: string;
  listings?: number;
  verified?: boolean;
  last_checked?: string;
  groups?: string[];
  marketplace?: boolean;
}

export interface CrmAgent {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  role: 'super_admin' | 'admin' | 'manager' | 'senior_agent' | 'agent' | 'intern';
  permissions: string[];
  specialties: string[];
  assigned_governorates: string[];
  max_customers: number;
  current_customers_count: number;
  is_active: boolean;
  is_online: boolean;
  last_online_at: string | null;
  current_status: 'available' | 'busy' | 'break' | 'offline';
  performance: Record<string, unknown>;
  monthly_targets: Record<string, number>;
  base_salary_egp: number;
  compensation_structure: Record<string, number>;
  total_earned_egp: number;
  current_month_earned_egp: number;
  work_schedule: Record<string, { start: string; end: string } | null>;
  created_at: string;
  updated_at: string;
}

export interface CrmActivityLog {
  id: string;
  customer_id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  agent_id: string | null;
  is_system: boolean;
  created_at: string;
}

export interface CrmConversation {
  id: string;
  customer_id: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string | null;
  status: string;
  sentiment: string | null;
  intent: string | null;
  ai_suggested_response: string | null;
  created_at: string;
}

// Helper maps for Arabic labels
export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  anonymous: 'مجهول',
  lead: 'عميل محتمل',
  qualified: 'مؤهل',
  contacted: 'تم التواصل',
  responded: 'رد',
  interested: 'مهتم',
  onboarding: 'تسجيل',
  activated: 'مُفعّل',
  active: 'نشط',
  power_user: 'مستخدم قوي',
  champion: 'بطل',
  at_risk: 'معرض للخطر',
  dormant: 'خامل',
  churned: 'غادر',
  reactivated: 'عاد',
  blacklisted: 'محظور',
};

export const LIFECYCLE_COLORS: Record<LifecycleStage, string> = {
  anonymous: 'bg-gray-100 text-gray-600',
  lead: 'bg-blue-100 text-blue-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  contacted: 'bg-purple-100 text-purple-700',
  responded: 'bg-violet-100 text-violet-700',
  interested: 'bg-cyan-100 text-cyan-700',
  onboarding: 'bg-amber-100 text-amber-700',
  activated: 'bg-emerald-100 text-emerald-700',
  active: 'bg-green-100 text-green-700',
  power_user: 'bg-teal-100 text-teal-700',
  champion: 'bg-yellow-100 text-yellow-800',
  at_risk: 'bg-orange-100 text-orange-700',
  dormant: 'bg-red-100 text-red-600',
  churned: 'bg-red-200 text-red-800',
  reactivated: 'bg-lime-100 text-lime-700',
  blacklisted: 'bg-gray-800 text-white',
};

export const SOURCE_LABELS: Record<string, string> = {
  organic: 'طبيعي',
  whatsapp_campaign: 'حملة واتساب',
  sms_campaign: 'حملة SMS',
  email_campaign: 'حملة إيميل',
  facebook_ad: 'إعلان فيسبوك',
  google_ad: 'إعلان جوجل',
  tiktok_ad: 'إعلان تيكتوك',
  referral: 'إحالة',
  cs_agent: 'موظف خدمة عملاء',
  import_csv: 'استيراد CSV',
  competitor_migration: 'انتقال من منافس',
  facebook_group: 'جروب فيسبوك',
  instagram: 'انستجرام',
  landing_page: 'صفحة هبوط',
  qr_code: 'كود QR',
  offline_event: 'حدث/معرض',
  partnership: 'شراكة',
  app_store: 'متجر التطبيقات',
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  individual: 'فرد',
  store: 'متجر',
  chain: 'سلسلة محلات',
  wholesaler: 'تاجر جملة',
  manufacturer: 'مصنع',
};

export const CATEGORY_LABELS: Record<string, string> = {
  phones: 'موبايلات وتابلت',
  electronics: 'إلكترونيات وكمبيوتر',
  vehicles: 'سيارات ومركبات',
  properties: 'عقارات',
  furniture: 'أثاث ومفروشات',
  fashion: 'أزياء وموضة',
  kids: 'أطفال ومستلزمات',
  sports: 'رياضة وهوايات',
  pets: 'حيوانات أليفة',
  jobs: 'وظائف',
  services: 'خدمات',
  other: 'أخرى',
};

export const SUBSCRIPTION_LABELS: Record<string, string> = {
  free: 'مجاني',
  silver: 'فضي',
  gold: 'ذهبي',
  platinum: 'بلاتيني',
};

export const LOYALTY_LABELS: Record<string, string> = {
  bronze: 'برونزي',
  silver: 'فضي',
  gold: 'ذهبي',
  platinum: 'بلاتيني',
  diamond: 'ماسي',
};
