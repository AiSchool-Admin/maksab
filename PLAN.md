# خطة الإصلاح — 3 مهام

---

## المهمة 1: العمولة المسبقة 0.5% مع أولوية الظهور وشارة "موثوق"

### الوضع الحالي
- النظام الحالي: عمولة تطوعية 1% بعد إتمام الصفقة (min 10, max 200 EGP)
- `commission-service.ts` يحسب 1% ويرسل لـ `/api/payment/process`
- الدفع: Vodafone Cash / InstaPay / Fawry / Paymob Card — كلها تعمل
- شارة "داعم مكسب 💚" موجودة بالفعل عبر `isCommissionSupporter()`

### التغييرات المطلوبة

**1. `src/lib/commission/commission-service.ts`**
- إضافة دالة `calculatePrepaidCommission(price)` → 0.5% (min 5, max 100 EGP)
- إضافة type `"prepaid"` لـ `CommissionStatus`
- إضافة دالة `submitPrepaidCommission()` تُستدعى عند إنشاء الإعلان

**2. `src/app/api/payment/process/route.ts`**
- إضافة handling لـ `type: "prepaid"` في body
- تسجيل commission record مع `status: "prepaid_pending"` ثم `"prepaid_paid"`

**3. `supabase/migrations/` — migration جديد**
- إضافة أعمدة للـ `ads` table:
  - `is_prepaid_commission BOOLEAN DEFAULT FALSE`
  - `is_trusted BOOLEAN DEFAULT FALSE` (شارة موثوق)
  - `boost_until TIMESTAMPTZ` (أولوية الظهور حتى تاريخ)
- توسيع CHECK constraint لـ `commissions.status` لتشمل `'prepaid_pending'`, `'prepaid_paid'`

**4. `src/app/api/search/route.ts`**
- تعديل ترتيب النتائج: الإعلانات ذات `is_prepaid_commission = true` AND `boost_until > NOW()` تظهر أولاً

**5. `src/app/ad/create/page.tsx` — Step 3 (السعر والصور)**
- إضافة قسم "ادفع مقدماً واستفيد" بعد إدخال السعر:
  ```
  ┌─────────────────────────────────────┐
  │ 💎 ادفع 0.5% مقدماً واستفيد        │
  │                                     │
  │ بدل 1% بعد البيع، ادفع 0.5% دلوقتي │
  │ واحصل على:                          │
  │ ✅ شارة "موثوق" على إعلانك          │
  │ ✅ أولوية الظهور في نتائج البحث      │
  │                                     │
  │ العمولة: XX جنيه (0.5% من السعر)    │
  │                                     │
  │ [💳 ادفع دلوقتي]  [⏭ لاحقاً]       │
  └─────────────────────────────────────┘
  ```

**6. مكون `TrustedBadge`**
- شارة "موثوق ✅" تظهر على AdCard وصفحة تفاصيل الإعلان
- لون ذهبي مميز عن باقي الإعلانات

**7. `src/components/ad/AdCard.tsx`**
- إضافة شارة "موثوق" + إطار ذهبي خفيف للإعلانات المدفوعة مسبقاً

---

## المهمة 2: أسعار الذهب اللحظية + تقييم المصنعية

### الوضع الحالي
- **لا يوجد أي نظام لأسعار الذهب** — البائع يدخل السعر يدوياً فقط
- فئة الذهب موجودة بحقول: النوع، العيار، الوزن، الحالة

### التغييرات المطلوبة

**1. `src/lib/gold/gold-price-service.ts` — ملف جديد**
- دالة `fetchCurrentGoldPrices()` → تجلب أسعار الذهب الحالية
- مصدر البيانات: scraping من مواقع أسعار الذهب المصرية أو API مجاني
- Cache لمدة 15 دقيقة (لا نحتاج أكثر من ذلك)
- الأسعار المطلوبة لكل جرام: عيار 24، 21، 18، 14
- يُرجع: `{ karat24: number, karat21: number, karat18: number, karat14: number, updatedAt: string }`

**2. `src/app/api/gold/prices/route.ts` — API route جديد**
- `GET /api/gold/prices` → يُرجع أسعار الذهب الحالية
- Cache في memory لمدة 15 دقيقة
- fallback: أسعار ثابتة مع تحذير "الأسعار غير مُحدّثة"

**3. `src/lib/gold/gold-valuation.ts` — ملف جديد**
- دالة `calculateGoldValue(weight, karat, currentPrices)` → القيمة الخام للذهب
- دالة `calculateCraftsmanshipPremium(adPrice, goldValue)` → نسبة/مبلغ المصنعية
- المعادلة: `المصنعية = سعر الإعلان - (الوزن × سعر الجرام حسب العيار)`

