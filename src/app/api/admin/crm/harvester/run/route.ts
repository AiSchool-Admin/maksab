/**
 * AHE Harvest Run API
 * POST — تنفيذ عملية حصاد واحدة
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/crm/auth";
import { runHarvestJob } from "@/lib/crm/harvester/engine";

export const maxDuration = 300; // 5 minutes max for Vercel

export async function POST(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return NextResponse.json({ error: "job_id مطلوب" }, { status: 400 });
    }

    const result = await runHarvestJob(job_id);

    return NextResponse.json({
      message: result.success ? "تم الحصاد بنجاح" : "فشل الحصاد",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ في الخادم", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
