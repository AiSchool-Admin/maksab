# مكسب — الخطة التسويقية التقنية الشاملة
# Maksab — Complete Marketing Technical Implementation Plan
# CMO: AI-Powered | Developer: Claude Code

---

> **هذا الملف هو المرجع الوحيد لكل التنفيذ التسويقي التقني في مشروع مكسب.**
> **Claude Code: اقرأ هذا الملف بالكامل، ثم نفّذ المهام بالترتيب حسب الـ Sprint.**

---

## جدول المحتويات
1. [معلومات المشروع التقنية](#-معلومات-المشروع)
2. [التحليل الحالي — ما هو موجود وما هو ناقص](#-التحليل-الحالي)
3. [Sprint 1 — Analytics + Tracking + SEO](#-sprint-1--الأسبوع-1-2)
4. [Sprint 2 — Growth Loops + Conversion](#-sprint-2--الأسبوع-3-4)
5. [Sprint 3 — Gamification + Advanced Analytics](#-sprint-3--الشهر-2)
6. [Environment Variables](#-environment-variables)
7. [تعليمات CLAUDE.md الإضافية](#-تعليمات-claude-للتسويق)
8. [Marketing Events Standard](#-marketing-events-standard)
9. [KPIs ومؤشرات الأداء](#-kpis)
10. [الميزانية وتخصيصها](#-الميزانية)

---

## 📋 معلومات المشروع

| البند | القيمة |
|-------|--------|
| **المشروع** | مكسب — تطبيق إعلانات مبوبة مصري |
| **الشعار** | كل صفقة مكسب |
| **الرابط** | https://maksab.vercel.app |
| **GitHub** | https://github.com/AiSchool-Admin/maksab |
| **Framework** | Next.js 16.1.6 (App Router) |
| **UI** | React 19.2.4 + Tailwind CSS 4.1.18 |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| **State** | Zustand 5.0.11 |
| **PWA** | next-pwa 5.6.0 |
| **Push** | Firebase Cloud Messaging |
| **Error Tracking** | Sentry (client + server + edge) |
| **Maps** | Leaflet 1.9.4 |
| **Forms** | React Hook Form 7.71.1 + Zod |
| **Animations** | Framer Motion |
| **Deploy** | Vercel (primary) + Railway |
| **اللغة** | العامية المصرية — RTL-native |
| **الجمهور** | مصر — 18-45 سنة — موبايل أولاً |

### الأقسام الموجودة:
سيارات، عقارات، موبايلات، ذهب، أثاث، خردة، الموضة، السلع الفاخرة، الأجهزة المنزلية، الهوايات

### الصفحات الموجودة:
`/` `/ad/[id]` `/search` `/stores` `/store/[id]` `/login` `/setup` `/profile` `/settings` `/favorites` `/collections` `/my-ads` `/my-offers` `/chat` `/price-scanner` `/map` `/ambassador` `/rewards` `/invite` `/auctions` `/admin` `/help` `/privacy` `/terms` `/campaign/[slug]`

---

## 🔍 التحليل الحالي

### ✅ ما هو موجود ويعمل:
- [x] Next.js 16 App Router مع SSR/SSG
- [x] Supabase Auth (رقم موبايل مصري +20)
- [x] PWA جاهز (next-pwa)
- [x] Firebase (Push notifications infrastructure)
- [x] Sentry Error Tracking
- [x] Leaflet Maps
- [x] Chat system
- [x] Auction system
- [x] Price Scanner (AI-powered)
- [x] Ambassador program page
- [x] Rewards page
- [x] Invite system page

### ❌ ما هو ناقص (الفجوات التسويقية الحرجة):

| # | الفجوة | التأثير | الأولوية |
|---|--------|---------|----------|
| 1 | Google Analytics 4 | لا tracking لسلوك المستخدمين — بنشتغل أعمى! | **P0** |
| 2 | Meta Pixel + CAPI | لا Conversion tracking — الإعلانات المدفوعة بدون بيانات | **P0** |
| 3 | TikTok Pixel | لا tracking لحملات TikTok | **P0** |
| 4 | UTM Tracking | مش عارفين المستخدم جاي من أنهي حملة | **P0** |
| 5 | SEO Dynamic Metadata | صفحات الإعلانات بدون metadata — Google مش شايفها | **P0** |
| 6 | Dynamic Sitemap | Google مش عارف يلاقي صفحات الإعلانات | **P0** |
| 7 | OG Images الديناميكية | المشاركة على واتساب/فيسبوك شكلها وحش | **P0** |
| 8 | PWA Install Prompt | المستخدمين مش عارفين يحملوا كـ App | **P0** |
| 9 | Referral System Backend | صفحة /invite موجودة لكن بدون Tracking كامل | **P0** |
| 10 | A/B Testing | لا تجارب — كل قرار بالحدس | **P1** |
| 11 | Structured Data JSON-LD | مفيش Rich Snippets في Google | **P1** |
| 12 | Push Notification Campaigns | Firebase موجود لكن بدون Campaign system | **P1** |
| 13 | Onboarding Flow | معدل التفعيل منخفض | **P1** |
| 14 | CRO — تحسين صفحة الإعلان | معدل التحويل غير مقاس ومش محسّن | **P1** |
| 15 | Landing Pages | محتاج صفحات هبوط للحملات التسويقية | **P1** |
| 16 | Email Collection | مفيش Email capture — ضايعين leads | **P1** |
| 17 | WhatsApp Share | المشاركة على واتساب مش محسّنة | **P1** |
| 18 | Gamification Engine | مفيش نقاط أو مستويات — لا دافع للاستمرار | **P2** |
| 19 | PostHog / Mixpanel | لا Funnel analysis أو Session Recording | **P2** |
| 20 | Seller Analytics | البائعين مش شايفين أداء إعلاناتهم | **P2** |

---

## 🚀 Sprint 1 — الأسبوع 1-2
### Analytics + Tracking + SEO (الأعلى أولوية — P0)

---

### المهمة 1: تركيب Google Analytics 4

**الملفات المطلوبة:**
- `src/lib/analytics.ts` ← جديد
- `src/components/providers/GoogleAnalytics.tsx` ← جديد
- `src/app/layout.tsx` ← تعديل (إضافة الـ component)

**التنفيذ:**

```typescript
// ============================================
// src/lib/analytics.ts
// ============================================
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID

export const pageview = (url: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', GA_TRACKING_ID, { page_path: url })
  }
}

export const event = (action: string, params: Record<string, any> = {}) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, params)
  }
}

// ===== Marketing Events =====

export const trackAdView = (adId: string, category: string, price?: number) =>
  event('view_item', {
    item_id: adId,
    item_category: category,
    value: price,
    currency: 'EGP',
  })

export const trackAdCreate = (category: string) =>
  event('ad_create', { category })

export const trackContact = (type: 'chat' | 'whatsapp' | 'call', adId: string) =>
  event('contact_seller', { method: type, item_id: adId })

export const trackSearch = (query: string, resultsCount: number) =>
  event('search', { search_term: query, results_count: resultsCount })

export const trackShare = (adId: string, method: string) =>
  event('share', { item_id: adId, method })

export const trackSignup = (method: string) =>
  event('sign_up', { method })

export const trackFavorite = (adId: string) =>
  event('add_to_wishlist', { item_id: adId })

export const trackPriceScanner = (query: string) =>
  event('price_scanner_use', { search_term: query })

export const trackInstallPrompt = (action: 'shown' | 'accepted' | 'dismissed') =>
  event('pwa_install', { action })

export const trackReferral = (action: 'share' | 'click' | 'signup' | 'first_ad') =>
  event('referral', { action })
```

```typescript
// ============================================
// src/components/providers/GoogleAnalytics.tsx
// ============================================
'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { GA_TRACKING_ID, pageview } from '@/lib/analytics'

function GoogleAnalyticsInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      pageview(pathname + (searchParams?.toString() ? `?${searchParams}` : ''))
    }
  }, [pathname, searchParams])

  if (!GA_TRACKING_ID) return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
            });
          `,
        }}
      />
    </>
  )
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner />
    </Suspense>
  )
}
```

**التعديل في layout.tsx:**
```typescript
// أضف في src/app/layout.tsx داخل <body>:
import GoogleAnalytics from '@/components/providers/GoogleAnalytics'

// داخل الـ return:
<body>
  <GoogleAnalytics />
  {/* باقي المحتوى */}
</body>
```

---

### المهمة 2: تركيب Meta Pixel + Conversions API

**الملفات المطلوبة:**
- `src/lib/meta-pixel.ts` ← جديد
- `src/components/providers/MetaPixel.tsx` ← جديد
- `src/app/api/meta-capi/route.ts` ← جديد (Server-side)
- `src/app/layout.tsx` ← تعديل

**التنفيذ:**

```typescript
// ============================================
// src/lib/meta-pixel.ts
// ============================================
declare global {
  interface Window {
    fbq: (...args: any[]) => void
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

export const fbPageview = () => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'PageView')
  }
}

export const fbTrackViewContent = (adId: string, value: number, category: string) => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'ViewContent', {
      content_ids: [adId],
      content_type: 'product',
      value,
      currency: 'EGP',
      content_category: category,
    })
  }
}

export const fbTrackSearch = (query: string) => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'Search', { search_string: query })
  }
}