**4. `src/components/gold/GoldPriceWidget.tsx` — مكون جديد**
- يُعرض في صفحة تفاصيل إعلانات الذهب
  ```
  ┌──────────────────────────────────┐
  │ 💰 تقييم السعر                   │
  │                                  │
  │ سعر الجرام اليوم (عيار 21):     │
  │ 3,850 جنيه/جرام                 │
  │ ⏰ آخر تحديث: منذ 5 دقائق       │
  │                                  │
  │ قيمة الذهب الخام: 57,750 جنيه   │
  │ (15 جرام × 3,850 جنيه)          │
  │                                  │
  │ سعر الإعلان: 62,000 جنيه        │
  │ 🔧 المصنعية: 4,250 جنيه         │
  │ (7.4% فوق سعر الذهب الخام)      │
  │                                  │
  │ ⚠️ هذا السعر هو سعر المصنعية    │
  │    فقط — سعر الذهب الخام محسوب   │
  │    من سعر البورصة اليوم          │
  └──────────────────────────────────┘
  ```

**5. `src/app/ad/[id]/page.tsx` (AdDetailClient)**
- إضافة `GoldPriceWidget` عند `category_id === "gold" || category_id === "gold_silver"`
- يُعرض بعد قسم المواصفات

**6. `src/app/ad/create/page.tsx` — Step 2 (تفاصيل الذهب)**
- عرض سعر الجرام الحالي أثناء إنشاء الإعلان كمرجع للبائع
- اقتراح سعر تلقائي = (الوزن × سعر الجرام) + نسبة مصنعية افتراضية 10%

---

## المهمة 3: فحص وإصلاح Push Notifications الخارجية

### الوضع الحالي
- **الكود جاهز 95%** — `smart-notifications.ts` يرسل push عبر `web-push`
- **Service Worker** يستقبل ويعرض الإشعارات بشكل صحيح (RTL، عربي، أيقونات)
- **طلب Permission** يعمل عبر `PostLoginPushPrompt` + `PushPromptBanner`

### المشاكل الموجودة (3 مشاكل)

**مشكلة 1: `web-push` في devDependencies بدل dependencies**
- الحزمة مطلوبة runtime على السيرفر لكنها في devDependencies
- لن تُثبّت في production build على Vercel

**مشكلة 2: مفاتيح VAPID غير مُعدّة**
- `.env.local` لا يحتوي على `NEXT_PUBLIC_VAPID_PUBLIC_KEY` أو `VAPID_PRIVATE_KEY`
- بدون المفاتيح: `sendPushToUser()` يعمل return مبكراً ولا يُرسل أي إشعار

**مشكلة 3: لا يتم فحص تفضيلات المستخدم**
- جدول `notification_preferences` موجود لكن **لا يُفحص** قبل الإرسال
- المستخدم لا يمكنه إيقاف أنواع معينة من الإشعارات

### التغييرات المطلوبة

**1. `package.json`**
- نقل `web-push` من `devDependencies` إلى `dependencies`

**2. `.env.local`**
- توليد مفاتيح VAPID: `npx web-push generate-vapid-keys --json`
- إضافة:
  ```
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated_public_key>
  VAPID_PRIVATE_KEY=<generated_private_key>
  ```

**3. `src/lib/notifications/smart-notifications.ts`**
- في `sendPushToUser()`: فحص `notification_preferences` قبل الإرسال
  ```typescript
  // قبل إرسال push:
  const { data: prefs } = await client
    .from("notification_preferences")
    .select("push_enabled, new_message, auction_updates, price_drops")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs && !prefs.push_enabled) return; // المستخدم أوقف الإشعارات
  // + فحص النوع المحدد (new_message, auction_updates, etc.)
  ```

**4. إضافة دالة `getPreferenceKeyForType()`**
- تربط نوع الإشعار بعمود التفضيلات:
  - `chat` → `new_message`
  - `auction_bid`, `auction_outbid`, `auction_ending`, `auction_won` → `auction_updates`
  - `favorite_price_drop` → `price_drops`
  - `new_match`, `exchange_match` → `new_in_category`

**5. اختبار شامل يدوي**
- تأكد أن الإشعار يظهر فعلاً على الموبايل خارج التطبيق
- اختبر على Chrome Android + Safari iOS
- اختبر click → فتح الصفحة الصحيحة
