/**
 * Dubizzle Text-Dump Parser
 *
 * Handles the common case where a Dubizzle listing's `description` field
 * actually contains a dump of the whole rendered page text, like:
 *
 *   "الصفحة الرئيسية/عقارات/شقق للبيع/.../ستانليمميزشاهد  صورة33,000,000 ج.م
 *    شقة للبيع ستانلي (قمراية رشدي)ستانلي، الإسكندريةمنذ 1 يومالمواصفات البارزة
 *    النوع[spec sep]شقة[spec sep]ملكية[spec sep]إعادة بيع..."
 *
 * We extract:
 *   - Cleaned description (stripped breadcrumb + preamble)
 *   - Inline specs (from the "المواصفات البارزة" section)
 *
 * Used by:
 *   - Detail page (runtime rendering cleanup)
 *   - Cleanup endpoint (retroactive backfill on existing rows)
 *   - Dubizzle parser (as a post-processor fallback)
 */

export interface DubizzleTextDumpResult {
  cleanDescription: string | null;
  inlineSpecs: Record<string, string>;
}

// Spec labels we know Dubizzle uses (Arabic side)
// Order matters: longer labels first to avoid partial matches
const DUBIZZLE_SPEC_LABELS = [
  // Real estate
  "طريقة الدفع",
  "مقدم التعاقد",
  "عدد الحمامات",
  "عدد الغرف",
  "المساحة (م٢)",
  "المساحة",
  "التشطيب",
  "الإطلالة",
  "المميزات",
  "الأمان",
  "الكهرباء",
  "البناء",
  "الدور",
  "الواجهة",
  "النوع",
  "ملكية",
  // Cars
  "الكيلومترات",
  "الماركة",
  "الموديل",
  "سنة الصنع",
  "ناقل الحركة",
  "نوع الوقود",
  "نوع الهيكل",
  "حجم المحرك",
  "اللون",
  "الحالة",
  "الضمان",
  "مرخصة",
  "عدد الأبواب",
  "السعر",
];

const SPEC_LABELS_PATTERN = DUBIZZLE_SPEC_LABELS
  .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

// Match a spec label followed by its value. Two cases we see in dumps:
//   LABEL VALUE LABEL VALUE ... (concatenated, no separator)
//   LABEL\nVALUE\n...
// We anchor on known labels and stop at the next known label or section break.
const SPEC_EXTRACTION_REGEX = new RegExp(
  `(${SPEC_LABELS_PATTERN})([^\\n]+?)(?=(?:${SPEC_LABELS_PATTERN})|\\n|$)`,
  "g"
);

// Noise lines that frequently appear between breadcrumb and real description
const DUBIZZLE_NOISE_PATTERNS: RegExp[] = [
  /^الصفحة\s+الرئيسية\/[^\n]*$/gm, // breadcrumb line
  /^\s*مميز\s*$/gm, // "مميز" badge
  /^\s*شاهد\s+صور[ةة]?\s*$/gm, // "شاهد صورة" gallery label
  /^\s*منذ\s+\d+\s+(ثانية|دقيقة|دقائق|ساعة|ساعات|يوم|يومين|أيام|شهر|أشهر|سنة|سنوات)\s*$/gm, // "منذ X يوم"
  /^\s*\d[\d,]*\s*ج\.م\s*$/gm, // price-only line
  /^\s*مقدم\s*[\d,]+\s*ج\.م\s*$/gm, // "مقدم X جنيه"
];

// Stop phrases: cut from here onwards (footer/nav noise)
const DUBIZZLE_STOP_PHRASES = [
  "الإعلانات ذات الصلة",
  "نبذة عنا",
  "سياسة الخصوصية",
  "شروط الاستخدام",
  "خريطة الموقع",
  "الإبلاغ عن هذا الإعلان",
  "تحميل التطبيق",
  "متدفعش او تحول فلوس",
  "خد حد معاك وانت رايح",
];

/**
 * Detect whether a description looks like a Dubizzle page-dump.
 * Signals:
 *   - Starts with "الصفحة الرئيسية" breadcrumb
 *   - Contains "المواصفات البارزة" label
 *   - Very long (>400 chars) with low newline density
 */
