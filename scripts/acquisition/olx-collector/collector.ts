/**
 * نظام جمع بيانات OLX — المجمّع الرئيسي
 * OLX Data Collector — Main Script
 *
 * يجمع بيانات الإعلانات والبائعين من OLX Egypt
 * عبر الـ API العام الظاهر على الموقع
 *
 * Usage:
 *   npx tsx scripts/acquisition/olx-collector/collector.ts \
 *     --categories cars,phones \
 *     --max-pages 5 \
 *     --governorate cairo \
 *     --delay 2000 \
 *     --output ./data/olx-collection
 */

import * as fs from 'fs';
import * as path from 'path';
import type { OlxListingRaw, CollectionConfig, CollectionStats, MaksabAd, MaksabSeller } from './types';
import { OLX_CATEGORIES } from './category-mapping';
import { transformListing, transformSeller } from './transformer';

// ── Constants ───────────────────────────────────────

const OLX_BASE = 'https://www.olx.com.eg';
const OLX_API_BASE = 'https://www.olx.com.eg/api/relevance/v4/search';
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const DEFAULT_CONFIG: CollectionConfig = {
  categories: ['cars-for-sale', 'mobile-phones'],
  maxPages: 3,
  delayMs: 2500,
  includeImages: true,
  includePhone: false,
  outputDir: './data/olx-collection',
  batchId: `batch_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Date.now().toString(36)}`,
};

// ── HTTP Helpers ────────────────────────────────────

async function fetchWithRetry(url: string, retries = 3, delay = 2000): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
          'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.5',
          'Referer': OLX_BASE,
        },
      });

      if (response.ok) return response;

      if (response.status === 429) {
        // Rate limited — wait longer
        const waitTime = delay * attempt * 2;
        console.log(`⏳ Rate limited (429) — ننتظر ${waitTime / 1000} ثانية...`);
        await sleep(waitTime);
        continue;
      }

      if (response.status >= 500 && attempt < retries) {
        console.log(`⚠️ Server error (${response.status}) — محاولة ${attempt}/${retries}`);
        await sleep(delay * attempt);
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`⚠️ خطأ في الاتصال — محاولة ${attempt}/${retries}`);
      await sleep(delay * attempt);
    }
  }
  throw new Error('Exhausted retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── OLX API Functions ───────────────────────────────

/**
 * Fetch listings from OLX search API
 */
async function fetchListings(
  categorySlug: string,
  page: number = 1,
  governorate?: string
): Promise<{ listings: OlxListingRaw[]; totalPages: number; totalCount: number }> {
  const params = new URLSearchParams({
    'category': categorySlug,
    'page': String(page),
    'sorting': 'desc-creation',
    'platform': 'web-desktop',
    'page_size': '40',
  });

  if (governorate) {
    params.set('location', governorate);
  }

  const url = `${OLX_API_BASE}?${params.toString()}`;

  console.log(`   📡 جاري جلب الصفحة ${page}...`);

  const response = await fetchWithRetry(url);
  const data = await response.json();

  const listings: OlxListingRaw[] = [];

  if (data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      try {
        const listing = parseOlxItem(item);
        if (listing) listings.push(listing);
      } catch (err) {
        // Skip malformed items
      }
    }
  }

  const totalCount = data.metadata?.total_count || 0;
  const totalPages = Math.ceil(totalCount / 40);

  return { listings, totalPages, totalCount };
}

/**
 * Parse a single OLX API item into our raw format
 */
