"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[مكسب Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <span className="text-4xl">⚠️</span>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-dark mb-2">حصل مشكلة</h1>
        <p className="text-gray-text mb-8 leading-relaxed">
          في حاجة غلط حصلت. جرب تاني أو ارجع للصفحة الرئيسية.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-green text-white rounded-xl font-bold text-base hover:bg-brand-green-dark transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            جرب تاني
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-light text-dark rounded-xl font-bold text-base hover:bg-gray-200 transition-colors"
          >
            <Home className="w-5 h-5" />
            الصفحة الرئيسية
          </Link>
        </div>

        {/* Error ID for support */}
        {error.digest && (
          <p className="mt-6 text-xs text-gray-400" dir="ltr">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
