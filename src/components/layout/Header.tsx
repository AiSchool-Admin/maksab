"use client";

import { Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-brand-green">مكسب</h1>
      <button
        className="p-2 text-gray-text hover:text-brand-green transition-colors rounded-full"
        aria-label="الإشعارات"
      >
        <Bell size={22} />
      </button>
    </header>
  );
}