export const fbTrackLead = (adId: string, contactMethod: string) => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'Lead', {
      content_ids: [adId],
      content_category: contactMethod,
    })
  }
}

export const fbTrackCompleteRegistration = (method: string) => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'CompleteRegistration', { method })
  }
}

export const fbTrackAddToWishlist = (adId: string, value?: number) => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'AddToWishlist', {
      content_ids: [adId],
      value,
      currency: 'EGP',
    })
  }
}
```

```typescript
// ============================================
// src/components/providers/MetaPixel.tsx
// ============================================
'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { FB_PIXEL_ID, fbPageview } from '@/lib/meta-pixel'

export default function MetaPixel() {
  const pathname = usePathname()

  useEffect(() => {
    fbPageview()
  }, [pathname])

  if (!FB_PIXEL_ID) return null

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      }}
    />
  )
}
```

```typescript
// ============================================
// src/app/api/meta-capi/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

function hashData(data: string): string {
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventName, eventData, userData } = body

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.eventId || crypto.randomUUID(),
        action_source: 'website',
        event_source_url: body.sourceUrl,
        user_data: {
          client_ip_address: req.headers.get('x-forwarded-for') || req.ip,
          client_user_agent: req.headers.get('user-agent'),
          ...(userData?.email && { em: [hashData(userData.email)] }),
          ...(userData?.phone && { ph: [hashData(userData.phone)] }),
          country: ['842c370ef94d498f576e0346db13296e1e2c48cac6b88da0c0d0284244e8fb6b'], // EG hashed
        },
        custom_data: eventData,
      }],
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send event' }, { status: 500 })
  }
}
```

---

### المهمة 3: تركيب TikTok Pixel

**الملفات المطلوبة:**
- `src/lib/tiktok-pixel.ts` ← جديد
- `src/components/providers/TikTokPixel.tsx` ← جديد
- `src/app/layout.tsx` ← تعديل

**التنفيذ:**

```typescript
// ============================================
// src/lib/tiktok-pixel.ts
// ============================================
declare global {
  interface Window {
    ttq: any
  }
}

