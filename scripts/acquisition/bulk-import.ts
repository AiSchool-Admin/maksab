/**
 * Maksab Bulk Import Script — إدخال بائعين مجمّع
 *
 * Usage:
 *   npx tsx scripts/acquisition/bulk-import.ts --file leads.json [--dry-run] [--batch batch_name]
 *
 * Input formats: JSON or CSV
 * Output: Import report (console + JSON file)
 *
 * This script does NOT create user accounts.
 * It only creates acquisition_leads records for outreach tracking.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ── Types ────────────────────────────────────────────

interface LeadInput {
  name?: string;
  phone: string;
  source: string;
  source_profile_url?: string;
  categories?: string[];
  active_ads_count?: number;
  location?: {
    governorate?: string;
    city?: string;
  };
  seller_score?: number;
  seller_tier?: string;
  notes?: string;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  skipped_blacklist: number;
  errors: Array<{ phone: string; reason: string }>;
  imported_leads: Array<{ phone: string; name: string; tier: string }>;
}

// ── Config ───────────────────────────────────────────

const VALID_SOURCES = [
  "olx",
  "facebook",
  "marketplace",
  "manual",
  "referral",
  "instagram",
  "tiktok",
  "whatsapp_group",
  "store_visit",
];
const VALID_TIERS = ["platinum", "gold", "silver", "bronze"];
const PHONE_REGEX = /^01[0125]\d{8}$/;

// ── Validation ───────────────────────────────────────

function validatePhone(phone: string): string | null {
  // Clean phone number
  const cleaned = phone.replace(/[\s\-\(\)\.+]/g, "");

  // Handle +2 or 002 prefix
  let normalized = cleaned;
  if (normalized.startsWith("+2")) normalized = normalized.slice(2);
  if (normalized.startsWith("002")) normalized = normalized.slice(3);
  if (normalized.startsWith("2") && normalized.length === 12)
    normalized = normalized.slice(1);

  if (!PHONE_REGEX.test(normalized)) return null;
  return normalized;
}

function validateLead(lead: LeadInput): {
  valid: boolean;
  reason?: string;
  cleaned?: LeadInput;
} {
  // Phone is required
  if (!lead.phone) {
    return { valid: false, reason: "رقم الهاتف مفقود" };
  }

  const phone = validatePhone(lead.phone);
  if (!phone) {
    return {
      valid: false,
      reason: `رقم هاتف غير صالح: ${lead.phone}`,
    };
  }

  // Source validation
  const source = (lead.source || "manual").toLowerCase();
  if (!VALID_SOURCES.includes(source)) {
    return { valid: false, reason: `مصدر غير معروف: ${lead.source}` };
  }

  // Tier validation
  const tier = (lead.seller_tier || "bronze").toLowerCase();
  if (!VALID_TIERS.includes(tier)) {
    return { valid: false, reason: `تصنيف غير صالح: ${lead.seller_tier}` };
  }

  return {
    valid: true,
    cleaned: {
      ...lead,
      phone,
      source,
      seller_tier: tier,
      seller_score: Math.min(Math.max(lead.seller_score || 0, 0), 50),
      active_ads_count: Math.max(lead.active_ads_count || 0, 0),
    },
  };
}

// ── File Parsing ─────────────────────────────────────

function parseJSON(filePath: string): LeadInput[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (Array.isArray(data)) return data;
  if (data.sellers && Array.isArray(data.sellers)) return data.sellers;
  if (data.leads && Array.isArray(data.leads)) return data.leads;

  throw new Error(
    "JSON file must contain an array or an object with 'sellers' or 'leads' key"
  );
}

function parseCSV(filePath: string): LeadInput[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  if (lines.length < 2) throw new Error("CSV file is empty or has no data rows");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const leads: LeadInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const lead: Record<string, unknown> = {};

    headers.forEach((header, idx) => {
      const value = values[idx]?.trim();
      if (!value) return;

      switch (header) {
        case "phone":
        case "هاتف":
        case "رقم":
          lead.phone = value;
          break;
        case "name":
        case "اسم":
          lead.name = value;
          break;
        case "source":
        case "مصدر":
          lead.source = value;
          break;
        case "source_profile_url":
        case "رابط":
          lead.source_profile_url = value;
          break;
        case "categories":
        case "أقسام":
          lead.categories = value.split(";").map((c) => c.trim());
          break;
        case "active_ads_count":
        case "إعلانات":
          lead.active_ads_count = parseInt(value, 10);
          break;
        case "governorate":
        case "محافظة":
          lead.location = {
            ...(lead.location as Record<string, string>),
            governorate: value,
          };
          break;
        case "city":
        case "مدينة":
          lead.location = {
            ...(lead.location as Record<string, string>),
            city: value,
          };
          break;
        case "seller_score":
        case "تقييم":
          lead.seller_score = parseInt(value, 10);
          break;
        case "seller_tier":
        case "تصنيف":
          lead.seller_tier = value;
          break;
        case "notes":
        case "ملاحظات":
          lead.notes = value;
          break;
      }
    });

    if (lead.phone) leads.push(lead as unknown as LeadInput);
  }

  return leads;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

// ── Database Operations ──────────────────────────────

async function getExistingPhones(
  supabase: SupabaseClient,
  phones: string[]
): Promise<Set<string>> {
  const existing = new Set<string>();

  // Check in batches of 100
  for (let i = 0; i < phones.length; i += 100) {
    const batch = phones.slice(i, i + 100);

    const { data } = await supabase
      .from("acquisition_leads")
      .select("phone")
      .in("phone", batch);

    if (data) data.forEach((d: { phone: string }) => existing.add(d.phone));

    // Also check if already registered
    const { data: profiles } = await supabase
      .from("profiles")
      .select("phone")
      .in("phone", batch);

    if (profiles)
      profiles.forEach((p: { phone: string }) => existing.add(p.phone));
  }

  return existing;
}

async function getBlacklistedPhones(
  supabase: SupabaseClient,
  phones: string[]
): Promise<Set<string>> {
  const blacklisted = new Set<string>();

  for (let i = 0; i < phones.length; i += 100) {
    const batch = phones.slice(i, i + 100);

    const { data } = await supabase
      .from("acquisition_leads")
      .select("phone")
      .in("phone", batch)
      .eq("status", "blacklist");

    if (data) data.forEach((d: { phone: string }) => blacklisted.add(d.phone));
  }

  return blacklisted;
}

async function insertLeads(
  supabase: SupabaseClient,
  leads: LeadInput[],
  batchId: string
): Promise<{ inserted: number; errors: Array<{ phone: string; reason: string }> }> {
  let inserted = 0;
  const errors: Array<{ phone: string; reason: string }> = [];

  // Insert in batches of 50
  for (let i = 0; i < leads.length; i += 50) {
    const batch = leads.slice(i, i + 50);

    const rows = batch.map((lead) => ({
      phone: lead.phone,
      name: lead.name || null,
      source: lead.source,
      source_profile_url: lead.source_profile_url || null,
      categories: lead.categories || [],
      active_ads_count: lead.active_ads_count || 0,
      seller_score: lead.seller_score || 0,
      seller_tier: lead.seller_tier || "bronze",
      governorate: lead.location?.governorate || null,
      city: lead.location?.city || null,
      notes: lead.notes || null,
      status: "new",
      batch_id: batchId,
      imported_by: "bulk-import-script",
    }));

    const { error } = await supabase.from("acquisition_leads").insert(rows);

    if (error) {
      // Try one by one to identify problematic rows
      for (const row of rows) {
        const { error: singleErr } = await supabase
          .from("acquisition_leads")
          .insert(row);

        if (singleErr) {
          errors.push({ phone: row.phone, reason: singleErr.message });
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

// ── Main ─────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const fileIdx = args.indexOf("--file");
  const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;
  const dryRun = args.includes("--dry-run");
  const batchIdx = args.indexOf("--batch");
  const batchId =
    batchIdx >= 0
      ? args[batchIdx + 1]
      : `batch_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${Date.now().toString(36)}`;

  if (!filePath) {
    console.error(`
╔═══════════════════════════════════════════════════════╗
║  مكسب — أداة الإدخال المجمع للبائعين                  ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  الاستخدام:                                           ║
║  npx tsx scripts/acquisition/bulk-import.ts \\         ║
║    --file leads.json                                  ║
║    [--dry-run]                                        ║
║    [--batch batch_name]                               ║
║                                                       ║
║  صيغ مدعومة: JSON, CSV                                ║
║                                                       ║
║  --dry-run: يفحص البيانات بدون إدخالها                 ║
║  --batch:   اسم الدُفعة (للتتبع)                      ║
╚═══════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }

  // Validate file exists
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ الملف غير موجود: ${absolutePath}`);
    process.exit(1);
  }

  // Validate env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(`
❌ المتغيرات البيئية مفقودة:
   NEXT_PUBLIC_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY

   تأكد من إن .env.local موجود أو مرر المتغيرات:
   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx ...
    `);
    process.exit(1);
  }

  console.log(`\n💚 مكسب — أداة الإدخال المجمع\n`);
  console.log(`📁 الملف: ${absolutePath}`);
  console.log(`📦 الدُفعة: ${batchId}`);
  if (dryRun) console.log(`⚠️  وضع الفحص (dry-run) — لن يتم إدخال بيانات\n`);

  // Parse file
  const ext = path.extname(absolutePath).toLowerCase();
  let leads: LeadInput[];

  try {
    if (ext === ".json") {
      leads = parseJSON(absolutePath);
    } else if (ext === ".csv") {
      leads = parseCSV(absolutePath);
    } else {
      console.error(`❌ صيغة غير مدعومة: ${ext} — استخدم JSON أو CSV`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ خطأ في قراءة الملف:`, (err as Error).message);
    process.exit(1);
  }

  console.log(`📊 عدد السجلات في الملف: ${leads.length}\n`);

  // Validate all leads
  const validLeads: LeadInput[] = [];
  const invalidLeads: Array<{ phone: string; reason: string }> = [];

  for (const lead of leads) {
    const result = validateLead(lead);
    if (result.valid && result.cleaned) {
      validLeads.push(result.cleaned);
    } else {
      invalidLeads.push({
        phone: lead.phone || "مفقود",
        reason: result.reason || "غير معروف",
      });
    }
  }

  console.log(`✅ سجلات صالحة: ${validLeads.length}`);
  console.log(`❌ سجلات مرفوضة: ${invalidLeads.length}`);

  if (invalidLeads.length > 0) {
    console.log(`\nأسباب الرفض:`);
    for (const inv of invalidLeads.slice(0, 10)) {
      console.log(`   ${inv.phone}: ${inv.reason}`);
    }
    if (invalidLeads.length > 10) {
      console.log(`   ... و${invalidLeads.length - 10} آخرين`);
    }
  }

  if (dryRun) {
    // Print summary and exit
    const tierCounts = validLeads.reduce(
      (acc, l) => {
        acc[l.seller_tier || "bronze"] = (acc[l.seller_tier || "bronze"] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const sourceCounts = validLeads.reduce(
      (acc, l) => {
        acc[l.source] = (acc[l.source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log(`\n── توزيع التصنيفات ──`);
    for (const [tier, count] of Object.entries(tierCounts)) {
      console.log(`   ${tier}: ${count}`);
    }

    console.log(`\n── توزيع المصادر ──`);
    for (const [source, count] of Object.entries(sourceCounts)) {
      console.log(`   ${source}: ${count}`);
    }

    console.log(`\n✅ الفحص اكتمل — شغّل بدون --dry-run للإدخال`);
    process.exit(0);
  }

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check for duplicates
  console.log(`\n🔍 جاري فحص التكرارات...`);
  const phones = validLeads.map((l) => l.phone);
  const existingPhones = await getExistingPhones(supabase, phones);
  const blacklistedPhones = await getBlacklistedPhones(supabase, phones);

  const newLeads = validLeads.filter((l) => {
    if (blacklistedPhones.has(l.phone)) return false;
    if (existingPhones.has(l.phone)) return false;
    return true;
  });

  const duplicateCount = validLeads.length - newLeads.length - [...blacklistedPhones].filter((p) => phones.includes(p)).length;
  const blacklistCount = [...blacklistedPhones].filter((p) => phones.includes(p)).length;

  console.log(`🔄 مكررين: ${duplicateCount}`);
  console.log(`🚫 في القائمة السوداء: ${blacklistCount}`);
  console.log(`🆕 جديد: ${newLeads.length}`);

  if (newLeads.length === 0) {
    console.log(`\n⚠️ لا يوجد سجلات جديدة للإدخال`);
    process.exit(0);
  }

  // Insert
  console.log(`\n📥 جاري الإدخال (${newLeads.length} سجل)...`);
  const { inserted, errors } = await insertLeads(supabase, newLeads, batchId);

  // Report
  const result: ImportResult = {
    total: leads.length,
    imported: inserted,
    skipped_duplicate: duplicateCount,
    skipped_invalid: invalidLeads.length,
    skipped_blacklist: blacklistCount,
    errors: [...invalidLeads, ...errors],
    imported_leads: newLeads.slice(0, inserted).map((l) => ({
      phone: l.phone,
      name: l.name || "",
      tier: l.seller_tier || "bronze",
    })),
  };

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  📊 تقرير الإدخال المجمع              ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  الإجمالي:         ${String(result.total).padStart(6)}           ║`);
  console.log(`║  تم إدخالهم:       ${String(result.imported).padStart(6)}           ║`);
  console.log(`║  مكررين:           ${String(result.skipped_duplicate).padStart(6)}           ║`);
  console.log(`║  غير صالحين:       ${String(result.skipped_invalid).padStart(6)}           ║`);
  console.log(`║  قائمة سوداء:      ${String(result.skipped_blacklist).padStart(6)}           ║`);
  console.log(`║  أخطاء:            ${String(errors.length).padStart(6)}           ║`);
  console.log(`╚══════════════════════════════════════╝`);

  // Save report
  const reportPath = path.join(
    path.dirname(absolutePath),
    `import-report-${batchId}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`\n📝 التقرير محفوظ في: ${reportPath}`);
}

main().catch((err) => {
  console.error("❌ خطأ غير متوقع:", err);
  process.exit(1);
});
