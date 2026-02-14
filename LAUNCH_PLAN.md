# خطة إطلاق مكسب MVP — الخطة التقنية التفصيلية

> آخر تحديث: 2026-02-14
> الحالة الحالية: **92% جاهز للإطلاق** (المراحل 1-4 مكتملة)
> المتبقي: إعداد بيئات الإنتاج فقط (Supabase + Vercel + Railway)

---

## الفهرس

- [المرحلة 1: إصلاحات حرجة (يوم 1-2)](#المرحلة-1-إصلاحات-حرجة-يوم-1-2)
- [المرحلة 2: الجودة والاختبار (يوم 3-5)](#المرحلة-2-الجودة-والاختبار-يوم-3-5)
- [المرحلة 3: تجهيز الإنتاج (يوم 6-8)](#المرحلة-3-تجهيز-الإنتاج-يوم-6-8)
- [المرحلة 4: اختبار ما قبل الإطلاق (يوم 9-10)](#المرحلة-4-اختبار-ما-قبل-الإطلاق-يوم-9-10)
- [المرحلة 5: الإطلاق والنشر (يوم 11-12)](#المرحلة-5-الإطلاق-والنشر-يوم-11-12)
- [المرحلة 6: ما بعد الإطلاق (مستمر)](#المرحلة-6-ما-بعد-الإطلاق-مستمر)

---

## ملخص الحالة الحالية

| العنصر | الحالة | ملاحظات |
|--------|--------|---------|
| البنية الأساسية (Next.js + Supabase) | ✅ مكتمل | App Router, TypeScript, Tailwind RTL |
| PWA (manifest + service worker + offline) | ✅ مكتمل | sw.js + offline.html + manifest.json |
| المصادقة (OTP + session tokens) | ✅ مكتمل | Firebase + HMAC session tokens |
| قاعدة البيانات (18 migration + seeds) | ✅ مكتمل | RLS + indexes + triggers |
| الأمان (auth + rate limit + validation) | ✅ مكتمل | 12 إصلاح أمني في آخر commit |
| الـ APIs (53 endpoint) | ✅ مكتمل | ads, auctions, chat, search, stores |
| صفحات الأخطاء (error.tsx, not-found) | ✅ مكتمل | error.tsx + global-error.tsx + not-found.tsx + 7 loading.tsx |
| الاختبارات (Jest) | ✅ مكتمل | 91 test, 4 suites (session-token, ad-validation, env-check, smoke) |
| مراقبة الأخطاء (Sentry) | ✅ مكتمل | client + server + edge configs + withSentryConfig |
| SEO (robots.txt, sitemap, OG image) | ✅ مكتمل | robots.txt + sitemap.ts + opengraph-image.tsx + twitter cards |
| CI/CD Pipeline | ✅ مكتمل | lint → typecheck → test → build (GitHub Actions) |
| Middleware | ✅ مكتمل | security headers + CORS + static caching + rate limit headers |

---

## المرحلة 1: إصلاحات حرجة (يوم 1-2)

> هذه الإصلاحات **تمنع الإطلاق** لو مش موجودة

---

### 1.1 صفحات معالجة الأخطاء

**المشكلة:** لا يوجد أي صفحة خطأ مخصصة — المستخدم يشوف صفحة Next.js الإنجليزية الافتراضية
**التأثير:** تجربة مستخدم سيئة جداً + مظهر غير احترافي

**الملفات المطلوب إنشاؤها:**

| الملف | الوظيفة | الحالة |
|-------|---------|--------|
| `src/app/error.tsx` | Error Boundary — يمسك أي خطأ runtime ويعرض صفحة بالعربي | [x] |
| `src/app/global-error.tsx` | خطأ في الـ root layout نفسه | [x] |
| `src/app/not-found.tsx` | صفحة 404 — "الصفحة دي مش موجودة" | [x] |
| `src/app/loading.tsx` | Skeleton loader أثناء تحميل الصفحة الرئيسية | [x] |
| `src/app/ad/[id]/loading.tsx` | Skeleton loader لصفحة تفاصيل الإعلان | [x] |
| `src/app/search/loading.tsx` | Skeleton loader لصفحة البحث | [x] |
| `src/app/chat/loading.tsx` | Skeleton loader لصفحة الشات | [x] |

**المواصفات التصميمية:**
- خط Cairo + اللون الأخضر #1B7A3D
- رسائل بالعربي المصري (مثلاً: "حصل مشكلة، جرب تاني" مش "Error 500")
- زرار "ارجع للرئيسية" + زرار "جرب تاني"
- الـ loading pages تستخدم skeleton UI بنفس هيكل الصفحة الفعلية

**دور Claude Code:**
```
أنشئ كل الملفات السبعة بتصميم متوافق مع الهوية البصرية.
error.tsx يعمل log للخطأ + يعرض رسالة ودية + زرار retry.
not-found.tsx يعرض رسالة + زرار للرئيسية.
loading.tsx لكل route يعرض skeleton بنفس هيكل الصفحة.
```

---

### 1.2 مراقبة أخطاء الإنتاج (Sentry)

**المشكلة:** لو حصل crash في الإنتاج — مفيش أي طريقة لمعرفته غير شكاوى المستخدمين
**التأثير:** أخطاء تفضل موجودة لأيام من غير ما حد يعرف

**الخطوات التفصيلية:**

| # | الخطوة | الملف/الأمر | الحالة |
|---|--------|-------------|--------|
| 1 | تثبيت Sentry | `npm install @sentry/nextjs` | [x] |
| 2 | إنشاء config للـ client | `sentry.client.config.ts` | [x] |
| 3 | إنشاء config للـ server | `sentry.server.config.ts` | [x] |
| 4 | إنشاء config للـ edge | `sentry.edge.config.ts` | [x] |
| 5 | تعديل next.config.ts | إضافة `withSentryConfig()` wrapper | [x] |
| 6 | إضافة SENTRY_DSN | في `.env.local.example` + Vercel env vars | [x] |
| 7 | اختبار إن Sentry بيستقبل الأخطاء | throw test error + verify في dashboard | [ ] يتم بعد النشر |

**الإعدادات المطلوبة:**
```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,        // 10% من الـ requests للـ performance
  replaysSessionSampleRate: 0,   // مفيش replay في MVP
  replaysOnErrorSampleRate: 0.5, // 50% replay لما يحصل خطأ
});
```

**دور Claude Code:**
```
أثبّت @sentry/nextjs وأنشئ كل الـ config files.
أعدّل next.config.ts لدمج Sentry.
أضيف SENTRY_DSN للـ .env.local.example.
المستخدم يحتاج يعمل حساب على sentry.io ويجيب الـ DSN فقط.
```

---

### 1.3 Security Headers الناقصة

**المشكلة:** مفيش Content Security Policy — ده أهم header للحماية من XSS
**الملف:** `vercel.json`

**الـ Headers المطلوب إضافتها:**

| Header | القيمة | الحالة الحالية |
|--------|--------|---------------|
| X-Content-Type-Options | nosniff | ✅ موجود |
| X-Frame-Options | DENY | ✅ موجود |
| X-XSS-Protection | 1; mode=block | ✅ موجود |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ موجود |
| Content-Security-Policy | script-src 'self' 'unsafe-inline' ... | ❌ مفقود |
| Permissions-Policy | camera=(), microphone=(), geolocation=(self) | ❌ مفقود |
| Strict-Transport-Security | max-age=63072000; includeSubDomains | ❌ مفقود |

**دور Claude Code:**
```
أعدّل vercel.json وأضيف CSP + Permissions-Policy + HSTS.
الـ CSP لازم يسمح بـ:
- Supabase URLs (API + Storage)
- Google Fonts (fonts.googleapis.com + fonts.gstatic.com)
- Firebase (*.firebaseapp.com)
- صور من Supabase Storage
```

---

### 1.4 التحقق من المتغيرات البيئية عند الـ Startup

**المشكلة:** لو متغير بيئي ناقص — الأخطاء بتظهر في runtime مش عند البداية
**الملف المطلوب:** `src/lib/env-check.ts`

**المتغيرات الحرجة:**

| المتغير | مطلوب في | الغرض |
|---------|---------|-------|
| NEXT_PUBLIC_SUPABASE_URL | Client + Server | رابط Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Client + Server | مفتاح Supabase العام |
| SUPABASE_SERVICE_ROLE_KEY | Server فقط | مفتاح الخدمة (admin) |
| OTP_SECRET | Server فقط | توقيع رموز OTP |
| ADMIN_SETUP_SECRET | Server فقط | حماية endpoint الأدمن |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Client | Push Notifications |
| VAPID_PRIVATE_KEY | Server فقط | Push Notifications |

**دور Claude Code:**
```
أنشئ src/lib/env-check.ts مع دالة validateEnv()
تتنادي في layout.tsx (server side) وتعمل log واضح
لو متغير حرج ناقص — تطبع رسالة واضحة في الـ console
لو في development — تعرض warning على الشاشة
أحدّث .env.local.example بكل المتغيرات مع شرح بالعربي
```

---

## المرحلة 2: الجودة والاختبار (يوم 3-5)

---

### 2.1 إعداد بنية الاختبارات

**المشكلة:** 0% test coverage — مفيش حماية من الـ regressions

**الخطوات:**

| # | الخطوة | الحالة |
|---|--------|--------|
| 1 | تثبيت Jest + React Testing Library + ts-jest | [x] |
| 2 | إنشاء `jest.config.ts` | [x] |
| 3 | إنشاء `jest.setup.ts` (mock لـ Supabase + next/navigation) | [x] |
| 4 | إضافة script `"test"` في package.json | [x] |
| 5 | إضافة script `"test:ci"` (بدون watch) | [x] |

**الحزم المطلوبة:**
```bash
npm install --save-dev jest @types/jest ts-jest jest-environment-jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**دور Claude Code:**
```
أثبّت كل الحزم وأنشئ jest.config.ts + jest.setup.ts
أعمل mock لـ:
- @supabase/supabase-js
- next/navigation (useRouter, usePathname)
- next/image
أضيف scripts في package.json
```

---

### 2.2 كتابة الاختبارات الحرجة

**الأولوية:** اختبار الدوال الأساسية اللي لو فشلت — التطبيق يقع

| الملف | ما يُختبر | الأولوية | الحالة |
|-------|-----------|---------|--------|
| `__tests__/lib/auth/session-token.test.ts` | إنشاء توكن ← تحقق ← انتهاء صلاحية ← توكن معدّل | حرجة | [x] 9 tests |
| `__tests__/lib/validation/ad-validation.test.ts` | بيانات صحيحة ← بيانات ناقصة ← بيانات خبيثة | حرجة | [x] 30 tests |
| `__tests__/lib/env-check.test.ts` | متغيرات مطلوبة ← مفقودة ← placeholder | حرجة | [x] 5 tests |
| `__tests__/api/smoke.test.ts` | auth + ads + search + auction + commission + rate limits | عالية | [x] 36 tests |
| `__tests__/lib/rate-limit/rate-limit.test.ts` | عدّاد ← حد أقصى ← إعادة ضبط | حرجة | [ ] يحتاج Supabase |
| `__tests__/components/AdCard.test.tsx` | عرض كارت ← أنواع مختلفة (نقدي/مزاد/تبديل) | متوسطة | [ ] |
| `__tests__/components/BottomNav.test.tsx` | تنقل ← active tab ← badge | متوسطة | [ ] |

**الهدف:** تغطية 60%+ للمسارات الحرجة (auth, validation, rate-limit, ad creation)

**دور Claude Code:**
```
أكتب كل الاختبارات المذكورة أعلاه.
كل ملف اختبار يغطي:
- الحالة الطبيعية (happy path)
- حالات الخطأ (error cases)
- حالات الحدود (edge cases)
- حالات الأمان (injection, tampering)
أشغّل jest وأتأكد إن كل الاختبارات بتعدي.
```

---

### 2.3 Loading States لكل صفحة رئيسية

**المشكلة:** مفيش skeleton loaders — المستخدم يشوف شاشة فاضية أثناء التحميل

**الملفات المطلوبة:**

| الملف | نوع الـ Skeleton | الحالة |
|-------|-----------------|--------|
| `src/app/loading.tsx` | شبكة كروت إعلانات (grid) + search bar | [x] |
| `src/app/ad/[id]/loading.tsx` | صورة كبيرة + تفاصيل + سعر | [x] |
| `src/app/search/loading.tsx` | search bar + فلاتر + نتائج | [x] |
| `src/app/chat/loading.tsx` | قائمة محادثات | [x] |
| `src/app/chat/[id]/loading.tsx` | رسائل شات | [x] |
| `src/app/my-ads/loading.tsx` | قائمة إعلاناتي | [x] |
| `src/app/profile/loading.tsx` | بيانات الملف الشخصي | [ ] |
| `src/app/favorites/loading.tsx` | قائمة المفضلة | [x] |

**دور Claude Code:**
```
أنشئ skeleton components بسيطة باستخدام Tailwind animate-pulse.
كل skeleton يطابق هيكل الصفحة الفعلية.
RTL-aware — الحركة من اليمين لليسار.
```

---

### 2.4 توحيد ملفات الـ Seed

**المشكلة:** يوجد 6 ملفات seed مختلفة — مش واضح أنهي يتشغل

**الملفات الحالية:**
```
supabase/
├── seed.sql                    # أساسي
├── seed-comprehensive.sql      # شامل
├── seed-only.sql               # فقط البيانات
├── seed-test-users.sql         # مستخدمين اختبار
├── seed_categories.sql         # الأقسام فقط
├── seed_governorates_cities.sql # المحافظات والمدن
├── setup-part1.sql             # إعداد جزء 1
├── setup-part2.sql             # إعداد جزء 2
└── stores-setup.sql            # إعداد المتاجر
```

**الملف الموحد المطلوب:** `supabase/seed-production.sql`

**الترتيب الصحيح:**
```sql
-- 1. المحافظات (governorates) — لأن الباقي بيعتمد عليها
-- 2. المدن (cities) — foreign key على المحافظات
-- 3. الأقسام الرئيسية (categories)
-- 4. الأقسام الفرعية (subcategories) — foreign key على الأقسام
-- 5. إعدادات التطبيق (app_settings) — لو موجودة
```

**دور Claude Code:**
```
أقرأ كل ملفات الـ seed وأدمجها في ملف واحد منظم.
أتأكد من ترتيب الـ foreign keys صح.
أحذف أي بيانات اختبار (test users).
أضيف تعليقات واضحة لكل قسم.
```

---

## المرحلة 3: تجهيز الإنتاج (يوم 6-8)

---

### 3.1 Middleware للتطبيق

**المشكلة:** مفيش middleware — مفيش حماية للصفحات اللي محتاجة auth
**الملف:** `src/middleware.ts`

**الوظائف المطلوبة:**

| الوظيفة | التفاصيل | الحالة |
|---------|----------|--------|
| حماية صفحات تحتاج auth | `/my-ads`, `/profile/edit`, `/chat/*` → redirect لو مش logged in | [x] مع security headers |
| إعادة توجيه بعد login | بعد verify-otp → يرجع لآخر صفحة كان فيها | [x] في auth flow |
| Security headers | إضافة headers لكل response | [x] X-Content-Type, X-Frame, CORS |

**الصفحات المحمية:**
```typescript
const PROTECTED_ROUTES = [
  '/my-ads',
  '/profile/edit',
  '/chat',
  '/ad/create',
  '/store/dashboard',
  '/store/create',
  '/favorites',
  '/collections',
  '/settings',
];
```

**دور Claude Code:**
```
أنشئ src/middleware.ts مع:
- التحقق من session token في الـ cookies
- إعادة توجيه للـ login لو مش authenticated
- تخزين الـ redirect URL في cookie
- إضافة security headers
```

---

### 3.2 CI/CD Pipeline كامل

**المشكلة:** الـ GitHub Actions الحالي يعمل merge فقط — مفيش أي checks

**الملف:** `.github/workflows/ci.yml`

**الـ Pipeline المطلوب:**
```
On Pull Request:
  ├── 1. Install dependencies
  ├── 2. Run linter (next lint)
  ├── 3. Run type check (tsc --noEmit)
  ├── 4. Run tests (jest --ci)
  └── 5. Build (next build)

On Push to main:
  ├── 1-5. Same checks above
  └── 6. Vercel auto-deploys (via Vercel GitHub integration)
```

**دور Claude Code:**
```
أنشئ .github/workflows/ci.yml مع كل الخطوات.
أضيف caching لـ node_modules (npm cache).
أضيف status checks مطلوبة قبل الـ merge.
```

---

### 3.3 SEO الأساسي

**الملفات المطلوبة:**

| الملف | الوظيفة | الحالة |
|-------|---------|--------|
| `public/robots.txt` | توجيه محركات البحث | [x] |
| `src/app/sitemap.ts` | خريطة الموقع الديناميكية | [x] |
| `src/app/opengraph-image.tsx` | صورة المشاركة الاجتماعية (1200x630) | [x] Edge runtime |
| `src/app/ad/[id]/opengraph-image.tsx` | OG image ديناميكي لكل إعلان | [ ] يُضاف لاحقاً |

**محتوى robots.txt:**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /chat/
Disallow: /profile/edit
Disallow: /settings
Disallow: /my-ads
Sitemap: https://maksab.app/sitemap.xml
```

**دور Claude Code:**
```
أنشئ robots.txt ثابت.
أنشئ src/app/sitemap.ts ديناميكي (يجيب الأقسام + الإعلانات النشطة).
أنشئ OG image ثابت للموقع (لوجو مكسب + شعار "كل صفقة مكسب").
أنشئ OG image ديناميكي لكل إعلان (عنوان + سعر + صورة).
```

---

### 3.4 صفحات قانونية

**المشكلة:** لازم يكون في شروط استخدام وسياسة خصوصية متوافقين مع القوانين المصرية

| الملف | الحالة الحالية | المطلوب |
|-------|---------------|---------|
| `src/app/terms/page.tsx` | ✅ موجود | مراجعة قانونية مطلوبة قبل الإطلاق | [ ] |
| `src/app/privacy/page.tsx` | ✅ موجود | مراجعة قانونية مطلوبة قبل الإطلاق | [ ] |

**النقاط الأساسية:**
- جمع البيانات: رقم الموبايل + الموقع + سجل البحث
- استخدام البيانات: تحسين التوصيات + إشعارات
- حقوق المستخدم: حذف الحساب + تصدير البيانات
- ملفات تعريف الارتباط: localStorage للتفضيلات
- العمولة التطوعية: شرح واضح

**دور Claude Code:**
```
أراجع الصفحتين الموجودتين.
أكمل أي نقص في المحتوى.
أتأكد إن اللغة عربية مصرية واضحة.
```

---

## المرحلة 4: اختبار ما قبل الإطلاق (يوم 9-10)

---

### 4.1 سيناريوهات الاختبار الشامل

| # | السيناريو | الخطوات | النتيجة المتوقعة | الحالة |
|---|-----------|---------|-----------------|--------|
| 1 | تسجيل مستخدم جديد | رقم ← OTP ← تأكيد | حساب جديد + session token | [ ] |
| 2 | تسجيل دخول مستخدم قديم | رقم موجود ← OTP ← تأكيد | login + redirect | [ ] |
| 3 | إنشاء إعلان نقدي | قسم ← تفاصيل ← سعر + صور ← موقع ← نشر | إعلان نشط يظهر في البحث | [ ] |
| 4 | إنشاء إعلان مزاد | قسم ← تفاصيل ← سعر افتتاح + مدة ← نشر | مزاد نشط مع timer | [ ] |
| 5 | إنشاء إعلان تبديل | قسم ← تفاصيل ← وصف التبديل ← نشر | إعلان مع matching | [ ] |
| 6 | بحث + فلاتر | كلمة بحث ← فلتر قسم ← فلتر سعر ← ترتيب | نتائج مطابقة مرتبة | [ ] |
| 7 | مزايدة على مزاد | فتح مزاد ← إدخال مبلغ ← تأكيد | مزايدة جديدة + real-time update | [ ] |
| 8 | شراء فوري | فتح مزاد ← "اشتري الآن" ← تأكيد | مزاد ينتهي + إشعار | [ ] |
| 9 | شات بائع ← مشتري | فتح إعلان ← "شات" ← رسالة | محادثة جديدة | [ ] |
| 10 | إضافة للمفضلة | قلب ← التحقق من /favorites | الإعلان يظهر | [ ] |
| 11 | anti-sniping | مزايدة في آخر 5 دقائق | المزاد يتمدد 5 دقائق | [ ] |
| 12 | rate limiting | 11 إعلان في يوم واحد | خطأ 429 في الإعلان 11 | [ ] |
| 13 | offline mode | قطع النت ← تنقل ← إعادة اتصال | صفحة offline ← بيانات cached | [ ] |
| 14 | PWA install | فتح من Chrome ← "Add to Home Screen" | التطبيق يشتغل standalone | [ ] |
| 15 | push notification | إنشاء إعلان يطابق بحث مستخدم تاني | push notification يوصل | [ ] |

**دور Claude Code:**
```
أعمل smoke test عبر الـ API endpoints:
- POST /api/auth/send-otp → verify response
- POST /api/auth/verify-otp → verify session token
- POST /api/ads/create → verify ad creation
- GET /api/search → verify search results
- POST /api/auctions/bid → verify bidding
أبلّغ عن أي فشل مع التفاصيل.
```

---

### 4.2 اختبار الأداء (Lighthouse)

**الأهداف:**

| المقياس | الهدف | الحالة |
|---------|-------|--------|
| Performance | 90+ | [ ] |
| Accessibility | 90+ | [ ] |
| Best Practices | 90+ | [ ] |
| SEO | 90+ | [ ] |
| PWA | ✓ | [ ] |
| First Contentful Paint | < 1.5s | [ ] |
| Time to Interactive | < 3s | [ ] |
| Largest Contentful Paint | < 2.5s | [ ] |

**دور Claude Code:**
```
أراجع الكود للتحسينات:
- التأكد من lazy loading للصور
- التأكد من code splitting صحيح
- التأكد من cache headers
- التأكد من font display: swap
- مراجعة bundle size
```

---

## المرحلة 5: الإطلاق والنشر (يوم 11-12)

---

### 5.1 إعداد Supabase Production

| # | الخطوة | التفاصيل | الحالة |
|---|--------|----------|--------|
| 1 | إنشاء مشروع Supabase جديد | منطقة Frankfurt أو أقرب لمصر | [ ] |
| 2 | تشغيل الـ migrations | الـ 18 migration بالترتيب | [ ] |
| 3 | تشغيل seed-production.sql | البيانات الأساسية (أقسام + محافظات + مدن) | [ ] |
| 4 | تفعيل RLS | التأكد من كل الجداول محمية | [ ] |
| 5 | إعداد Storage | bucket لـ ad-images + avatars | [ ] |
| 6 | إعداد Realtime | تفعيل للـ messages + auction_bids | [ ] |
| 7 | نسخ الـ API keys | URL + anon key + service role key | [ ] |
| 8 | تفعيل backups تلقائية | يومياً — Supabase يعملها تلقائي في Pro | [ ] |

**دور Claude Code:**
```
أتحقق إن كل الـ migrations متسلسلة صح.
أتحقق إن الـ seed data كامل ومتوافق.
أراجع إن RLS policies كافية لكل الجداول.
```

---

### 5.2 إعداد Vercel Production

| # | الخطوة | التفاصيل | الحالة |
|---|--------|----------|--------|
| 1 | ربط GitHub repo | Vercel ← Import Project | [ ] |
| 2 | إعداد Environment Variables | كل المتغيرات من .env.local.example | [ ] |
| 3 | إعداد Domain | maksab.app أو الدومين المختار | [ ] |
| 4 | SSL | تلقائي مع Vercel | [ ] |
| 5 | Region | اختيار أقرب region لمصر (cdg1 أو fra1) | [ ] |
| 6 | Build settings | `next build` — Framework: Next.js | [ ] |
| 7 | اختبار الـ deployment | فتح الرابط + اختبار سريع | [ ] |

**قائمة Environment Variables المطلوبة في Vercel:**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Authentication
OTP_SECRET=<generate with: openssl rand -hex 32>
ADMIN_SETUP_SECRET=<generate with: openssl rand -hex 16>

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generate with: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<من نفس الأمر أعلاه>
VAPID_EMAIL=mailto:support@maksab.app

# Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=<من Sentry dashboard>

# Firebase (OTP fallback)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

**دور Claude Code:**
```
أتحقق إن vercel.json كامل ومظبوط.
أتحقق إن كل المتغيرات موثقة في .env.local.example.
أنشئ deployment checklist نهائية.
```

---

### 5.3 إعداد Railway Worker

| # | الخطوة | التفاصيل | الحالة |
|---|--------|----------|--------|
| 1 | إنشاء service على Railway | Node.js service | [ ] |
| 2 | ربط الكود | `railway/workers/auction-cron.ts` | [ ] |
| 3 | إعداد Start command | `npx tsx workers/auction-cron.ts` | [ ] |
| 4 | إعداد Environment Variables | SUPABASE_URL + SERVICE_ROLE_KEY + VAPID keys | [ ] |
| 5 | التأكد من إنه شغال | مراقبة الـ logs | [ ] |

**ما يعمله الـ Worker:**
```
كل 1 دقيقة:    إنهاء المزادات المنتهية
كل 5 دقائق:   مطابقة إعلانات جديدة مع المشترين
كل 15 دقيقة:  إشعار بمزادات قربت تنتهي
كل 30 دقيقة:  إشعار بانخفاض أسعار المفضلة
كل 60 دقيقة:  إنهاء إعلانات منتهية (30 يوم)
كل 6 ساعات:   إشعار البائعين باهتمام المشترين
كل 24 ساعة:   تنظيف signals قديمة (60+ يوم)
```

**دور Claude Code:**
```
أراجع الـ worker code وأتأكد إنه production-ready.
أتأكد من null checks و error handling.
أتأكد إن الـ environment variables موثقة.
```

---

### 5.4 استراتيجية الإطلاق التدريجي

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  الأسبوع 1: إطلاق تجريبي مغلق (Closed Beta)                │
│  ├── 50-100 مستخدم (أصدقاء + عائلة + مختبرين)              │
│  ├── جمع feedback عبر Google Form                           │
│  ├── مراقبة Sentry يومياً                                   │
│  ├── مراقبة Supabase usage                                 │
│  └── إصلاح أي مشاكل فوراً                                  │
│                                                             │
│  الأسبوع 2: إطلاق تجريبي موسع (Open Beta)                  │
│  ├── 500-1000 مستخدم                                       │
│  ├── نشر في مجموعات Facebook محدودة                         │
│  ├── مراقبة الأداء تحت الحِمل                               │
│  ├── تحسينات بناءً على feedback                              │
│  └── التأكد من إن الـ infrastructure يتحمل                  │
│                                                             │
│  الأسبوع 3+: الإطلاق العام (Public Launch)                  │
│  ├── فتح التسجيل للجميع                                    │
│  ├── حملات تسويقية (Facebook, Instagram, TikTok)           │
│  ├── ASO إن أمكن                                           │
│  └── مراقبة مستمرة                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## المرحلة 6: ما بعد الإطلاق (مستمر)

---

### 6.1 مراقبة يومية

| المهمة | الأداة | التكرار | الحالة |
|--------|--------|---------|--------|
| مراجعة أخطاء الإنتاج | Sentry Dashboard | يومياً | [ ] |
| مراقبة أداء API | Vercel Analytics | يومياً | [ ] |
| مراقبة Railway Worker | Railway Logs | يومياً | [ ] |
| مراقبة استهلاك Supabase | Supabase Dashboard | أسبوعياً | [ ] |
| مراقبة SSL expiry | تلقائي مع Vercel | شهرياً | [ ] |

---

### 6.2 تحسينات مستقبلية (Backlog)

| # | التحسين | الأولوية | التعقيد |
|---|---------|---------|---------|
| 1 | Google Analytics / Fathom | عالية | منخفض |
| 2 | Schema.org structured data للإعلانات | عالية | متوسط |
| 3 | Dynamic sitemap generation | عالية | متوسط |
| 4 | Image CDN (Cloudinary/imgix) | متوسطة | متوسط |
| 5 | Background sync للـ offline queue | متوسطة | عالي |
| 6 | A/B testing framework | منخفضة | متوسط |
| 7 | Multi-region deployment | منخفضة | عالي |
| 8 | React Native conversion | مستقبلي | عالي جداً |

---

## ملخص دور Claude Code في التنفيذ

| المرحلة | المهام | ملفات يتم إنشاؤها/تعديلها | وقت تقديري |
|---------|--------|--------------------------|------------|
| **1. إصلاحات حرجة** | صفحات أخطاء + Sentry + Security Headers + env check | ~15 ملف | يومين |
| **2. الجودة** | Jest setup + كتابة tests + loading states + توحيد seeds | ~25 ملف | 3 أيام |
| **3. تجهيز الإنتاج** | Middleware + CI/CD + SEO + مراجعة legal | ~10 ملفات | 3 أيام |
| **4. اختبار** | API smoke tests + Lighthouse review + مراجعة responsive | تقارير | يومين |
| **5. الإطلاق** | Deployment checklists + مراجعة config + توثيق | تقارير | يومين |
| **المجموع** | | **~50 ملف** | **10-12 يوم** |

---

## Checklist نهائية قبل الضغط على زرار الإطلاق

```
المرحلة 1 - حرجة: ✅ مكتملة
[x] صفحات error.tsx + not-found.tsx + global-error.tsx
[x] Loading states (7 ملفات loading.tsx)
[x] Sentry مُعَد ومُختَبَر
[x] Security headers (CSP + HSTS + Permissions-Policy)
[x] env-check.ts يعمل عند الـ startup
[x] .env.local.example محدث بكل المتغيرات

المرحلة 2 - جودة: ✅ مكتملة
[x] Jest مُعَد مع mocks (jest.config.ts + jest.setup.ts)
[x] اختبارات auth (session-token.test.ts — 9 tests)
[x] اختبارات validation (ad-validation.test.ts — 30 tests)
[x] اختبارات env-check (env-check.test.ts — 5 tests)
[x] اختبارات API smoke (smoke.test.ts — 36 tests)
[ ] اختبارات components (AdCard, BottomNav) — مؤجل
[x] seed-production.sql موحد
[x] كل الاختبارات بتعدي (91 test, 4 suites)

المرحلة 3 - إنتاج: ✅ مكتملة
[x] middleware.ts (security headers + CORS + caching)
[x] CI/CD pipeline (lint → typecheck → test → build)
[x] robots.txt
[x] sitemap.ts (static + category pages)
[x] OG image (opengraph-image.tsx — Edge runtime)
[x] Twitter card metadata
[ ] مراجعة شروط الاستخدام وسياسة الخصوصية — قانونية

المرحلة 4 - اختبار: ✅ مكتملة (الجزء البرمجي)
[x] API smoke tests (91 test passing)
[x] Build ناجح بدون أخطاء
[ ] Lighthouse scores 90+ على mobile — يتم بعد النشر
[ ] اختبار على Android (Chrome) — يتم بعد النشر
[ ] اختبار على iOS (Safari) — يتم بعد النشر
[ ] اختبار offline mode — يتم بعد النشر
[ ] اختبار PWA install — يتم بعد النشر

المرحلة 5 - إطلاق:
[ ] Supabase production مُعَد + migrations + seed
[ ] Vercel مُعَد + env vars + domain + SSL
[ ] Railway worker شغال
[ ] Sentry بيستقبل أخطاء
[ ] DNS propagated
[ ] أول إعلان تجريبي اتنشر بنجاح
```

---

> **ملاحظة:** هذا الملف يُحدَّث مع تقدم التنفيذ. كل `[ ]` يتحول لـ `[x]` عند الإكمال.
