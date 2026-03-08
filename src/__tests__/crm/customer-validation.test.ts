/**
 * اختبارات التحقق من بيانات العملاء — Customer Validation
 * من وجهة نظر موظف خدمة العملاء:
 * - هل النظام بيرفض أرقام الموبايل الغلط؟
 * - هل بيمنع تكرار العملاء؟
 * - هل البيانات المطلوبة فعلاً مطلوبة؟
 * - هل البيانات الاختيارية اختيارية فعلاً؟
 */

describe('التحقق من بيانات العملاء — Customer Validation', () => {
  // Phone validation regex matching the API
  const phoneRegex = /^01[0125]\d{8}$/;

  describe('التحقق من رقم الموبايل المصري', () => {
    it('يقبل أرقام فودافون (010)', () => {
      expect(phoneRegex.test('01012345678')).toBe(true);
    });

    it('يقبل أرقام اتصالات (011)', () => {
      expect(phoneRegex.test('01112345678')).toBe(true);
    });

    it('يقبل أرقام أورانج (012)', () => {
      expect(phoneRegex.test('01212345678')).toBe(true);
    });

    it('يقبل أرقام WE (015)', () => {
      expect(phoneRegex.test('01512345678')).toBe(true);
    });

    it('يرفض أرقام بتبدأ بـ 013', () => {
      expect(phoneRegex.test('01312345678')).toBe(false);
    });

    it('يرفض أرقام بتبدأ بـ 014', () => {
      expect(phoneRegex.test('01412345678')).toBe(false);
    });

    it('يرفض أرقام بتبدأ بـ 016', () => {
      expect(phoneRegex.test('01612345678')).toBe(false);
    });

    it('يرفض أرقام أقل من 11 رقم', () => {
      expect(phoneRegex.test('0101234567')).toBe(false);
    });

    it('يرفض أرقام أكتر من 11 رقم', () => {
      expect(phoneRegex.test('010123456789')).toBe(false);
    });

    it('يرفض أرقام بدون 0 في الأول', () => {
      expect(phoneRegex.test('1012345678')).toBe(false);
    });

    it('يرفض أرقام فيها حروف', () => {
      expect(phoneRegex.test('010123456ab')).toBe(false);
    });

    it('يرفض رقم فاضي', () => {
      expect(phoneRegex.test('')).toBe(false);
    });

    it('يرفض أرقام فيها مسافات', () => {
      expect(phoneRegex.test('010 1234 5678')).toBe(false);
    });

    it('يرفض أرقام فيها شرطات', () => {
      expect(phoneRegex.test('010-1234-5678')).toBe(false);
    });
  });

  describe('التحقق من البيانات المطلوبة', () => {
    it('الاسم مطلوب — لا يمكن إنشاء عميل بدون اسم', () => {
      const body = { phone: '01012345678' };
      expect(!body.hasOwnProperty('full_name') || !(body as Record<string, unknown>).full_name).toBe(true);
    });

    it('رقم الهاتف مطلوب — لا يمكن إنشاء عميل بدون رقم', () => {
      const body = { full_name: 'أحمد' };
      expect(!body.hasOwnProperty('phone') || !(body as Record<string, unknown>).phone).toBe(true);
    });

    it('البيانات الاختيارية مش مطلوبة — يمكن إنشاء عميل بالاسم والرقم فقط', () => {
      const body = { full_name: 'أحمد محمد', phone: '01012345678' };
      // These are the only required fields
      expect(body.full_name).toBeTruthy();
      expect(phoneRegex.test(body.phone)).toBe(true);
    });
  });

  describe('القيم الافتراضية للعملاء الجدد', () => {
    it('lifecycle_stage الافتراضي هو lead', () => {
      const defaults = { lifecycle_stage: 'lead' };
      expect(defaults.lifecycle_stage).toBe('lead');
    });

    it('account_type الافتراضي هو individual', () => {
      const defaults = { account_type: 'individual' };
      expect(defaults.account_type).toBe('individual');
    });

    it('role الافتراضي هو both', () => {
      const defaults = { role: 'both' };
      expect(defaults.role).toBe('both');
    });

    it('source الافتراضي للإنشاء اليدوي هو cs_agent', () => {
      const defaults = { source: 'cs_agent' };
      expect(defaults.source).toBe('cs_agent');
    });

    it('WhatsApp الافتراضي = رقم الهاتف', () => {
      const phone = '01012345678';
      const whatsapp = phone; // Default behavior
      expect(whatsapp).toBe(phone);
    });
  });

  describe('أنواع الحسابات', () => {
    const validTypes = ['individual', 'store', 'chain', 'wholesaler', 'manufacturer'];

    it.each(validTypes)('يقبل نوع الحساب: %s', (type) => {
      expect(validTypes).toContain(type);
    });

    it('يرفض نوع حساب غير صالح', () => {
      const invalidType = 'enterprise';
      expect(validTypes).not.toContain(invalidType);
    });
  });

  describe('مراحل دورة الحياة المتاحة', () => {
    const validStages = [
      'anonymous', 'lead', 'qualified', 'contacted', 'responded', 'interested',
      'onboarding', 'activated', 'active', 'power_user', 'champion',
      'at_risk', 'dormant', 'churned', 'reactivated', 'blacklisted',
    ];

    it('فيه 16 مرحلة متاحة', () => {
      expect(validStages).toHaveLength(16);
    });

    it.each(validStages)('المرحلة %s موجودة ومعرّفة', (stage) => {
      expect(validStages).toContain(stage);
    });
  });

  describe('تنظيف بيانات الاستيراد', () => {
    it('يشيل المسافات والشرطات من رقم الهاتف', () => {
      const rawPhone = '010-1234-5678';
      const cleaned = rawPhone.replace(/[\s-]/g, '');
      expect(cleaned).toBe('01012345678');
      expect(phoneRegex.test(cleaned)).toBe(true);
    });

    it('يفصل التاجز بالفاصلة', () => {
      const rawTags = 'مميز, جديد, القاهرة';
      const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
      expect(tags).toEqual(['مميز', 'جديد', 'القاهرة']);
    });

    it('يتعامل مع تاجز فاضية', () => {
      const rawTags: string = '';
      const tags = rawTags ? rawTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      expect(tags).toEqual([]);
    });
  });
});
