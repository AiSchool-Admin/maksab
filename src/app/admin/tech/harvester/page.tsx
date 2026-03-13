"use client";

/**
 * Tech Harvester page — redirects to the unified CRM harvester.
 * The duplicate has been eliminated. Canonical page: /admin/crm/harvester
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TechHarvesterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/crm/harvester");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]" dir="rtl">
      <p className="text-sm text-gray-text">جاري التحويل لمحرك الحصاد...</p>
    </div>
  );
}
