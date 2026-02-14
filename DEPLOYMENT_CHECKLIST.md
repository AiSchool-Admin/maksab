# قائمة فحص النشر — مكسب Maksab Deployment Checklist

> **آخر تحديث:** 2026-02-14
> **الحالة:** جاهز للنشر بنسبة 95%

---

## المتطلبات قبل البدء

- [ ] حساب [Supabase](https://supabase.com) (خطة Pro موصى بها = $25/شهر)
- [ ] حساب [Vercel](https://vercel.com) (خطة Hobby مجانية كافية للبداية)
- [ ] حساب [Railway](https://railway.app) (خطة Starter = $5/شهر)
- [ ] حساب [Sentry](https://sentry.io) (خطة Developer مجانية)
- [ ] دومين (اختياري — `maksab.app` أو ما تختاره)

---

## الخطوة 1: إعداد Supabase (قاعدة البيانات)

### 1.1 إنشاء المشروع
- [ ] ادخل [supabase.com/dashboard](https://supabase.com/dashboard)
- [ ] اضغط "New Project"
- [ ] **اسم المشروع:** `maksab-production`
- [ ] **Database Password:** اختار باسورد قوي واحفظه في مكان آمن
- [ ] **Region:** اختار `Frankfurt (eu-central-1)` — أقرب لمصر
- [ ] انتظر المشروع يتنشئ (2-3 دقائق)

### 1.2 تشغيل الـ Migrations (19 ملف)
- [ ] روح "SQL Editor" في الـ dashboard
- [ ] شغّل كل migration بالترتيب (من 00001 لحد 00019):

```
supabase/migrations/00001_extensions_and_core_tables.sql
supabase/migrations/00002_ads_table.sql
supabase/migrations/00003_interaction_tables.sql
supabase/migrations/00004_recommendations_tables.sql
supabase/migrations/00005_row_level_security.sql
supabase/migrations/00006_notifications_and_push.sql
supabase/migrations/00007_smart_notifications.sql
supabase/migrations/00008_custom_phone_otp.sql
supabase/migrations/00009_advanced_search.sql
supabase/migrations/00010_personalized_recommendations.sql
supabase/migrations/00011_ratings_verification_offers.sql
supabase/migrations/00012_stores_unified_system.sql
supabase/migrations/00013_fix_store_analytics_rls.sql
supabase/migrations/00014_store_business_types.sql
supabase/migrations/00015_reports_blocks_rate_limits.sql
supabase/migrations/00016_admin_role.sql
supabase/migrations/00017_app_settings.sql
supabase/migrations/00018_security_fixes.sql
supabase/migrations/00019_rls_security_hardening.sql
```

- [ ] تأكد إن كل migration نجح بدون errors

### 1.3 تشغيل البيانات الأساسية (Seed)
- [ ] شغّل `supabase/seed-production.sql` في SQL Editor
- [ ] تأكد إن الرسائل في النهاية كلها "موجودة بالفعل" أو "تم الإنشاء"
- [ ] اتأكد: 12 قسم + 72 قسم فرعي + 27 محافظة + ~200 مدينة

### 1.4 إعداد Storage
- [ ] روح "Storage" في الـ dashboard
- [ ] تأكد إن bucket اسمه `ad-images` موجود (الـ seed بيعمله)
- [ ] لو مش موجود، أنشئه:
  - **Name:** `ad-images`
  - **Public:** Yes
  - **File size limit:** 5MB
  - **Allowed MIME types:** `image/jpeg, image/png, image/webp`

### 1.5 إعداد Realtime
- [ ] روح "Database" → "Replication"
- [ ] فعّل Realtime للجداول دي:
  - `messages` (للشات)
  - `auction_bids` (للمزادات)
  - `notifications` (للإشعارات)

### 1.6 نسخ المفاتيح
- [ ] روح "Settings" → "API"
- [ ] انسخ واحفظ:
  - **Project URL:** `https://xxxxx.supabase.co`
  - **anon public key:** `eyJhbGci...`
  - **service_role key:** `eyJhbGci...` (سري — لا تنشره أبداً)

### 1.7 التحقق النهائي
```sql
-- شغّل الاستعلام ده في SQL Editor للتحقق:
SELECT
  (SELECT count(*) FROM categories) as categories,
  (SELECT count(*) FROM subcategories) as subcategories,
  (SELECT count(*) FROM governorates) as governorates,
  (SELECT count(*) FROM cities) as cities;

-- المفروض يطلع: 12, 72, 27, ~200
```
- [ ] النتائج متوافقة مع المتوقع

---

## الخطوة 2: إعداد Vercel (الموقع)

### 2.1 ربط المشروع
- [ ] ادخل [vercel.com/new](https://vercel.com/new)
- [ ] اضغط "Import Git Repository"
- [ ] اختار `AiSchool-Admin/maksab`
- [ ] **Framework Preset:** Next.js (تلقائي)
- [ ] **Root Directory:** `.` (الافتراضي)
- [ ] **Build Command:** `next build` (الافتراضي)

### 2.2 إعداد Environment Variables
أضف كل المتغيرات دي قبل أول deploy:

#### مطلوبة (لازم تملأها):
| المتغير | الوصف | كيف تحصل عليه |
|---------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | رابط Supabase | من الخطوة 1.6 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح Supabase العام | من الخطوة 1.6 |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح Supabase السري | من الخطوة 1.6 |
| `OTP_SECRET` | مفتاح توقيع OTP | `openssl rand -hex 32` |
| `ADMIN_SETUP_SECRET` | مفتاح حماية الأدمن | `openssl rand -hex 16` |

#### موصى بها:
| المتغير | الوصف | كيف تحصل عليه |
|---------|-------|---------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications | `npx web-push generate-vapid-keys --json` |
| `VAPID_PRIVATE_KEY` | Push notifications | نفس الأمر أعلاه |
| `VAPID_EMAIL` | Push notifications | `mailto:support@maksab.app` |
| `NEXT_PUBLIC_SENTRY_DSN` | مراقبة الأخطاء | من Sentry Dashboard → Client Keys |
| `SENTRY_AUTH_TOKEN` | Sentry uploads | من Sentry → Settings → Auth Tokens |

#### اختيارية (ممكن تضيفها لاحقاً):
| المتغير | الوصف |
|---------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Phone Auth |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp OTP |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp API |
| `NEXT_PUBLIC_PAYMOB_ENABLED` | Paymob payments |

- [ ] كل المتغيرات المطلوبة تم إضافتها
- [ ] كل المتغيرات الموصى بها تم إضافتها

### 2.3 إعداد Domain (اختياري)
- [ ] روح "Settings" → "Domains"
- [ ] أضف الدومين المختار (مثلاً `maksab.app`)
- [ ] حدّث DNS records عند مزود الدومين
- [ ] انتظر SSL يتفعل تلقائي

### 2.4 Deploy
- [ ] اضغط "Deploy"
- [ ] انتظر الـ build ينجح (3-5 دقائق)
- [ ] افتح الرابط وتأكد إن الصفحة شغالة

### 2.5 اختبار سريع
- [ ] الصفحة الرئيسية تفتح بدون أخطاء
- [ ] الأقسام ظاهرة (12 قسم)
- [ ] صفحة البحث شغالة
- [ ] تسجيل دخول بالموبايل يعمل (لو Firebase مفعّل)
- [ ] إنشاء إعلان يعمل
- [ ] صفحة 404 ظاهرة عند زيارة رابط غلط

---

## الخطوة 3: إعداد Railway (Background Worker)

### 3.1 إنشاء الخدمة
- [ ] ادخل [railway.app](https://railway.app)
- [ ] اضغط "New Project" → "Deploy from GitHub"
- [ ] اختار `AiSchool-Admin/maksab`
- [ ] **Root Directory:** `railway`
- [ ] **Start Command:** `npx tsx workers/auction-cron.ts`

### 3.2 إعداد Environment Variables
أضف المتغيرات دي:

| المتغير | القيمة |
|---------|--------|
| `SUPABASE_URL` | نفس `NEXT_PUBLIC_SUPABASE_URL` من الخطوة 2.2 |
| `SUPABASE_SERVICE_ROLE_KEY` | نفس المفتاح السري من الخطوة 2.2 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | نفس الـ VAPID public key |
| `VAPID_PRIVATE_KEY` | نفس الـ VAPID private key |
| `VAPID_EMAIL` | `mailto:support@maksab.app` |

- [ ] كل المتغيرات تم إضافتها

### 3.3 التحقق
- [ ] اضغط "Deploy"
- [ ] افتح "Logs" وتأكد من الرسائل:
  ```
  🟢 مكسب Worker started (Auctions + Smart Notifications)
  ✅ DB health check passed
  ```
- [ ] لو ظهر `❌ DB health check failed` — راجع المتغيرات

---

## الخطوة 4: إعداد Sentry (مراقبة الأخطاء)

- [ ] ادخل [sentry.io](https://sentry.io)
- [ ] أنشئ مشروع جديد → اختار "Next.js"
- [ ] انسخ الـ DSN وأضفه في Vercel كـ `NEXT_PUBLIC_SENTRY_DSN`
- [ ] أنشئ Auth Token وأضفه كـ `SENTRY_AUTH_TOKEN`
- [ ] أعد deploy في Vercel

---

## الخطوة 5: اختبارات ما قبل الإطلاق

### 5.1 اختبار وظيفي
- [ ] **تسجيل دخول:** سجّل برقم جديد → استلم OTP → ادخل
- [ ] **إنشاء إعلان:** أنشئ إعلان في كل نوع بيع (نقدي + مزاد + تبديل)
- [ ] **بحث:** ابحث عن الإعلان اللي أنشأته
- [ ] **شات:** ابدأ محادثة مع بائع
- [ ] **مفضلة:** أضف إعلان للمفضلة
- [ ] **مزاد:** زايد على إعلان مزاد
- [ ] **ملف شخصي:** حدّث البيانات + الصورة

### 5.2 اختبار أمان
- [ ] **RLS:** حاول تعدّل إعلان مش بتاعك (المفروض يرفض)
- [ ] **Rate Limiting:** حاول تبعت OTP أكتر من 5 مرات (المفروض يمنعك)
- [ ] **XSS:** حاول تدخل `<script>alert('xss')</script>` في حقل (المفروض يترفض)
- [ ] **صفحة الأدمن:** جرّب تدخل `/admin` بدون صلاحية

### 5.3 اختبار أداء
- [ ] **Lighthouse:** شغّل Lighthouse في Chrome DevTools → الهدف 90+ Mobile
- [ ] **سرعة التحميل:** الصفحة الرئيسية تفتح في أقل من 3 ثواني
- [ ] **صور:** الصور تتحمّل بسرعة (WebP + lazy loading)

### 5.4 اختبار PWA
- [ ] **على Android:** افتح الموقع → "Add to Home Screen" → التطبيق يفتح كـ standalone
- [ ] **على iOS:** افتح في Safari → Share → "Add to Home Screen"
- [ ] **أيقونات:** الأيقونة ظاهرة صح على الشاشة الرئيسية
- [ ] **Offline:** افصل النت → التطبيق يعرض صفحة offline مناسبة

---

## الخطوة 6: إطلاق تجريبي (Closed Beta)

- [ ] ابعت الرابط لـ 50-100 شخص (أصدقاء + عائلة)
- [ ] اعمل Google Form لجمع الـ feedback
- [ ] راقب Sentry يومياً لأي أخطاء
- [ ] راقب Supabase Dashboard → Usage لاستهلاك الموارد
- [ ] أصلح أي مشاكل تظهر
- [ ] بعد أسبوع: قيّم الوضع وقرر لو مستعد للإطلاق الموسع

---

## ملاحظات أمنية مهمة

1. **لا تنشر `SUPABASE_SERVICE_ROLE_KEY` أبداً** — هذا المفتاح يتجاوز كل الحماية
2. **لا تنشر `OTP_SECRET`** — يُستخدم لتوقيع رموز الجلسة
3. **لا تنشر `ADMIN_SETUP_SECRET`** — يحمي إنشاء حسابات الأدمن
4. **غيّر الباسوردات فوراً** لو شكيت إنها اتسرّبت
5. **راجع الـ Supabase logs** بانتظام لأي نشاط مشبوه
6. **فعّل 2FA** على حسابات Supabase + Vercel + Railway + GitHub

---

## ملخص التكاليف الشهرية (تقدير)

| الخدمة | الخطة | التكلفة |
|--------|-------|---------|
| Supabase | Pro | $25/شهر |
| Vercel | Hobby (مجاني) أو Pro | $0-20/شهر |
| Railway | Starter | $5/شهر |
| Sentry | Developer (مجاني) | $0/شهر |
| Domain | سنوي | ~$12/سنة |
| **الإجمالي** | | **~$30-50/شهر** |

---

## الملفات المرجعية

| الملف | الوصف |
|-------|-------|
| `LAUNCH_PLAN.md` | خطة الإطلاق الكاملة (6 مراحل) |
| `.env.local.example` | كل المتغيرات البيئية مع شرح |
| `vercel.json` | إعدادات Vercel (headers + security + caching) |
| `supabase/migrations/` | 19 migration بالترتيب |
| `supabase/seed-production.sql` | البيانات الأساسية |
| `railway/workers/auction-cron.ts` | كود الـ Background Worker |
| `.github/workflows/ci.yml` | CI/CD pipeline |
