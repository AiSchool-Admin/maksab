// CRM Scoring Algorithm for Maksab
// 5 scores: acquisition, engagement, value, churnRisk, health

import type { CrmCustomer } from '@/types/crm';

export interface ScoreResult {
  acquisition_score: number;
  engagement_score: number;
  value_score: number;
  churn_risk_score: number;
  health_score: number;
}

// Helper: safely convert Supabase NUMERIC (returned as string) to number
function num(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}

export function calculateAllScores(customer: CrmCustomer): ScoreResult {
  const acquisition = calcAcquisition(customer);
  const engagement = calcEngagement(customer);
  const value = calcValue(customer);
  const churnRisk = calcChurnRisk(customer);

  const health = Math.round(
    (acquisition * 0.15) +
    (engagement * 0.35) +
    (value * 0.30) +
    ((100 - churnRisk) * 0.20)
  );

  return {
    acquisition_score: acquisition,
    engagement_score: engagement,
    value_score: value,
    churn_risk_score: churnRisk,
    health_score: Math.min(Math.max(health, 0), 100),
  };
}

// Category priority map — supports both CRM spec keys AND CLAUDE.md app keys
const CATEGORY_PRIORITY: Record<string, number> = {
  // CRM spec keys (from CLAUDE.md categories)
  phones: 20,
  electronics: 18,
  vehicles: 15,
  properties: 10,
  furniture: 12,
  fashion: 12,
  kids: 8,
  sports: 8,
  pets: 6,
  services: 5,
  jobs: 4,
  other: 3,
  // Seed data / app keys (used in actual data)
  cars: 15,
  real_estate: 10,
  gold: 16,
  scrap: 14,
  luxury: 17,
  home_appliances: 13,
  hobbies: 8,
  tools: 10,
};

// Location priority map — supports both English keys AND Arabic names
const LOCATION_PRIORITY: Record<string, number> = {
  // English keys
  cairo: 10, alexandria: 10, giza: 9, qalyubia: 7, sharqia: 6,
  dakahlia: 6, gharbia: 5, monufia: 5, beheira: 4,
  // Arabic names (used in actual data)
  'القاهرة': 10, 'الإسكندرية': 10, 'الجيزة': 9,
  'القليوبية': 7, 'الشرقية': 6, 'الدقهلية': 6,
  'الغربية': 5, 'المنوفية': 5, 'البحيرة': 4,
  'الفيوم': 4, 'المنيا': 4, 'أسيوط': 3,
  'سوهاج': 3, 'قنا': 3, 'الأقصر': 3, 'أسوان': 3,
  'بورسعيد': 5, 'الإسماعيلية': 5, 'السويس': 5,
  'المنصورة': 6, 'دمياط': 5, 'كفر الشيخ': 4,
};

function calcAcquisition(c: CrmCustomer): number {
  let s = 0;

  // Estimated competitor listings (0-25)
  const listings = num(c.estimated_competitor_listings);
  if (listings >= 50) s += 25;
  else if (listings >= 20) s += 20;
  else if (listings >= 10) s += 15;
  else if (listings >= 5) s += 10;
  else s += 5;

  // Account type (0-20)
  const biz: Record<string, number> = { chain: 20, wholesaler: 18, store: 15, manufacturer: 15, individual: 8 };
  s += biz[c.account_type] || 5;

  // Verified on competitor (0-15)
  if (c.competitor_profiles && typeof c.competitor_profiles === 'object') {
    try {
      const profiles = Object.values(c.competitor_profiles);
      if (profiles.some(p => p && typeof p === 'object' && p.verified)) s += 15;
    } catch {
      // skip if competitor_profiles is malformed
    }
  }

  // Category priority (0-20)
  s += CATEGORY_PRIORITY[c.primary_category || ''] || 3;

  // Location priority (0-10)
  s += LOCATION_PRIORITY[c.governorate || ''] || 3;

  // Multi-category (0-10)
  s += Math.min((c.secondary_categories?.length || 0) * 3, 10);

  return Math.min(s, 100);
}

function calcEngagement(c: CrmCustomer): number {
  let s = 0;

  // Active listings (0-25)
  const active = num(c.active_listings);
  if (active >= 20) s += 25;
  else if (active >= 10) s += 20;
  else if (active >= 5) s += 15;
  else if (active >= 1) s += 8;

  // Last active (0-25)
  const days = num(c.days_since_last_active) || 999;
  if (days <= 1) s += 25;
  else if (days <= 3) s += 20;
  else if (days <= 7) s += 15;
  else if (days <= 14) s += 8;
  else if (days <= 30) s += 3;

  // Response time (0-20)
  const rt = num(c.avg_response_time_minutes) || 999;
  if (rt <= 5) s += 20;
  else if (rt <= 15) s += 15;
  else if (rt <= 60) s += 10;
  else if (rt <= 240) s += 5;

  // Feature usage (0-20)
  if (num(c.total_auctions_created) > 0) s += 7;
  if (num(c.total_exchanges) > 0) s += 7;
  if ((num(c.total_sales) + num(c.total_purchases)) > 0) s += 6;

  // Listing quality (0-10)
  const quality = num(c.avg_listing_quality_score);
  if (quality >= 80) s += 10;
  else if (quality >= 60) s += 5;

  return Math.min(s, 100);
}