export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID

export const ttPageview = () => {
  if (typeof window.ttq !== 'undefined') {
    window.ttq.page()
  }
}

export const ttTrackViewContent = (adId: string, category: string, value?: number) => {
  if (typeof window.ttq !== 'undefined') {
    window.ttq.track('ViewContent', {
      content_id: adId,
      content_type: 'product',
      content_category: category,
      value,
      currency: 'EGP',
    })
  }
}

export const ttTrackSearch = (query: string) => {
  if (typeof window.ttq !== 'undefined') {
    window.ttq.track('Search', { query })
  }
}

export const ttTrackRegistration = () => {
  if (typeof window.ttq !== 'undefined') {
    window.ttq.track('CompleteRegistration')
  }
}

export const ttTrackClickButton = (buttonName: string) => {
  if (typeof window.ttq !== 'undefined') {
    window.ttq.track('ClickButton', { button_name: buttonName })
  }
}
```

```typescript
// ============================================
// src/components/providers/TikTokPixel.tsx
// ============================================
'use client'

import Script from 'next/script'
import { TIKTOK_PIXEL_ID } from '@/lib/tiktok-pixel'

export default function TikTokPixel() {
  if (!TIKTOK_PIXEL_ID) return null

  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
            ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
            ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
            for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
            ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
            ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
            ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
            var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
            var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${TIKTOK_PIXEL_ID}');
            ttq.page();
          }(window, document, 'ttq');
        `,
      }}
    />
  )
}
```

---

### المهمة 4: UTM Tracking System

