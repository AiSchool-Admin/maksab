/**
 * اختبارات التسميات والترجمة العربية — Labels & Localization
 * من وجهة نظر موظف خدمة العملاء:
 * - هل كل مرحلة عندها تسمية عربية؟
 * - هل كل مصدر عنده تسمية عربية؟
 * - هل الألوان متعيّنة لكل مرحلة؟
 * - هل كل الأقسام عندها ترجمة؟
 */

import {
  LIFECYCLE_LABELS,
  LIFECYCLE_COLORS,
  SOURCE_LABELS,
  ACCOUNT_TYPE_LABELS,
  CATEGORY_LABELS,
  SUBSCRIPTION_LABELS,
  LOYALTY_LABELS,
} from '@/types/crm';
import type { LifecycleStage } from '@/types/crm';

describe('التسميات والترجمة العربية — Labels & Localization', () => {

  describe('تسميات مراحل دورة الحياة', () => {
    const allStages: LifecycleStage[] = [
      'anonymous', 'lead', 'qualified', 'contacted', 'responded', 'interested',
      'onboarding', 'activated', 'active', 'power_user', 'champion',
      'at_risk', 'dormant', 'churned', 'reactivated', 'blacklisted',
    ];

    it('كل مرحلة عندها تسمية عربية', () => {
      for (const stage of allStages) {
        expect(LIFECYCLE_LABELS[stage]).toBeDefined();
        expect(LIFECYCLE_LABELS[stage].length).toBeGreaterThan(0);
      }
    });

    it('كل مرحلة عندها لون CSS', () => {
      for (const stage of allStages) {
        expect(LIFECYCLE_COLORS[stage]).toBeDefined();
        expect(LIFECYCLE_COLORS[stage]).toContain('bg-');
        expect(LIFECYCLE_COLORS[stage]).toContain('text-');
      }
    });

    it('التسميات مش فاضية', () => {
      expect(LIFECYCLE_LABELS.lead).toBe('عميل محتمل');
      expect(LIFECYCLE_LABELS.active).toBe('نشط');
      expect(LIFECYCLE_LABELS.churned).toBe('غادر');
      expect(LIFECYCLE_LABELS.blacklisted).toBe('محظور');
    });
  });

  describe('تسميات مصادر العملاء', () => {
    const expectedSources = [
      'organic', 'whatsapp_campaign', 'sms_campaign', 'email_campaign',
      'facebook_ad', 'google_ad', 'tiktok_ad', 'referral',
      'cs_agent', 'import_csv', 'competitor_migration',
    ];

    it('كل مصدر عنده تسمية عربية', () => {
      for (const source of expectedSources) {
        expect(SOURCE_LABELS[source]).toBeDefined();
        expect(SOURCE_LABELS[source].length).toBeGreaterThan(0);
      }
    });

    it('مصدر موظف خدمة العملاء = "موظف خدمة عملاء"', () => {
      expect(SOURCE_LABELS.cs_agent).toBe('موظف خدمة عملاء');
    });

    it('مصدر الاستيراد = "استيراد CSV"', () => {
      expect(SOURCE_LABELS.import_csv).toBe('استيراد CSV');
    });
  });

  describe('تسميات أنواع الحسابات', () => {
    it('فرد = individual', () => {
      expect(ACCOUNT_TYPE_LABELS.individual).toBe('فرد');
    });

    it('متجر = store', () => {
      expect(ACCOUNT_TYPE_LABELS.store).toBe('متجر');
    });

    it('سلسلة محلات = chain', () => {
      expect(ACCOUNT_TYPE_LABELS.chain).toBe('سلسلة محلات');
    });

    it('تاجر جملة = wholesaler', () => {
      expect(ACCOUNT_TYPE_LABELS.wholesaler).toBe('تاجر جملة');
    });

    it('مصنع = manufacturer', () => {
      expect(ACCOUNT_TYPE_LABELS.manufacturer).toBe('مصنع');
    });
  });

  describe('تسميات الأقسام', () => {
    it('أقسام CRM الأساسية معرّفة', () => {
      expect(CATEGORY_LABELS.phones).toBeDefined();
      expect(CATEGORY_LABELS.vehicles).toBeDefined();
      expect(CATEGORY_LABELS.properties).toBeDefined();
      expect(CATEGORY_LABELS.furniture).toBeDefined();
    });

    it('أقسام التطبيق الأساسية معرّفة', () => {
      expect(CATEGORY_LABELS.cars).toBeDefined();
      expect(CATEGORY_LABELS.real_estate).toBeDefined();
      expect(CATEGORY_LABELS.gold).toBeDefined();
      expect(CATEGORY_LABELS.scrap).toBeDefined();
      expect(CATEGORY_LABELS.luxury).toBeDefined();
    });

    it('التسميات بالعربي', () => {
      expect(CATEGORY_LABELS.phones).toBe('موبايلات وتابلت');
      expect(CATEGORY_LABELS.gold).toBe('ذهب وفضة');
      expect(CATEGORY_LABELS.scrap).toBe('خردة');
    });
  });

  describe('تسميات خطط الاشتراك', () => {
    it('كل الخطط معرّفة', () => {
      expect(SUBSCRIPTION_LABELS.free).toBe('مجاني');
      expect(SUBSCRIPTION_LABELS.silver).toBe('فضي');
      expect(SUBSCRIPTION_LABELS.gold).toBe('ذهبي');
      expect(SUBSCRIPTION_LABELS.platinum).toBe('بلاتيني');
    });
  });

  describe('تسميات مستويات الولاء', () => {
    it('كل المستويات معرّفة', () => {
      expect(LOYALTY_LABELS.bronze).toBe('برونزي');
      expect(LOYALTY_LABELS.silver).toBe('فضي');
      expect(LOYALTY_LABELS.gold).toBe('ذهبي');
      expect(LOYALTY_LABELS.platinum).toBe('بلاتيني');
      expect(LOYALTY_LABELS.diamond).toBe('ماسي');
    });

    it('فيه 5 مستويات ولاء', () => {
      expect(Object.keys(LOYALTY_LABELS)).toHaveLength(5);
    });
  });
});
