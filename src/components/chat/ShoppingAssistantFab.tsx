"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

/**
 * Floating action button for the Shopping Assistant.
 * Shows on home page, search page, and category pages.
 */
export default function ShoppingAssistantFab() {
  return (
    <Link
      href="/shopping-assistant"
      className="fixed bottom-20 start-4 z-40 w-12 h-12 bg-brand-green text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-green-dark active:scale-[0.92] transition-all"
      aria-label="مساعد التسوق"
    >
      <ShoppingBag size={22} />
    </Link>
  );
}
