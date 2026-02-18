"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  Trash2,
  Edit3,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useAuthStore } from "@/stores/auth-store";
import { getStoreByUserId } from "@/lib/stores/store-service";
import {
  getCategoryById,
  categoriesConfig,
} from "@/lib/categories/categories-config";
import {
  generateAutoTitle,
  generateAutoDescription,
} from "@/lib/categories/generate";
import type { Store } from "@/types";

interface ImportRow {
  id: string;
  rawData: Record<string, string>;
  parsedData: {
    title: string;
    description: string;
    price: number;
    is_negotiable: boolean;
    subcategory_id: string;
    category_fields: Record<string, unknown>;
  };
  errors: string[];
  status: "pending" | "publishing" | "success" | "error";
  errorMessage?: string;
}

type ImportStep = "select" | "upload" | "preview" | "publishing" | "done";

export default function BulkImportPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<ImportStep>("select");
  const [categoryId, setCategoryId] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishResults, setPublishResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [editingRow, setEditingRow] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    async function load() {
      const s = await getStoreByUserId(user!.id);
      if (!s) { router.push("/store/create"); return; }
      setStore(s);
      if (s.main_category) setCategoryId(s.main_category);
      setIsLoading(false);
    }
    load();
  }, [user, router]);

  // Generate CSV template for selected category
  const generateTemplate = useCallback(() => {
    const config = getCategoryById(categoryId);
    if (!config) return;

    // Build headers: price, is_negotiable, subcategory, + category fields
    const headers = ["السعر", "قابل_للتفاوض", "القسم_الفرعي"];
    const fieldIds = ["price", "is_negotiable", "subcategory_id"];

    for (const field of config.fields) {
      headers.push(field.label);
      fieldIds.push(field.id);
    }

    // Example row
    const exampleRow: string[] = [];
    exampleRow.push("1000"); // price
    exampleRow.push("نعم"); // negotiable
    exampleRow.push(config.subcategories[0]?.name || ""); // subcategory

    for (const field of config.fields) {
      if (field.type === "select" && field.options?.length) {
        exampleRow.push(field.options[0].label);
      } else if (field.type === "number") {
        exampleRow.push("0");
      } else if (field.type === "toggle") {
        exampleRow.push("نعم");
      } else if (field.type === "year-picker") {
        exampleRow.push("2024");
      } else {
        exampleRow.push("");
      }
    }

    // Add BOM for Excel Arabic support
    const BOM = "\uFEFF";
    const csvContent = BOM + [
      headers.join(","),
      exampleRow.join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `مكسب_قالب_${config.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [categoryId]);

  // Parse uploaded file
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const config = getCategoryById(categoryId);
    if (!config) return;

    try {
      let parsedRows: Record<string, string>[] = [];

      if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        // Parse CSV
        const text = await file.text();
        const Papa = (await import("papaparse")).default;
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h: string) => h.trim(),
        });
        parsedRows = result.data as Record<string, string>[];
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Parse Excel
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as Record<string, string>[];
      } else {
        alert("نوع الملف مش مدعوم. استخدم CSV أو Excel (.xlsx)");
        return;
      }

      if (parsedRows.length === 0) {
        alert("الملف فاضي أو مفيش بيانات");
        return;
      }

      if (parsedRows.length > 100) {
        alert("الحد الأقصى 100 منتج في المرة الواحدة. الملف فيه " + parsedRows.length + " صف");
        parsedRows = parsedRows.slice(0, 100);
      }

      // Map rows to ImportRow
      const importRows: ImportRow[] = parsedRows.map((raw, index) => {
        const errors: string[] = [];
        const categoryFields: Record<string, unknown> = {};

        // Parse price
        const priceStr = raw["السعر"] || raw["price"] || "";
        const price = Number(priceStr.replace(/[^\d.]/g, ""));
        if (!price || price <= 0) errors.push("السعر مطلوب");

        // Parse negotiable
        const negStr = raw["قابل_للتفاوض"] || raw["negotiable"] || "";
        const isNeg = ["نعم", "yes", "1", "true"].includes(negStr.toLowerCase().trim());

        // Parse subcategory
        const subStr = raw["القسم_الفرعي"] || raw["subcategory"] || "";
        const sub = config.subcategories.find(
          s => s.name === subStr.trim() || s.id === subStr.trim() || s.slug === subStr.trim()
        );

        // Parse category fields
        for (const field of config.fields) {
          const rawVal = raw[field.label] || raw[field.id] || "";
          if (!rawVal.trim()) {
            if (field.isRequired && config.requiredFields.includes(field.id)) {
              errors.push(`${field.label} مطلوب`);
            }
            if (field.defaultValue !== undefined) {
              categoryFields[field.id] = field.defaultValue;
            }
            continue;
          }

          if (field.type === "select" && field.options) {
            const opt = field.options.find(
              o => o.label === rawVal.trim() || o.value === rawVal.trim()
            );
            categoryFields[field.id] = opt?.value || rawVal.trim();
          } else if (field.type === "number") {
            categoryFields[field.id] = Number(rawVal.replace(/[^\d.]/g, "")) || 0;
          } else if (field.type === "toggle") {
            categoryFields[field.id] = ["نعم", "yes", "1", "true"].includes(rawVal.toLowerCase().trim());
          } else if (field.type === "year-picker") {
            categoryFields[field.id] = rawVal.trim();
          } else {
            categoryFields[field.id] = rawVal.trim();
          }
        }

        // Auto-generate title and description
        const title = generateAutoTitle(config, categoryFields, sub?.id) || "منتج جديد";
        const description = generateAutoDescription(config, categoryFields, sub?.id) || "";

        return {
          id: `row-${index}`,
          rawData: raw,
          parsedData: {
            title,
            description,
            price,
            is_negotiable: isNeg,
            subcategory_id: sub?.id || "",
            category_fields: categoryFields,
          },
          errors,
          status: "pending" as const,
        };
      });

      setRows(importRows);
      setStep("preview");
    } catch (err) {
      console.error("File parse error:", err);
      alert("حصل مشكلة في قراءة الملف. تأكد إنه CSV أو Excel صحيح");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [categoryId]);

  // Remove a row
  const handleRemoveRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  }, []);

  // Update row inline
  const handleUpdateRowPrice = useCallback((rowId: string, newPrice: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const price = Number(newPrice.replace(/[^\d.]/g, ""));
      return {
        ...r,
        parsedData: { ...r.parsedData, price },
        errors: price > 0 ? r.errors.filter(e => e !== "السعر مطلوب") : r.errors,
      };
    }));
  }, []);

  const handleUpdateRowTitle = useCallback((rowId: string, newTitle: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, parsedData: { ...r.parsedData, title: newTitle } };
    }));
  }, []);

  // Publish all valid rows
  const handlePublish = useCallback(async () => {
    if (!user || !store) return;

    const validRows = rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      alert("مفيش منتجات صالحة للنشر. صلّح الأخطاء الأول");
      return;
    }

    setStep("publishing");
    setPublishProgress(0);
    setPublishResults({ success: 0, failed: 0 });

    // Publish in batches of 10
    const batchSize = 10;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);

      const ads = batch.map(row => ({
        category_id: categoryId,
        subcategory_id: row.parsedData.subcategory_id || null,
        title: row.parsedData.title,
        description: row.parsedData.description,
        price: row.parsedData.price,
        is_negotiable: row.parsedData.is_negotiable,
        category_fields: row.parsedData.category_fields,
        governorate: store.location_gov || null,
        city: store.location_area || null,
        images: [],
        sale_type: "cash",
      }));

      try {
        const res = await fetch("/api/ads/bulk-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            ads,
            store_id: store.id,
          }),
        });

        const result = await res.json();

        if (res.ok && result.success) {
          successCount += result.count;
          // Mark batch rows as success
          const batchIds = new Set(batch.map(r => r.id));
          setRows(prev => prev.map(r =>
            batchIds.has(r.id) ? { ...r, status: "success" as const } : r
          ));
        } else {
          failCount += batch.length;
          const batchIds = new Set(batch.map(r => r.id));
          setRows(prev => prev.map(r =>
            batchIds.has(r.id) ? { ...r, status: "error" as const, errorMessage: result.error } : r
          ));
        }
      } catch {
        failCount += batch.length;
      }

      setPublishProgress(Math.min(i + batchSize, validRows.length));
      setPublishResults({ success: successCount, failed: failCount });
    }

    setStep("done");
  }, [rows, user, store, categoryId]);

  const config = getCategoryById(categoryId);
  const validCount = rows.filter(r => r.errors.length === 0).length;
  const errorCount = rows.filter(r => r.errors.length > 0).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-light px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.push("/store/dashboard/products")} className="p-1">
          <ArrowRight size={20} />
        </button>
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-brand-green" />
          <h1 className="text-xl font-bold text-dark">استيراد من ملف Excel</h1>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="px-4 mt-3">
        <div className="flex items-center gap-1 text-xs">
          {["اختار القسم", "ارفع الملف", "راجع وانشر"].map((label, i) => {
            const stepMap: Record<string, number> = { select: 0, upload: 1, preview: 2, publishing: 3, done: 3 };
            const currentStepNum = stepMap[step] ?? 0;
            const isActive = i <= currentStepNum;
            const isPast = i < currentStepNum;
            return (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <div className={`w-6 h-0.5 ${isPast ? "bg-brand-green" : "bg-gray-200"}`} />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isPast ? "bg-brand-green text-white" : isActive ? "bg-brand-green/20 text-brand-green" : "bg-gray-200 text-gray-text"
                }`}>
                  {isPast ? <Check size={12} /> : i + 1}
                </div>
                <span className={`${isActive ? "text-brand-green font-semibold" : "text-gray-text"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* ── Step 1: Select Category ── */}
        {step === "select" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-light p-4 space-y-4">
              <div className="text-center pb-2">
                <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet size={28} className="text-brand-green" />
                </div>
                <h2 className="text-2xl font-bold text-dark mb-1">استيراد منتجات من ملف</h2>
                <p className="text-sm text-gray-text">
                  حمّل قالب Excel، عبّيه بالمنتجات، وارفعه هنا
                </p>
              </div>

              <Select
                label="اختار القسم"
                name="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categoriesConfig.map(c => ({
                  value: c.id,
                  label: `${c.icon} ${c.name}`,
                }))}
                placeholder="اختار قسم المنتجات"
                required
              />

              {categoryId && config && (
                <div className="bg-brand-green/5 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-semibold text-dark">
                    {config.icon} {config.name} — {config.fields.filter(f => f.isRequired).length} حقول مطلوبة
                  </p>
                  <p className="text-xs text-gray-text">
                    الحقول المطلوبة: {config.fields.filter(f => config.requiredFields.includes(f.id)).map(f => f.label).join("، ")}
                  </p>
                </div>
              )}
            </div>

            {categoryId && (
              <div className="space-y-2">
                <Button
                  fullWidth
                  variant="outline"
                  onClick={generateTemplate}
                  icon={<Download size={16} />}
                >
                  حمّل قالب Excel
                </Button>
                <Button
                  fullWidth
                  onClick={() => setStep("upload")}
                  icon={<Upload size={16} />}
                >
                  عندي ملف جاهز — ارفعه
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Upload File ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="bg-white rounded-2xl border-2 border-dashed border-brand-green/40 p-8 text-center cursor-pointer hover:bg-brand-green/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={40} className="mx-auto text-brand-green mb-3" />
              <h3 className="text-base font-bold text-dark mb-1">ارفع الملف هنا</h3>
              <p className="text-sm text-gray-text mb-3">
                CSV أو Excel (.xlsx)
              </p>
              <p className="text-xs text-gray-text">
                الحد الأقصى: 100 منتج في المرة الواحدة
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
              <p className="text-xs font-semibold text-dark mb-1">نصائح:</p>
              <ul className="text-xs text-gray-text space-y-1 list-disc list-inside">
                <li>استخدم القالب اللي حملته عشان الأعمدة تكون صح</li>
                <li>كل صف = منتج واحد</li>
                <li>السعر لازم يكون رقم (مثلاً: 1500)</li>
                <li>للحقول الاختيارية — سيبها فاضية</li>
              </ul>
            </div>

            <button
              onClick={() => setStep("select")}
              className="w-full text-center text-sm text-gray-text hover:text-brand-green"
            >
              ← رجوع لاختيار القسم
            </button>
          </div>
        )}

        {/* ── Step 3: Preview & Edit ── */}
        {step === "preview" && (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="bg-white rounded-xl border border-gray-light p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-dark">{rows.length} منتج</span>
                {validCount > 0 && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">
                    {validCount} صالح
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded-full font-semibold">
                    {errorCount} فيه أخطاء
                  </span>
                )}
              </div>
              <button
                onClick={() => { setRows([]); setStep("upload"); }}
                className="text-xs text-gray-text hover:text-error"
              >
                ملف تاني
              </button>
            </div>

            {/* Product rows */}
            {rows.map((row, index) => (
              <div
                key={row.id}
                className={`bg-white rounded-xl border p-3 space-y-2 ${
                  row.errors.length > 0 ? "border-error/30 bg-error/5" : "border-gray-light"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-text bg-gray-100 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      {editingRow === row.id ? (
                        <input
                          value={row.parsedData.title}
                          onChange={(e) => handleUpdateRowTitle(row.id, e.target.value)}
                          onBlur={() => setEditingRow(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingRow(null)}
                          className="text-sm font-semibold text-dark border-b border-brand-green outline-none flex-1 bg-transparent"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm font-semibold text-dark line-clamp-1 flex-1">
                          {row.parsedData.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 mr-7">
                      {editingRow === row.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={row.parsedData.price || ""}
                            onChange={(e) => handleUpdateRowPrice(row.id, e.target.value)}
                            className="text-xs font-bold text-brand-green border-b border-brand-green outline-none w-20 bg-transparent"
                            type="number"
                            placeholder="السعر"
                          />
                          <span className="text-xs text-gray-text">جنيه</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-brand-green">
                          {row.parsedData.price ? `${row.parsedData.price.toLocaleString()} جنيه` : "—"}
                        </span>
                      )}
                      {row.parsedData.is_negotiable && (
                        <span className="text-[10px] text-gray-text">قابل للتفاوض</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingRow(editingRow === row.id ? null : row.id)}
                      className="p-1.5 text-gray-text hover:text-brand-green rounded-lg hover:bg-gray-50"
                    >
                      {editingRow === row.id ? <Check size={14} /> : <Edit3 size={14} />}
                    </button>
                    <button
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-1.5 text-gray-text hover:text-error rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Errors */}
                {row.errors.length > 0 && (
                  <div className="flex items-start gap-1.5 bg-error/10 rounded-lg p-2">
                    <AlertCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-error">
                      {row.errors.join(" • ")}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 4: Publishing Progress ── */}
        {step === "publishing" && (
          <div className="bg-white rounded-2xl border border-gray-light p-6 text-center space-y-4">
            <Loader2 size={40} className="mx-auto text-brand-green animate-spin" />
            <h3 className="text-lg font-bold text-dark">جاري نشر المنتجات...</h3>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all duration-500"
                style={{ width: `${validCount > 0 ? (publishProgress / validCount) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-text">
              {publishProgress} من {validCount} منتج
            </p>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === "done" && (
          <div className="bg-white rounded-2xl border border-gray-light p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-brand-green" />
            </div>
            <h3 className="text-lg font-bold text-dark">تم الاستيراد!</h3>

            <div className="flex justify-center gap-4">
              {publishResults.success > 0 && (
                <div className="bg-green-50 rounded-xl px-4 py-2">
                  <p className="text-2xl font-bold text-green-600">{publishResults.success}</p>
                  <p className="text-xs text-green-600">نجحوا</p>
                </div>
              )}
              {publishResults.failed > 0 && (
                <div className="bg-error/10 rounded-xl px-4 py-2">
                  <p className="text-2xl font-bold text-error">{publishResults.failed}</p>
                  <p className="text-xs text-error">فشلوا</p>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Button
                fullWidth
                onClick={() => router.push("/store/dashboard/products")}
                icon={<Check size={16} />}
              >
                عرض المنتجات
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => {
                  setRows([]);
                  setStep("select");
                  setPublishProgress(0);
                  setPublishResults({ success: 0, failed: 0 });
                }}
                icon={<Upload size={16} />}
              >
                استيراد ملف تاني
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Publish Button (Preview step only) */}
      {step === "preview" && rows.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light p-4 z-40">
          <Button
            fullWidth
            size="lg"
            onClick={handlePublish}
            disabled={validCount === 0}
            icon={<Upload size={18} />}
          >
            نشر {validCount} منتج
            {errorCount > 0 && ` (${errorCount} هيتم تخطيهم)`}
          </Button>
        </div>
      )}
    </div>
  );
}
