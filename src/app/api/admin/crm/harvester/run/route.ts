/**
 * AHE Harvest Run API
 * POST — تنفيذ عملية حصاد واحدة
 */

import { NextRequest, NextResponse } from "next/server";
import { runHarvestJob } from "@/lib/crm/harvester/engine";

export const maxDuration = 60; // Vercel Hobby plan max

export async function POST(req: NextRequest) {

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
