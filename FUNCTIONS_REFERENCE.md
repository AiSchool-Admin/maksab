# مرجع الوظائف الشامل — مكسب Maksab Functions Reference

> **ملف يحتوي على جميع الوظائف والخدمات والهوكس في تطبيق مكسب**
> **آخر تحديث:** 2026-03-04

---

## 📋 فهرس المحتويات

1. [خدمات Supabase](#1-خدمات-supabase)
2. [نظام المحادثات](#2-نظام-المحادثات)
3. [نظام المزادات](#3-نظام-المزادات)
4. [نظام البحث](#4-نظام-البحث)
5. [نظام التبديل](#5-نظام-التبديل)
6. [محرك التوصيات](#6-محرك-التوصيات)
7. [نظام العمولة](#7-نظام-العمولة)
8. [نظام الإشعارات](#8-نظام-الإشعارات)
9. [المفضلة والمجموعات](#9-المفضلة-والمجموعات)
10. [إدارة الإعلانات](#10-إدارة-الإعلانات)
11. [طلبات الشراء](#11-طلبات-الشراء)
12. [عروض الأسعار والتفاوض](#12-عروض-الأسعار-والتفاوض)
13. [نظام الولاء والمكافآت](#13-نظام-الولاء-والمكافآت)
14. [التقييمات والمراجعات](#14-التقييمات-والمراجعات)
15. [تصنيف البائعين](#15-تصنيف-البائعين)
16. [نظام المتاجر](#16-نظام-المتاجر)
17. [نظام الدفع](#17-نظام-الدفع)
18. [نظام التحقق](#18-نظام-التحقق)
19. [التحليلات والتتبع](#19-التحليلات-والتتبع)
20. [البلاغات والحظر](#20-البلاغات-والحظر)
21. [الأدوات المساعدة](#21-الأدوات-المساعدة)
22. [React Hooks](#22-react-hooks)
23. [Zustand Stores](#23-zustand-stores)
24. [Supabase Edge Functions](#24-supabase-edge-functions)
25. [API Routes](#25-api-routes)
26. [Database Migrations](#26-database-migrations)
27. [خدمات اجتماعية](#27-خدمات-اجتماعية)
28. [خدمات الذكاء الاصطناعي](#28-خدمات-الذكاء-الاصطناعي)
29. [الإدارة والإعدادات](#29-الإدارة-والإعدادات)

---

## 1. خدمات Supabase

### `src/lib/supabase/client.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getSupabaseClient()` | إنشاء عميل Supabase (lazy-loaded) | - | `SupabaseClient` |
| `supabase` (Proxy) | عميل Supabase العام | - | `SupabaseClient` |

### `src/lib/supabase/server.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `createServerClient()` | عميل Supabase للسيرفر مع Auth | - | `SupabaseClient` |
| `createServiceClient()` | عميل Service Role للعمليات الإدارية | - | `SupabaseClient` |
| `getServiceClient()` | عميل Service مُخزن مؤقتاً | - | `SupabaseClient` |

### `src/lib/supabase/auth.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getSessionToken()` | الحصول على توكن الجلسة | - | `string \| null` |
| `generateSessionToken(userId)` | إنشاء توكن موقّع | `userId: string` | `string` |
| `verifySessionToken(token)` | التحقق من صحة التوكن | `token: string` | `{ userId: string } \| null` |

---

## 2. نظام المحادثات

### `src/lib/chat/chat-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `fetchConversations()` | جلب جميع محادثات المستخدم | - | `ChatConversation[]` |
| `fetchMessages(conversationId)` | جلب رسائل محادثة معينة | `conversationId: string` | `ChatMessage[]` |
| `fetchConversation(conversationId)` | جلب تفاصيل محادثة واحدة | `conversationId: string` | `ChatConversation` |
| `findOrCreateConversation(adId)` | إنشاء أو العثور على محادثة موجودة | `adId: string` | `ChatConversation` |
| `sendMessage(params)` | إرسال رسالة جديدة | `{ conversationId, content, imageUrl? }` | `ChatMessage` |
| `markMessagesAsRead(conversationId, userId)` | تعليم الرسائل كمقروءة | `conversationId: string, userId: string` | `void` |
| `uploadChatImage(file, conversationId)` | رفع صورة في المحادثة | `file: File, conversationId: string` | `string (url)` |
| `getTotalUnreadCount()` | عدد الرسائل غير المقروءة | - | `number` |

### `src/lib/chat/group-chat-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| إدارة المحادثات الجماعية | للمفاوضات المتعددة الأطراف | متعدد | متعدد |

### `src/lib/chat/realtime.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `subscribeToConversation()` | اشتراك في تحديثات المحادثة لحظياً | `conversationId: string` | `Subscription` |
| `broadcastTyping()` | بث مؤشر الكتابة | `conversationId: string` | `void` |

---

## 3. نظام المزادات

### `src/lib/auction/auction-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `placeBid(adId, bidderId, bidderName, amount)` | تقديم مزايدة | `adId, bidderId, bidderName: string, amount: number` | `AuctionBid` |
| `buyNow(adId, buyerId, buyerName)` | شراء فوري (ينهي المزاد) | `adId, buyerId, buyerName: string` | `void` |

### `src/lib/auction/finalize.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `resolveAuctionStatus()` | تحديد نتيجة المزاد | `ad: Ad` | `AuctionOutcome` |
| `calcOriginalEndsAt()` | حساب وقت انتهاء المزاد الأصلي | `ad: Ad` | `Date` |
| `wasAuctionExtended()` | هل تم تمديد المزاد (anti-sniping) | `ad: Ad` | `boolean` |

### `src/lib/auction/types.ts`

| النوع | الوصف |
|-------|-------|
| `AuctionState` | حالة المزاد الحالية |
| `AuctionBid` | بنية المزايدة الفردية |

---

## 4. نظام البحث

### `src/lib/search/search-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `advancedSearch(filters, page)` | بحث نصي كامل + ضبابي بالعربية | `SearchFilters, page: number` | `{ ads: Ad[], total: number }` |
| `getAutocompleteSuggestions(query)` | اقتراحات الإكمال التلقائي | `query: string` | `string[]` |
| `getTrendingSearches()` | عمليات البحث الرائجة | - | `string[]` |
| `imageSearch(imageUrl)` | البحث العكسي بالصورة | `imageUrl: string` | `Ad[]` |

### `src/lib/search/smart-parser.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| تحليل الاستعلام الذكي | فهم دلالي للاستعلام | `query: string` | `ParsedQuery` |
| استخراج الكيانات | استخراج الماركة، الموديل، السنة، إلخ | `query: string` | `Entities` |
| كشف الفلاتر التلقائي | تحويل النص الحر لفلاتر | `query: string` | `AutoFilters` |

### `src/lib/search/ai-query-engine.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| تحسين الاستعلام بالذكاء الاصطناعي | تعزيز نتائج البحث | `query: string` | `EnhancedQuery` |
| ترتيب ذكي للنتائج | ترتيب حسب السياق | `results: Ad[]` | `Ad[]` |

### `src/lib/search/search-data.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| إدارة عمليات البحث الأخيرة | حفظ واسترجاع | - | `string[]` |

### `src/lib/search/recent-searches.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| تتبع عمليات البحث الأخيرة | حفظ في localStorage | `query: string` | `void` |

---

## 5. نظام التبديل

### `src/lib/exchange/exchange-engine.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `parseExchangeWanted()` | تحليل العناصر المطلوبة للتبديل | `ad: Ad` | `ExchangeWantedItem` |
| `generateWantedTitle()` | إنشاء عنوان من مواصفات التبديل | `specs: ExchangeSpecs` | `string` |
| `calculateMatchScore()` | حساب نسبة التوافق بين إعلانين | `ad1: Ad, ad2: Ad` | `number (0-100)` |
| `getMatchLevel()` | تحديد مستوى التطابق | `score: number` | `'perfect' \| 'strong' \| 'good' \| 'partial'` |
| `findSmartExchangeMatches(params)` | البحث عن إعلانات تبديل متوافقة | `{ adId, category, wanted }` | `ExchangeMatchResult[]` |
| `findChainExchanges(params)` | إيجاد سلاسل تبديل ثلاثية (A→B→C→A) | `{ adId }` | `ChainExchange[]` |

### `src/lib/exchange/types.ts`

| النوع | الوصف |
|-------|-------|
| `ExchangeWantedItem` | عنصر مطلوب منظم |
| `ExchangeMatchResult` | نتيجة تطابق مع الأسباب |
| `ChainExchange` | سلسلة تبديل متعددة الأطراف |

---

## 6. محرك التوصيات

### `src/lib/recommendations/recommendations-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getRecommendations(userId, governorate)` | توصيات مخصصة عبر API | `userId: string, governorate?: string` | `Ad[]` |
| `fallbackRecommendations()` | توصيات بديلة عند عدم توفر API | - | `Ad[]` |
| `findExchangeMatches()` | إيجاد إعلانات تبديل متوافقة | `ad: Ad` | `ExchangeMatch[]` |
| `getSellerInsights(params)` | تقدير عدد المشترين المحتملين | `{ category, subcategory, governorate }` | `SellerInsights` |

### `src/lib/recommendations/signal-store.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `trackSignal()` | حفظ إشارة سلوكية (fire-and-forget) | `UserSignal` | `void` |

### أوزان الإشارات

| الإشارة | الوزن | السبب |
|---------|-------|-------|
| `bid_placed` (مزايدة) | 10 | أعلى نية — مستعد للدفع |
| `chat_initiated` (محادثة) | 8 | نية عالية جداً — تفاوض نشط |
| `ad_created` (إعلان تبديل) | 8 | يبحث عن عناصر محددة |
| `favorite` (مفضلة) | 6 | اهتمام قوي |
| `search` (بحث بفلاتر) | 5 | يبحث بنشاط |
| `view` (عرض تفصيلي) | 3 | تصفح باهتمام |
| `category_view` (عرض قسم) | 1 | اهتمام عام |

---

## 7. نظام العمولة

### `src/lib/commission/commission-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `calculateSuggestedCommission(amount)` | عمولة 1% بعد الصفقة (10-200 جنيه) | `amount: number` | `number` |
| `calculatePrePaymentCommission(amount)` | عمولة 0.5% مقدمة (5-100 جنيه) | `amount: number` | `number` |
| `getPrePaymentSavings()` | حساب التوفير مقارنة بالعمولة العادية | `amount: number` | `number` |
| `submitCommission(params)` | تقديم دفعة عمولة | `{ adId, amount, method }` | `Commission` |
| `declineCommission(params)` | تسجيل رفض العمولة | `{ adId }` | `void` |
| `isCommissionSupporter()` | هل المستخدم داعم لمكسب | `userId: string` | `boolean` |
| `submitPrePaymentCommission()` | دفع عمولة مقدمة | `{ adId, amount }` | `void` |
| `boostAd()` | تعزيز الإعلان (موثوق) | `adId: string` | `void` |
| `isAdBoosted()` | هل الإعلان معزز | `adId: string` | `boolean` |
| `isTrustedSeller()` | هل البائع موثوق (دفع مسبق) | `sellerId: string` | `boolean` |

---

## 8. نظام الإشعارات

### `src/lib/notifications/notification-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `fetchNotifications(userId)` | جلب إشعارات المستخدم | `userId: string` | `AppNotification[]` |
| `getUnreadCount(userId)` | عدد الإشعارات غير المقروءة | `userId: string` | `number` |
| `markAsRead(notificationId)` | تعليم إشعار كمقروء | `notificationId: string` | `void` |
| `markAllAsRead(userId)` | تعليم الكل كمقروء | `userId: string` | `void` |
| `requestPushPermission()` | طلب إذن إشعارات Push | - | `boolean` |
| `savePushSubscription()` | حفظ اشتراك Push | `subscription: PushSubscription` | `void` |
| `setupPushNotifications()` | إعداد Push بخطوة واحدة | - | `boolean` |
| `showLocalNotification()` | عرض إشعار محلي | `{ title, body, icon? }` | `void` |

### `src/lib/notifications/campaign-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `sendPushNotification()` | إرسال إشعار Push مستهدف | `{ userId, title, body }` | `void` |
| `logCampaignNotification()` | تتبع مقاييس الحملة | `{ campaignId, userId }` | `void` |
| `trackNotificationClick()` | تتبع التفاعل | `notificationId: string` | `void` |

### `src/lib/notifications/smart-notifications.ts`

| الوظيفة | الوصف |
|---------|-------|
| توقيت ذكي للإشعارات | إرسال في الوقت الأنسب |
| محتوى واعي بالسياق | تخصيص المحتوى حسب السياق |

### `src/lib/notifications/notification-preferences.ts`

| الوظيفة | الوصف |
|---------|-------|
| إدارة تفضيلات الإشعارات | تخصيص أنواع الإشعارات المفعلة |

### `src/lib/notifications/whatsapp-notifications.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `sendWhatsAppNotification()` | إرسال إشعار واتساب | `{ phone, message }` | `void` |

---

## 9. المفضلة والمجموعات

### `src/lib/favorites/favorites-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getFavoriteIds()` | جلب معرفات المفضلة من localStorage | - | `string[]` |
| `isFavorited(adId)` | هل الإعلان في المفضلة | `adId: string` | `boolean` |
| `toggleFavorite(adId)` | إضافة/إزالة من المفضلة | `adId: string` | `boolean` |
| `clearFavorites()` | مسح جميع المفضلات | - | `void` |
| `getFavoritePrices()` | جلب الأسعار وقت الإضافة للمفضلة | - | `Record<string, number>` |
| `saveFavoritePrice()` | حفظ لقطة السعر | `adId: string, price: number` | `void` |

### `src/lib/collections/collections-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `createCollection()` | إنشاء مجموعة جديدة | `{ name, description? }` | `Collection` |
| `getCollections()` | جلب مجموعات المستخدم | - | `Collection[]` |
| `getCollectionById()` | جلب مجموعة بإعلاناتها | `id: string` | `Collection` |
| `addToCollection()` | إضافة إعلان لمجموعة | `{ collectionId, adId }` | `void` |
| `removeFromCollection()` | إزالة إعلان من مجموعة | `{ collectionId, adId }` | `void` |
| `shareCollection()` | إنشاء رابط مشاركة | `collectionId: string` | `string (shareCode)` |
| `getSharedCollection()` | عرض مجموعة مشتركة | `shareCode: string` | `Collection` |

---

## 10. إدارة الإعلانات

### `src/lib/my-ads/my-ads-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `fetchMyAds()` | جلب جميع إعلانات المستخدم | - | `Ad[]` |
| `updateAdStatus(adId, status)` | تغيير حالة الإعلان | `adId: string, status: string` | `void` |
| `deleteAd(adId)` | حذف ناعم للإعلان | `adId: string` | `void` |
| `duplicateAd()` | نسخ إعلان موجود | `adId: string` | `Ad` |
| `repostAd()` | إعادة نشر إعلان منتهي | `adId: string` | `Ad` |

---

## 11. طلبات الشراء

### `src/lib/buy-requests/buy-request-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `createBuyRequest(input)` | نشر طلب شراء | `BuyRequestInput` | `BuyRequest` |
| `getBuyRequests()` | جلب طلبات الشراء | - | `BuyRequest[]` |
| `getBuyRequestById()` | جلب طلب شراء بالتفاصيل | `id: string` | `BuyRequest` |
| `closeBuyRequest()` | إغلاق طلب (تم التلبية) | `id: string` | `void` |
| `findMatchingAds()` | إيجاد إعلانات تطابق الطلب | `request: BuyRequest` | `Ad[]` |

### `src/lib/buy-requests/buy-request-offers-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `submitBuyRequestOffer()` | تقديم عرض على طلب شراء | `{ requestId, price, message }` | `Offer` |
| `acceptOffer()` | قبول عرض | `offerId: string` | `void` |
| `rejectOffer()` | رفض عرض | `offerId: string` | `void` |
| `getOffers()` | جلب العروض على طلب | `requestId: string` | `Offer[]` |

---

## 12. عروض الأسعار والتفاوض

### `src/lib/offers/offers-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `submitOffer(params)` | تقديم عرض سعر | `{ adId, amount, message? }` | `PriceOffer` |
| `respondToOffer()` | قبول/رفض/عرض مضاد | `{ offerId, response, counterAmount? }` | `void` |
| `withdrawOffer()` | سحب عرض معلق | `offerId: string` | `void` |
| `getAdOffers()` | جلب كل العروض على إعلان | `adId: string` | `PriceOffer[]` |
| `getAdOffersSummary()` | إحصائيات العروض (عبر RPC) | `adId: string` | `OffersSummary` |
| `getUserOffers()` | جلب عروض المستخدم المرسلة | - | `PriceOffer[]` |
| `updateAdOfferStats()` | تحديث مقاييس العروض | `adId: string` | `void` |
| `getOfferStatusLabel()` | نص الحالة بالعربية | `status: string` | `string` |
| `getOfferStatusColor()` | لون الحالة للعرض | `status: string` | `string` |

---

## 13. نظام الولاء والمكافآت

### `src/lib/loyalty/loyalty-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getStoredData()` | جلب بيانات الولاء من localStorage | - | `LoyaltyData` |
| `addPoints()` | إضافة نقاط لإجراءات | `{ action, points }` | `void` |
| `getLoyaltyProfile()` | مستوى الولاء والتقدم | `userId: string` | `LoyaltyProfile` |
| `generateReferralCode()` | إنشاء كود إحالة فريد | - | `string` |
| `trackReferral()` | تسجيل نقرة إحالة | `code: string` | `void` |
| `getPointsHistory()` | سجل المعاملات | - | `PointTransaction[]` |
| `redeemPoints()` | تحويل نقاط لمزايا | `{ points, benefit }` | `void` |

### مستويات الولاء

| المستوى | الاسم | الشرط |
|---------|-------|-------|
| `member` | عضو | البداية |
| `silver` | فضي | 100+ نقطة |
| `gold` | ذهبي | 500+ نقطة |
| `diamond` | ألماسي | 2000+ نقطة |

---

## 14. التقييمات والمراجعات

### `src/lib/reviews/reviews-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getSellerReviews(sellerId)` | جلب تقييمات البائع مع pagination | `sellerId: string` | `Review[]` |
| `getSellerRatingsSummary()` | ملخص التقييمات والتوزيع | `sellerId: string` | `RatingsSummary` |
| `submitReview()` | نشر تقييم للبائع | `{ sellerId, rating, comment }` | `Review` |
| `hasReviewedSeller()` | هل المستخدم قيّم البائع مسبقاً | `sellerId: string` | `boolean` |
| `deleteReview()` | حذف تقييم (مالك أو أدمن) | `reviewId: string` | `void` |

---

## 15. تصنيف البائعين

### `src/lib/social/seller-rank-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getSellerRank()` | حساب رتبة البائع | `sellerId: string` | `SellerRank` |
| `calculateSellerScore()` | حساب النتيجة من 8 معايير | `metrics: SellerMetrics` | `number` |
| `getSellerRankProfile()` | بيانات الرتبة الكاملة مع التفصيل | `sellerId: string` | `SellerRankProfile` |

### مستويات البائعين

| الرتبة | الاسم | الأيقونة | النتيجة |
|--------|-------|----------|---------|
| `beginner` | مبتدئ | 🌱 | 0-24 |
| `good` | شاطر | ⭐ | 25-49 |
| `pro` | محترف | 🏆 | 50-74 |
| `elite` | مكسب Elite | 👑 | 75-100 |

---

## 16. نظام المتاجر

### `src/lib/stores/store-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getStoreBySlug(slug)` | جلب متجر مع الإحصائيات | `slug: string` | `Store` |
| `getCurrentUserStore()` | متجر المستخدم الحالي | - | `Store \| null` |
| `createStore()` | إنشاء متجر جديد | `StoreInput` | `Store` |
| `updateStore()` | تحديث بيانات المتجر | `{ storeId, updates }` | `Store` |
| `getStoreProducts()` | جلب منتجات المتجر | `storeId: string` | `Ad[]` |
| `getStoreReviews()` | جلب تقييمات المتجر | `storeId: string` | `Review[]` |
| `getStoreAnalytics()` | مبيعات، مشاهدات، تحويلات | `storeId: string` | `StoreAnalytics` |
| `followStore()` | متابعة/إلغاء متابعة متجر | `storeId: string` | `boolean` |
| `getStoreFollowers()` | قائمة المتابعين | `storeId: string` | `User[]` |

### `src/lib/stores/subscription-plans.ts`

| الوظيفة | الوصف |
|---------|-------|
| إعدادات خطط الاشتراك | مميزات كل مستوى (إعلانات مميزة، دومين مخصص، إلخ) |

### `src/lib/stores/business-types.ts`

| الوظيفة | الوصف |
|---------|-------|
| أنواع الأعمال | فردي، مشروع صغير، مؤسسة |

---

## 17. نظام الدفع

### `src/lib/payment/payment-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getAvailablePaymentMethods()` | طرق الدفع المتاحة | - | `PaymentMethod[]` |
| `processPayment()` | معالجة الدفع عبر API | `PaymentRequest` | `PaymentResult` |

### طرق الدفع المدعومة

| الطريقة | الوصف |
|---------|-------|
| `instapay` | إنستاباي |
| `vodafone_cash` | فودافون كاش |
| `fawry` | فوري |
| `paymob_card` | بطاقة عبر Paymob |

---

## 18. نظام التحقق

### `src/lib/verification/verification-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `requestPhoneVerification()` | إرسال OTP | `phone: string` | `void` |
| `verifyOTP()` | التحقق من كود OTP | `{ phone, otp }` | `boolean` |
| `isPhoneVerified()` | حالة التحقق | `userId: string` | `boolean` |
| `getVerificationBadges()` | شارات التحقق | `userId: string` | `Badge[]` |

---

## 19. التحليلات والتتبع

### `src/lib/utils/` (Analytics)

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `trackPageView()` | تتبع مشاهدة الصفحة | `path: string` | `void` |
| `trackEvent()` | تتبع حدث مخصص | `{ name, params }` | `void` |
| `trackAdView()` | تتبع مشاهدة إعلان | `adId: string` | `void` |
| `trackSearch()` | تتبع استعلام بحث | `query: string` | `void` |

### `src/lib/social/seller-analytics.ts` (Seller Analytics)

| الوظيفة | الوصف |
|---------|-------|
| `getSellerAnalytics()` | لوحة تحكم مقاييس البائع |

### GA4 & PostHog Integrations

| الملف | الوصف |
|-------|-------|
| `ga4.ts` | تكامل Google Analytics 4 |
| `posthog.ts` | تكامل PostHog |

---

## 20. البلاغات والحظر

### `src/lib/reports/report-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `submitReport(params)` | الإبلاغ عن إعلان أو مستخدم | `{ targetType, targetId, reason }` | `Report` |
| `hasAlreadyReported()` | هل تم الإبلاغ مسبقاً | `{ targetType, targetId }` | `boolean` |

### أسباب البلاغ

| السبب | الوصف |
|-------|-------|
| `inappropriate` | محتوى غير لائق |
| `fraud` | احتيال |
| `spam` | سبام |
| `duplicate` | مكرر |

### `src/lib/blocks/block-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `blockUser()` | حظر مستخدم | `userId: string` | `void` |
| `unblockUser()` | إلغاء حظر | `userId: string` | `void` |
| `getBlockedUsers()` | قائمة المحظورين | - | `User[]` |
| `isUserBlocked()` | هل المستخدم محظور | `userId: string` | `boolean` |

---

## 21. الأدوات المساعدة

### `src/lib/utils/validators.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `validatePhone()` | تحقق من رقم موبايل مصري (01X) | `phone: string` | `boolean` |
| `validateEmail()` | تحقق من البريد الإلكتروني | `email: string` | `boolean` |
| `validatePrice()` | تحقق من السعر | `price: number` | `boolean` |
| `validateUrl()` | تحقق من الرابط | `url: string` | `boolean` |

### `src/lib/utils/format.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `formatPrice()` | تنسيق عملة (350,000 جنيه) | `price: number` | `string` |
| `formatDate()` | تنسيق تاريخ (منذ 3 ساعات) | `date: Date` | `string` |
| `formatPhone()` | تنسيق رقم (01X-XXXX-XXXX) | `phone: string` | `string` |
| تحويل أرقام عربية | تحويل بين الأنظمة الرقمية | `num: string` | `string` |

### `src/lib/utils/image-compress.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `compressImage(file)` | ضغط الصورة لأقل من 1MB | `file: File` | `File` |

### `src/lib/utils/video-compress.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `compressVideo(file)` | ضغط الفيديو | `file: File` | `File` |

### `src/lib/utils/audio-recorder.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `recordAudio()` | تسجيل صوتي للرسائل الصوتية | - | `Blob` |
| `playAudio()` | تشغيل الصوت | `url: string` | `void` |

### `src/lib/utils/geo.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getCurrentLocation()` | الحصول على الموقع الجغرافي | - | `{ lat, lng }` |
| `calculateDistance()` | المسافة بين نقطتين | `coords1, coords2` | `number (km)` |
| `getNearbyAds()` | إعلانات قريبة من الموقع | `{ lat, lng, radius }` | `Ad[]` |

### `src/lib/utils/auth-fetch.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `authFetch()` | Fetch مع توكن الجلسة | `url: string, options?` | `Response` |

### `src/lib/utils/unique-amount.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| إنشاء أرقام مرجعية فريدة | لعمليات الدفع | - | `string` |

### `src/lib/rate-limit/rate-limit-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `checkRateLimit()` | فحص تجاوز الحد | `{ key, limit, window }` | `boolean` |
| `incrementCounter()` | زيادة عداد الحد | `key: string` | `void` |

---

## 22. React Hooks

### `src/lib/hooks/useRealtimeChat.ts`

```typescript
useRealtimeChat({
  conversationId: string,
  currentUserId: string,
  onNewMessage: (msg) => void,
  onTypingChange: (isTyping) => void,
  autoMarkRead: boolean
})
```
**الوصف:** اشتراك لحظي في رسائل المحادثة مع مؤشرات القراءة والكتابة

### `src/lib/hooks/useLiveChat.ts`

| الوصف | المدخلات |
|-------|----------|
| ويدجت محادثة مباشرة مع اقتراحات رد تلقائي | - |

### `src/lib/hooks/useTyping.ts`

| الوصف | المدخلات |
|-------|----------|
| بث مؤشر الكتابة مع debounce | `conversationId: string` |

### `src/lib/hooks/usePresence.ts`

| الوصف | المدخلات |
|-------|----------|
| تتبع حالة المستخدم (متصل/غير متصل) | `userId: string` |

### `src/lib/hooks/useTrackSignal.ts`

```typescript
const { track } = useTrackSignal();
track({
  signal_type: 'view' | 'search' | 'favorite' | 'bid_placed' | 'chat_initiated',
  category_id: string,
  ad_id?: string,
  signal_data: Record<string, any>,
  weight: number
});
```
**الوصف:** تتبع سلوك المستخدم بدون حجب واجهة المستخدم (fire-and-forget)

### `src/lib/hooks/useInfiniteScroll.ts`

```typescript
const { items, isLoading, hasMore, loadMore } = useInfiniteScroll({
  fetchFn: (page) => Promise<T[]>,
  pageSize: number
});
```
**الوصف:** تحميل لا نهائي مع Intersection Observer API

### `src/lib/hooks/useRecentlyViewed.ts`

```typescript
const { recentlyViewed, addToViewed } = useRecentlyViewed();
```
**الوصف:** تتبع الإعلانات المعروضة مؤخراً (localStorage، أقصى 20)

### `src/lib/hooks/useConnectionQuality.ts`

```typescript
const { quality, adjustImageQuality } = useConnectionQuality();
```
**الوصف:** كشف سرعة الاتصال وضبط جودة الصور

---

## 23. Zustand Stores

### `src/stores/auth-store.ts` — مخزن المصادقة

```typescript
interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}
```

### `src/stores/chat-store.ts` — مخزن المحادثات

```typescript
interface ChatStore {
  conversations: ChatConversation[];
  messagesByConversation: Record<string, ChatMessage[]>;
  unreadCount: number;
  loadConversations: () => Promise<void>;
  loadMessages: (convId: string) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  markAsRead: (convId: string) => void;
}
```

### `src/stores/notification-store.ts` — مخزن الإشعارات

```typescript
interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
}
```

### `src/stores/comparison-store.ts` — مخزن المقارنة

```typescript
// مقارنة الإعلانات جنباً إلى جنب
```

### `src/stores/theme-store.ts` — مخزن السمة

```typescript
interface ThemeStore {
  isDark: boolean;
  toggleTheme: () => void;
}
```

### `src/stores/update-store.ts` — مخزن التحديثات

```typescript
// إشعارات تحديث PWA وحالة Service Worker
```

---

## 24. Supabase Edge Functions

### `supabase/functions/auction-end/`

```
POST /functions/v1/auction-end
```

| الخطوة | الوصف |
|--------|-------|
| 1 | استعلام عن المزادات النشطة المنتهية (`auction_ends_at <= NOW()`) |
| 2 | لكل مزاد: جلب أعلى مزايدة |
| 3 | تحديث `auction_status` → "ended_winner" أو "ended_no_bids" |
| 4 | تحديث `status` → "sold" |
| 5 | إنشاء إشعارات للفائز والبائع |

**حماية:** منع حالات السباق بـ `eq("auction_status", "active")`

### `supabase/functions/get-recommendations/`

```
POST /functions/v1/get-recommendations
Body: { user_id: string, limit?: number, governorate?: string }
```

| الخطوة | الوصف |
|--------|-------|
| 1 | جلب إشارات المستخدم الأخيرة (30 يوم) |
| 2 | تجميع في مجموعات اهتمام (أعلى 5 بالوزن) |
| 3 | لكل مجموعة: استعلام إعلانات مطابقة |
| 4 | فلترة بنطاق السعر (±30%) |
| 5 | تعزيز حسب الموقع |
| 6 | احتياطي: إعلانات شائعة إذا لم توجد إشارات |

---

## 25. API Routes

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/search` | POST | بحث متقدم مع فلاتر |
| `/api/search/autocomplete` | POST | اقتراحات الإكمال التلقائي |
| `/api/search/trending` | GET | عمليات البحث الرائجة |
| `/api/search/image` | POST | البحث العكسي بالصورة |
| `/api/recommendations` | POST | توصيات مخصصة |
| `/api/recommendations/seller-insights` | POST | تقديرات عدد المشترين |
| `/api/auctions/bid` | POST | تقديم مزايدة |
| `/api/auctions/buy-now` | POST | شراء فوري |
| `/api/chat/members` | GET | أعضاء المحادثة |
| `/api/collections` | GET/POST | إنشاء/جلب المجموعات |
| `/api/collections/[id]` | GET/PUT/DELETE | إدارة مجموعة |
| `/api/payment/process` | POST | معالجة الدفع |
| `/api/loyalty/profile` | GET | ملف الولاء |
| `/api/loyalty/referral` | POST | تتبع إحالة |
| `/api/notifications/push-subscribe` | POST | حفظ اشتراك Push |
| `/api/stores/[slug]` | GET | جلب تفاصيل المتجر |
| `/api/stores/check-name` | POST | فحص توفر اسم المتجر |
| `/api/admin/complete-setup-sql` | POST | إعداد الأدمن |
| `/api/users/delete` | POST | حذف حساب المستخدم |
| `/api/users/block` | POST | حظر مستخدم |
| `/api/ads/comments` | POST | تعليق على إعلان |
| `/api/ads/reactions` | POST | تفاعل على إعلان (إيموجي) |
| `/api/ads/duplicate` | POST | نسخ إعلان |

---

## 26. Database Migrations

| الرقم | الملف | الوصف |
|-------|-------|-------|
| 00001 | Extensions | pg_trgm, uuid, الملفات الأساسية |
| 00002 | Ads table | جدول الإعلانات بالتفصيل |
| 00003 | Interactions | المحادثات، الرسائل، المزايدات |
| 00004 | User signals | إشارات المستخدم، التوصيات |
| 00005 | RLS policies | سياسات أمان مستوى الصف |
| 00006 | Notifications | الإشعارات، اشتراكات Push |
| 00007 | Smart notifications | إشعارات ذكية |
| 00008 | Phone OTP | تحقق OTP مخصص |
| 00009 | Search indexes | فهارس البحث النصي |
| 00010 | Recommendation views | عروض التوصيات المخصصة |
| 00011 | Reviews | التقييمات، المراجعات، التحقق |
| 00012 | Stores | المتاجر، المتابعين، تقييمات المتاجر |
| 00013 | Store analytics RLS | إصلاحات أمان تحليلات المتاجر |
| 00014 | Business types | أنواع الأعمال التجارية |
| 00015 | Reports & blocks | البلاغات والحظر |
| 00016 | Admin role | دور المسؤول |
| 00017 | App settings | إعدادات التطبيق |
| 00018 | Security fixes | إصلاحات أمنية |
| 00019 | RLS hardening | تعزيز سياسات الأمان |
| 00020 | Badges & analytics | الشارات والتحليلات |
| 00021 | Founder/UTM | برنامج المؤسسين وتتبع UTM |
| 00022 | Referral system | نظام الإحالة |
| 00023 | Notification prefs | تفضيلات الإشعارات |
| 00024 | Gamification | محرك التلعيب |
| 00025 | Buy requests | طلبات الشراء |
| 00026 | Commission constraints | قيود العمولة |
| 00027 | Pre-payment | العمولة المقدمة، أسعار الذهب |
| 00028 | Price offers RLS | أمان عروض الأسعار + RPC |
| 00029 | Drop email subs | حذف جدول المشتركين |
| 00030 | Auction status fix | إصلاح حالة المزاد |
| 00031 | Buy request RPC | تحسينات RPC طلبات الشراء |
| 00032 | InstaPay verify | تحقق إنستاباي |
| 00033 | Payment verify | نظام تحقق الدفع |

---

## 27. خدمات اجتماعية

### `src/lib/social/ambassador-service.ts`

| الوظيفة | الوصف |
|---------|-------|
| إدارة برنامج السفراء | تتبع الإحالات والمكافآت |

### `src/lib/social/reactions-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| تفاعلات إيموجي على الإعلانات | إعجاب/تفاعل | `{ adId, emoji }` | `void` |
| تجميع عدد التفاعلات | إحصاء | `adId: string` | `ReactionCounts` |

### `src/lib/referral.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getReferralCode()` | كود إحالة المستخدم | - | `string` |
| `trackReferral()` | تسجيل تسجيل عبر إحالة | `code: string` | `void` |
| `getReferralStats()` | مقاييس الإحالة | - | `ReferralStats` |
| `sendReferralInvite()` | إرسال دعوة لصديق | `{ phone, method }` | `void` |

### `src/lib/badges/badge-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `userHasBadge()` | فحص شارة المستخدم | `{ userId, badge }` | `boolean` |
| `awardBadge()` | منح شارة | `{ userId, badge }` | `void` |

### أنواع الشارات

| الشارة | الوصف |
|--------|-------|
| `verified` | موثق الهوية |
| `commission_supporter` | داعم مكسب 💚 |
| `pro_seller` | بائع محترف |
| `ambassador` | سفير مكسب |
| `founder` | مؤسس (مبكر) |

### `src/lib/founder/founder-service.ts`

| الوظيفة | الوصف |
|---------|-------|
| مميزات برنامج المؤسسين | مزايا المستخدمين الأوائل |

### `src/lib/utm/utm-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `captureUTMParams()` | التقاط معاملات الاستعلام | - | `UTMParams` |
| `getStoredUTM()` | استرجاع UTM المخزن | - | `UTMParams` |
| `syncUTMVisit()` | تتبع زيارة UTM | `params: UTMParams` | `void` |

---

## 28. خدمات الذكاء الاصطناعي

### `src/lib/ai/ai-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `generateAdTitle()` | إنشاء عنوان بالذكاء الاصطناعي | `{ category, fields }` | `string` |
| `generateAdDescription()` | إنشاء وصف بالذكاء الاصطناعي | `{ category, fields }` | `string` |
| `enhanceImage()` | اقتراحات تحسين الصورة | `imageUrl: string` | `Suggestions` |
| `detectFraud()` | كشف الاحتيال | `ad: Ad` | `FraudScore` |

### `src/lib/ai/chat-intelligence.ts`

| الوظيفة | الوصف |
|---------|-------|
| اقتراحات رد ذكية | ردود تلقائية مقترحة |
| كشف النبرة | تحليل نبرة الرسالة |

---

## 29. الإدارة والإعدادات

### `src/lib/admin/admin-service.ts`

| الوظيفة | الوصف | المدخلات | المخرجات |
|---------|-------|----------|----------|
| `getAppSettings()` | إعدادات التطبيق العامة | - | `AppSettings` |
| `updateSettings()` | تحديث الإعدادات (أدمن فقط) | `settings: Partial<AppSettings>` | `void` |
| `banUser()` | حظر مستخدم (أدمن) | `userId: string` | `void` |
| `deleteAd()` | حذف إعلان (أدمن) | `adId: string` | `void` |

---

## 📊 ملخص الإحصائيات

| العنصر | العدد |
|--------|-------|
| **إجمالي الخدمات** | 45+ |
| **React Hooks** | 8 |
| **Zustand Stores** | 6 |
| **Edge Functions** | 2 |
| **Database Migrations** | 33 |
| **API Routes** | 30+ |
| **Type Definitions** | 100+ |

---

## 🔧 متغيرات البيئة المطلوبة

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_key
NEXT_PUBLIC_VODAFONE_CASH_NUMBER=your_vodafone_number
NEXT_PUBLIC_INSTAPAY_PHONE=your_instapay_phone
NEXT_PUBLIC_INSTAPAY_LINK=your_instapay_link
NEXT_PUBLIC_PAYMOB_ENABLED=true/false
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

---

> **ملاحظة:** هذا الملف يتم تحديثه تلقائياً مع كل إضافة جديدة للمشروع.
> آخر تحديث: 2026-03-04