function parseOlxItem(item: Record<string, unknown>): OlxListingRaw | null {
  if (!item || typeof item !== 'object') return null;

  const id = String(item.id || '');
  if (!id) return null;

  // Extract price
  const priceObj = item.price as Record<string, unknown> | undefined;
  const price = {
    value: 0,
    currency: 'EGP',
    negotiable: false,
    displayValue: '',
  };

  if (priceObj) {
    price.value = Number(priceObj.value || priceObj.amount || 0);
    price.displayValue = String(priceObj.display || priceObj.raw || '');
    price.negotiable = Boolean(priceObj.negotiable);
    price.currency = String(priceObj.currency || 'EGP');
  }

  // Extract category
  const catObj = item.category as Record<string, unknown> | undefined;
  const category = {
    id: String(catObj?.id || ''),
    name: String(catObj?.name || ''),
    parentId: catObj?.parent_id ? String(catObj.parent_id) : undefined,
    parentName: catObj?.parent_name ? String(catObj.parent_name) : undefined,
  };

  // Extract location
  const locObj = item.location as Record<string, unknown> | undefined;
  const geoObj = item.geo as Record<string, unknown> | undefined;
  const location: OlxListingRaw['location'] = {
    governorate: '',
    city: '',
    lat: geoObj?.lat ? Number(geoObj.lat) : undefined,
    lng: geoObj?.lng ? Number(geoObj.lng) : undefined,
  };

  if (locObj) {
    // OLX location can have nested city/region
    const regionObj = locObj.region as Record<string, unknown> | undefined;
    const cityObj = locObj.city as Record<string, unknown> | undefined;
    const districtObj = locObj.district as Record<string, unknown> | undefined;

    location.governorate = String(regionObj?.name || locObj.region_name || '');
    location.city = String(districtObj?.name || cityObj?.name || locObj.city_name || '');
    location.neighborhood = districtObj?.name ? String(districtObj.name) : undefined;
  }

  // Extract seller/user info
  const userObj = item.user as Record<string, unknown> | undefined;
  const seller = {
    id: String(userObj?.id || ''),
    name: String(userObj?.name || ''),
    phone: undefined as string | undefined,
    memberSince: userObj?.created ? String(userObj.created) : undefined,
    profileUrl: userObj?.id ? `${OLX_BASE}/profile/${userObj.id}` : '',
    adsCount: Number(userObj?.ads_count || 0),
  };

  // Extract images
  const images: string[] = [];
  const photosArr = item.photos as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(photosArr)) {
    for (const photo of photosArr) {
      // Prefer large then medium then small
      const url = String(photo.url || photo.large || photo.medium || photo.small || '');
      if (url) images.push(url);
    }
  }

  // Extract attributes
  const attributes: Record<string, string> = {};
  const paramsArr = item.parameters as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(paramsArr)) {
    for (const param of paramsArr) {
      const key = String(param.key || param.id || '');
      const value = String(param.value || param.label || param.value_name || '');
      if (key && value) {
        attributes[key] = value;
      }
    }
  }

  // Build URL
  const slug = item.slug || item.title;
  const adUrl = `${OLX_BASE}/item/${id}`;

  return {
    id,
    title: String(item.title || ''),
    description: String(item.description || ''),
    price,
    category,
    location,
    seller,
    images,
    attributes,
    createdAt: String(item.created_at || item.created_time || ''),
    url: adUrl,
  };
}

/**
 * Fetch detailed ad page for additional info (phone, full description)
 */
async function fetchAdDetail(adId: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `${OLX_BASE}/api/v1/items/${adId}`;
    const response = await fetchWithRetry(url, 2, 3000);
    return await response.json();
  } catch {
    return null;
  }
}

// ── Collection Pipeline ─────────────────────────────