**الملفات المطلوبة:**
- `src/lib/utm.ts` ← جديد
- `src/hooks/useUTM.ts` ← جديد

**التنفيذ:**

```typescript
// ============================================
// src/lib/utm.ts
// ============================================
export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

const UTM_KEYS: (keyof UTMParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const FIRST_TOUCH_KEY = 'maksab_utm_first'
const LAST_TOUCH_KEY = 'maksab_utm_last'
const UTM_TIME_KEY = 'maksab_utm_time'

export const captureUTM = (): UTMParams => {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const utm: UTMParams = {}

  UTM_KEYS.forEach(key => {
    const val = params.get(key)
    if (val) utm[key] = val
  })

  if (Object.keys(utm).length > 0) {
    // First touch — only save if not already set
    if (!localStorage.getItem(FIRST_TOUCH_KEY)) {
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(utm))
    }
    // Last touch — always update
    localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(utm))
    localStorage.setItem(UTM_TIME_KEY, new Date().toISOString())
  }

  return utm
}

export const getFirstTouchUTM = (): UTMParams | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(FIRST_TOUCH_KEY)
  return stored ? JSON.parse(stored) : null
}

export const getLastTouchUTM = (): UTMParams | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(LAST_TOUCH_KEY)
  return stored ? JSON.parse(stored) : null
}

export const clearUTM = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FIRST_TOUCH_KEY)
  localStorage.removeItem(LAST_TOUCH_KEY)
  localStorage.removeItem(UTM_TIME_KEY)
}
```

```typescript
// ============================================
// src/hooks/useUTM.ts
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { captureUTM, getLastTouchUTM, type UTMParams } from '@/lib/utm'

export function useUTM() {
  const [utm, setUtm] = useState<UTMParams>({})

  useEffect(() => {
    const captured = captureUTM()
    setUtm(Object.keys(captured).length > 0 ? captured : getLastTouchUTM() || {})
  }, [])

  return utm
}
```

---

### المهمة 5: SEO — Dynamic Metadata لكل صفحة

**الملفات المطلوبة:**
- `src/app/ad/[id]/page.tsx` ← تعديل (إضافة generateMetadata)
- `src/app/search/page.tsx` ← تعديل
- `src/app/stores/page.tsx` ← تعديل
- `src/app/page.tsx` ← تعديل (الرئيسية)

**التنفيذ — مثال لصفحة الإعلان:**

```typescript
// ============================================
// أضف في أعلى src/app/ad/[id]/page.tsx
// ============================================
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: ad } = await supabase
    .from('ads')
    .select('title, description, price, location, category, images')
    .eq('id', id)
    .single()

  if (!ad) {
    return {
      title: 'مكسب — كل صفقة مكسب',
      description: 'أول تطبيق مصري للبيع والشراء بالذكاء الاصطناعي',
    }
  }

  const title = `${ad.title} — ${ad.price?.toLocaleString('ar-EG')} جنيه | مكسب`
  const desc = `${ad.title} للبيع في ${ad.location || 'مصر'}. السعر: ${ad.price?.toLocaleString('ar-EG')} جنيه. ${(ad.description || '').slice(0, 120)}`

  return {
    title,
    description: desc,
    keywords: [ad.category, ad.location, 'بيع', 'شراء', 'مكسب', 'مصر', 'إعلانات مبوبة'].filter(Boolean),
    openGraph: {
      title,
      description: desc,
      images: [{ url: `/api/og?id=${id}`, width: 1200, height: 630 }],
      type: 'website',
      locale: 'ar_EG',
      siteName: 'مكسب',
    },
    twitter: { card: 'summary_large_image', title, description: desc },
    alternates: { canonical: `https://maksab.vercel.app/ad/${id}` },
  }
}
```

**Metadata للصفحة الرئيسية:**
```typescript
// src/app/page.tsx — أضف في أعلى الملف أو عدّل الموجود
export const metadata: Metadata = {
  title: 'مكسب — كل صفقة مكسب | بيع وشراء في مصر',
  description: 'أول تطبيق مصري للبيع والشراء بالذكاء الاصطناعي. سيارات، عقارات، موبايلات، ذهب وأكتر. اعرف سعر أي حاجة بالـ AI مجاناً!',
  keywords: ['مكسب', 'بيع', 'شراء', 'سيارات', 'عقارات', 'موبايلات', 'مصر', 'إعلانات مبوبة', 'OLX بديل'],
  openGraph: {
    title: 'مكسب — كل صفقة مكسب',
    description: 'أول تطبيق مصري للبيع والشراء بالذكاء الاصطناعي',
    url: 'https://maksab.vercel.app',
    siteName: 'مكسب',
    locale: 'ar_EG',
    type: 'website',
  },
}
```

---

### المهمة 6: Dynamic Sitemap + Robots.txt

**الملفات المطلوبة:**
- `src/app/sitemap.ts` ← جديد
- `src/app/robots.ts` ← جديد

**التنفيذ:**

```typescript
// ============================================
// src/app/sitemap.ts
// ============================================
import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const baseUrl = 'https://maksab.vercel.app'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/stores`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/price-scanner`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/map`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ]

  // Dynamic ad pages
  const { data: ads } = await supabase
    .from('ads')
    .select('id, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(5000)

  const adPages: MetadataRoute.Sitemap = (ads || []).map(ad => ({
    url: `${baseUrl}/ad/${ad.id}`,
    lastModified: new Date(ad.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Dynamic store pages
  const { data: stores } = await supabase
    .from('stores')
    .select('id, updated_at')
    .limit(1000)

  const storePages: MetadataRoute.Sitemap = (stores || []).map(store => ({
    url: `${baseUrl}/store/${store.id}`,
    lastModified: new Date(store.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...adPages, ...storePages]
}
```

