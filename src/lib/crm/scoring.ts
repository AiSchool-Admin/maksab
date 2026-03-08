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

function calcAcquisition(c: CrmCustomer): number {
  let s = 0;

  // Estimated competitor listings (0-25)
  if (c.estimated_competitor_listings >= 50) s += 25;
  else if (c.estimated_competitor_listings >= 20) s += 20;
  else if (c.estimated_competitor_listings >= 10) s += 15;
  else if (c.estimated_competitor_listings >= 5) s += 10;
  else s += 5;

  // Account type (0-20)
  const biz: Record<string, number> = { chain: 20, wholesaler: 18, store: 15, manufacturer: 15, individual: 8 };
  s += biz[c.account_type] || 5;

  // Verified on competitor (0-15)
  if (c.competitor_profiles && Object.values(c.competitor_profiles).some(p => p.verified)) s += 15;

  // Category priority (0-20)
  const cat: Record<string, number> = {
    phones: 20, electronics: 18, vehicles: 15, furniture: 12, fashion: 12,
    properties: 10, kids: 8, sports: 8, pets: 6, services: 5, jobs: 4, other: 3
  };
  s += cat[c.primary_category || ''] || 3;

  // Location priority (0-10)
  const loc: Record<string, number> = {
    cairo: 10, alexandria: 10, giza: 9, qalyubia: 7, sharqia: 6,
    dakahlia: 6, gharbia: 5, monufia: 5, beheira: 4
  };
  s += loc[c.governorate || ''] || 3;

  // Multi-category (0-10)
  s += Math.min((c.secondary_categories?.length || 0) * 3, 10);

  return Math.min(s, 100);
}

function calcEngagement(c: CrmCustomer): number {
  let s = 0;

  // Active listings (0-25)
  if (c.active_listings >= 20) s += 25;
  else if (c.active_listings >= 10) s += 20;
  else if (c.active_listings >= 5) s += 15;
  else if (c.active_listings >= 1) s += 8;

  // Last active (0-25)
  const days = c.days_since_last_active || 999;
  if (days <= 1) s += 25;
  else if (days <= 3) s += 20;
  else if (days <= 7) s += 15;
  else if (days <= 14) s += 8;
  else if (days <= 30) s += 3;

  // Response time (0-20)
  const rt = c.avg_response_time_minutes || 999;
  if (rt <= 5) s += 20;
  else if (rt <= 15) s += 15;
  else if (rt <= 60) s += 10;
  else if (rt <= 240) s += 5;

  // Feature usage (0-20)
  if (c.total_auctions_created > 0) s += 7;
  if (c.total_exchanges > 0) s += 7;
  if ((c.total_sales + c.total_purchases) > 0) s += 6;

  // Listing quality (0-10)
  if ((c.avg_listing_quality_score || 0) >= 80) s += 10;
  else if ((c.avg_listing_quality_score || 0) >= 60) s += 5;

  return Math.min(s, 100);
}

function calcValue(c: CrmCustomer): number {
  let s = 0;

  // Total GMV (0-25)
  if (c.total_gmv_egp >= 500000) s += 25;
  else if (c.total_gmv_egp >= 100000) s += 20;
  else if (c.total_gmv_egp >= 50000) s += 15;
  else if (c.total_gmv_egp >= 10000) s += 10;
  else if (c.total_gmv_egp >= 1000) s += 5;

  // Commission paid (0-25)
  if (c.total_commission_paid_egp >= 500) s += 25;
  else if (c.total_commission_paid_egp >= 200) s += 20;
  else if (c.total_commission_paid_egp >= 50) s += 15;
  else if (c.total_commission_paid_egp >= 10) s += 10;
  if (c.is_commission_supporter) s += 5;

  // Subscription (0-20)
  if (c.subscription_plan === 'platinum') s += 20;
  else if (c.subscription_plan === 'gold') s += 15;
  else if (c.subscription_plan === 'silver') s += 10;

  // Addons (0-15)
  if (c.total_addons_paid_egp >= 200) s += 15;
  else if (c.total_addons_paid_egp >= 50) s += 10;
  else if (c.total_addons_paid_egp > 0) s += 5;

  return Math.min(s, 100);
}

function calcChurnRisk(c: CrmCustomer): number {
  let r = 0;

  // Inactivity (0-40)
  const days = c.days_since_last_active || 999;
  if (days >= 60) r += 40;
  else if (days >= 30) r += 30;
  else if (days >= 14) r += 20;
  else if (days >= 7) r += 10;

  // No completed transactions (0-20)
  if ((c.total_sales + c.total_purchases + c.total_exchanges) === 0) r += 20;

  // Expired listings with no renewal (0-15)
  if (c.active_listings === 0 && c.total_listings > 0) r += 15;

  // Low engagement indicators (0-15)
  if (c.app_sessions_count <= 1) r += 10;
  if (c.total_messages_received === 0 && c.total_listings > 0) r += 5;

  return Math.min(r, 100);
}

// Auto lifecycle stage determination
export function determineLifecycleStage(customer: CrmCustomer): string | null {
  const days = customer.days_since_last_active || 999;
  const currentStage = customer.lifecycle_stage;

  // Blacklisted stays blacklisted
  if (currentStage === 'blacklisted') return null;

  // Check for churn stages
  if (days >= 60 && ['active', 'power_user', 'at_risk', 'dormant'].includes(currentStage)) {
    return 'churned';
  }
  if (days >= 30 && ['active', 'power_user', 'at_risk'].includes(currentStage)) {
    return 'dormant';
  }
  if (days >= 14 && ['active', 'power_user'].includes(currentStage)) {
    return 'at_risk';
  }

  // Check for power_user promotion
  if (customer.active_listings >= 10 && customer.total_sales >= 5 && currentStage === 'active') {
    return 'power_user';
  }

  // Check for champion
  if (customer.is_commission_supporter && ['active', 'power_user'].includes(currentStage)) {
    // Simplified: commission supporter + active = champion candidate
    return 'champion';
  }

  return null; // No change needed
}
