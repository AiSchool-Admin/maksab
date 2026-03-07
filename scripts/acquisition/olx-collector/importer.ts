/**
 * مستورد البيانات — من ملفات الجمع إلى قاعدة بيانات مكسب
 * Data Importer — From collected files to Maksab Database
 *
 * يقرأ الملفات المُصدّرة من المجمّع ويستوردها في Supabase
 *
 * Usage:
 *   npx tsx scripts/acquisition/olx-collector/importer.ts \
 *     --dir ./data/olx-collection/batch_xxx \
 *     [--dry-run] \
 *     [--ads-only] \
 *     [--sellers-only] \
 *     [--skip-duplicates]
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import type { MaksabAd, MaksabSeller } from './types';

// ── Types ──────────────────────────────────────────

interface ImportStats {
  batchDir: string;
  startedAt: string;
  completedAt?: string;
  ads: {
    total: number;
    imported: number;
    skipped_duplicate: number;
    skipped_invalid: number;
    errors: Array<{ id: string; reason: string }>;
  };
  sellers: {
    total: number;
    imported: number;
    skipped_duplicate: number;
    skipped_invalid: number;
    errors: Array<{ id: string; reason: string }>;
  };
}

interface ImportConfig {
  dir: string;
  dryRun: boolean;
  adsOnly: boolean;
  sellersOnly: boolean;
  skipDuplicates: boolean;
  batchSize: number;
}

// ── CLI Parsing ────────────────────────────────────

function parseArgs(): ImportConfig {
  const args = process.argv.slice(2);
  const config: ImportConfig = {
    dir: '',
    dryRun: false,
    adsOnly: false,
    sellersOnly: false,
    skipDuplicates: true,
    batchSize: 50,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dir':
      case '-d':
        config.dir = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--ads-only':
        config.adsOnly = true;
        break;
      case '--sellers-only':
        config.sellersOnly = true;
        break;
      case '--skip-duplicates':
        config.skipDuplicates = true;
        break;
      case '--include-duplicates':
        config.skipDuplicates = false;
        break;
      case '--batch-size':
        config.batchSize = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!config.dir) {
    console.error('❌ لازم تحدد مجلد البيانات: --dir <path>');
    printHelp();
    process.exit(1);
  }

  return config;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💚 مكسب — أداة استيراد بيانات OLX                       ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  الاستخدام:                                               ║
║  npx tsx scripts/acquisition/olx-collector/importer.ts    ║
║    --dir ./data/olx-collection/batch_xxx                  ║
║    [--dry-run]              فحص بدون إدخال                ║
║    [--ads-only]             إعلانات فقط                   ║
║    [--sellers-only]         بائعين فقط                    ║
║    [--include-duplicates]   لا تتخطى المكررين              ║
║    [--batch-size 50]        حجم الدفعة                    ║
║                                                           ║
║  المتغيرات البيئية المطلوبة:                              ║
║    NEXT_PUBLIC_SUPABASE_URL                                ║
║    SUPABASE_SERVICE_ROLE_KEY                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

// ── Database Operations ────────────────────────────

async function importAds(
  supabase: SupabaseClient,
  ads: MaksabAd[],
  config: ImportConfig,
  stats: ImportStats
) {
  console.log(`\n📦 جاري استيراد ${ads.length} إعلان...`);

  if (config.skipDuplicates) {
    // Check for existing ads by source_id
    const sourceIds = ads.map((a) => a.source_id);
    const existingIds = new Set<string>();

    for (let i = 0; i < sourceIds.length; i += 100) {
      const batch = sourceIds.slice(i, i + 100);
      const { data } = await supabase
        .from('imported_ads')
        .select('source_id')
        .in('source_id', batch);

      if (data) data.forEach((d: { source_id: string }) => existingIds.add(d.source_id));
    }

    const newAds = ads.filter((a) => !existingIds.has(a.source_id));
    stats.ads.skipped_duplicate = ads.length - newAds.length;
    ads = newAds;

    if (stats.ads.skipped_duplicate > 0) {
      console.log(`   🔄 تم تخطي ${stats.ads.skipped_duplicate} إعلان مكرر`);
    }
  }

  if (ads.length === 0) {
    console.log('   ⚠️ لا يوجد إعلانات جديدة للاستيراد');
    return;
  }

  // Insert in batches
  for (let i = 0; i < ads.length; i += config.batchSize) {
    const batch = ads.slice(i, i + config.batchSize);
    const rows = batch.map((ad) => ({
      title: ad.title,
      description: ad.description,
      category_id: ad.category_id,
      subcategory_id: ad.subcategory_id,
      sale_type: ad.sale_type,
      price: ad.price,
      is_negotiable: ad.is_negotiable,
      category_fields: ad.category_fields,
      governorate: ad.governorate,
      city: ad.city,
      latitude: ad.latitude,
      longitude: ad.longitude,
      images: ad.images,
      status: 'active',
      source: 'olx',
      source_url: ad.source_url,
      source_id: ad.source_id,
      source_seller_id: ad.source_seller_id,
      source_seller_name: ad.source_seller_name,
      source_seller_phone: ad.source_seller_phone,
      extracted_at: ad.extracted_at,
    }));

    const { error } = await supabase.from('imported_ads').insert(rows);

    if (error) {
      // Try one by one
      for (const row of rows) {
        const { error: singleErr } = await supabase.from('imported_ads').insert(row);
        if (singleErr) {
          stats.ads.errors.push({
            id: row.source_id,
            reason: singleErr.message,
          });
        } else {
          stats.ads.imported++;
        }
      }
    } else {
      stats.ads.imported += batch.length;
    }

    // Progress
    const progress = Math.min(i + config.batchSize, ads.length);
    console.log(`   📥 ${progress}/${ads.length} (${Math.round((progress / ads.length) * 100)}%)`);
  }
}

async function importSellers(
  supabase: SupabaseClient,
  sellers: MaksabSeller[],
  config: ImportConfig,
  stats: ImportStats
) {
  console.log(`\n👥 جاري استيراد ${sellers.length} بائع...`);

  if (config.skipDuplicates) {
    // Check for existing sellers by source_id
    const sourceIds = sellers.map((s) => s.source_id);
    const existingIds = new Set<string>();

    for (let i = 0; i < sourceIds.length; i += 100) {
      const batch = sourceIds.slice(i, i + 100);

      // Check in acquisition_leads
      const { data } = await supabase
        .from('acquisition_leads')
        .select('source_id')
        .in('source_id', batch);

      if (data) data.forEach((d: { source_id: string }) => existingIds.add(d.source_id));

      // Check by phone in profiles
      const phoneBatch = sellers
        .filter((s) => batch.includes(s.source_id) && s.phone)
        .map((s) => s.phone!);

      if (phoneBatch.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('phone')
          .in('phone', phoneBatch);

        if (profiles) {
          for (const p of profiles) {
            const matchingSeller = sellers.find((s) => s.phone === (p as { phone: string }).phone);
            if (matchingSeller) existingIds.add(matchingSeller.source_id);
          }
        }
      }
    }

    const newSellers = sellers.filter((s) => !existingIds.has(s.source_id));
    stats.sellers.skipped_duplicate = sellers.length - newSellers.length;
    sellers = newSellers;

    if (stats.sellers.skipped_duplicate > 0) {
      console.log(`   🔄 تم تخطي ${stats.sellers.skipped_duplicate} بائع مكرر`);
    }
  }

  if (sellers.length === 0) {
    console.log('   ⚠️ لا يوجد بائعين جدد للاستيراد');
    return;
  }

  // Insert into acquisition_leads
  for (let i = 0; i < sellers.length; i += config.batchSize) {
    const batch = sellers.slice(i, i + config.batchSize);
    const rows = batch.map((seller) => ({
      name: seller.name || null,
      phone: seller.phone || null,
      source: 'olx',
      source_profile_url: seller.source_profile_url,
      source_id: seller.source_id,
      categories: seller.categories,
      active_ads_count: seller.active_ads_count,
      governorate: seller.location.governorate || null,
      city: seller.location.city || null,
      seller_score: seller.seller_score,
      seller_tier: seller.seller_tier,
      member_since: seller.member_since || null,
      notes: seller.notes || null,
      status: 'new',
      imported_by: 'olx-collector',
    }));

    const { error } = await supabase.from('acquisition_leads').insert(rows);

    if (error) {
      for (const row of rows) {
        const { error: singleErr } = await supabase.from('acquisition_leads').insert(row);
        if (singleErr) {
          stats.sellers.errors.push({
            id: row.source_id,
            reason: singleErr.message,
          });
        } else {
          stats.sellers.imported++;
        }
      }
    } else {
      stats.sellers.imported += batch.length;
    }

    const progress = Math.min(i + config.batchSize, sellers.length);
    console.log(`   📥 ${progress}/${sellers.length} (${Math.round((progress / sellers.length) * 100)}%)`);
  }
}

// ── Main ────────────────────────────────────────────

async function main() {
  const config = parseArgs();
  const dirPath = path.resolve(config.dir);

  if (!fs.existsSync(dirPath)) {
    console.error(`❌ المجلد غير موجود: ${dirPath}`);
    process.exit(1);
  }

  console.log(`\n💚 مكسب — أداة استيراد بيانات OLX\n`);
  console.log(`📁 المجلد: ${dirPath}`);
  if (config.dryRun) console.log(`⚠️ وضع الفحص (dry-run) — لن يتم إدخال بيانات`);

  const stats: ImportStats = {
    batchDir: dirPath,
    startedAt: new Date().toISOString(),
    ads: { total: 0, imported: 0, skipped_duplicate: 0, skipped_invalid: 0, errors: [] },
    sellers: { total: 0, imported: 0, skipped_duplicate: 0, skipped_invalid: 0, errors: [] },
  };

  // Read data files
  let ads: MaksabAd[] = [];
  let sellers: MaksabSeller[] = [];

  if (!config.sellersOnly) {
    const adsFile = path.join(dirPath, 'maksab-ads.json');
    if (fs.existsSync(adsFile)) {
      ads = JSON.parse(fs.readFileSync(adsFile, 'utf-8'));
      stats.ads.total = ads.length;
      console.log(`📄 إعلانات: ${ads.length}`);
    } else {
      console.log(`⚠️ ملف الإعلانات غير موجود: maksab-ads.json`);
    }
  }

  if (!config.adsOnly) {
    const sellersFile = path.join(dirPath, 'sellers.json');
    if (fs.existsSync(sellersFile)) {
      const sellersData = JSON.parse(fs.readFileSync(sellersFile, 'utf-8'));
      sellers = sellersData.sellers || sellersData;
      stats.sellers.total = sellers.length;
      console.log(`📄 بائعين: ${sellers.length}`);
    } else {
      console.log(`⚠️ ملف البائعين غير موجود: sellers.json`);
    }
  }

  if (ads.length === 0 && sellers.length === 0) {
    console.log(`\n⚠️ لا يوجد بيانات للاستيراد`);
    process.exit(0);
  }

  // Show summary in dry-run mode
  if (config.dryRun) {
    console.log(`\n── ملخص البيانات ──`);

    if (ads.length > 0) {
      const categories = ads.reduce((acc, a) => {
        acc[a.category_id] = (acc[a.category_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const governorates = ads.reduce((acc, a) => {
        acc[a.governorate || 'غير محدد'] = (acc[a.governorate || 'غير محدد'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const withPrice = ads.filter((a) => a.price && a.price > 0).length;
      const withImages = ads.filter((a) => a.images.length > 0).length;

      console.log(`\n📦 الإعلانات (${ads.length}):`);
      console.log(`   💰 بسعر: ${withPrice} (${Math.round((withPrice / ads.length) * 100)}%)`);
      console.log(`   📸 بصور: ${withImages} (${Math.round((withImages / ads.length) * 100)}%)`);

      console.log(`   📂 حسب القسم:`);
      for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
        console.log(`      ${cat}: ${count}`);
      }

      console.log(`   📍 حسب المحافظة (أعلى 5):`);
      for (const [gov, count] of Object.entries(governorates).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
        console.log(`      ${gov}: ${count}`);
      }
    }

    if (sellers.length > 0) {
      const tiers = sellers.reduce((acc, s) => {
        acc[s.seller_tier] = (acc[s.seller_tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const withPhone = sellers.filter((s) => s.phone).length;

      console.log(`\n👥 البائعين (${sellers.length}):`);
      console.log(`   📱 برقم هاتف: ${withPhone} (${Math.round((withPhone / sellers.length) * 100)}%)`);
      console.log(`   🏆 حسب التصنيف:`);
      for (const [tier, count] of Object.entries(tiers)) {
        console.log(`      ${tier}: ${count}`);
      }
    }

    console.log(`\n✅ الفحص اكتمل — شغّل بدون --dry-run للاستيراد`);
    process.exit(0);
  }

  // Validate env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(`
❌ المتغيرات البيئية مفقودة:
   NEXT_PUBLIC_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
    `);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Import
  if (!config.sellersOnly && ads.length > 0) {
    await importAds(supabase, ads, config, stats);
  }

  if (!config.adsOnly && sellers.length > 0) {
    await importSellers(supabase, sellers, config, stats);
  }

  stats.completedAt = new Date().toISOString();

  // Save import report
  const reportPath = path.join(dirPath, 'import-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2), 'utf-8');

  // Print summary
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  📊 تقرير الاستيراد                                  ║
╠═══════════════════════════════════════════════════════╣
║  إعلانات:                                            ║
║    الإجمالي:     ${String(stats.ads.total).padEnd(35)}║
║    تم استيرادهم: ${String(stats.ads.imported).padEnd(35)}║
║    مكررين:       ${String(stats.ads.skipped_duplicate).padEnd(35)}║
║    أخطاء:        ${String(stats.ads.errors.length).padEnd(35)}║
║                                                       ║
║  بائعين:                                              ║
║    الإجمالي:     ${String(stats.sellers.total).padEnd(35)}║
║    تم استيرادهم: ${String(stats.sellers.imported).padEnd(35)}║
║    مكررين:       ${String(stats.sellers.skipped_duplicate).padEnd(35)}║
║    أخطاء:        ${String(stats.sellers.errors.length).padEnd(35)}║
╚═══════════════════════════════════════════════════════╝
  `);

  console.log(`📝 التقرير محفوظ في: ${reportPath}`);
}

main().catch((err) => {
  console.error('❌ خطأ غير متوقع:', err);
  process.exit(1);
});
