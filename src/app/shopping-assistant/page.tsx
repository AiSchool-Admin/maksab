"use client";

import { useRouter } from "next/navigation";
import ShoppingAssistant from "@/components/chat/ShoppingAssistant";

export default function ShoppingAssistantPage() {
  const router = useRouter();

  return (
    <main className="h-screen bg-white">
      <ShoppingAssistant onClose={() => router.back()} />
    </main>
  );
}