async function collectCategory(
  categorySlug: string,
  config: CollectionConfig,
  stats: CollectionStats
): Promise<{ listings: OlxListingRaw[]; sellers: Map<string, MaksabSeller> }> {
  const categoryMap = OLX_CATEGORIES.find((c) => c.olxSlug === categorySlug);
  const categoryName = categoryMap?.olxName || categorySlug;

  console.log(`\n📂 جاري جمع: ${categoryName} (${categorySlug})`);
  console.log(`   الحد الأقصى: ${config.maxPages} صفحات`);

  const allListings: OlxListingRaw[] = [];
  const sellers = new Map<string, MaksabSeller>();

  let page = 1;
  let hasMore = true;

  while (page <= config.maxPages && hasMore) {
    try {
      const governorate = config.governorates?.[0]; // Use first governorate for now
      const { listings, totalPages, totalCount } = await fetchListings(
        categorySlug,
        page,
        governorate
      );

      if (listings.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`   ✅ الصفحة ${page}: ${listings.length} إعلان (إجمالي: ${totalCount})`);

      for (const listing of listings) {
        allListings.push(listing);

        // Track unique sellers
        if (listing.seller.id && !sellers.has(listing.seller.id)) {
          const score = calculateSellerScore(listing.seller);
          sellers.set(listing.seller.id, {
            name: listing.seller.name,
            phone: listing.seller.phone,
            source: 'olx',
            source_profile_url: listing.seller.profileUrl,
            source_id: listing.seller.id,
            categories: categoryMap ? [categoryMap.maksabCategoryId] : [],
            active_ads_count: listing.seller.adsCount || 1,
            location: {
              governorate: listing.location.governorate,
              city: listing.location.city,
            },
            seller_score: score.score,
            seller_tier: score.tier,
            member_since: listing.seller.memberSince,
            notes: `من ${categoryName} — ${listing.seller.adsCount || 1} إعلان`,
          });
        } else if (listing.seller.id && sellers.has(listing.seller.id)) {
          // Update seller with additional category
          const existing = sellers.get(listing.seller.id)!;
          if (categoryMap && !existing.categories.includes(categoryMap.maksabCategoryId)) {
            existing.categories.push(categoryMap.maksabCategoryId);
          }
          existing.active_ads_count = Math.max(existing.active_ads_count, listing.seller.adsCount || 1);
        }
      }

      hasMore = page < totalPages;
      page++;

      // Respect rate limits
      if (hasMore) {
        const delay = config.delayMs + Math.random() * 1000; // Add jitter
        await sleep(delay);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ خطأ في الصفحة ${page}: ${errMsg}`);
      stats.errors.push({ category: categorySlug, page, error: errMsg });

      // Skip this page and continue
      page++;
      await sleep(config.delayMs * 2);
    }
  }

  console.log(`   📊 النتيجة: ${allListings.length} إعلان — ${sellers.size} بائع فريد`);

  // Update stats
  stats.byCategory[categorySlug] = {
    listings: allListings.length,
    sellers: sellers.size,
  };

  return { listings: allListings, sellers };
}

function calculateSellerScore(seller: { adsCount?: number; memberSince?: string; name: string }): {
  score: number;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
} {
  let score = 0;

  // Ads count (max 15)
  const adsCount = seller.adsCount || 0;
  if (adsCount >= 20) score += 15;
  else if (adsCount >= 10) score += 12;
  else if (adsCount >= 5) score += 8;
  else if (adsCount >= 3) score += 5;
  else score += 2;

  // Account age (max 15)
  if (seller.memberSince) {
    const created = new Date(seller.memberSince);
    const now = new Date();
    const monthsOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld >= 24) score += 15;
    else if (monthsOld >= 12) score += 12;
    else if (monthsOld >= 6) score += 8;
    else if (monthsOld >= 3) score += 5;
    else score += 2;
  } else {
    score += 3;
  }

  // Has name (max 5)
  if (seller.name && seller.name.length > 2) score += 5;

  // Determine tier
  let tier: 'platinum' | 'gold' | 'silver' | 'bronze' = 'bronze';
  if (score >= 30) tier = 'platinum';
  else if (score >= 22) tier = 'gold';
  else if (score >= 14) tier = 'silver';

  return { score, tier };
}

// ── Output & Saving ─────────────────────────────────

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveResults(
  config: CollectionConfig,
  allListings: OlxListingRaw[],
  allSellers: MaksabSeller[],
  transformedAds: MaksabAd[],
  stats: CollectionStats
) {
  const outputDir = path.resolve(config.outputDir, config.batchId);
  ensureDir(outputDir);

  // 1. Raw OLX data
  fs.writeFileSync(
    path.join(outputDir, 'olx-raw-listings.json'),
    JSON.stringify(allListings, null, 2),
    'utf-8'
  );

  // 2. Transformed Maksab ads
  fs.writeFileSync(
    path.join(outputDir, 'maksab-ads.json'),
    JSON.stringify(transformedAds, null, 2),
    'utf-8'
  );

  // 3. Sellers
  fs.writeFileSync(
    path.join(outputDir, 'sellers.json'),
    JSON.stringify({ sellers: allSellers, exportedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  );

  // 4. Stats
  fs.writeFileSync(
    path.join(outputDir, 'collection-stats.json'),
    JSON.stringify(stats, null, 2),
    'utf-8'
  );

  // 5. CSV for sellers (easy import)
  const csvHeaders = 'phone,name,source,source_profile_url,categories,active_ads_count,governorate,city,seller_score,seller_tier,notes';
  const csvRows = allSellers.map((s) => {
    return [
      s.phone || '',
      `"${(s.name || '').replace(/"/g, '""')}"`,
      s.source,
      s.source_profile_url,
      `"${s.categories.join(';')}"`,
      s.active_ads_count,
      s.location.governorate || '',
      s.location.city || '',
      s.seller_score,
      s.seller_tier,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });
  fs.writeFileSync(
    path.join(outputDir, 'sellers.csv'),
    '\uFEFF' + csvHeaders + '\n' + csvRows.join('\n'),
    'utf-8'
  );

  // 6. Summary CSV for ads
  const adCsvHeaders = 'title,price,category,subcategory,governorate,city,source_url,seller_name,images_count';
  const adCsvRows = transformedAds.map((a) => {
    return [
      `"${(a.title || '').replace(/"/g, '""')}"`,
      a.price || 0,
      a.category_id,
      a.subcategory_id,
      a.governorate,
      a.city,
      a.source_url,
      `"${(a.source_seller_name || '').replace(/"/g, '""')}"`,
      a.images.length,
    ].join(',');
  });
  fs.writeFileSync(
    path.join(outputDir, 'ads-summary.csv'),
    '\uFEFF' + adCsvHeaders + '\n' + adCsvRows.join('\n'),
    'utf-8'
  );

  console.log(`\n💾 تم حفظ النتائج في: ${outputDir}`);
  console.log(`   📄 olx-raw-listings.json — البيانات الخام (${allListings.length})`);
  console.log(`   📄 maksab-ads.json — الإعلانات المحوّلة (${transformedAds.length})`);
  console.log(`   📄 sellers.json — البائعين (${allSellers.length})`);
  console.log(`   📄 sellers.csv — البائعين CSV`);
  console.log(`   📄 ads-summary.csv — ملخص الإعلانات CSV`);
  console.log(`   📄 collection-stats.json — إحصائيات الجمع`);
}

