"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserCog,
  Plus,
  Shield,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { useAdmin, getAdminHeaders } from "../layout";
import {
  ROLE_CONFIGS,
  getRolesByLevel,
  canManageRole,
  type TeamRole,
  type TeamMemberWithConfig,
} from "@/lib/admin/rbac";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default function TeamManagementPage() {
  const admin = useAdmin();
  const [members, setMembers] = useState<TeamMemberWithConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = getAdminHeaders();
      const res = await fetch("/api/admin/team?action=list", { headers });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      } else if (res.status === 403) {
        setError("ليس لديك صلاحية لعرض أعضاء الفريق");
      }
    } catch {
      setError("حصل مشكلة في تحميل البيانات");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (admin) loadMembers();
  }, [admin, loadMembers]);

  const roleGroups = getRolesByLevel();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} className="text-yellow-600" />
        </div>
        <h2 className="text-lg font-bold text-dark">{error}</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <UserCog size={24} className="text-brand-green" />
            إدارة الفريق
          </h2>
          <p className="text-xs text-gray-text mt-1">
            إدارة أعضاء فريق العمل وصلاحياتهم
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-green-dark transition-colors"
        >
          <Plus size={16} />
          دعوة عضو
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-dark">{members.length}</p>
          <p className="text-xs text-gray-text">إجمالي الأعضاء</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {members.filter((m) => m.is_active).length}
          </p>
          <p className="text-xs text-gray-text">نشط</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {members.filter((m) => m.roleConfig.level <= 2).length}
          </p>
          <p className="text-xs text-gray-text">C-Level</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {members.filter((m) => m.roleConfig.level >= 3).length}
          </p>
          <p className="text-xs text-gray-text">موظفين</p>
        </div>
      </div>

      {/* Role Hierarchy Explanation */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <h3 className="text-sm font-bold text-dark mb-3">هيكل الصلاحيات</h3>
        <div className="space-y-2">
          {roleGroups.map((group) => (
            <div key={group.level} className="flex items-start gap-3">
              <span className="text-[10px] text-gray-text bg-gray-100 px-2 py-0.5 rounded-full mt-0.5 shrink-0">
                مستوى {group.level}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {group.roles.map((role) => (
                  <span
                    key={role.id}
                    className="inline-flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded-lg"
                  >
                    <span>{role.icon}</span>
                    {role.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Members List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-dark">أعضاء الفريق</h3>
        {members.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <p className="text-gray-text text-sm">مفيش أعضاء حالياً</p>
            <p className="text-xs text-gray-text mt-1">أول مدير يسجل دخوله سيكون المدير العام تلقائياً</p>
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-brand-green-light rounded-full flex items-center justify-center text-brand-green text-sm font-bold shrink-0">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  (member.name || "?")[0]
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-dark truncate">{member.name}</p>
                  {!member.is_active && (
                    <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">معطّل</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-text">
                    <span>{member.roleConfig.icon}</span>
                    {member.roleConfig.label}
                  </span>
                  {member.title && (
                    <span className="text-[10px] text-gray-text">— {member.title}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {member.email && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-text">
                      <Mail size={10} />
                      <span dir="ltr">{member.email}</span>
                    </span>
                  )}
                  {member.phone && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-text">
                      <Phone size={10} />
                      <span dir="ltr">{member.phone}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Last login */}
              <div className="text-left shrink-0">
                {member.last_login_at ? (
                  <span className="flex items-center gap-1 text-[10px] text-gray-text">
                    <Clock size={10} />
                    {formatTimeAgo(member.last_login_at)}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-text">لم يسجل دخول</span>
                )}
                <p className="text-[10px] text-gray-text mt-0.5">
                  انضم {formatDate(member.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          currentRole={admin?.role || "viewer"}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            loadMembers();
          }}
        />
      )}
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────

function InviteModal({
  currentRole,
  onClose,
  onSuccess,
}: {
  currentRole: TeamRole;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<TeamRole>("viewer");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Only show roles that the current user can assign
  const assignableRoles = Object.values(ROLE_CONFIGS).filter((r) =>
    canManageRole(currentRole, r.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role) {
      setError("الاسم والدور مطلوبين");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const headers = {
        ...getAdminHeaders(),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          title: title.trim() || undefined,
          department: ROLE_CONFIGS[role]?.department,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "فشل في إضافة العضو");
      }
    } catch {
      setError("حصل مشكلة في الاتصال");
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-dark">دعوة عضو جديد</h3>
          <button onClick={onClose} className="p-1 text-gray-text hover:text-dark rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-dark mb-1">الاسم *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم العضو"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-green"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-dark mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-green"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-dark mb-1">رقم الموبايل</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-green"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-dark mb-1">الدور *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-green bg-white"
            >
              {assignableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.icon} {r.label} — {r.description}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-dark mb-1">المسمى الوظيفي</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مدير التسويق الرقمي"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-green"
            />
          </div>

          {/* Role description */}
          {role && ROLE_CONFIGS[role] && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-dark flex items-center gap-1.5">
                <Shield size={12} className="text-brand-green" />
                صلاحيات {ROLE_CONFIGS[role].label}
              </p>
              <p className="text-[11px] text-gray-text mt-1">{ROLE_CONFIGS[role].description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {ROLE_CONFIGS[role].sections.map((section) => (
                  <span key={section} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200">
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-green text-white py-3 rounded-xl text-sm font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check size={16} />
                إضافة العضو
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
