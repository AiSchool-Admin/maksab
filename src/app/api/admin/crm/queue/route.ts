// CRM Queue Processor API — معالج طابور الإرسال
// POST: Process queued messages
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/crm/auth";
import { processMessageQueue } from "@/lib/crm/queue-processor";

// POST — trigger queue processing
export async function POST(req: NextRequest) {
  const authError = await validateAdminRequest(req);
  if (authError) return authError;

  try {
    const result = await processMessageQueue();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "فشل معالجة الطابور" },
      { status: 500 }
    );
  }
}
