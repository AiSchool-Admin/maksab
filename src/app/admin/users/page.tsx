"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Store, User, Shield, Phone } from "lucide-react";
import { useAdmin } from "../layout";
import type { AdminUser } from "@/lib/admin/admin-service";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
}

export default function AdminUsersPage() {
  const admin = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

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
        headers: { "x-admin-id": admin.id },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch {
      // Silent
    }
    setIsLoading(false);
  }, [admin, page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark">المستخدمين</h2>
          <p className="text-xs text-gray-text">{total} مستخدم مسجّل</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-text" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="ابحث بالاسم أو رقم الموبايل..."
          className="w-full ps-4 pe-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-text">جاري التحميل...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-text">لا يوجد مستخدمين</div>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
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
                        </div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-50">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
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
                    <span>{u.governorate || "—"}</span>
                    <span>{u.totalAds} إعلان</span>
                    <span>{formatDate(u.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-sm text-gray-text px-3">
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-text hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
