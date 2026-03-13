/**
 * GET /api/admin/team — Get current team member info + all team members (for CEO/managers)
 * POST /api/admin/team — Create/invite a team member (CEO/managers only)
 * PATCH /api/admin/team — Update team member role (CEO/managers only)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";
import { verifyAdmin } from "@/lib/admin/admin-service";
import {
  getTeamMemberByUserId,
  getAllTeamMembers,
  createTeamMember,
  updateTeamMemberRole,
  deactivateTeamMember,
  ensureTeamMember,
  logTeamActivity,
} from "@/lib/admin/team-service";
import { hasPermission, canManageRole, enrichTeamMember } from "@/lib/admin/rbac";
import type { TeamRole } from "@/lib/admin/rbac";

async function authenticateAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session.valid) return null;

  const isAdmin = await verifyAdmin(session.userId);
  if (!isAdmin) return null;

  return session.userId;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticateAdmin(req);
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "me";

    // Get or create team member for current user
    let member = await getTeamMemberByUserId(userId);
    if (!member) {
      // Auto-register (will be CEO if first member)
      member = await ensureTeamMember(userId);
    }

    if (!member) {
      return NextResponse.json({ error: "ليس عضو في الفريق" }, { status: 403 });
    }

    if (action === "me") {
      return NextResponse.json({
        member: enrichTeamMember(member),
      });
    }

    if (action === "list") {
      // Only managers and above can list all members
      if (!hasPermission(member.role, "team", "view")) {
        return NextResponse.json({ error: "ليس لديك صلاحية" }, { status: 403 });
      }
      const allMembers = await getAllTeamMembers();
      return NextResponse.json({
        members: allMembers.map(enrichTeamMember),
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    console.error("Team API error:", error);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await authenticateAdmin(req);
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const currentMember = await getTeamMemberByUserId(userId);
    if (!currentMember || !hasPermission(currentMember.role, "team", "create")) {
      return NextResponse.json({ error: "ليس لديك صلاحية لإضافة أعضاء" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, role, title, department } = body;

    if (!name || !role) {
      return NextResponse.json({ error: "الاسم والدور مطلوبين" }, { status: 400 });
    }

    // Can't create a member with higher/equal role
    if (!canManageRole(currentMember.role, role as TeamRole)) {
      return NextResponse.json({ error: "لا يمكنك إضافة عضو بصلاحيات أعلى من صلاحياتك" }, { status: 403 });
    }

    const newMember = await createTeamMember({
      name,
      email,
      phone,
      role: role as TeamRole,
      title,
      department,
      invited_by: currentMember.id,
    });

    if (!newMember) {
      return NextResponse.json({ error: "فشل في إنشاء العضو" }, { status: 500 });
    }

    await logTeamActivity({
      team_member_id: currentMember.id,
      action: "invite_team_member",
      resource_type: "team_member",
      resource_id: newMember.id,
      details: { name, role, invited_by: currentMember.name },
    });

    return NextResponse.json({ member: enrichTeamMember(newMember) });
  } catch (error) {
    console.error("Team create error:", error);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await authenticateAdmin(req);
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const currentMember = await getTeamMemberByUserId(userId);
    if (!currentMember || !hasPermission(currentMember.role, "team", "edit")) {
      return NextResponse.json({ error: "ليس لديك صلاحية" }, { status: 403 });
    }

    const body = await req.json();
    const { member_id, action: updateAction, role, title } = body;

    if (!member_id) {
      return NextResponse.json({ error: "member_id مطلوب" }, { status: 400 });
    }

    if (updateAction === "deactivate") {
      const success = await deactivateTeamMember(member_id);
      if (success) {
        await logTeamActivity({
          team_member_id: currentMember.id,
          action: "deactivate_team_member",
          resource_type: "team_member",
          resource_id: member_id,
        });
      }
      return NextResponse.json({ success });
    }

    if (updateAction === "update_role" && role) {
      if (!canManageRole(currentMember.role, role as TeamRole)) {
        return NextResponse.json({ error: "لا يمكنك ترقية عضو لصلاحيات أعلى من صلاحياتك" }, { status: 403 });
      }
      const success = await updateTeamMemberRole(member_id, role as TeamRole, title);
      if (success) {
        await logTeamActivity({
          team_member_id: currentMember.id,
          action: "update_team_role",
          resource_type: "team_member",
          resource_id: member_id,
          details: { new_role: role, title },
        });
      }
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    console.error("Team update error:", error);
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }
}
