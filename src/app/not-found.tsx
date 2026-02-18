import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center max-w-sm">
        {/* 404 Visual */}
        <div className="mb-6">
          <span className="text-7xl font-bold text-brand-green opacity-20">
            404
          </span>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-dark mb-2">
          الصفحة دي مش موجودة
        </h1>
        <p className="text-gray-text mb-8 leading-relaxed">
          يمكن الرابط غلط أو الصفحة اتشالت. دوّر على اللي بتدور عليه من البحث.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-green text-white rounded-xl font-bold text-base hover:bg-brand-green-dark transition-colors"
          >
            <Home className="w-5 h-5" />
            الصفحة الرئيسية
          </Link>

          <Link
            href="/search"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-light text-dark rounded-xl font-bold text-base hover:bg-gray-200 transition-colors"
          >
            <Search className="w-5 h-5" />
            ابحث في مكسب
          </Link>
        </div>
      </div>
    </div>
  );
}
