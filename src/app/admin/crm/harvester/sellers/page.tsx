"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/crm/harvester");
  }, [router]);
  return (
    <div className="p-8 text-center text-gray-400" dir="rtl">
      جاري التحويل...
    </div>
  );
}
