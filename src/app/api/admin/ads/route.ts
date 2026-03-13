/**
 * POST /api/admin/ads — Ad moderation actions
 * GET  /api/admin/ads?id=xxx — Get ad detail
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import { verifyAdmin } from "@/lib/admin/admin-service";
import {
  moderateAd,
  bulkModerateAds,
  getAdDetail,
  type AdAction,
} from "@/lib/admin/admin-actions";

async function authenticateAdmin(req: NextRequest): Promise<{ adminId: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "مطلوب تسجيل الدخول" }, { status: 401 });
  }
  const session = verifySessionToken(token);
  if (!session.valid) {
    return NextResponse.json({ error: session.error }, { status: 401 });
  }
  const isAdmin = await verifyAdmin(session.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "ليس لديك صلاحيات الأدمن" }, { status: 403 });
  }
  return { adminId: session.userId };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const adId = url.searchParams.get("id");

    if (!adId) {
      return NextResponse.json({ error: "معرّف الإعلان مطلوب" }, { status: 400 });
    }

    const detail = await getAdDetail(adId);
    if (!detail) {
      return NextResponse.json({ error: "الإعلان غير موجود" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error("[Admin Ads API Error]", err);
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { action, adId, adIds, reason } = body as {
      action: AdAction;
      adId?: string;
      adIds?: string[];
      reason?: string;
    };

    if (!action) {
      return NextResponse.json({ error: "الإجراء مطلوب" }, { status: 400 });
    }

    // Bulk action
    if (adIds && Array.isArray(adIds) && adIds.length > 0) {
      if (adIds.length > 100) {
        return NextResponse.json({ error: "الحد الأقصى 100 إعلان" }, { status: 400 });
      }
      const result = await bulkModerateAds(adIds, action, auth.adminId, reason);
      return NextResponse.json(result);
    }

    // Single action
    if (!adId) {
      return NextResponse.json({ error: "معرّف الإعلان مطلوب" }, { status: 400 });
    }

    const result = await moderateAd(adId, action, auth.adminId, reason);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Admin Ads API Error]", err);
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
