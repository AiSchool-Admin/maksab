"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  TrendingUp,
  MapPin,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  UserSearch,
  Target,
  Megaphone,
  Inbox,
  BarChart3,
  Wheat,
  Bell,
  Headphones,
  ArrowUpRight,
  SmilePlus,
  PieChart,
  Mail,
  Globe,
  Search,
  Pencil,
  Facebook,
  ClipboardCheck,
  Flag,
  DollarSign,
  CreditCard,
  Monitor,
  Cpu,
  UserCog,
  Lock,
  Send,
} from "lucide-react";
import type { TeamRole, AdminSection, RoleConfig } from "@/lib/admin/rbac";
import { ROLE_CONFIGS, hasAccess } from "@/lib/admin/rbac";

const ADMIN_SESSION_KEY = "maksab_admin_session";

// ─── Extended Admin Session with Role ────────────────────────

interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  teamMemberId?: string;
  roleConfig?: RoleConfig;
}

const AdminContext = createContext<AdminSession | null>(null);
export function useAdmin() {
  return useContext(AdminContext);
}

/** Check if current admin has access to a section */
export function useHasAccess(section: AdminSection): boolean {
  const admin = useAdmin();
  if (!admin?.role) return false;
  return hasAccess(admin.role, section);
}

/** Build Authorization headers for admin API calls using session token */
export function getAdminHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("maksab_session_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// ─── Navigation Definition (Unified — no legacy section) ────

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface NavSection {
  id: string;
  sectionKey: AdminSection; // Maps to RBAC section for access control
  label: string;
  icon: string;
  items: NavItem[];
}

/**
 * Unified navigation — all former "legacy/أخرى" items are now distributed
 * to their appropriate department sections.
 */
const navSections: NavSection[] = [
  {
    id: "dashboard",
    sectionKey: "dashboard",
    label: "لوحة القيادة",
    icon: "🎯",
    items: [
      { href: "/admin/marketplace", label: "🏗️ بناء السوق", icon: Target },
      { href: "/admin/dashboard", label: "الرئيسية", icon: LayoutDashboard },
      { href: "/admin/acquisition", label: "محرك الاستحواذ", icon: Target },
    ],
  },
  {
    id: "sales",
    sectionKey: "sales",
    label: "الحصاد والمبيعات",
    icon: "📈",
    items: [
      { href: "/admin/crm/harvester", label: "محرك الحصاد", icon: Cpu },
      { href: "/admin/crm/harvester/alexandria", label: "الإسكندرية", icon: MapPin },
      { href: "/admin/crm/harvester/enrich-specs", label: "استخراج المواصفات", icon: Search },
      { href: "/admin/crm/harvester/test-scopes", label: "🔍 اختبار النطاقات", icon: Search },
      { href: "/admin/sales/crm", label: "🎯 نظام المبيعات (Seller 360)", icon: Target },
      { href: "/admin/sales/outreach?tab=waleed", label: "وليد 🚗 سيارات", icon: Mail },
      { href: "/admin/sales/outreach?tab=ahmed", label: "أحمد 🏠 عقارات", icon: Mail },
      { href: "/admin/sales/whatsapp", label: "📱 لوحة واتساب", icon: Send },
      { href: "/admin/sales/templates", label: "📝 قوالب الرسائل", icon: ClipboardCheck },
    ],
  },
  {
    id: "sellers",
    sectionKey: "sales",
    label: "العملاء",
    icon: "👥",
    items: [
      { href: "/admin/crm/sellers?category=vehicles", label: "بائعو السيارات 🚗", icon: UserSearch },
      { href: "/admin/crm/sellers?category=properties", label: "بائعو العقارات 🏠", icon: UserSearch },
    ],
  },
  {
    id: "finance",
    sectionKey: "finance",
    label: "المالية",
    icon: "💰",
    items: [
      { href: "/admin/finance/revenue", label: "الإيرادات", icon: DollarSign },
      { href: "/admin/price-index", label: "مؤشر الأسعار 📊", icon: TrendingUp },
      { href: "/pricing", label: "الباقات", icon: CreditCard },
    ],
  },
  {
    id: "settings",
    sectionKey: "settings",
    label: "الإعدادات",
    icon: "⚙️",
    items: [
      { href: "/admin/cs", label: "سارة (خدمة العملاء)", icon: Headphones },
      { href: "/admin/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

// Flatten all nav items for header title lookup
const allNavItems = navSections.flatMap((s) => s.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Collapsible sections — start all collapsed except dashboard
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Skip auth check on login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!stored) {
        router.replace("/admin/login");
        return;
      }
      const parsed = JSON.parse(stored) as AdminSession;

      // If no role stored, default to CEO (legacy sessions) and fetch role
      if (!parsed.role) {
        parsed.role = "ceo";
      }
      parsed.roleConfig = ROLE_CONFIGS[parsed.role] || ROLE_CONFIGS.viewer;

      setSession(parsed);
    } catch {
      router.replace("/admin/login");
    }
    setIsLoading(false);
  }, [isLoginPage, router]);

  // Fetch team member role from API (once per load)
  useEffect(() => {
    if (!session || isLoginPage) return;

    async function fetchRole() {
      try {
        const headers = getAdminHeaders();
        const res = await fetch("/api/admin/team?action=me", { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.member) {
            const updatedSession: AdminSession = {
              ...session!,
              role: data.member.role,
              teamMemberId: data.member.id,
              roleConfig: ROLE_CONFIGS[data.member.role as TeamRole] || ROLE_CONFIGS.viewer,
            };
            setSession(updatedSession);
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(updatedSession));
          }
        }
      } catch {
        // Silent — use stored role
      }
    }

    fetchRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage]);

  // Fetch notifications
  useEffect(() => {
    if (!session || isLoginPage) return;

    async function fetchNotifications() {
      try {
        const headers = getAdminHeaders();
        const res = await fetch("/api/admin/notifications", { headers });
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.unread_count || 0);
          setNotifications(data.notifications || []);
        }
      } catch {
        // Silent
      }
    }

    fetchNotifications();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage, session?.id]);

  async function markAllNotificationsRead() {
    try {
      const headers = getAdminHeaders();
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotificationCount(0);
      setNotifications([]);
      setShowNotifications(false);
    } catch {
      // Silent
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem("maksab_session_token");
    router.replace("/admin/login");
  };

  // Filter nav sections based on role
  const filteredSections = navSections.filter((section) => {
    if (!session?.role) return false;
    return hasAccess(session.role, section.sectionKey);
  });

  // Resolve header title from pathname
  const getPageTitle = (): string => {
    const exact = allNavItems.find((n) => n.href === pathname);
    if (exact) return exact.label;
    const prefix = allNavItems
      .filter((n) => pathname.startsWith(n.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);
    if (prefix.length > 0) return prefix[0].label;
    if (pathname === "/admin") return "لوحة التحكم";
    return "لوحة التحكم";
  };

  // Login page — render without layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-green rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Shield size={24} className="text-white" />
          </div>
          <p className="text-sm text-gray-text">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const roleConfig = session.roleConfig || ROLE_CONFIGS[session.role] || ROLE_CONFIGS.viewer;

  return (
    <AdminContext.Provider value={session}>
      <div className="min-h-screen bg-gray-50 flex" dir="rtl">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 right-0 z-50 w-64 bg-white border-l border-gray-200 transform transition-transform lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo + Role Badge */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-brand-green rounded-lg flex items-center justify-center">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-dark">مكسب</h2>
                    <p className="text-[10px] text-gray-text">إدارة العمل الموحدة</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-gray-text">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Navigation with collapsible sections — role-filtered */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {filteredSections.map((section) => {
                const isCollapsed = collapsedSections[section.id] ?? false;
                const hasActiveItem = section.items.some(
                  (item) => pathname === item.href || pathname.startsWith(item.href + "/")
                );

                // Single-item sections render directly as a link
                if (section.items.length === 1) {
                  const item = section.items[0];
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={section.id}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-green text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                      }`}
                    >
                      <span className="text-base">{section.icon}</span>
                      {item.label}
                    </Link>
                  );
                }

                // Auto-expand section that has active item
                const shouldCollapse = hasActiveItem ? false : isCollapsed;

                return (
                  <div key={section.id}>
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        hasActiveItem ? "text-brand-green" : "text-gray-400"
                      } hover:bg-gray-50`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{section.icon}</span>
                        {section.label}
                      </span>
                      {shouldCollapse ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>

                    {/* Section items */}
                    {!shouldCollapse && (
                      <div className="mt-0.5 mr-3 border-r border-gray-100 space-y-0.5">
                        {section.items.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2 mr-1 rounded-lg text-sm transition-colors ${
                                isActive
                                  ? "bg-brand-green text-white font-medium"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                              }`}
                            >
                              <item.icon size={16} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Admin info with role badge & logout */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <div className="w-8 h-8 bg-brand-green-light rounded-full flex items-center justify-center text-brand-green text-xs font-bold">
                  {(session.name || "A")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-dark truncate">{session.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px]">{roleConfig.icon}</span>
                    <p className="text-[10px] text-gray-text truncate">{roleConfig.label}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-error hover:bg-error/5 transition-colors"
              >
                <LogOut size={16} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-3 sticky top-0 z-30">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-gray-text hover:text-dark rounded-lg hover:bg-gray-100">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-dark">
              {getPageTitle()}
            </h1>
            <div className="flex-1" />

            {/* Role indicator in header */}
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-text bg-gray-100 px-2 py-1 rounded-full">
              <Lock size={10} />
              {roleConfig.label}
            </span>

            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-text hover:text-dark rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 z-50" dir="rtl">
                  <div className="p-3 border-b flex items-center justify-between">
                    <h4 className="font-bold text-sm text-dark">
                      التنبيهات {notificationCount > 0 && `(${notificationCount} جديدة)`}
                    </h4>
                    {notificationCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-brand-green hover:text-brand-green-dark"
                      >
                        تعليم الكل كمقروء
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      لا توجد تنبيهات جديدة
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((n: any) => (
                        <div key={n.id} className="p-3 hover:bg-gray-50">
                          <p className="text-sm font-medium text-dark">{n.title}</p>
                          {n.body && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-gray-400">
                              {n.created_at
                                ? new Date(n.created_at).toLocaleString("ar-EG", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : ""}
                            </span>
                            {n.action_url && (
                              <Link
                                href={n.action_url}
                                onClick={() => setShowNotifications(false)}
                                className="text-[10px] text-brand-green hover:text-brand-green-dark font-medium"
                              >
                                اتخذ إجراء →
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href="/" className="text-xs text-brand-green hover:text-brand-green-dark flex items-center gap-1">
              <ChevronLeft size={14} />
              الموقع الرئيسي
            </Link>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
