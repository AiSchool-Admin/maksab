/**
 * اختبارات نظام التقييم (Scoring) في CRM
 * من وجهة نظر موظف خدمة العملاء:
 * - هل التقييمات بتعكس حالة العميل الفعلية؟
 * - هل النقاط بتتحسب صح؟
 * - هل النظام بيفرق بين العملاء المهمين والعاديين؟
 */

import { calculateAllScores } from '@/lib/crm/scoring';
import type { CrmCustomer } from '@/types/crm';

// Helper: create a minimal CrmCustomer with overrides
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

describe('نظام التقييم CRM — Scoring Engine', () => {
  describe('الحساب العام — calculateAllScores', () => {
    it('يرجع كل النقاط الخمسة', () => {
      const customer = makeCustomer();
      const scores = calculateAllScores(customer);

      expect(scores).toHaveProperty('acquisition_score');
      expect(scores).toHaveProperty('engagement_score');
      expect(scores).toHaveProperty('value_score');
      expect(scores).toHaveProperty('churn_risk_score');
      expect(scores).toHaveProperty('health_score');
    });

    it('كل النقاط بين 0 و 100', () => {
      const customer = makeCustomer();
      const scores = calculateAllScores(customer);

      expect(scores.acquisition_score).toBeGreaterThanOrEqual(0);
      expect(scores.acquisition_score).toBeLessThanOrEqual(100);
      expect(scores.engagement_score).toBeGreaterThanOrEqual(0);
      expect(scores.engagement_score).toBeLessThanOrEqual(100);
      expect(scores.value_score).toBeGreaterThanOrEqual(0);
      expect(scores.value_score).toBeLessThanOrEqual(100);
      expect(scores.churn_risk_score).toBeGreaterThanOrEqual(0);
      expect(scores.churn_risk_score).toBeLessThanOrEqual(100);
      expect(scores.health_score).toBeGreaterThanOrEqual(0);
      expect(scores.health_score).toBeLessThanOrEqual(100);
    });

    it('النقاط الصحية = تجميعة مرجّحة من الباقي', () => {
      const customer = makeCustomer({
        estimated_competitor_listings: 50,
        account_type: 'chain',
        primary_category: 'phones',
        governorate: 'القاهرة',
        active_listings: 20,
        days_since_last_active: 0,
        avg_response_time_minutes: 3,
        total_gmv_egp: 600000,
        total_commission_paid_egp: 600,
        subscription_plan: 'platinum',
      });
      const scores = calculateAllScores(customer);

      // health = acq*0.15 + eng*0.35 + val*0.30 + (100-churn)*0.20
      const expectedHealth = Math.round(
        scores.acquisition_score * 0.15 +
        scores.engagement_score * 0.35 +
        scores.value_score * 0.30 +
        (100 - scores.churn_risk_score) * 0.20
      );
      expect(scores.health_score).toBe(Math.min(Math.max(expectedHealth, 0), 100));
    });
  });

  describe('تقييم الاستحواذ — Acquisition Score', () => {
    it('سلسلة محلات في القاهرة بيع موبايلات = تقييم عالي', () => {
      const customer = makeCustomer({
        account_type: 'chain',
        primary_category: 'phones',
        governorate: 'القاهرة',
        estimated_competitor_listings: 60,
        secondary_categories: ['electronics', 'luxury'],
      });
      const scores = calculateAllScores(customer);
      expect(scores.acquisition_score).toBeGreaterThanOrEqual(70);
    });

    it('فرد بدون إعلانات سابقة = تقييم منخفض', () => {
      const customer = makeCustomer({
        account_type: 'individual',
        estimated_competitor_listings: 0,
      });
      const scores = calculateAllScores(customer);
      expect(scores.acquisition_score).toBeLessThan(30);
    });

    it('تاجر جملة يحتل مرتبة أعلى من متجر عادي', () => {
      const wholesaler = makeCustomer({ account_type: 'wholesaler' });
      const store = makeCustomer({ account_type: 'store' });
      const scoresW = calculateAllScores(wholesaler);
      const scoresS = calculateAllScores(store);
      expect(scoresW.acquisition_score).toBeGreaterThan(scoresS.acquisition_score);
    });

    it('إعلانات المنافسين الكتير بتزود التقييم', () => {
      const low = makeCustomer({ estimated_competitor_listings: 2 });
      const high = makeCustomer({ estimated_competitor_listings: 55 });
      expect(calculateAllScores(high).acquisition_score).toBeGreaterThan(
        calculateAllScores(low).acquisition_score
      );
    });

    it('أكتر من category بتزود التقييم', () => {
      const single = makeCustomer({ secondary_categories: [] });
      const multi = makeCustomer({ secondary_categories: ['phones', 'electronics', 'gold'] });
      expect(calculateAllScores(multi).acquisition_score).toBeGreaterThan(
        calculateAllScores(single).acquisition_score
      );
    });

    it('verified على منافس = 15 نقطة زيادة', () => {
      const unverified = makeCustomer({ competitor_profiles: {} });
      const verified = makeCustomer({
        competitor_profiles: { olx: { verified: true, listings: 10 } },
      });
      const diff = calculateAllScores(verified).acquisition_score - calculateAllScores(unverified).acquisition_score;
      expect(diff).toBe(15);
    });
  });

  describe('تقييم التفاعل — Engagement Score', () => {
    it('عميل نشط جداً = تقييم عالي', () => {
      const customer = makeCustomer({
        active_listings: 25,
        days_since_last_active: 0,
        avg_response_time_minutes: 3,
        total_auctions_created: 5,
        total_exchanges: 3,
        total_sales: 10,
        avg_listing_quality_score: 90,
      });
      const scores = calculateAllScores(customer);
      expect(scores.engagement_score).toBeGreaterThanOrEqual(90);
    });

    it('عميل خامل من 30 يوم = تقييم منخفض', () => {
      const customer = makeCustomer({
        active_listings: 0,
        days_since_last_active: 35,
        avg_response_time_minutes: null,
      });
      const scores = calculateAllScores(customer);
      expect(scores.engagement_score).toBe(0);
    });

    it('وقت استجابة سريع بيحسّن التقييم', () => {
      const fast = makeCustomer({ avg_response_time_minutes: 3 });
      const slow = makeCustomer({ avg_response_time_minutes: 300 });
      expect(calculateAllScores(fast).engagement_score).toBeGreaterThan(
        calculateAllScores(slow).engagement_score
      );
    });

    it('استخدام المزادات والتبديل بيزود النقاط', () => {
      const basic = makeCustomer({});
      const powerUser = makeCustomer({
        total_auctions_created: 3,
        total_exchanges: 2,
        total_sales: 5,
      });
      expect(calculateAllScores(powerUser).engagement_score).toBeGreaterThan(
        calculateAllScores(basic).engagement_score
      );
    });
  });

  describe('تقييم القيمة — Value Score', () => {
    it('عميل GMV عالي + عمولة + اشتراك بلاتيني = تقييم ممتاز', () => {
      const customer = makeCustomer({
        total_gmv_egp: 1000000,
        total_commission_paid_egp: 700,
        is_commission_supporter: true,
        subscription_plan: 'platinum',
        total_addons_paid_egp: 300,
      });
      const scores = calculateAllScores(customer);
      expect(scores.value_score).toBeGreaterThanOrEqual(85);
    });

    it('عميل مجاني بدون مبيعات = 0', () => {
      const customer = makeCustomer({
        total_gmv_egp: 0,
        total_commission_paid_egp: 0,
        subscription_plan: 'free',
      });
      const scores = calculateAllScores(customer);
      expect(scores.value_score).toBe(0);
    });

    it('الاشتراك الذهبي أعلى من الفضي', () => {
      const gold = makeCustomer({ subscription_plan: 'gold' });
      const silver = makeCustomer({ subscription_plan: 'silver' });
      expect(calculateAllScores(gold).value_score).toBeGreaterThan(
        calculateAllScores(silver).value_score
      );
    });

    it('داعم العمولة بياخد نقاط إضافية', () => {
      const supporter = makeCustomer({ is_commission_supporter: true, total_commission_paid_egp: 100 });
      const notSupporter = makeCustomer({ is_commission_supporter: false, total_commission_paid_egp: 100 });
      expect(calculateAllScores(supporter).value_score).toBeGreaterThan(
        calculateAllScores(notSupporter).value_score
      );
    });
  });

  describe('تقييم خطر المغادرة — Churn Risk Score', () => {
    it('عميل غايب 60+ يوم = خطر عالي', () => {
      const customer = makeCustomer({ days_since_last_active: 65 });
      const scores = calculateAllScores(customer);
      expect(scores.churn_risk_score).toBeGreaterThanOrEqual(40);
    });

    it('عميل نشط النهارده = خطر منخفض', () => {
      const customer = makeCustomer({
        days_since_last_active: 0,
        total_sales: 5,
        active_listings: 3,
        app_sessions_count: 50,
        total_messages_received: 10,
      });
      const scores = calculateAllScores(customer);
      expect(scores.churn_risk_score).toBe(0);
    });

    it('days_since_last_active = 0 يُعامل كـ "نشط النهارده" مش كـ "غير معروف"', () => {
      const customer = makeCustomer({
        days_since_last_active: 0,
        total_sales: 1,
        active_listings: 1,
        app_sessions_count: 5,
        total_messages_received: 1,
      });
      const scores = calculateAllScores(customer);
      // 0 يعني نشط النهارده — خطر المغادرة لازم يكون 0
      expect(scores.churn_risk_score).toBe(0);
    });

    it('days_since_last_active = null يُعامل كـ "غير معروف" = خطر عالي', () => {
      const customer = makeCustomer({
        days_since_last_active: null as unknown as number,
      });
      const scores = calculateAllScores(customer);
      expect(scores.churn_risk_score).toBeGreaterThanOrEqual(40);
    });

    it('عميل عنده إعلانات بس مفيش بيع = خطر أعلى', () => {
      const noSales = makeCustomer({
        total_listings: 5,
        active_listings: 0,
        total_sales: 0,
        total_purchases: 0,
      });
      const withSales = makeCustomer({
        total_listings: 5,
        active_listings: 2,
        total_sales: 3,
      });
      expect(calculateAllScores(noSales).churn_risk_score).toBeGreaterThan(
        calculateAllScores(withSales).churn_risk_score
      );
    });

    it('اشتراك قرب ينتهي بدون تجديد تلقائي = خطر', () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 3); // 3 days from now
      const customer = makeCustomer({
        subscription_expires_at: expiringDate.toISOString(),
        subscription_auto_renew: false,
        subscription_plan: 'gold',
      });
      const scores = calculateAllScores(customer);
      expect(scores.churn_risk_score).toBeGreaterThanOrEqual(10);
    });

    it('session واحدة بس = مؤشر خطر', () => {
      const customer = makeCustomer({ app_sessions_count: 1 });
      const scores = calculateAllScores(customer);
      expect(scores.churn_risk_score).toBeGreaterThanOrEqual(10);
    });
  });

  describe('تعامل مع بيانات Supabase (strings as numbers)', () => {
    it('يتعامل مع القيم الرقمية اللي جاية كـ string', () => {
      const customer = makeCustomer({
        estimated_competitor_listings: '25' as unknown as number,
        total_gmv_egp: '150000' as unknown as number,
        days_since_last_active: '5' as unknown as number,
        active_listings: '10' as unknown as number,
      });
      const scores = calculateAllScores(customer);
      // Should not throw and should calculate properly
      expect(scores.acquisition_score).toBeGreaterThan(0);
      expect(scores.engagement_score).toBeGreaterThan(0);
    });

    it('يتعامل مع null/undefined بأمان', () => {
      const customer = makeCustomer({
        estimated_competitor_listings: null as unknown as number,
        total_gmv_egp: undefined as unknown as number,
        avg_response_time_minutes: null,
      });
      expect(() => calculateAllScores(customer)).not.toThrow();
    });
  });
});
