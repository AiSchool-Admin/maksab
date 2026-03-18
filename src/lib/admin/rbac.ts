/**
 * Role-Based Access Control (RBAC) for Maksab Admin
 *
 * Defines roles, permissions, and which sections each role can access.
 * This is the single source of truth for the unified admin system.
 */

// ─── Role Types ──────────────────────────────────────────────

export type TeamRole =
  | "ceo"
  | "cto"
  | "cmo"
  | "coo"
  | "cfo"
  | "cs_manager"
  | "sales_manager"
  | "cs_agent"
  | "sales_agent"
  | "moderator"
  | "content_editor"
  | "viewer";

// ─── Permission Sections (maps to sidebar sections) ──────────

export type AdminSection =
  | "dashboard"         // لوحة القيادة
  | "cs"                // خدمة العملاء
  | "sales"             // المبيعات والاستحواذ
  | "marketing"         // التسويق والنمو
  | "ops"               // العمليات والجودة
  | "finance"           // المالية
  | "tech"              // التقنية
  | "users"             // إدارة المستخدمين
  | "ads"               // إدارة الإعلانات
  | "analytics"         // التحليلات
  | "locations"         // المواقع
  | "settings"          // الإعدادات
  | "crm"              // CRM (العملاء، الاكتشاف، الحملات)
  | "ai"               // فريق AI
  | "team";             // إدارة الفريق

// ─── Granular Actions ────────────────────────────────────────

export type PermissionAction =
  | "view"              // مشاهدة
  | "create"            // إنشاء
  | "edit"              // تعديل
  | "delete"            // حذف
  | "approve"           // موافقة
  | "export"            // تصدير
  | "manage_team";      // إدارة أعضاء الفريق

export interface SectionPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
  manage_team: boolean;
}

// ─── Role Metadata ───────────────────────────────────────────

export interface RoleConfig {
  id: TeamRole;
  label: string;          // Arabic display name
  title: string;          // Arabic title
  description: string;    // Arabic description
  icon: string;           // Emoji
  level: number;          // Hierarchy level (1 = highest)
  department?: string;    // Primary department
  sections: AdminSection[];  // Accessible sections
  permissions: Partial<Record<AdminSection, Partial<SectionPermission>>>;
}

// Full permissions helper
const FULL: SectionPermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  approve: true,
  export: true,
  manage_team: true,
};

const VIEW_ONLY: Partial<SectionPermission> = { view: true };
const VIEW_EXPORT: Partial<SectionPermission> = { view: true, export: true };
const VIEW_CREATE_EDIT: Partial<SectionPermission> = { view: true, create: true, edit: true };
const VIEW_CREATE_EDIT_APPROVE: Partial<SectionPermission> = { view: true, create: true, edit: true, approve: true };

// ─── Role Definitions ────────────────────────────────────────