```typescript
// ============================================
// src/app/robots.ts
// ============================================
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/chat/', '/settings/', '/my-ads/', '/my-offers/'],
      },
    ],
    sitemap: 'https://maksab.vercel.app/sitemap.xml',
  }
}
```

---

### المهمة 7: Dynamic OG Images

**الملفات المطلوبة:**
- `src/app/api/og/route.tsx` ← جديد

**التنفيذ:**

```typescript
// ============================================
// src/app/api/og/route.tsx
// ============================================
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const adId = searchParams.get('id')

  let title = 'مكسب — كل صفقة مكسب'
  let price = ''
  let location = ''
  let category = ''

  if (adId) {
    const supabase = await createClient()
    const { data: ad } = await supabase
      .from('ads')
      .select('title, price, location, category')
      .eq('id', adId)
      .single()

    if (ad) {
      title = ad.title || title
      price = ad.price ? `${ad.price.toLocaleString('ar-EG')} جنيه` : ''
      location = ad.location || ''
      category = ad.category || ''
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #4CAF50 100%)',
          fontFamily: 'Arial, sans-serif',
          direction: 'rtl',
          padding: '40px',
        }}
      >
        <div style={{ fontSize: '32px', color: '#fff', opacity: 0.9, marginBottom: '20px' }}>
          مكسب 💚
        </div>
        <div style={{ fontSize: '48px', color: '#fff', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px', maxWidth: '900px' }}>
          {title}
        </div>
        {price && (
          <div style={{ fontSize: '40px', color: '#FFD600', fontWeight: 'bold', marginBottom: '15px' }}>
            {price}
          </div>
        )}
        {location && (
          <div style={{ fontSize: '24px', color: '#C8E6C9' }}>
            📍 {location} {category ? `• ${category}` : ''}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: '30px', fontSize: '20px', color: '#A5D6A7' }}>
          maksab.vercel.app — كل صفقة مكسب
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

---

### المهمة 8: PWA Install Prompt محسّن

**الملفات المطلوبة:**
- `src/components/InstallPrompt.tsx` ← جديد
- `src/hooks/useInstallPrompt.ts` ← جديد
- `src/app/layout.tsx` ← تعديل (إضافة InstallPrompt)

**التنفيذ:**

```typescript
// ============================================
// src/hooks/useInstallPrompt.ts
// ============================================
'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('maksab_install_dismissed')
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) return
    }

    // Track visits
    const visits = parseInt(localStorage.getItem('maksab_visits') || '0') + 1
    localStorage.setItem('maksab_visits', visits.toString())

    // Show after 2nd visit
    if (visits < 2) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setIsInstallable(false)
    if (outcome === 'accepted') setIsInstalled(true)
    return outcome === 'accepted'
  }

  const dismiss = () => {
    setIsInstallable(false)
    localStorage.setItem('maksab_install_dismissed', Date.now().toString())
  }

  return { isInstallable, isInstalled, install, dismiss }
}
```

```typescript
// ============================================
// src/components/InstallPrompt.tsx
// ============================================
'use client'