// ── CLI ─────────────────────────────────────────────

function parseArgs(): CollectionConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--categories':
      case '-c':
        config.categories = args[++i].split(',');
        break;
      case '--max-pages':
      case '-p':
        config.maxPages = parseInt(args[++i], 10);
        break;
      case '--governorate':
      case '-g':
        config.governorates = args[++i].split(',');
        break;
      case '--delay':
      case '-d':
        config.delayMs = parseInt(args[++i], 10);
        break;
      case '--output':
      case '-o':
        config.outputDir = args[++i];
        break;
      case '--batch':
      case '-b':
        config.batchId = args[++i];
        break;
      case '--with-images':
        config.includeImages = true;
        break;
      case '--with-phones':
        config.includePhone = true;
        break;
      case '--all':
        config.categories = OLX_CATEGORIES.map((c) => c.olxSlug);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💚 مكسب — أداة جمع بيانات OLX                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  الاستخدام:                                               ║
║  npx tsx scripts/acquisition/olx-collector/collector.ts   ║
║    --categories cars-for-sale,mobile-phones               ║
║    --max-pages 5                                          ║
║    --governorate cairo                                    ║
║    --delay 2500                                           ║
║    --output ./data/olx-collection                         ║
║                                                           ║
║  الخيارات:                                                ║
║  -c, --categories   الأقسام (مفصولة بفاصلة)               ║
║  -p, --max-pages    أقصى عدد صفحات لكل قسم (افتراضي: 3)  ║
║  -g, --governorate  المحافظة (اختياري)                     ║
║  -d, --delay        التأخير بين الطلبات بالمللي (2500)     ║
║  -o, --output       مجلد الإخراج                          ║
║  -b, --batch        اسم الدفعة                            ║
║  --all              جمع كل الأقسام                        ║
║  --with-phones      محاولة استخراج أرقام الهواتف          ║
║  -h, --help         عرض المساعدة                          ║
║                                                           ║
║  الأقسام المتاحة:                                         ║
${OLX_CATEGORIES.map((c) => `║    ${c.olxSlug.padEnd(35)} ${c.olxName.padEnd(15)}║`).join('\n')}
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

// ── Main ────────────────────────────────────────────

