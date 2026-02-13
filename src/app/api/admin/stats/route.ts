/**
 * GET /api/admin/stats?type=overview|categories|governorates|sale_types|growth|users|ads
 *
 * Admin analytics endpoint — requires admin auth.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOverviewStats,
  getAdsByCategory,
  getAdsByGovernorate,
  getAdsBySaleType,
  getDailyGrowth,
  getUsers,
  getAds,
  verifyAdmin,
} from "@/lib/admin/admin-service";

export async function GET(req: NextRequest) {
  try {
    // Verify admin identity from header
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: "ليس لديك صلاحيات الأدمن" }, { status: 403 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "overview";

    switch (type) {
      case "overview": {
        const stats = await getOverviewStats();
        return NextResponse.json(stats);
      }

      case "categories": {
        const data = await getAdsByCategory();
        return NextResponse.json(data);
      }

      case "governorates": {
        const data = await getAdsByGovernorate();
        return NextResponse.json(data);
      }

      case "sale_types": {
        const data = await getAdsBySaleType();
        return NextResponse.json(data);
      }

      case "growth": {
        const days = Number(url.searchParams.get("days")) || 30;
        const data = await getDailyGrowth(days);
        return NextResponse.json(data);
      }

      case "users": {
        const page = Number(url.searchParams.get("page")) || 1;
        const limit = Number(url.searchParams.get("limit")) || 20;
        const search = url.searchParams.get("search") || undefined;
        const data = await getUsers(page, limit, search);
        return NextResponse.json(data);
      }

      case "ads": {
        const page = Number(url.searchParams.get("page")) || 1;
        const limit = Number(url.searchParams.get("limit")) || 20;
        const data = await getAds(page, limit, {
          category: url.searchParams.get("category") || undefined,
          status: url.searchParams.get("status") || undefined,
          sale_type: url.searchParams.get("sale_type") || undefined,
          governorate: url.searchParams.get("governorate") || undefined,
          search: url.searchParams.get("search") || undefined,
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "نوع غير معروف" }, { status: 400 });
    }
  } catch (err) {
    console.error("[Admin API Error]", err);
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