function calcValue(c: CrmCustomer): number {
  let s = 0;

  // Total GMV (0-25)
  const gmv = num(c.total_gmv_egp);
  if (gmv >= 500000) s += 25;
  else if (gmv >= 100000) s += 20;
  else if (gmv >= 50000) s += 15;
  else if (gmv >= 10000) s += 10;
  else if (gmv >= 1000) s += 5;

  // Commission paid (0-25)
  const commission = num(c.total_commission_paid_egp);
  if (commission >= 500) s += 25;
  else if (commission >= 200) s += 20;
  else if (commission >= 50) s += 15;
  else if (commission >= 10) s += 10;
  if (c.is_commission_supporter) s += 5;

  // Subscription (0-20)
  if (c.subscription_plan === 'platinum') s += 20;
  else if (c.subscription_plan === 'gold') s += 15;
  else if (c.subscription_plan === 'silver') s += 10;

  // Addons (0-15)
  const addons = num(c.total_addons_paid_egp);
  if (addons >= 200) s += 15;
  else if (addons >= 50) s += 10;
  else if (addons > 0) s += 5;

  return Math.min(s, 100);
}

function calcChurnRisk(c: CrmCustomer): number {
  let r = 0;

  // Inactivity (0-40)
  const days = num(c.days_since_last_active) || 999;
  if (days >= 60) r += 40;
  else if (days >= 30) r += 30;
  else if (days >= 14) r += 20;
  else if (days >= 7) r += 10;

  // No completed transactions (0-20)
  if ((num(c.total_sales) + num(c.total_purchases) + num(c.total_exchanges)) === 0) r += 20;

  // Expired listings with no renewal (0-15)
  if (num(c.active_listings) === 0 && num(c.total_listings) > 0) r += 15;

  // Low engagement indicators (0-15)
  if (num(c.app_sessions_count) <= 1) r += 10;
  if (num(c.total_messages_received) === 0 && num(c.total_listings) > 0) r += 5;

  // Subscription expiring soon without auto-renew (0-10)
  if (c.subscription_expires_at && !c.subscription_auto_renew) {
    const expiresIn = new Date(c.subscription_expires_at).getTime() - Date.now();
    const daysToExpiry = expiresIn / (1000 * 60 * 60 * 24);
    if (daysToExpiry <= 7 && daysToExpiry > 0) r += 10;
  }

  return Math.min(r, 100);
}

// Auto lifecycle stage determination
export function determineLifecycleStage(customer: CrmCustomer): string | null {
  const days = num(customer.days_since_last_active) || 999;
  const currentStage = customer.lifecycle_stage;

  // Blacklisted stays blacklisted
  if (currentStage === 'blacklisted') return null;

  // Check for churn stages (highest priority — degradation)
  if (days >= 60 && ['active', 'power_user', 'at_risk', 'dormant'].includes(currentStage)) {
    return 'churned';
  }
  if (days >= 30 && ['active', 'power_user', 'at_risk'].includes(currentStage)) {
    return 'dormant';
  }
  if (days >= 14 && ['active', 'power_user'].includes(currentStage)) {
    return 'at_risk';
  }

  // Check for reactivation (came back after 30+ days of inactivity)
  if (days <= 1 && ['dormant', 'churned'].includes(currentStage)) {
    return 'reactivated';
  }

  // Check for power_user promotion
  if (num(customer.active_listings) >= 10 && num(customer.total_sales) >= 5 && currentStage === 'active') {
    return 'power_user';
  }

  // Check for champion (requires: commission supporter + active/power_user)
  // Note: full spec requires referrals >= 3, but we don't track referral count on customer yet
  if (customer.is_commission_supporter && num(customer.total_sales) >= 10 && ['active', 'power_user'].includes(currentStage)) {
    return 'champion';
  }

  // Check for activated (first listing posted)
  if (currentStage === 'onboarding' && num(customer.total_listings) > 0) {
    return 'activated';
  }

  // Check activated → active (has activity within 7 days)
  if (currentStage === 'activated' && days <= 7) {
    return 'active';
  }

  // Check reactivated → active (if still active after reactivation)
  if (currentStage === 'reactivated' && days <= 7 && num(customer.total_listings) > 0) {
    return 'active';
  }

  return null; // No change needed
}
