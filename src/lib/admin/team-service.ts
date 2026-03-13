/**
 * Team Members Service — server-side CRUD for team management.
 * Uses service_role key to bypass RLS.
 */

import { createClient } from "@supabase/supabase-js";
import type { TeamMember, TeamRole } from "./rbac";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Get team member by user_id (from auth) */
export async function getTeamMemberByUserId(userId: string): Promise<TeamMember | null> {
  const sb = getServiceClient();
  const { data } = await sb
    .from("team_members")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();
  return data as TeamMember | null;
}

/** Get team member by email */
export async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  const sb = getServiceClient();
  const { data } = await sb
    .from("team_members")
    .select("*")
    .eq("email", email)
    .eq("is_active", true)
    .single();
  return data as TeamMember | null;
}

/** Get team member by phone */
export async function getTeamMemberByPhone(phone: string): Promise<TeamMember | null> {
  const sb = getServiceClient();
  const { data } = await sb
    .from("team_members")
    .select("*")
    .eq("phone", phone)
    .eq("is_active", true)
    .single();
  return data as TeamMember | null;
}

/** Get all team members */
export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const sb = getServiceClient();
  const { data } = await sb
    .from("team_members")
    .select("*")
    .order("role", { ascending: true })
    .order("name", { ascending: true });
  return (data as TeamMember[]) || [];
}

/** Create a new team member */
export async function createTeamMember(member: {
  name: string;
  email?: string;
  phone?: string;
  role: TeamRole;
  title?: string;
  department?: string;
  user_id?: string;
  invited_by?: string;
}): Promise<TeamMember | null> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("team_members")
    .insert({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      title: member.title,
      department: member.department,
      user_id: member.user_id,
      invited_by: member.invited_by,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating team member:", error);
    return null;
  }
  return data as TeamMember;
}

/** Update team member role */
export async function updateTeamMemberRole(
  memberId: string,
  role: TeamRole,
  title?: string
): Promise<boolean> {
  const sb = getServiceClient();
  const { error } = await sb
    .from("team_members")
    .update({ role, title, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  return !error;
}

/** Deactivate team member */
export async function deactivateTeamMember(memberId: string): Promise<boolean> {
  const sb = getServiceClient();
  const { error } = await sb
    .from("team_members")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  return !error;
}

/** Update last login timestamp */
export async function updateLastLogin(memberId: string): Promise<void> {
  const sb = getServiceClient();
  await sb
    .from("team_members")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", memberId);
}

/** Log a team activity */
export async function logTeamActivity(params: {
  team_member_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const sb = getServiceClient();
  await sb.from("team_activity_log").insert({
    team_member_id: params.team_member_id,
    action: params.action,
    resource_type: params.resource_type,
    resource_id: params.resource_id,
    details: params.details || {},
  });
}

/**
 * Ensure a user is registered as a team member on login.
 * If they're in admin_phones but not in team_members, auto-create as CEO.
 */
export async function ensureTeamMember(userId: string, phone?: string, email?: string): Promise<TeamMember | null> {
  // First check if already a team member
  const existing = await getTeamMemberByUserId(userId);
  if (existing) {
    await updateLastLogin(existing.id);
    return existing;
  }

  // Check by phone or email
  if (phone) {
    const byPhone = await getTeamMemberByPhone(phone);
    if (byPhone) {
      // Link user_id to existing team member
      const sb = getServiceClient();
      await sb.from("team_members").update({
        user_id: userId,
        last_login_at: new Date().toISOString(),
      }).eq("id", byPhone.id);
      return { ...byPhone, user_id: userId };
    }
  }
  if (email) {
    const byEmail = await getTeamMemberByEmail(email);
    if (byEmail) {
      const sb = getServiceClient();
      await sb.from("team_members").update({
        user_id: userId,
        last_login_at: new Date().toISOString(),
      }).eq("id", byEmail.id);
      return { ...byEmail, user_id: userId };
    }
  }

  // Not a team member — check if they're an admin (legacy check)
  // Auto-register first admin as CEO
  const sb = getServiceClient();
  const { count } = await sb.from("team_members").select("*", { count: "exact", head: true });

  if (count === 0) {
    // First team member = CEO
    return createTeamMember({
      name: email || phone || "المدير العام",
      email: email || undefined,
      phone: phone || undefined,
      role: "ceo",
      title: "المدير العام",
      user_id: userId,
    });
  }

  return null;
}