import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { trackInstallPrompt } from '@/lib/analytics'
import { useEffect } from 'react'

export default function InstallPrompt() {
  const { isInstallable, install, dismiss } = useInstallPrompt()

  useEffect(() => {
    if (isInstallable) trackInstallPrompt('shown')
  }, [isInstallable])

  if (!isInstallable) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-green-200 p-4 flex items-center gap-3 animate-slide-up">
      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
        م
      </div>
      <div className="flex-1 text-right">
        <p className="font-bold text-gray-900 text-sm">حمّل مكسب على موبايلك</p>
        <p className="text-gray-500 text-xs">مجاناً وبدون App Store!</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => { dismiss(); trackInstallPrompt('dismissed') }}
          className="text-gray-400 text-xs px-2 py-1"
        >
          لاحقاً
        </button>
        <button
          onClick={async () => {
            const accepted = await install()
            trackInstallPrompt(accepted ? 'accepted' : 'dismissed')
          }}
          className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          حمّل دلوقتي
        </button>
      </div>
    </div>
  )
}
```

---

## 🔄 Sprint 2 — الأسبوع 3-4
### Growth Loops + Conversion Optimization (P0-P1)

### المهمة 9: Referral System الكامل

**الملفات المطلوبة:**
- `supabase/migrations/XXXXXX_referral_system.sql` ← جديد
- `src/lib/referral.ts` ← جديد
- `src/app/api/referral/track/route.ts` ← جديد
- `src/app/invite/[code]/page.tsx` ← تعديل
- `src/components/ReferralDashboard.tsx` ← جديد

**SQL Migration:**
```sql
-- supabase/migrations/XXXXXX_referral_system.sql

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code TEXT NOT NULL REFERENCES public.referral_codes(code),
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'signup', 'first_ad', 'first_sale')),
  referred_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_points INT DEFAULT 0,
  level TEXT DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'ambassador')),
  referral_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_referral_events_code ON public.referral_events(referral_code);
CREATE INDEX idx_referral_codes_user ON public.referral_codes(user_id);