async function main() {
  const config = parseArgs();

  console.log(`
╔═══════════════════════════════════════════════════════╗
║  💚 مكسب — أداة جمع بيانات OLX                       ║
╠═══════════════════════════════════════════════════════╣
║  📦 الدفعة: ${config.batchId.padEnd(38)}║
║  📂 الأقسام: ${config.categories.length.toString().padEnd(37)}║
║  📄 أقصى صفحات: ${config.maxPages.toString().padEnd(34)}║
║  ⏱️  التأخير: ${(config.delayMs / 1000).toFixed(1).padEnd(35)}ث║
╚═══════════════════════════════════════════════════════╝
  `);

  const stats: CollectionStats = {
    batchId: config.batchId,
    startedAt: new Date().toISOString(),
    categoriesProcessed: 0,
    totalListings: 0,
    totalSellers: 0,
    uniqueSellers: 0,
    errors: [],
    byCategory: {},
    byGovernorate: {},
  };

  const allListings: OlxListingRaw[] = [];
  const allSellersMap = new Map<string, MaksabSeller>();

  // Process each category
  for (const categorySlug of config.categories) {
    try {
      const { listings, sellers } = await collectCategory(categorySlug, config, stats);

      allListings.push(...listings);

      // Merge sellers
      for (const [id, seller] of sellers) {
        if (allSellersMap.has(id)) {
          const existing = allSellersMap.get(id)!;
          // Merge categories
          for (const cat of seller.categories) {
            if (!existing.categories.includes(cat)) existing.categories.push(cat);
          }
          existing.active_ads_count = Math.max(existing.active_ads_count, seller.active_ads_count);
        } else {
          allSellersMap.set(id, seller);
        }
      }

      stats.categoriesProcessed++;

      // Delay between categories
      if (config.categories.indexOf(categorySlug) < config.categories.length - 1) {
        console.log(`\n⏳ ننتظر 5 ثواني قبل القسم التالي...`);
        await sleep(5000);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ فشل في جمع ${categorySlug}: ${errMsg}`);
      stats.errors.push({ category: categorySlug, page: 0, error: errMsg });
    }
  }

  // Transform listings to Maksab format
  console.log(`\n🔄 جاري تحويل البيانات لصيغة مكسب...`);
  const transformedAds = allListings
    .map(transformListing)
    .filter((ad): ad is MaksabAd => ad !== null);

  // Count by governorate
  for (const listing of allListings) {
    const gov = listing.location.governorate || 'غير محدد';
    stats.byGovernorate[gov] = (stats.byGovernorate[gov] || 0) + 1;
  }

  const allSellers = Array.from(allSellersMap.values());

  stats.totalListings = allListings.length;
  stats.totalSellers = allSellers.length;
  stats.uniqueSellers = allSellersMap.size;
  stats.completedAt = new Date().toISOString();

  // Save results
  saveResults(config, allListings, allSellers, transformedAds, stats);

  // Print summary
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  📊 ملخص عملية الجمع                                 ║
╠═══════════════════════════════════════════════════════╣
║  📦 الدفعة:          ${config.batchId.slice(0, 30).padEnd(30)}║
║  📂 أقسام تم جمعها:  ${String(stats.categoriesProcessed).padEnd(30)}║
║  📄 إجمالي الإعلانات: ${String(stats.totalListings).padEnd(30)}║
║  ✅ إعلانات محوّلة:   ${String(transformedAds.length).padEnd(30)}║
║  👥 بائعين فريدين:    ${String(stats.uniqueSellers).padEnd(30)}║
║  ❌ أخطاء:           ${String(stats.errors.length).padEnd(30)}║
╠═══════════════════════════════════════════════════════╣
║  توزيع حسب القسم:                                    ║`);

  for (const [cat, data] of Object.entries(stats.byCategory)) {
    const catName = OLX_CATEGORIES.find((c) => c.olxSlug === cat)?.olxName || cat;
    console.log(`║    ${catName.padEnd(20)} ${String(data.listings).padEnd(6)} إعلان — ${String(data.sellers).padEnd(4)} بائع  ║`);
  }

  console.log(`╠═══════════════════════════════════════════════════════╣`);
  console.log(`║  توزيع حسب المحافظة (أعلى 5):                       ║`);

  const topGovs = Object.entries(stats.byGovernorate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [gov, count] of topGovs) {
    console.log(`║    ${gov.padEnd(20)} ${String(count).padEnd(10)} إعلان          ║`);
  }

  console.log(`╚═══════════════════════════════════════════════════════╝`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️ الأخطاء:`);
    for (const err of stats.errors) {
      console.log(`   ${err.category} (صفحة ${err.page}): ${err.error}`);
    }
  }

  console.log(`\n✅ اكتملت عملية الجمع!`);
  console.log(`💡 لاستيراد البيانات في مكسب:`);
  console.log(`   npx tsx scripts/acquisition/olx-collector/importer.ts \\`);
  console.log(`     --dir ${path.resolve(config.outputDir, config.batchId)}`);
}

main().catch((err) => {
  console.error('\n❌ خطأ غير متوقع:', err);
  process.exit(1);
});
