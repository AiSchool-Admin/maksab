"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Store,
  User,
  Shield,
  Phone,
  X,
  Loader2,
  Ban,
  CheckCircle2,
  ShieldCheck,
  ShieldOff,
  MapPin,
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  ShoppingBag,
  Download,
  Filter,
  UserCheck,
  UserX,
  Crown,
  Clock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAdmin, getAdminHeaders } from "../layout";
import type { AdminUser } from "@/lib/admin/admin-service";
import type { UserDetail } from "@/lib/admin/admin-actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
}

type UserAction = "ban" | "unban" | "make_admin" | "remove_admin" | "verify";

export default function AdminUsersPage() {
  const admin = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  // Detail drawer
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Ban dialog
  const [banDialogUser, setBanDialogUser] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");

  const loadUsers = useCallback(async () => {
    if (!admin) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: "users",
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/stats?${params}`, {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        let filtered = data.users as AdminUser[];
        // Client-side type filter (the backend doesn't support it yet)
        if (typeFilter === "store") {
          filtered = filtered.filter((u) => u.sellerType === "store");
        } else if (typeFilter === "individual") {
          filtered = filtered.filter((u) => u.sellerType === "individual");
        } else if (typeFilter === "admin") {
          filtered = filtered.filter((u) => u.isAdmin);
        }
        setUsers(filtered);
        setTotal(data.total);
      }
    } catch {
      // Silent
    }
    setIsLoading(false);
  }, [admin, page, search, typeFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / limit);

  // ── User Actions ──────────────────────────────────────

  async function performAction(userId: string, action: UserAction, reason?: string) {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({ action, userId, reason }),
      });
      if (res.ok) {
        loadUsers();
        // Refresh detail if open
        if (detailUser?.id === userId) {
          openDetail(userId);
        }
      }
    } catch {
      // Silent
    }
    setActionLoading(null);
  }

  async function handleBan() {
    if (!banDialogUser) return;
    await performAction(banDialogUser.id, "ban", banReason || undefined);
    setBanDialogUser(null);
    setBanReason("");
  }

  // ── User Detail ───────────────────────────────────────

  async function openDetail(userId: string) {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailUser(data);
      }
    } catch {
      // Silent
    }
    setIsLoadingDetail(false);
  }

  // ── Export ──────────────────────────────────────────────

  function exportCsv() {
    const header = "ID,الاسم,الموبايل,النوع,المحافظة,الإعلانات,التقييم,تاريخ التسجيل\n";
    const rows = users
      .map((u) =>
        [
          u.id,
          `"${(u.displayName || "").replace(/"/g, '""')}"`,
          u.phone,
          u.sellerType,
          u.governorate || "",
          u.totalAds,
          u.rating,
          u.createdAt,
        ].join(","),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maksab-users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark flex items-center gap-2">
            <User size={24} className="text-brand-green" />
            إدارة المستخدمين
          </h2>
          <p className="text-xs text-gray-text mt-1">{total} مستخدم مسجّل</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
              showFilters ? "bg-brand-green text-white" : "bg-gray-100 text-gray-text hover:bg-gray-200"
            }`}
          >
            <Filter size={14} />
            فلاتر
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-gray-100 text-gray-text hover:bg-gray-200 font-medium transition-colors"
          >
            <Download size={14} />
            تصدير
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث بالاسم أو رقم الموبايل..."
            className="w-full ps-4 pe-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
          />
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
            <span className="text-xs text-gray-text self-center">نوع المستخدم:</span>
            {[
              { value: "", label: "الكل" },
              { value: "individual", label: "أفراد" },
              { value: "store", label: "تجار" },
              { value: "admin", label: "مديرين" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => { setTypeFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  typeFilter === f.value
                    ? "bg-brand-green text-white"
                    : "bg-white text-gray-text hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <User size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-text">لا يوجد مستخدمين</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-gray-text">المستخدم</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-text">الموبايل</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-text">النوع</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-text">المحافظة</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-text">الإعلانات</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-text">التقييم</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-text">تاريخ التسجيل</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-text w-24">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(u.id)} className="flex items-center gap-2 hover:text-brand-green transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {u.avatarUrl ? (
                              <Image src={u.avatarUrl} alt="" width={32} height={32} className="w-full h-full rounded-full object-cover" unoptimized />
                            ) : (
                              <User size={14} className="text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-dark truncate flex items-center gap-1">
                              {u.displayName || "—"}
                              {u.isAdmin && <Shield size={12} className="text-brand-green flex-shrink-0" />}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-text font-mono text-xs" dir="ltr">{formatPhone(u.phone)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                          u.sellerType === "store"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-blue-50 text-blue-600"
                        }`}>
                          {u.sellerType === "store" ? <Store size={10} /> : <User size={10} />}
                          {u.sellerType === "store" ? "تاجر" : "فرد"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-text">{u.governorate || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-dark">{u.totalAds}</td>
                      <td className="px-4 py-3 text-xs text-gray-text">{u.rating > 0 ? `⭐ ${u.rating}` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-text">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {actionLoading === u.id ? (
                            <Loader2 size={14} className="animate-spin text-brand-green" />
                          ) : (
                            <>
                              <button
                                onClick={() => openDetail(u.id)}
                                className="p-1.5 text-gray-text hover:text-brand-green hover:bg-green-50 rounded-lg transition-colors"
                                title="عرض التفاصيل"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => setBanDialogUser({ id: u.id, name: u.displayName || u.phone })}
                                className="p-1.5 text-gray-text hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="حظر"
                              >
                                <Ban size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-50">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openDetail(u.id)}
                  className="w-full p-4 space-y-2 text-start hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        {u.avatarUrl ? (
                          <Image src={u.avatarUrl} alt="" width={36} height={36} className="w-full h-full rounded-full object-cover" unoptimized />
                        ) : (
                          <User size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark flex items-center gap-1">
                          {u.displayName || "بدون اسم"}
                          {u.isAdmin && <Shield size={12} className="text-brand-green" />}
                        </p>
                        <p className="text-[10px] text-gray-text font-mono" dir="ltr">{formatPhone(u.phone)}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-lg ${
                      u.sellerType === "store"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-blue-50 text-blue-600"
                    }`}>
                      {u.sellerType === "store" ? "تاجر" : "فرد"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-text">
                    {u.governorate && <span className="flex items-center gap-0.5"><MapPin size={8} /> {u.governorate}</span>}
                    <span>{u.totalAds} إعلان</span>
                    <span>{formatDate(u.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-text">
            صفحة {page} من {totalPages} — عرض {(page - 1) * limit + 1}-{Math.min(page * limit, total)} من {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {(detailUser || isLoadingDetail) && (
        <UserDetailDrawer
          user={detailUser}
          isLoading={isLoadingDetail}
          currentAdminId={admin?.id || ""}
          onClose={() => setDetailUser(null)}
          onAction={(action, reason) => {
            if (detailUser) {
              performAction(detailUser.id, action, reason);
            }
          }}
          onBan={() => {
            if (detailUser) {
              setBanDialogUser({ id: detailUser.id, name: detailUser.displayName || detailUser.phone });
            }
          }}
        />
      )}

      {/* Ban Dialog */}
      {banDialogUser && (
        <BanDialog
          userName={banDialogUser.name}
          reason={banReason}
          onReasonChange={setBanReason}
          onConfirm={handleBan}
          onCancel={() => { setBanDialogUser(null); setBanReason(""); }}
          isLoading={actionLoading === banDialogUser.id}
        />
      )}
    </div>
  );
}

// ── User Detail Drawer ─────────────────────────────────────

function UserDetailDrawer({
  user,
  isLoading,
  currentAdminId,
  onClose,
  onAction,
  onBan,
}: {
  user: UserDetail | null;
  isLoading: boolean;
  currentAdminId: string;
  onClose: () => void;
  onAction: (action: UserAction, reason?: string) => void;
  onBan: () => void;
}) {
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 start-0 w-full max-w-lg bg-white z-50 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark">تفاصيل المستخدم</h3>
          <button onClick={onClose} className="p-2 text-gray-text hover:text-dark rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {isLoading || !user ? (
          <div className="p-8 text-center">
            <Loader2 size={24} className="animate-spin text-brand-green mx-auto" />
            <p className="text-sm text-gray-text mt-2">جاري التحميل...</p>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="" width={64} height={64} className="w-full h-full rounded-full object-cover" unoptimized />
                ) : (
                  <User size={28} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-dark flex items-center gap-2">
                  {user.displayName || "بدون اسم"}
                  {user.isAdmin && <Shield size={16} className="text-brand-green" />}
                  {user.isVerified && <CheckCircle2 size={16} className="text-blue-500" />}
                </h4>
                <p className="text-sm text-gray-text font-mono" dir="ltr">
                  <Phone size={12} className="inline me-1" />
                  {formatPhone(user.phone)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg ${
                    user.sellerType === "store"
                      ? "bg-orange-50 text-orange-600"
                      : "bg-blue-50 text-blue-600"
                  }`}>
                    {user.sellerType === "store" ? "تاجر" : "فرد"}
                  </span>
                  {user.isBanned && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-red-50 text-red-600">
                      محظور
                    </span>
                  )}
                  {user.isCommissionSupporter && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-green-50 text-green-600">
                      💚 داعم
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ban warning */}
            {user.isBanned && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <Ban size={16} />
                  هذا المستخدم محظور
                </div>
                {user.banReason && (
                  <p className="text-xs text-red-600 mt-1">السبب: {user.banReason}</p>
                )}
              </div>
            )}

            {/* Bio */}
            {user.bio && (
              <div>
                <h5 className="text-xs font-semibold text-gray-text mb-1">نبذة</h5>
                <p className="text-sm text-dark">{user.bio}</p>
              </div>
            )}

            {/* Location */}
            {(user.governorate || user.city) && (
              <div className="flex items-center gap-2 text-sm text-gray-text">
                <MapPin size={14} />
                <span>{[user.governorate, user.city].filter(Boolean).join(" — ")}</span>
              </div>
            )}

            {/* Activity Stats */}
            <div>
              <h5 className="text-xs font-semibold text-gray-text mb-2">نشاط المستخدم</h5>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <ShoppingBag size={16} className="mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold text-dark">{user.activeAdsCount}</p>
                  <p className="text-[10px] text-gray-text">إعلان نشط</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <CheckCircle2 size={16} className="mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-dark">{user.soldAdsCount}</p>
                  <p className="text-[10px] text-gray-text">مباع</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <ShoppingBag size={16} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-lg font-bold text-dark">{user.totalAds}</p>
                  <p className="text-[10px] text-gray-text">إجمالي</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Eye size={16} className="mx-auto text-purple-500 mb-1" />
                  <p className="text-lg font-bold text-dark">{user.totalViewsOnAds.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-text">مشاهدة</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <MessageSquare size={16} className="mx-auto text-amber-500 mb-1" />
                  <p className="text-lg font-bold text-dark">{user.totalConversations}</p>
                  <p className="text-[10px] text-gray-text">محادثة</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Heart size={16} className="mx-auto text-red-400 mb-1" />
                  <p className="text-lg font-bold text-dark">{user.totalFavorites}</p>
                  <p className="text-[10px] text-gray-text">مفضلة</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-1 text-xs text-gray-text">
              <div className="flex items-center gap-2">
                <Calendar size={12} />
                <span>تسجيل: {formatFullDate(user.createdAt)}</span>
              </div>
              {user.lastActiveAt && (
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>آخر نشاط: {formatFullDate(user.lastActiveAt)}</span>
                </div>
              )}
              {user.rating > 0 && (
                <div className="flex items-center gap-2">
                  <Crown size={12} />
                  <span>التقييم: ⭐ {user.rating}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h5 className="text-xs font-semibold text-gray-text mb-2">إجراءات إدارية</h5>
              <div className="flex flex-wrap gap-2">
                {/* Ban / Unban */}
                {user.isBanned ? (
                  <button
                    onClick={() => onAction("unban")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-green-500 text-white hover:bg-green-600 font-medium transition-colors"
                  >
                    <UserCheck size={14} />
                    رفع الحظر
                  </button>
                ) : (
                  <button
                    onClick={onBan}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium transition-colors"
                  >
                    <UserX size={14} />
                    حظر
                  </button>
                )}

                {/* Verify */}
                {!user.isVerified && (
                  <button
                    onClick={() => onAction("verify")}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium transition-colors"
                  >
                    <ShieldCheck size={14} />
                    توثيق
                  </button>
                )}

                {/* Admin toggle (only if not self) */}
                {user.id !== currentAdminId && (
                  user.isAdmin ? (
                    <button
                      onClick={() => onAction("remove_admin")}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-gray-500 text-white hover:bg-gray-600 font-medium transition-colors"
                    >
                      <ShieldOff size={14} />
                      إزالة الإدارة
                    </button>
                  ) : (
                    <button
                      onClick={() => onAction("make_admin")}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-purple-500 text-white hover:bg-purple-600 font-medium transition-colors"
                    >
                      <Shield size={14} />
                      جعله مدير
                    </button>
                  )
                )}

                {/* View profile */}
                <Link
                  href={`/user/${user.id}`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-brand-green text-white hover:bg-brand-green-dark font-medium transition-colors"
                >
                  <Eye size={14} />
                  صفحة المستخدم
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Ban Dialog ──────────────────────────────────────────────

function BanDialog({
  userName,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  isLoading,
}: {
  userName: string;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Ban size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark">حظر المستخدم</h3>
              <p className="text-xs text-gray-text">هل متأكد إنك عايز تحظر &quot;{userName}&quot;؟</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-dark mb-1 block">سبب الحظر (اختياري)</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="مثلاً: محتوى مخالف، سبام، احتيال..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-text hover:text-dark hover:bg-gray-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Ban size={14} />
              )}
              حظر المستخدم
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