export function isDubizzleTextDump(text: string | null | undefined): boolean {
  if (!text || text.length < 100) return false;
  if (text.startsWith("الصفحة الرئيسية") || text.includes("/عقارات/") || text.includes("/سيارات/")) return true;
  if (text.includes("المواصفات البارزة")) return true;
  return false;
}

/**
 * Parse a Dubizzle page-dump description and extract:
 *   - Clean description (body text only — breadcrumb and specs stripped)
 *   - Inline specs map
 */
export function parseDubizzleTextDump(raw: string): DubizzleTextDumpResult {
  const result: DubizzleTextDumpResult = {
    cleanDescription: null,
    inlineSpecs: {},
  };

  if (!raw) return result;

  let text = raw.trim();

  // Insert newlines before/after known section markers to make downstream regex work
  text = text.replace(/المواصفات البارزة/g, "\nالمواصفات البارزة\n");
  text = text.replace(/وصف\s*الإعلان/g, "\nوصف الإعلان\n");
  text = text.replace(/(الإعلانات ذات الصلة|نبذة عنا|سياسة الخصوصية|شروط الاستخدام)/g, "\n$1");

  // Split at "المواصفات البارزة" into [preamble, specsAndAfter]
  const specsMarkerIdx = text.indexOf("المواصفات البارزة");
  let preamble = specsMarkerIdx >= 0 ? text.substring(0, specsMarkerIdx) : text;
  let afterSpecs = specsMarkerIdx >= 0 ? text.substring(specsMarkerIdx + "المواصفات البارزة".length) : "";

  // Strip noise lines from preamble
  for (const pattern of DUBIZZLE_NOISE_PATTERNS) {
    preamble = preamble.replace(pattern, "");
  }

  // Try to extract specs from the section right after "المواصفات البارزة"
  // Also try from the tail of preamble (sometimes specs appear concatenated before the label)
  const specsSection = afterSpecs;

  // Extract specs: walk through known labels and grab the text until the next label
  for (const label of DUBIZZLE_SPEC_LABELS) {
    const labelIdx = specsSection.indexOf(label);
    if (labelIdx < 0) continue;
    const valueStart = labelIdx + label.length;
    // Find the nearest next-label
    let valueEnd = specsSection.length;
    for (const otherLabel of DUBIZZLE_SPEC_LABELS) {
      if (otherLabel === label) continue;
      const nextIdx = specsSection.indexOf(otherLabel, valueStart);
      if (nextIdx > 0 && nextIdx < valueEnd) valueEnd = nextIdx;
    }
    const value = specsSection.substring(valueStart, valueEnd).trim();
    if (value && value.length > 0 && value.length < 80) {
      // Clean the value — remove leading separators and common noise
      const cleanValue = value
        .replace(/^[:：\-–—]\s*/, "")
        .replace(/\s*[,،]?\s*$/, "")
        .trim();
      if (cleanValue && !/^\d+$/.test(label)) {
        result.inlineSpecs[label] = cleanValue;
      }
    }
  }

  // Build clean description
  // Preamble after noise removal: try to find the real description body.
  // Heuristic: the real description usually comes AFTER the title+location+date block.
  // Title+location often appears as "<title>...<location>، الإسكندرية" — after this, the user's text begins.
  let cleanDesc = preamble.replace(/\n{2,}/g, "\n").trim();

  // Apply stop phrases
  for (const stopPhrase of DUBIZZLE_STOP_PHRASES) {
    const idx = cleanDesc.indexOf(stopPhrase);
    if (idx > 0) {
      cleanDesc = cleanDesc.substring(0, idx).trim();
    }
  }

  // If after stripping noise the description is still full of "breadcrumb + concat garbage",
  // it likely has no real user description — set to null.
  if (cleanDesc.length < 30 || /^[^\s]{100,}/.test(cleanDesc.substring(0, 200))) {
    cleanDesc = "";
  }

  result.cleanDescription = cleanDesc.length >= 20 ? cleanDesc : null;
  return result;
}
