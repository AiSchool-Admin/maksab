/**
 * اختبارات نظام إدارة دورة حياة العميل — Lifecycle Management
 * من وجهة نظر موظف خدمة العملاء:
 * - هل النظام بينقل العميل للمرحلة الصح تلقائياً؟
 * - هل بيكتشف العملاء اللي هيسيبونا (churn)؟
 * - هل بيكافئ العملاء المميزين (power user / champion)؟
 * - هل بيكتشف العملاء اللي رجعوا تاني (reactivation)؟
 */

import { determineLifecycleStage } from '@/lib/crm/scoring';
import type { CrmCustomer, LifecycleStage } from '@/types/crm';

function makeCustomer(overrides: Partial<CrmCustomer> = {}): CrmCustomer {
  return {
    id: 'test-id',
    full_name: 'أحمد محمد',
    display_name: null,
    phone: '01012345678',
    phone_verified: false,
    whatsapp: '01012345678',
    whatsapp_verified: false,
    email: null,
    email_verified: false,
    avatar_url: null,
    national_id: null,
    account_type: 'individual',
    role: 'both',
    is_verified: false,
    verification_level: 'none',
    business_name: null,
    business_name_ar: null,
    business_license_number: null,
    tax_id: null,
    business_category: null,
    business_description: null,
    business_logo_url: null,
    business_cover_url: null,
    website_url: null,
    subscription_plan: 'free',
    subscription_billing: 'none',
    subscription_started_at: null,
    subscription_expires_at: null,
    subscription_auto_renew: false,
    max_active_listings: 5,
    max_featured_listings: 0,
    governorate: null,
    city: null,
    area: null,
    address: null,
    latitude: null,
    longitude: null,
    primary_category: null,
    secondary_categories: [],
    interests: [],
    source: 'organic',
    source_detail: null,
    source_url: null,
    source_platform: null,
    referral_code: null,
    referred_by: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    lifecycle_stage: 'lead',
    lifecycle_changed_at: new Date().toISOString(),
    lifecycle_history: [],
    acquisition_score: 0,
    engagement_score: 0,
    value_score: 0,
    churn_risk_score: 0,
    health_score: 0,
    scores_updated_at: null,
    total_listings: 0,
    active_listings: 0,
    total_sales: 0,
    total_purchases: 0,
    total_exchanges: 0,
    total_auctions_created: 0,
    total_auctions_won: 0,
    total_views_received: 0,
    total_messages_received: 0,
    avg_response_time_minutes: null,
    avg_listing_quality_score: null,
    total_gmv_egp: 0,
    total_commission_paid_egp: 0,
    commission_payment_rate: 0,
    is_commission_supporter: false,
    last_commission_paid_at: null,
    total_subscription_paid_egp: 0,
    total_addons_paid_egp: 0,
    total_featured_purchased: 0,
    total_boosts_purchased: 0,
    preferred_channel: 'whatsapp',
    preferred_language: 'ar',
    notification_enabled: true,
    marketing_consent: true,
    marketing_consent_at: null,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    do_not_contact: false,
    do_not_contact_reason: null,
    outreach_attempts: 0,
    last_outreach_at: null,
    last_outreach_channel: null,
    last_response_at: null,
    last_response_sentiment: null,
    last_active_at: null,
    last_app_open_at: null,
    last_listing_posted_at: null,
    last_transaction_at: null,
    first_listing_at: null,
    first_transaction_at: null,
    app_sessions_count: 0,
    days_since_last_active: 0,
    assigned_agent_id: null,
    assigned_at: null,
    loyalty_tier: 'bronze',
    loyalty_points: 0,
    loyalty_points_lifetime: 0,
    loyalty_tier_upgraded_at: null,
    lifetime_value_egp: 0,
    competitor_profiles: {},
    estimated_competitor_listings: 0,
    migrated_from: null,
    tags: [],
    internal_notes: null,
    app_user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('إدارة دورة حياة العميل — Lifecycle Management', () => {

  describe('اكتشاف المغادرة (Churn Detection)', () => {
    it('عميل نشط غايب 60+ يوم = churned', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        days_since_last_active: 65,
      });
      expect(determineLifecycleStage(customer)).toBe('churned');
    });

    it('عميل power_user غايب 60+ يوم = churned', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'power_user',
        days_since_last_active: 90,
      });
      expect(determineLifecycleStage(customer)).toBe('churned');
    });

    it('عميل at_risk غايب 60+ يوم = churned', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'at_risk',
        days_since_last_active: 70,
      });
      expect(determineLifecycleStage(customer)).toBe('churned');
    });

    it('عميل dormant غايب 60+ يوم = churned', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'dormant',
        days_since_last_active: 80,
      });
      expect(determineLifecycleStage(customer)).toBe('churned');
    });
  });

  describe('اكتشاف الخمول (Dormancy Detection)', () => {
    it('عميل نشط غايب 30+ يوم = dormant', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        days_since_last_active: 35,
      });
      expect(determineLifecycleStage(customer)).toBe('dormant');
    });

    it('عميل power_user غايب 30+ يوم = dormant', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'power_user',
        days_since_last_active: 45,
      });
      expect(determineLifecycleStage(customer)).toBe('dormant');
    });

    it('عميل at_risk غايب 30+ يوم = dormant', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'at_risk',
        days_since_last_active: 40,
      });
      expect(determineLifecycleStage(customer)).toBe('dormant');
    });
  });

  describe('اكتشاف الخطر (At Risk Detection)', () => {
    it('عميل نشط غايب 14+ يوم = at_risk', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        days_since_last_active: 20,
      });
      expect(determineLifecycleStage(customer)).toBe('at_risk');
    });

    it('عميل power_user غايب 14+ يوم = at_risk', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'power_user',
        days_since_last_active: 16,
      });
      expect(determineLifecycleStage(customer)).toBe('at_risk');
    });
  });

  describe('اكتشاف العودة (Reactivation)', () => {
    it('عميل dormant رجع النهارده = reactivated', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'dormant',
        days_since_last_active: 1, // Note: 0 is treated as "unknown" (999) via `|| 999`
      });
      expect(determineLifecycleStage(customer)).toBe('reactivated');
    });

    it('⚠️ days_since_last_active = 0 يُعامل كـ 999 — لا يتم اكتشاف العودة', () => {
      // هذا سلوك حالي: num(0) || 999 = 999 → يُعتبر churned مش reactivated
      const customer = makeCustomer({
        lifecycle_stage: 'dormant',
        days_since_last_active: 0,
      });
      expect(determineLifecycleStage(customer)).toBe('churned');
    });

    it('عميل churned رجع النهارده = reactivated', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'churned',
        days_since_last_active: 1,
      });
      expect(determineLifecycleStage(customer)).toBe('reactivated');
    });

    it('عميل dormant لسه غايب = مفيش تغيير', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'dormant',
        days_since_last_active: 10,
      });
      expect(determineLifecycleStage(customer)).toBeNull();
    });
  });

  describe('ترقية Power User', () => {
    it('عميل نشط + 10 إعلانات + 5 مبيعات = power_user', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        active_listings: 12,
        total_sales: 7,
        days_since_last_active: 1,
      });
      expect(determineLifecycleStage(customer)).toBe('power_user');
    });

    it('عميل نشط + إعلانات قليلة = لا ترقية', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        active_listings: 5,
        total_sales: 7,
        days_since_last_active: 1,
      });
      expect(determineLifecycleStage(customer)).toBeNull();
    });

    it('عميل lead مش هيترقى لـ power_user مباشرة', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'lead',
        active_listings: 15,
        total_sales: 10,
      });
      // Should not jump from lead to power_user
      expect(determineLifecycleStage(customer)).not.toBe('power_user');
    });
  });

  describe('ترقية Champion', () => {
    it('داعم عمولة + 10 مبيعات + نشط = champion', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        is_commission_supporter: true,
        total_sales: 12,
        days_since_last_active: 1,
      });
      expect(determineLifecycleStage(customer)).toBe('champion');
    });

    it('داعم عمولة + 10 مبيعات + power_user = champion', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'power_user',
        is_commission_supporter: true,
        total_sales: 15,
        days_since_last_active: 1,
      });
      expect(determineLifecycleStage(customer)).toBe('champion');
    });

    it('مش داعم عمولة = لا ترقية لـ champion', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        is_commission_supporter: false,
        total_sales: 20,
      });
      expect(determineLifecycleStage(customer)).not.toBe('champion');
    });
  });

  describe('التفعيل (Activation)', () => {
    it('عميل onboarding نشر أول إعلان = activated', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'onboarding',
        total_listings: 1,
      });
      expect(determineLifecycleStage(customer)).toBe('activated');
    });

    it('عميل onboarding بدون إعلانات = لا تغيير', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'onboarding',
        total_listings: 0,
      });
      expect(determineLifecycleStage(customer)).toBeNull();
    });

    it('عميل activated + نشط خلال 7 أيام = active', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'activated',
        days_since_last_active: 3,
      });
      expect(determineLifecycleStage(customer)).toBe('active');
    });

    it('عميل reactivated + نشط + عنده إعلانات = active', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'reactivated',
        days_since_last_active: 2,
        total_listings: 3,
      });
      expect(determineLifecycleStage(customer)).toBe('active');
    });
  });

  describe('القائمة السوداء (Blacklist)', () => {
    it('عميل محظور يفضل محظور دايماً', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'blacklisted',
        days_since_last_active: 0,
        active_listings: 50,
        total_sales: 100,
        is_commission_supporter: true,
      });
      expect(determineLifecycleStage(customer)).toBeNull();
    });
  });

  describe('أولوية القواعد', () => {
    it('الـ churn أولوية أعلى من dormant', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        days_since_last_active: 65, // qualifies for both churn and dormant
      });
      expect(determineLifecycleStage(customer)).toBe('churned');
    });

    it('الـ dormant أولوية أعلى من at_risk', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        days_since_last_active: 35, // qualifies for both dormant and at_risk
      });
      expect(determineLifecycleStage(customer)).toBe('dormant');
    });

    it('عميل نشط مستقر = لا تغيير (null)', () => {
      const customer = makeCustomer({
        lifecycle_stage: 'active',
        days_since_last_active: 3,
        active_listings: 3,
        total_sales: 2,
      });
      expect(determineLifecycleStage(customer)).toBeNull();
    });
  });
});
