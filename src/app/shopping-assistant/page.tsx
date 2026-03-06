"use client";

import { useRouter } from "next/navigation";
import ShoppingAssistant from "@/components/chat/ShoppingAssistant";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";

export default function ShoppingAssistantPage() {
  const router = useRouter();

  return (
    <main className="h-screen bg-white flex flex-col pb-16">
      <div className="flex-1 min-h-0">
        <ShoppingAssistant onClose={() => router.back()} />
      </div>
      <BottomNavWithBadge />
    </main>
  );
}