export const ROLE_CONFIGS: Record<TeamRole, RoleConfig> = {
  // ── C-Level ────────────────────────────────
  ceo: {
    id: "ceo",
    label: "المدير العام",
    title: "CEO — المدير العام الاستراتيجي",
    description: "صلاحيات كاملة على جميع أقسام النظام",
    icon: "👑",
    level: 1,
    sections: ["dashboard", "cs", "sales", "marketing", "ops", "finance", "tech", "users", "ads", "analytics", "locations", "settings", "crm", "ai", "team"],
    permissions: {
      dashboard: FULL,
      cs: FULL,
      sales: FULL,
      marketing: FULL,
      ops: FULL,
      finance: FULL,
      tech: FULL,
      users: FULL,
      ads: FULL,
      analytics: FULL,
      locations: FULL,
      settings: FULL,
      crm: FULL,
      ai: FULL,
      team: FULL,
    },
  },

  cto: {
    id: "cto",
    label: "المدير التقني",
    title: "CTO — المدير التقني",
    description: "إدارة التقنية، محرك الحصاد، النظام، التحليلات",
    icon: "💻",
    level: 2,
    department: "tech",
    sections: ["dashboard", "tech", "analytics", "settings", "crm", "ai", "users"],
    permissions: {
      dashboard: VIEW_EXPORT,
      tech: FULL,
      analytics: FULL,
      settings: FULL,
      crm: { view: true, create: true, edit: true, export: true },
      ai: FULL,
      users: VIEW_EXPORT,
    },
  },

  cmo: {
    id: "cmo",
    label: "مدير التسويق",
    title: "CMO — مدير التسويق والنمو",
    description: "إدارة التسويق، المحتوى، SEO، الحملات",
    icon: "📣",
    level: 2,
    department: "marketing",
    sections: ["dashboard", "marketing", "analytics", "crm"],
    permissions: {
      dashboard: VIEW_EXPORT,
      marketing: FULL,
      analytics: VIEW_EXPORT,
      crm: { view: true, create: true, edit: true, export: true },
    },
  },

  coo: {
    id: "coo",
    label: "مدير العمليات",
    title: "COO — مدير العمليات والجودة",
    description: "إدارة العمليات، مراجعة الإعلانات، البلاغات، الجودة",
    icon: "⚙️",
    level: 2,
    department: "ops",
    sections: ["dashboard", "ops", "ads", "users", "analytics", "locations"],
    permissions: {
      dashboard: VIEW_EXPORT,
      ops: FULL,
      ads: { view: true, edit: true, approve: true, delete: true, export: true },
      users: VIEW_EXPORT,
      analytics: VIEW_EXPORT,
      locations: FULL,
    },
  },

  cfo: {
    id: "cfo",
    label: "المدير المالي",
    title: "CFO — المدير المالي",
    description: "إدارة المالية، الاشتراكات، الإيرادات، التقارير المالية",
    icon: "💰",
    level: 2,
    department: "finance",
    sections: ["dashboard", "finance", "analytics"],
    permissions: {
      dashboard: VIEW_EXPORT,
      finance: FULL,
      analytics: VIEW_EXPORT,
    },
  },

  // ── Department Managers ────────────────────
  cs_manager: {
    id: "cs_manager",
    label: "مدير خدمة العملاء",
    title: "مدير خدمة العملاء",
    description: "إدارة فريق خدمة العملاء، التصعيدات، التقارير",
    icon: "📞",
    level: 3,
    department: "cs",
    sections: ["dashboard", "cs", "analytics"],
    permissions: {
      dashboard: VIEW_ONLY,
      cs: { view: true, create: true, edit: true, approve: true, export: true, manage_team: true },
      analytics: VIEW_ONLY,
    },
  },

  sales_manager: {
    id: "sales_manager",
    label: "مدير المبيعات",
    title: "مدير المبيعات والاستحواذ",
    description: "إدارة فريق المبيعات، Pipeline، النطاقات، التواصل",
    icon: "📈",
    level: 3,
    department: "sales",
    sections: ["dashboard", "sales", "crm", "analytics"],
    permissions: {
      dashboard: VIEW_ONLY,
      sales: { view: true, create: true, edit: true, approve: true, export: true, manage_team: true },
      crm: VIEW_CREATE_EDIT,
      analytics: VIEW_ONLY,
    },
  },

  // ── Agents / Staff ─────────────────────────
  cs_agent: {
    id: "cs_agent",
    label: "موظف خدمة عملاء",
    title: "موظف خدمة العملاء",
    description: "الرد على المحادثات، إدارة التصعيدات المعينة له",
    icon: "🎧",
    level: 4,
    department: "cs",
    sections: ["cs"],
    permissions: {
      cs: { view: true, create: true, edit: true },
    },
  },

  sales_agent: {
    id: "sales_agent",
    label: "موظف مبيعات",
    title: "موظف مبيعات",
    description: "التواصل مع العملاء المحتملين، تحديث حالة الـ Pipeline",
    icon: "📱",
    level: 4,
    department: "sales",
    sections: ["sales", "crm"],
    permissions: {
      sales: { view: true, create: true, edit: true },
      crm: { view: true, edit: true },
    },
  },

  moderator: {
    id: "moderator",
    label: "مراجع محتوى",
    title: "مراجع الإعلانات والمحتوى",
    description: "مراجعة الإعلانات المعلّقة، معالجة البلاغات",
    icon: "🛡️",
    level: 4,
    department: "ops",
    sections: ["ops", "ads"],
    permissions: {
      ops: VIEW_CREATE_EDIT_APPROVE,
      ads: { view: true, edit: true, approve: true },
    },
  },

  content_editor: {
    id: "content_editor",
    label: "محرر محتوى",
    title: "محرر المحتوى التسويقي",
    description: "إنشاء وتعديل المحتوى التسويقي والحملات",
    icon: "✏️",
    level: 4,
    department: "marketing",
    sections: ["marketing"],
    permissions: {
      marketing: VIEW_CREATE_EDIT,
    },
  },

  viewer: {
    id: "viewer",
    label: "مشاهد",
    title: "مشاهد فقط",
    description: "مشاهدة لوحة القيادة والتحليلات بدون تعديل",
    icon: "👁️",
    level: 5,
    sections: ["dashboard"],
    permissions: {
      dashboard: VIEW_ONLY,
    },
  },
};

// ─── Helper Functions ────────────────────────────────────────

/** Check if a role has access to a section */
export function hasAccess(role: TeamRole, section: AdminSection): boolean {
  const config = ROLE_CONFIGS[role];
  return config?.sections.includes(section) ?? false;
}

/** Check if a role has a specific permission on a section */
export function hasPermission(
  role: TeamRole,
  section: AdminSection,
  action: PermissionAction
): boolean {
  const config = ROLE_CONFIGS[role];
  if (!config) return false;
  const sectionPerms = config.permissions[section];
  if (!sectionPerms) return false;
  return sectionPerms[action] ?? false;
}

/** Get all accessible sections for a role */
export function getAccessibleSections(role: TeamRole): AdminSection[] {
  return ROLE_CONFIGS[role]?.sections ?? [];
}

/** Get the role hierarchy level (1 = CEO, higher = less access) */
export function getRoleLevel(role: TeamRole): number {
  return ROLE_CONFIGS[role]?.level ?? 99;
}

/** Check if roleA can manage roleB (higher level can manage lower) */
export function canManageRole(managerRole: TeamRole, targetRole: TeamRole): boolean {
  return getRoleLevel(managerRole) < getRoleLevel(targetRole);
}

/** Get all roles grouped by level */
export function getRolesByLevel(): { level: number; label: string; roles: RoleConfig[] }[] {
  const levels = [
    { level: 1, label: "المدير العام" },
    { level: 2, label: "C-Level" },
    { level: 3, label: "مديرو الأقسام" },
    { level: 4, label: "الموظفين" },
    { level: 5, label: "مشاهدين" },
  ];

  return levels.map((l) => ({
    ...l,
    roles: Object.values(ROLE_CONFIGS).filter((r) => r.level === l.level),
  }));
}

// ─── Team Member Types ───────────────────────────────────────

export interface TeamMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: TeamRole;
  title: string | null;
  department: string | null;
  is_active: boolean;
  last_login_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberWithConfig extends TeamMember {
  roleConfig: RoleConfig;
}

/** Enrich team member with role configuration */
export function enrichTeamMember(member: TeamMember): TeamMemberWithConfig {
  return {
    ...member,
    roleConfig: ROLE_CONFIGS[member.role] || ROLE_CONFIGS.viewer,
  };
}
