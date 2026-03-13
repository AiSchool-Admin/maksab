/**
 * POST /api/admin/users — User management actions (ban, unban, etc.)
 * GET  /api/admin/users?id=xxx — Get user detail
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import { verifyAdmin } from "@/lib/admin/admin-service";
import {
  manageUser,
  getUserDetail,
  type UserAction,
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
    const userId = url.searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "معرّف المستخدم مطلوب" }, { status: 400 });
    }

    const detail = await getUserDetail(userId);
    if (!detail) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error("[Admin Users API Error]", err);
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { action, userId, reason } = body as {
      action: UserAction;
      userId: string;
      reason?: string;
    };

    if (!action || !userId) {
      return NextResponse.json({ error: "الإجراء والمعرّف مطلوبين" }, { status: 400 });
    }

    // Prevent self-ban
    if (action === "ban" && userId === auth.adminId) {
      return NextResponse.json({ error: "مش ممكن تحظر نفسك" }, { status: 400 });
    }

    // Prevent self-demote
    if (action === "remove_admin" && userId === auth.adminId) {
      return NextResponse.json({ error: "مش ممكن تشيل صلاحياتك" }, { status: 400 });
    }

    const result = await manageUser(userId, action, auth.adminId, reason);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Admin Users API Error]", err);
    return NextResponse.json({ error: "حصلت مشكلة" }, { status: 500 });
  }
}
