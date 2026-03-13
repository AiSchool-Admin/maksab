/**
 * GET /api/admin/cs/escalations — Real escalations data
 * Currently returns empty since no escalation table exists yet.
 */

import { NextResponse } from "next/server";

export async function GET() {
  // No escalation table exists yet — return empty
  return NextResponse.json({
    escalations: [],
    stats: { total: 0, pending: 0, resolved: 0 },
  });
}