-- Auto-create referral code on signup
CREATE OR REPLACE FUNCTION public.create_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, 'MKS' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 6)));
  INSERT INTO public.user_points (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_code();

-- Add points function
CREATE OR REPLACE FUNCTION public.add_points(
  p_user_id UUID,
  p_points INT,
  p_reason TEXT DEFAULT ''
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (p_user_id, p_points)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_points.total_points + p_points,
    referral_count = CASE WHEN p_reason = 'referral_signup' THEN user_points.referral_count + 1 ELSE user_points.referral_count END,
    level = CASE
      WHEN user_points.total_points + p_points >= 1000 THEN 'ambassador'
      WHEN user_points.total_points + p_points >= 500 THEN 'gold'
      WHEN user_points.total_points + p_points >= 100 THEN 'silver'
      ELSE 'bronze'
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Points System:**
| الحدث | النقاط |
|-------|--------|
| صاحبك سجّل (referral signup) | 10 |
| صاحبك نشر أول إعلان | 25 |
| صاحبك عمل أول صفقة | 50 |
| أنت نشرت إعلان | 5 |
| أنت أضفت تقييم | 3 |

**Levels:**
| المستوى | النقاط المطلوبة | المكافأة |
|---------|----------------|---------|
| برونز 🥉 | 0-99 | — |
| فضي 🥈 | 100-499 | إعلان مميز مجاني |
| ذهبي 🥇 | 500-999 | شهر Premium مجاني |
| سفير 🏆 | 1000+ | هدية فعلية + Badge دائم |

---

### المهمة 10: WhatsApp Share محسّن
- Pre-filled message مع OG preview
- Deep link: `https://wa.me/?text=...`
- Track shares في GA4

### المهمة 11: A/B Testing Framework
- Consistent user bucketing مع Zustand
- Track variant + conversion في GA4
- أول تجربة: CTA button color

### المهمة 12: Onboarding Flow محسّن
- 4 خطوات بـ Framer Motion
- Progress bar + Skip option
- Track completion rate

### المهمة 13: Smart Push Notifications
- Firebase Cloud Messaging campaigns
- Trigger-based: Welcome, Nudge, Category Alert, Chat, Price Drop

### المهمة 14: CRO — تحسين صفحة الإعلان
- Sticky CTA bar (موبايل)
- Social proof: "[عدد] شخص شاف الإعلان"
- Lazy loading + Skeleton

### المهمة 15: Landing Pages Template
- `/campaign/[slug]` — Hero + Benefits + CTA
- UTM tracking مدمج

### المهمة 16: Email Capture + Welcome Flow
- Popup بعد 30 ثانية
- جدول email_subscribers + Welcome email

---

## 🎮 Sprint 3 — الشهر 2
### Gamification + Advanced Analytics (P2)

### المهمة 17: نظام النقاط والمستويات (Gamification)
### المهمة 18: Structured Data JSON-LD
### المهمة 19: PostHog Integration (مجاني)
### المهمة 20: Seller Analytics Dashboard
### المهمة 21: Smart Search + Autocomplete
### المهمة 22: Performance Optimization

---

## 🔐 Environment Variables

أضف هذه المتغيرات في `.env.local` وفي Vercel Dashboard:

```env
# ===== Sprint 1: Analytics & Tracking =====
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=XXXXXXXXXXXXXXX
FB_ACCESS_TOKEN=XXXXXXXXXXXXXXX
NEXT_PUBLIC_TIKTOK_PIXEL_ID=XXXXXXXXXXXXXXX

# ===== Sprint 2: Email (اختياري) =====
RESEND_API_KEY=re_XXXXXXXXXXXXXXX

# ===== Sprint 3: PostHog (اختياري) =====
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXXXXXXX
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## 📐 تعليمات Claude للتسويق

### المبادئ:
1. **Track everything** — أي ميزة جديدة لازم يكون فيها analytics events
2. **Mobile-first** — 90% من المستخدمين المصريين على موبايل
3. **Speed = Money** — كل ثانية تحميل = 7% خسارة conversion
4. **Arabic-first** — كل نص بالعامية المصرية، RTL-native
5. **Test everything** — A/B test أي CTA أو copy مهم

### Checklist لأي ميزة جديدة:
- [ ] GA4 events tracking
- [ ] Meta Pixel events
- [ ] SEO metadata
- [ ] OG tags للمشاركة
- [ ] Mobile responsive
- [ ] Skeleton loading
- [ ] Error handling
- [ ] RTL support

---

## 📊 Marketing Events Standard

```typescript
// كل event لازم يتبع هذا الـ Pattern:
// GA4:
analytics.event('event_name', {
  item_id: string,        // ID الإعلان
  item_category: string,  // القسم
  value: number,          // السعر بالجنيه
  currency: 'EGP',
  method: string,         // الطريقة
})

// Meta Pixel:
fbq('track', 'EventName', { content_ids: [id], value, currency: 'EGP' })

// TikTok:
ttq.track('EventName', { content_id: id, value, currency: 'EGP' })
```

---

## 📈 KPIs

| المؤشر | الهدف | القياس |
|--------|-------|--------|
| التحميلات الأسبوعية | 1,000 | GA4 + App Store |
| CAC | أقل من 5 ج.م | Meta Ads / Installs |
| معدل التفعيل (أول إعلان خلال 7 أيام) | 30% | GA4 events |
| D7 Retention | 25% | GA4 cohorts |
| D30 Retention | 15% | GA4 cohorts |
| Engagement Rate | فوق 5% | GA4 |
| Organic Traffic شهرياً | 100,000 | GA4 |
| Referral Rate | 30% من التسجيلات | Supabase |
| Monthly Revenue | 100,000 ج.م | Supabase |
| التجار الشركاء | 50 | Supabase |

---

## 💰 الميزانية

| البند | شهرياً |
|-------|--------|
| إعلانات Meta | 60,000 ج.م |
| إعلانات Google | 25,000 ج.م |
| إعلانات TikTok | 15,000 ج.م |
| Influencers | 20,000 ج.م |
| Referral Rewards | 15,000 ج.م |
| Content Production | 5,000 ج.م |
| Tools & Analytics | 3,000 ج.م |
| Events & PR | 10,000 ج.م |
| **الإجمالي** | **~153,000 ج.م** |
| **الاحتياطي** | **~47,000 ج.م** |

---

> **آخر تحديث:** فبراير 2026
> **CMO:** AI-Powered Marketing | **Developer:** Claude Code
