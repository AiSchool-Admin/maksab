"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload, FileText, CheckCircle, AlertTriangle, Users, ArrowRight,
  X, Download, RefreshCw, Eye
} from "lucide-react";
import { getAdminHeaders } from "@/app/admin/layout";

interface ParsedRow {
  full_name: string;
  phone: string;
  primary_category?: string;
  governorate?: string;
  city?: string;
  source?: string;
  source_detail?: string;
  account_type?: string;
  notes?: string;
  valid: boolean;
  errors: string[];
}

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  details: Array<{ row: number; status: string; error?: string }>;
}

const PHONE_REGEX = /^01[0125]\d{8}$/;

export default function BulkImportPage() {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    const rows = parseCSV(text);
    setParsedRows(rows);
    setStep("preview");
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return [];

    // Detect separator
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const headerRaw = lines[0].split(sep).map(h => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

    // Map header names (Arabic/English)
    const headerMap: Record<string, string> = {
      "الاسم": "full_name", "name": "full_name", "full_name": "full_name", "اسم": "full_name",
      "الهاتف": "phone", "phone": "phone", "رقم": "phone", "موبايل": "phone", "mobile": "phone",
      "الفئة": "primary_category", "category": "primary_category", "primary_category": "primary_category", "قسم": "primary_category",
      "المحافظة": "governorate", "governorate": "governorate", "محافظة": "governorate",
      "المدينة": "city", "city": "city", "مدينة": "city",
      "المصدر": "source", "source": "source", "مصدر": "source",
      "تفاصيل المصدر": "source_detail", "source_detail": "source_detail",
      "نوع الحساب": "account_type", "account_type": "account_type", "نوع": "account_type",
      "ملاحظات": "notes", "notes": "notes",
    };

    const headers = headerRaw.map(h => headerMap[h] || h);

    return lines.slice(1).map(line => {
      const values = line.split(sep).map(v => v.replace(/^["']|["']$/g, "").trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });

      // Validate
      const errors: string[] = [];
      if (!row.full_name) errors.push("الاسم مطلوب");
      if (!row.phone) errors.push("الهاتف مطلوب");
      else {
        // Clean phone
        let phone = row.phone.replace(/[\s\-\(\)]/g, "");
        if (phone.startsWith("+2")) phone = phone.substring(2);
        if (phone.startsWith("2") && phone.length === 12) phone = phone.substring(1);
        row.phone = phone;
        if (!PHONE_REGEX.test(phone)) errors.push("رقم هاتف غير صالح");
      }

      return {
        full_name: row.full_name || "",
        phone: row.phone || "",
        primary_category: row.primary_category || undefined,
        governorate: row.governorate || undefined,
        city: row.city || undefined,
        source: row.source || "csv_import",
        source_detail: row.source_detail || undefined,
        account_type: row.account_type || undefined,
        notes: row.notes || undefined,
        valid: errors.length === 0,
        errors,
      };
    });
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    setStep("importing");

    try {
      const customers = validRows.map(r => ({
        full_name: r.full_name,
        phone: r.phone,
        primary_category: r.primary_category,
        governorate: r.governorate,
        city: r.city,
        source: r.source || "csv_import",
        source_detail: r.source_detail,
        account_type: r.account_type,
        internal_notes: r.notes,
      }));

      const res = await fetch("/api/admin/crm/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ customers }),
      });

      const data = await res.json();
      setImportResult({
        total: customers.length,
        imported: data.imported || 0,
        duplicates: data.duplicates || 0,
        errors: data.errors || 0,
        details: data.details || [],
      });
      setStep("done");
    } catch {
      setImportResult({
        total: validRows.length,
        imported: 0,
        duplicates: 0,
        errors: validRows.length,
        details: [{ row: 0, status: "error", error: "فشل الاتصال بالسيرفر" }],
      });
      setStep("done");
    }
    setImporting(false);
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/crm/discovery" className="hover:text-[#1B7A3D]">محرك الاكتشاف</Link>
        <ArrowRight size={12} />
        <span className="text-gray-800 font-medium">استيراد جماعي</span>
      </div>

      <h2 className="text-lg font-bold flex items-center gap-2">
        <Upload size={20} className="text-[#1B7A3D]" />
        أداة الاستيراد الجماعي
      </h2>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <Upload size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-bold text-lg mb-2">ارفع ملف CSV أو Excel</h3>
          <p className="text-sm text-gray-500 mb-4">
            الأعمدة المطلوبة: <b>الاسم</b>، <b>الهاتف</b><br />
            أعمدة اختيارية: الفئة، المحافظة، المدينة، المصدر، نوع الحساب، ملاحظات
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E]">
            <FileText size={16} className="inline ml-2" />
            اختر ملف
          </button>

          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-right">
            <h4 className="text-xs font-bold text-gray-700 mb-2">نموذج الملف:</h4>
            <pre className="text-[11px] text-gray-500 font-mono overflow-x-auto" dir="ltr">
{`الاسم,الهاتف,الفئة,المحافظة,المصدر,ملاحظات
أحمد محمد,01012345678,phones,القاهرة,facebook_group,تاجر موبايلات نشط
سارة أحمد,01112345678,gold,الإسكندرية,dubizzle,`}
            </pre>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            الحد الأقصى: 1,000 صف في المرة الواحدة
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm">معاينة: {fileName}</h3>
                <p className="text-xs text-gray-500">{parsedRows.length} صف</p>
              </div>
              <div className="flex gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  <CheckCircle size={12} className="inline ml-1" />
                  {validCount} صالح
                </span>
                {invalidCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                    <AlertTriangle size={12} className="inline ml-1" />
                    {invalidCount} خطأ
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-right">#</th>
                    <th className="px-2 py-2 text-right">الحالة</th>
                    <th className="px-2 py-2 text-right">الاسم</th>
                    <th className="px-2 py-2 text-right">الهاتف</th>
                    <th className="px-2 py-2 text-right">الفئة</th>
                    <th className="px-2 py-2 text-right">المحافظة</th>
                    <th className="px-2 py-2 text-right">المصدر</th>
                    <th className="px-2 py-2 text-right">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} className={`border-t ${!row.valid ? "bg-red-50" : "hover:bg-gray-50"}`}>
                      <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-2 py-2">
                        {row.valid ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <span title={row.errors.join("، ")}>
                            <AlertTriangle size={14} className="text-red-500" />
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 font-medium">{row.full_name || "—"}</td>
                      <td className="px-2 py-2 font-mono" dir="ltr">{row.phone || "—"}</td>
                      <td className="px-2 py-2">{row.primary_category || "—"}</td>
                      <td className="px-2 py-2">{row.governorate || "—"}</td>
                      <td className="px-2 py-2">{row.source || "—"}</td>
                      <td className="px-2 py-2 max-w-[150px] truncate">{row.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setStep("upload"); setParsedRows([]); }}
              className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50">
              رجوع
            </button>
            <button onClick={handleImport} disabled={validCount === 0}
              className="flex-1 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium hover:bg-[#145C2E] disabled:opacity-50">
              <Users size={14} className="inline ml-1" />
              استيراد {validCount} عميل
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="w-12 h-12 border-4 border-[#1B7A3D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">جاري الاستيراد...</h3>
          <p className="text-sm text-gray-500">يتم استيراد {validCount} عميل — لا تغلق الصفحة</p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && importResult && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border p-6 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <h3 className="font-bold text-lg mb-2">تم الاستيراد!</h3>

            <div className="grid grid-cols-3 gap-3 mt-4 max-w-md mx-auto">
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
                <p className="text-[10px] text-green-600">تم استيرادهم</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-amber-700">{importResult.duplicates}</p>
                <p className="text-[10px] text-amber-600">مكرر</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-red-700">{importResult.errors}</p>
                <p className="text-[10px] text-red-600">أخطاء</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setStep("upload"); setParsedRows([]); setImportResult(null); }}
              className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-gray-50">
              <Upload size={14} className="inline ml-1" />
              استيراد آخر
            </button>
            <Link href="/admin/crm/customers"
              className="flex-1 py-2.5 bg-[#1B7A3D] text-white rounded-xl text-sm font-medium text-center hover:bg-[#145C2E]">
              <Users size={14} className="inline ml-1" />
              عرض العملاء
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
