"use client";

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { categoriesConfig } from "@/lib/categories/categories-config";
import {
  createBuyRequest,
  type PurchaseType,
} from "@/lib/buy-requests/buy-request-service";

interface CreateBuyRequestProps {
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export default function CreateBuyRequest({ onClose, onCreated }: CreateBuyRequestProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("cash");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [exchangeOffer, setExchangeOffer] = useState("");
  const [exchangeCategoryId, setExchangeCategoryId] = useState("");
  const [governorate, setGovernorate] = useState("");

  const selectedCategory = categoriesConfig.find((c) => c.id === categoryId);

  const handleSubmit = async () => {
    setErrorMsg("");

    if (!categoryId || !title.trim()) {
      setErrorMsg("اختار القسم واكتب اللي عايزه");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBuyRequest({
        categoryId,
        title: title.trim(),
        description: description.trim() || undefined,
        purchaseType,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        exchangeOffer: exchangeOffer.trim() || undefined,
        exchangeCategoryId: exchangeCategoryId || undefined,
        governorate: governorate || undefined,
      });

      if (result.success && result.id) {
        toast.success("تم نشر طلبك! هنلاقيلك عروض مناسبة");
        onCreated?.(result.id);
        onClose();
      } else {
        setErrorMsg(result.error || "حصل مشكلة — جرب تاني");
      }
    } catch {
      setErrorMsg("حصل مشكلة — جرب تاني");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 py-3 border-b border-gray-light">
          <h2 className="text-lg font-bold text-dark">
            {step === 1 ? "عايز تشتري إيه؟" : "تفاصيل الشراء"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-text hover:text-dark">
            <X size={22} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">
          {step === 1 && (
            <>
              {/* Category selection */}
              <div>
                <label className="text-sm font-bold text-dark block mb-2">اختار القسم</label>
                <div className="grid grid-cols-3 gap-2">
                  {categoriesConfig.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        categoryId === cat.id
                          ? "border-brand-green bg-brand-green-light"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[11px] font-bold text-dark text-center leading-tight">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-bold text-dark block mb-1.5">
                  اوصف اللي عايزه
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: آيفون 15 برو 256 جيجا"
                  className="w-full bg-gray-light rounded-xl px-4 py-3 text-sm text-dark placeholder:text-gray-text outline-none focus:ring-2 focus:ring-brand-green/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-bold text-dark block mb-1.5">
                  تفاصيل أكتر <span className="text-gray-text font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="لون معين، حالة، مواصفات..."
                  rows={2}
                  className="w-full bg-gray-light rounded-xl px-4 py-3 text-sm text-dark placeholder:text-gray-text outline-none focus:ring-2 focus:ring-brand-green/30 resize-none"
                />
              </div>

              {errorMsg && (
                <div className="text-sm text-error font-bold text-center bg-red-50 rounded-xl py-2 px-3">
                  <p>{errorMsg}</p>
                  {errorMsg.includes("/setup") && (
                    <Link href="/setup" onClick={onClose} className="text-brand-green underline text-xs mt-1 block">
                      افتح صفحة الإعداد
                    </Link>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setErrorMsg("");
                  if (!categoryId) {
                    setErrorMsg("اختار القسم الأول");
                    return;
                  }
                  if (!title.trim()) {
                    setErrorMsg("اكتب اللي عايز تشتريه");
                    return;
                  }
                  setStep(2);
                }}
                className="w-full py-3.5 bg-brand-green text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-transform"
              >
                التالي ←
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Purchase type */}
              <div>
                <label className="text-sm font-bold text-dark block mb-2">طريقة الشراء</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { type: "cash" as const, label: "شراء نقدي", emoji: "💵", desc: "عايز أشتري" },
                    { type: "exchange" as const, label: "استبدال", emoji: "🔄", desc: "عايز أبدّل" },
                    { type: "both" as const, label: "الاتنين", emoji: "💵🔄", desc: "نقدي أو بدل" },
                  ]).map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setPurchaseType(opt.type)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        purchaseType === opt.type
                          ? "border-brand-green bg-brand-green-light"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-[11px] font-bold text-dark">{opt.label}</span>
                      <span className="text-[9px] text-gray-text">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget (for cash / both) */}
              {(purchaseType === "cash" || purchaseType === "both") && (
                <div>
                  <label className="text-sm font-bold text-dark block mb-1.5">الميزانية</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        placeholder="من"
                        className="w-full bg-gray-light rounded-xl px-4 py-3 text-sm text-dark placeholder:text-gray-text outline-none"
                      />
                    </div>
                    <span className="text-gray-text text-sm">—</span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        placeholder="إلى"
                        className="w-full bg-gray-light rounded-xl px-4 py-3 text-sm text-dark placeholder:text-gray-text outline-none"
                      />
                    </div>
                    <span className="text-xs text-gray-text">جنيه</span>
                  </div>
                </div>
              )}

              {/* Exchange details (for exchange / both) */}
              {(purchaseType === "exchange" || purchaseType === "both") && (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-dark block">عندك إيه تبدّله؟</label>
                  <input
                    type="text"
                    value={exchangeOffer}
                    onChange={(e) => setExchangeOffer(e.target.value)}
                    placeholder="مثلاً: سامسونج S24 مستعمل ممتاز"
                    className="w-full bg-gray-light rounded-xl px-4 py-3 text-sm text-dark placeholder:text-gray-text outline-none"
                  />
                  <div>
                    <label className="text-xs text-gray-text block mb-1">قسم اللي هتبدله</label>
                    <select
                      value={exchangeCategoryId}
                      onChange={(e) => setExchangeCategoryId(e.target.value)}
                      className="w-full bg-gray-light rounded-xl px-4 py-3 text-sm text-dark outline-none"
                    >
                      <option value="">اختار القسم</option>
                      {categoriesConfig.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-light rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-dark">ملخص طلبك:</p>
                <p className="text-sm text-dark">
                  {selectedCategory?.icon} {title}
                </p>
                <p className="text-xs text-gray-text">
                  {purchaseType === "cash" && budgetMax && `ميزانية: حتى ${Number(budgetMax).toLocaleString("en-US")} جنيه`}
                  {purchaseType === "exchange" && exchangeOffer && `للبدل بـ: ${exchangeOffer}`}
                  {purchaseType === "both" && "نقدي أو استبدال"}
                </p>
              </div>

              {errorMsg && (
                <div className="text-sm text-error font-bold text-center bg-red-50 rounded-xl py-2 px-3">
                  <p>{errorMsg}</p>
                  {errorMsg.includes("/setup") && (
                    <Link href="/setup" onClick={onClose} className="text-brand-green underline text-xs mt-1 block">
                      افتح صفحة الإعداد
                    </Link>
                  )}
                </div>
              )}

              <div className="flex gap-2 pb-4">
                <button
                  onClick={() => { setErrorMsg(""); setStep(1); }}
                  className="flex-1 py-3 border-2 border-gray-200 text-dark font-bold rounded-xl text-sm"
                >
                  → رجوع
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-brand-green text-white font-bold rounded-xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {isSubmitting ? "جاري النشر..." : "انشر طلبك"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
